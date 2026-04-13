import path from 'node:path'
import { Boom } from '@hapi/boom'
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type WASocket,
  type ConnectionState,
} from '@whiskeysockets/baileys'

// Minimal pino-compatible silent logger untuk Baileys
const silentLogger = {
  level: 'silent',
  trace: () => {}, debug: () => {}, info: () => {},
  warn:  (m: unknown) => { if (typeof m === 'string' && !m.includes('skipping')) console.warn('[Baileys]', m) },
  error: (m: unknown) => console.error('[Baileys]', m),
  fatal: (m: unknown) => console.error('[Baileys FATAL]', m),
  child: () => silentLogger,
} as any
import QRCode from 'qrcode'
import { db } from '@/lib/db'
import { instances, users, chatRecordingConfigs, aiAgents, aiAgentPausedChats } from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'
import { isProActive } from '@/lib/plan-helpers'
import { getChatRecordQueue, getAiReplyQueue } from '@/lib/queue'
import { makeSessionName } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────────────
export type SessionStatus = 'disconnected' | 'connecting' | 'qr_code' | 'connected' | 'error'

interface SessionEntry {
  socket:     WASocket
  status:     SessionStatus
  qrDataUrl?: string       // base64 QR PNG
  instanceId: string
  userId:     string
}

// ── Singleton store ───────────────────────────────────────────────────
const g = global as typeof global & {
  _baileySessions?: Map<string, SessionEntry>
  _baileyReconnectCount?: Map<string, number>
}
if (!g._baileySessions) g._baileySessions = new Map()
if (!g._baileyReconnectCount) g._baileyReconnectCount = new Map()
const sessions = g._baileySessions
const reconnectCount = g._baileyReconnectCount

const MAX_RECONNECT_ATTEMPTS = 3

function isFatalDisconnect(code: number | undefined): boolean {
  return (
    code === DisconnectReason.loggedOut ||
    code === DisconnectReason.badSession ||
    code === DisconnectReason.forbidden ||
    code === 400 // bad-request
  )
}

// ── Helpers ───────────────────────────────────────────────────────────
function authDir(sessionName: string) {
  return path.join(process.cwd(), 'ons', sessionName)
}

async function updateDBStatus(
  instanceId: string,
  status: SessionStatus,
  phoneNumber?: string,
) {
  try {
    await db.update(instances).set({
      status,
      ...(phoneNumber      ? { phoneNumber }         : {}),
      ...(status === 'connected' ? { lastConnected: new Date() } : {}),
      updatedAt: new Date(),
    }).where(eq(instances.id, instanceId))
  } catch (e) {
    console.error('[Baileys] DB update error:', e)
  }
}

