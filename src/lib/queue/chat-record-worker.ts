import { Worker, type Job } from 'bullmq'
import { getRedis } from './index'
import { db } from '@/lib/db'
import { chatRecordingConfigs, chatRecordingLogs } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { google } from 'googleapis'

export interface ChatRecordJobData {
  configId:   string
  phone:      string
  name:       string
  message:    string
  recordedAt: string // ISO string
}

const g = global as typeof global & { _chatRecordWorker?: Worker }

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

const HEADER = ['Date', 'Name', 'Phone', 'Chat']

function formatDateWIB(d: Date): string {
  const parts = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  return `${get('day')}-${get('month')}-${get('year')} ${get('hour')}:${get('minute')}:${get('second')}`
}

async function processJob(job: Job<ChatRecordJobData>) {
  const { configId, phone, name, message, recordedAt } = job.data

  const [config] = await db
    .select({ spreadsheetId: chatRecordingConfigs.spreadsheetId, sheetName: chatRecordingConfigs.sheetName })
    .from(chatRecordingConfigs)
    .where(eq(chatRecordingConfigs.id, configId))

  if (!config) throw new Error(`Config ${configId} not found`)

  const sheets = sheetsClient()
  const { spreadsheetId, sheetName } = config

  // Check if header row already exists
  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:D1`,
    })
    const firstRow = existing.data.values?.[0]
    if (!firstRow || firstRow.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [HEADER] },
      })
    }
  } catch {
    // If sheet doesn't exist yet, try to create header anyway
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADER] },
    })
  }

  // Append data row
  const dateStr = formatDateWIB(new Date(recordedAt))
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:D`,
    valueInputOption: 'RAW',
    requestBody: { values: [[dateStr, name, phone, message]] },
  })

  // Log success
  await db.insert(chatRecordingLogs).values({
    configId,
    phone,
    name,
    message,
    recordedAt: new Date(recordedAt),
    status: 'success',
  })
}

export async function startChatRecordWorker() {
  if (g._chatRecordWorker) return

  g._chatRecordWorker = new Worker<ChatRecordJobData>(
    'chat-record',
    async (job) => {
      try {
        await processJob(job)
      } catch (err) {
        // Log failure
        try {
          await db.insert(chatRecordingLogs).values({
            configId:   job.data.configId,
            phone:      job.data.phone,
            name:       job.data.name,
            message:    job.data.message,
            recordedAt: new Date(job.data.recordedAt),
            status:     'failed',
          })
        } catch {}
        throw err
      }
    },
    {
      connection: getRedis(),
      concurrency: 1,
    },
  )

  g._chatRecordWorker.on('failed', (job, err) => {
    console.error('[ChatRecordWorker] Job failed:', job?.id, err.message)
  })

  console.log('[ChatRecordWorker] Started')
}
