import { Worker, type Job } from 'bullmq'
import { getRedis } from './index'
import { db } from '@/lib/db'
import { aiAgents, aiAgentPausedChats, chatRecordingConfigs, instances } from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { decrypt } from '@/lib/ai-agent/crypto'
import { callLLM, type LLMMessage } from '@/lib/ai-agent/llm'
import { sendMessage } from '@/lib/baileys/index'
import { normalizePhone } from '@/lib/utils'
import { google } from 'googleapis'

export interface AiReplyJobData {
  agentId:       string
  instanceId:    string
  userId:        string
  sessionName:   string
  phone:         string   // 628xxx format
  name:          string
  text:          string | null  // null = non-text message
  recordedAt:    string         // ISO string
}

const g = global as typeof global & { _aiReplyWorker?: Worker }

function sheetsClient() {
  let creds = {}
  try { creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}') } catch {}
  return google.sheets({
    version: 'v4',
    auth: new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    }),
  })
}

/** Read all rows from sheet, return as array of string arrays */
async function readSheetRows(
  spreadsheetId: string,
  sheetName: string,
): Promise<string[][]> {
  try {
    const sheets = sheetsClient()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:G`,
    })
    return (res.data.values ?? []) as string[][]
  } catch {
    return []
  }
}

/** Ensure sheet has the extended header columns, return column indices */
async function ensureExtendedHeaders(
  spreadsheetId: string,
  sheetName: string,
  rows: string[][],
): Promise<{ repliedByCol: number; repliedTextCol: number; excludeNumCol: number }> {
  const header = rows[0] ?? []

  // Current known positions: A=Date, B=Name, C=Phone, D=Chat
  // We add: E=replied_by, F=replied_text, G=exclude_number
  let repliedByCol   = header.indexOf('replied_by')
  let repliedTextCol = header.indexOf('replied_text')
  let excludeNumCol  = header.indexOf('exclude_number')

  if (repliedByCol === -1 || repliedTextCol === -1 || excludeNumCol === -1) {
    // Need to extend header
    const newHeader = [...header]
    if (repliedByCol   === -1) { repliedByCol   = newHeader.length; newHeader.push('replied_by') }
    if (repliedTextCol === -1) { repliedTextCol = newHeader.length; newHeader.push('replied_text') }
    if (excludeNumCol  === -1) { excludeNumCol  = newHeader.length; newHeader.push('exclude_number') }

    const sheets = sheetsClient()
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [newHeader] },
    }).catch(() => {})
  }

  return { repliedByCol, repliedTextCol, excludeNumCol }
}

/** Update a specific row in the sheet (1-indexed rowNum) */
async function updateSheetRow(
  spreadsheetId: string,
  sheetName: string,
  rowNum: number,
  colIndex: number,
  value: string,
  colIndex2: number,
  value2: string,
): Promise<void> {
  // Convert column index to letter (0=A, 1=B, etc.)
  const colLetter  = String.fromCharCode(65 + colIndex)
  const colLetter2 = String.fromCharCode(65 + colIndex2)
  const sheets = sheetsClient()
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: `${sheetName}!${colLetter}${rowNum}`, values: [[value]] },
        { range: `${sheetName}!${colLetter2}${rowNum}`, values: [[value2]] },
      ],
    },
  }).catch(() => {})
}

async function processJob(job: Job<AiReplyJobData>) {
  const { agentId, instanceId, phone, name, text } = job.data

  // Resolve correct session_name from instances table (instanceId → session_name)
  const [instRow] = await db
    .select({ sessionName: instances.sessionName })
    .from(instances)
    .where(eq(instances.id, instanceId))
  if (!instRow) {
    console.error(`[AiReplyWorker] Instance ${instanceId} not found`)
    return
  }
  const sessionName = instRow.sessionName

  // 1. Fetch agent config
  const [agent] = await db
    .select()
    .from(aiAgents)
    .where(and(eq(aiAgents.id, agentId), eq(aiAgents.isActive, true)))
  if (!agent) return  // agent disabled or deleted

  // 2. Check paused chats
  const now = new Date()
  const [paused] = await db
    .select({ resumeAt: aiAgentPausedChats.resumeAt })
    .from(aiAgentPausedChats)
    .where(and(
      eq(aiAgentPausedChats.agentId, agentId),
      eq(aiAgentPausedChats.phoneNumber, phone),
      gt(aiAgentPausedChats.resumeAt, now),
    ))
  if (paused) return  // still in human takeover window

  // 3. Non-text message → reply with mediaReplyText
  if (!text) {
    await new Promise((r) => setTimeout(r, randomDelay()))
    await sendMessage(sessionName, phone, agent.mediaReplyText).catch((err) => {
      console.error('[AiAgent] Send media reply error:', err)
    })
    return
  }

  // 4. Load Google Sheet context + exclude numbers
  let contextMessages: LLMMessage[] = []
  let rows: string[][] = []
  let repliedByCol  = 4
  let repliedTextCol = 5

  if (agent.sheetConfigId) {
    const [cfg] = await db
      .select({ spreadsheetId: chatRecordingConfigs.spreadsheetId, sheetName: chatRecordingConfigs.sheetName })
      .from(chatRecordingConfigs)
      .where(eq(chatRecordingConfigs.id, agent.sheetConfigId))

    if (cfg) {
      rows = await readSheetRows(cfg.spreadsheetId, cfg.sheetName)
      const cols = await ensureExtendedHeaders(cfg.spreadsheetId, cfg.sheetName, rows)
      repliedByCol   = cols.repliedByCol
      repliedTextCol = cols.repliedTextCol

      // Check exclude_number column
      const excludeNums = rows.slice(1)
        .map((r) => normalizePhone(r[cols.excludeNumCol] ?? ''))
        .filter(Boolean)
      if (excludeNums.includes(phone)) return  // excluded

      // Build context: rows for this phone, last 20
      const phoneRows = rows.slice(1).filter((r) => {
        // column index 2 = Phone (C)
        return normalizePhone(r[2] ?? '') === phone
      })
      const last20 = phoneRows.slice(-20)
      for (const r of last20) {
        const incoming = r[3] ?? ''  // column D = Chat
        const reply    = r[repliedTextCol] ?? ''
        if (incoming) contextMessages.push({ role: 'user', content: incoming })
        if (reply)    contextMessages.push({ role: 'assistant', content: reply })
      }
    }
  }

  // Add current message if not already at end
  const lastMsg = contextMessages.at(-1)
  if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== text) {
    contextMessages.push({ role: 'user', content: text })
  }

  // 5. Call LLM
  const decryptedKey = decrypt(agent.apiKey)
  const reply = await callLLM({
    provider:     agent.provider,
    apiKey:       decryptedKey,
    model:        agent.model,
    systemPrompt: agent.systemPrompt,
    strictRules:  agent.strictRules,
    messages:     contextMessages,
  })

  if (!reply) return

  // 6. Random delay 3–8 seconds
  await new Promise((r) => setTimeout(r, randomDelay()))

  // 7. Send reply
  await sendMessage(sessionName, phone, reply)

  // 8. Update Google Sheet if config exists
  if (agent.sheetConfigId && rows.length > 1) {
    const [cfg] = await db
      .select({ spreadsheetId: chatRecordingConfigs.spreadsheetId, sheetName: chatRecordingConfigs.sheetName })
      .from(chatRecordingConfigs)
      .where(eq(chatRecordingConfigs.id, agent.sheetConfigId))

    if (cfg) {
      // Find last row matching this phone (1-indexed, +1 for header, +1 for 1-based)
      const dataRows = rows.slice(1)
      let lastMatchIdx = -1
      for (let i = dataRows.length - 1; i >= 0; i--) {
        if (normalizePhone(dataRows[i][2] ?? '') === phone) {
          lastMatchIdx = i
          break
        }
      }
      if (lastMatchIdx >= 0) {
        const sheetRowNum = lastMatchIdx + 2  // +1 for header, +1 for 1-based
        await updateSheetRow(
          cfg.spreadsheetId, cfg.sheetName, sheetRowNum,
          repliedByCol,  'ai',
          repliedTextCol, reply,
        )
      }
    }
  }
}

function randomDelay(): number {
  return (3 + Math.random() * 5) * 1000  // 3–8 seconds
}

export async function startAiReplyWorker() {
  if (g._aiReplyWorker) return

  const { getAiReplyQueue } = await import('./index')
  getAiReplyQueue()  // ensure queue is created

  g._aiReplyWorker = new Worker<AiReplyJobData>(
    'ai-reply',
    async (job) => {
      try {
        await processJob(job)
      } catch (err) {
        console.error('[AiReplyWorker] Job error:', err)
        throw err
      }
    },
    {
      connection:  getRedis(),
      concurrency: 3,
    },
  )

  g._aiReplyWorker.on('failed', (job, err) => {
    console.error('[AiReplyWorker] Failed:', job?.id, err.message)
  })

  console.log('[AiReplyWorker] Started')
}