// ── startSession ─────────────────────────────────────────────────────
export async function startSession(
  sessionName: string,
  userId: string,
  instanceId: string,
): Promise<void> {
  // Jika sudah ada & connected, skip
  const existing = sessions.get(sessionName)
  if (existing && existing.status === 'connected') return

  // Tutup socket lama jika ada
  if (existing?.socket) {
    try { existing.socket.end(undefined) } catch {}
    sessions.delete(sessionName)
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir(sessionName))
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys:  makeCacheableSignalKeyStore(state.keys, silentLogger),
    },
    logger:                      silentLogger,
    printQRInTerminal:           false,
    browser:                     ['Mote Blaster', 'Chrome', '1.0'],
    connectTimeoutMs:            60_000,
    defaultQueryTimeoutMs:       30_000,
    keepAliveIntervalMs:         25_000,
    generateHighQualityLinkPreview: false,
    syncFullHistory:             false,
    markOnlineOnConnect:         false,
    getMessage:                  async () => undefined,
  })

  const entry: SessionEntry = {
    socket: sock,
    status: 'connecting',
    instanceId,
    userId,
  }
  sessions.set(sessionName, entry)
  await updateDBStatus(instanceId, 'connecting')

  // ── connection.update ─────────────────────────────────────────────
  sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      try {
        const dataUrl = await QRCode.toDataURL(qr)
        const e = sessions.get(sessionName)
        if (e) { e.status = 'qr_code'; e.qrDataUrl = dataUrl }
        await updateDBStatus(instanceId, 'qr_code')
        console.log(`[Baileys] QR ready for ${sessionName}`)
      } catch (err) {
        console.error('[Baileys] QR gen error:', err)
      }
    }

    if (connection === 'close') {
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode
      const fatal = isFatalDisconnect(code)
      const attempts = (reconnectCount.get(sessionName) ?? 0) + 1
      const tooManyRetries = attempts >= MAX_RECONNECT_ATTEMPTS
      const shouldReconnect = !fatal && !tooManyRetries

      console.log(`[Baileys] ${sessionName} closed (${code}), attempt=${attempts}, reconnect=${shouldReconnect}`)

      sessions.delete(sessionName)

      if (fatal || tooManyRetries) {
        reconnectCount.delete(sessionName)
        console.log(`[Baileys] Session ${sessionName} invalid, stopping reconnect`)
        await updateDBStatus(instanceId, 'error')
      } else {
        reconnectCount.set(sessionName, attempts)
        await updateDBStatus(instanceId, 'disconnected')
        // Reconnect setelah 3 detik
        setTimeout(() => startSession(sessionName, userId, instanceId), 3_000)
      }
    }

    if (connection === 'open') {
      const e = sessions.get(sessionName)
      if (e) { e.status = 'connected'; e.qrDataUrl = undefined }

      // Reset reconnect counter setelah berhasil connect
      reconnectCount.delete(sessionName)

      // Ambil nomor HP dari creds
      const phone = sock.user?.id?.split(':')[0] ?? undefined
      await updateDBStatus(instanceId, 'connected', phone)
      console.log(`[Baileys] ${sessionName} connected (${phone ?? 'unknown'})`)
    }
  })

  // ── creds.update ─────────────────────────────────────────────────
  sock.ev.on('creds.update', saveCreds)

  // ── messages.upsert — Chat Recording + AI Agent ──────────────────
  sock.ev.on('messages.upsert', (m) => {
    if (m.type !== 'notify') return
    for (const msg of m.messages) {
      const remoteJid    = msg.key.remoteJid    ?? ''
      const remoteJidAlt = msg.key.remoteJidAlt ?? ''
      // Skip group messages
      if (remoteJid.endsWith('@g.us') || remoteJidAlt.endsWith('@g.us')) continue
      // Resolve contact JID
      const contactJid = remoteJidAlt.endsWith('@s.whatsapp.net') ? remoteJidAlt : remoteJid
      if (!contactJid.endsWith('@s.whatsapp.net')) continue

      const content = msg.message
      if (!content) continue

      const fromMe     = msg.key.fromMe ?? false
      const phone      = contactJid.split('@')[0]
      const name       = msg.pushName ?? ''
      const recordedAt = new Date(Number(msg.messageTimestamp ?? Date.now() / 1000) * 1000).toISOString()

      // Extract text content
      let text: string | null = null
      if (content.conversation)                  text = content.conversation
      else if (content.extendedTextMessage?.text) text = content.extendedTextMessage.text
      else if (content.imageMessage?.caption)     text = content.imageMessage.caption

      // ── Chat Recording (incoming text only) ──────────────────────
      if (!fromMe && text) {
        ;(async () => {
          try {
            const [userRow] = await db
              .select({ plan: users.plan, proExpiresAt: users.proExpiresAt })
              .from(users)
              .where(eq(users.id, userId))
            if (!userRow || !isProActive(userRow)) return

            const [config] = await db
              .select({ id: chatRecordingConfigs.id })
              .from(chatRecordingConfigs)
              .where(and(
                eq(chatRecordingConfigs.instanceId, instanceId),
                eq(chatRecordingConfigs.isActive, true),
              ))
            if (!config) return

            await getChatRecordQueue().add('record', {
              configId:   config.id,
              phone,
              name,
              message:    text!,
              recordedAt,
            })
          } catch (err) {
            console.error('[Baileys] Chat record enqueue error:', err)
          }
        })()
      }

      // ── AI Agent ──────────────────────────────────────────────────
      ;(async () => {
        try {
          const [agent] = await db
            .select({
              id:       aiAgents.id,
              isActive: aiAgents.isActive,
            })
            .from(aiAgents)
            .where(and(
              eq(aiAgents.instanceId, instanceId),
              eq(aiAgents.isActive, true),
            ))
          if (!agent) return

          if (fromMe) {
            // Human takeover: pause AI for 1 hour
            const resumeAt = new Date(Date.now() + 60 * 60 * 1000)
            const existing = await db
              .select({ id: aiAgentPausedChats.id })
              .from(aiAgentPausedChats)
              .where(and(
                eq(aiAgentPausedChats.agentId, agent.id),
                eq(aiAgentPausedChats.phoneNumber, phone),
              ))

            if (existing.length > 0) {
              await db.update(aiAgentPausedChats).set({ pausedAt: new Date(), resumeAt })
                .where(and(
                  eq(aiAgentPausedChats.agentId, agent.id),
                  eq(aiAgentPausedChats.phoneNumber, phone),
                ))
            } else {
              await db.insert(aiAgentPausedChats).values({
                agentId:     agent.id,
                phoneNumber: phone,
                resumeAt,
              })
            }
            return
          }

          // Incoming message: enqueue AI reply
          const sessionName = makeSessionName(userId, instanceId)
          await getAiReplyQueue().add('reply', {
            agentId:     agent.id,
            instanceId,
            userId,
            sessionName,
            phone,
            name,
            text,  // null for non-text
            recordedAt,
          })
        } catch (err) {
          console.error('[Baileys] AI agent enqueue error:', err)
        }
      })()
    }
  })
}

