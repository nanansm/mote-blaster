import { Worker, type Job } from 'bullmq'
import { getRedis } from './index'
import { db } from '@/lib/db'
import { messageLogs, campaigns, dailyUsage } from '@/lib/db/schema'
import { eq, and, sql, inArray, count } from 'drizzle-orm'
import { renderTemplate } from '@/lib/template-engine'
import { normalizePhone, getTodayWIB } from '@/lib/utils'
import { sendMessage } from '@/lib/baileys'

const g = global as typeof global & { _worker?: Worker }

async function checkAndCompleteCampaign(campaignId: string) {
  const [campaign] = await db.select({ contactsCount: campaigns.contactsCount })
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
  if (!campaign) return

  const [{ processed }] = await db
    .select({ processed: count() })
    .from(messageLogs)
    .where(and(
      eq(messageLogs.campaignId, campaignId),
      inArray(messageLogs.status, ['sent', 'failed', 'skipped']),
    ))

  if (Number(processed) >= campaign.contactsCount) {
    await db.update(campaigns).set({
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(campaigns.id, campaignId))
  }
}

export interface BlastJobData {
  campaignId:      string
  contactPhone:    string
  contactName:     string | null
  variables:       Record<string, string>
  messageTemplate: string
  sessionName:     string
  userId:          string
  isPro:           boolean
}

export async function startWorker() {
  if (g._worker) return

  g._worker = new Worker<BlastJobData>('blast', async (job: Job<BlastJobData>) => {
    const { campaignId, contactPhone, contactName, variables,
            messageTemplate, sessionName, userId, isPro } = job.data

    // 1. Cek daily limit (FREE plan)
    if (!isPro) {
      const limit = Number(process.env.FREE_PLAN_DAILY_LIMIT) || 50
      const today = getTodayWIB()
      const [usage] = await db
        .select({ count: dailyUsage.sentCount })
        .from(dailyUsage)
        .where(and(eq(dailyUsage.userId, userId), eq(dailyUsage.date, today)))

      if (usage && usage.count >= limit) {
        await db.update(messageLogs)
          .set({ status: 'skipped' })
          .where(and(
            eq(messageLogs.campaignId, campaignId),
            eq(messageLogs.contactPhone, contactPhone),
          ))
        await checkAndCompleteCampaign(campaignId)
        return
      }
    }

    // 2. Render + normalisasi
    const rendered = renderTemplate(messageTemplate, {
      name: contactName || contactPhone,
      ...variables,
    })
    const phone = normalizePhone(contactPhone)

    // 3. Kirim via Baileys
    try {
      await sendMessage(sessionName, phone, rendered)

      await db.update(messageLogs).set({
        status: 'sent', renderedMessage: rendered, sentAt: new Date(),
      }).where(and(
        eq(messageLogs.campaignId, campaignId),
        eq(messageLogs.contactPhone, contactPhone),
      ))
      await db.update(campaigns).set({
        sentCount: sql`${campaigns.sentCount} + 1`, updatedAt: new Date(),
      }).where(eq(campaigns.id, campaignId))
      await checkAndCompleteCampaign(campaignId)

      const today = getTodayWIB()
      await db.insert(dailyUsage)
        .values({ userId, date: today, sentCount: 1 })
        .onConflictDoUpdate({
          target: [dailyUsage.userId, dailyUsage.date],
          set:    { sentCount: sql`${dailyUsage.sentCount} + 1` },
        })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)

      // Jika session tidak connected, jangan retry — langsung tandai failed
      const isSessionError =
        errorMsg.includes('tidak connected') ||
        errorMsg.includes('not connected') ||
        errorMsg.includes('Session') ||
        errorMsg.includes('socket') ||
        errorMsg.includes('Connection Closed') ||
        errorMsg.includes('not open')

      if (isSessionError) {
        await db.update(messageLogs).set({
          status: 'failed',
          error: 'WhatsApp tidak aktif. Hubungkan ulang instance.',
        }).where(and(
          eq(messageLogs.campaignId, campaignId),
          eq(messageLogs.contactPhone, contactPhone),
        ))
        await db.update(campaigns).set({
          failedCount: sql`${campaigns.failedCount} + 1`,
          updatedAt: new Date(),
        }).where(eq(campaigns.id, campaignId))
        await checkAndCompleteCampaign(campaignId)
        return
      }

      await db.update(messageLogs).set({ status: 'failed', error: errorMsg })
        .where(and(
          eq(messageLogs.campaignId, campaignId),
          eq(messageLogs.contactPhone, contactPhone),
        ))
      await db.update(campaigns).set({
        failedCount: sql`${campaigns.failedCount} + 1`, updatedAt: new Date(),
      }).where(eq(campaigns.id, campaignId))
      await checkAndCompleteCampaign(campaignId)
      throw err
    }
  }, {
    connection:  getRedis(),
    concurrency: 1,
  })

  g._worker.on('error', (e) => console.error('[Worker]', e))
  g._worker.on('failed', (job, e) => console.error(`[Worker] Job ${job?.id} failed:`, e.message))

  // Mark orphaned 'running' campaigns as 'paused'
  try {
    await db.update(campaigns).set({ status: 'paused' }).where(eq(campaigns.status, 'running'))
  } catch {}

  console.log('[Mote Blaster] Worker started ✓')
}