// ── getSessionStatus ──────────────────────────────────────────────────
export function getSessionStatus(sessionName: string): {
  status: SessionStatus
  qrDataUrl?: string
} {
  const e = sessions.get(sessionName)
  if (!e) return { status: 'disconnected' }
  return { status: e.status, qrDataUrl: e.qrDataUrl }
}

// ── closeSession ──────────────────────────────────────────────────────
export async function closeSession(sessionName: string): Promise<void> {
  const e = sessions.get(sessionName)
  if (e) {
    try { e.socket.end(undefined) } catch {}
    sessions.delete(sessionName)
    await updateDBStatus(e.instanceId, 'disconnected')
  }
}

// ── sendMessage ───────────────────────────────────────────────────────
export async function sendMessage(
  sessionName: string,
  phone: string,
  message: string,
): Promise<void> {
  const e = sessions.get(sessionName)
  if (!e || e.status !== 'connected') {
    throw new Error(`Session ${sessionName} tidak connected`)
  }
  // Format JID: 628xxx@s.whatsapp.net
  const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`
  await e.socket.sendMessage(jid, { text: message })
}

// ── restoreSessions ───────────────────────────────────────────────────
export async function restoreSessions(): Promise<void> {
  const { ne } = await import('drizzle-orm')

  const activeInstances = await db
    .select({ sessionName: instances.sessionName, userId: instances.userId, id: instances.id })
    .from(instances)
    .where(ne(instances.status, 'disconnected'))

  if (activeInstances.length === 0) return

  console.log(`[Baileys] Restoring ${activeInstances.length} session(s)...`)

  for (const inst of activeInstances) {
    try {
      await startSession(inst.sessionName, inst.userId, inst.id)
    } catch (e) {
      console.error(`[Baileys] Restore ${inst.sessionName}:`, e)
    }
    // Delay antar session agar tidak spike CPU
    await new Promise((r) => setTimeout(r, 2_000))
  }

  console.log('[Baileys] Session restore complete')
}

// ── getAllSessions ─────────────────────────────────────────────────────
export function getAllSessions(): Array<{
  sessionName: string
  status: SessionStatus
  instanceId: string
  userId: string
}> {
  return [...sessions.entries()].map(([sessionName, e]) => ({
    sessionName,
    status:     e.status,
    instanceId: e.instanceId,
    userId:     e.userId,
  }))
}
