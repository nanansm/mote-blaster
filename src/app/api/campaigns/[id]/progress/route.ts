import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { campaigns, messageLogs } from '@/lib/db/schema'
import { eq, and, count } from 'drizzle-orm'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser()
  if (session instanceof Response) return session

  const { id } = await params

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
        } catch {}
      }

      const poll = async () => {
        try {
          const [campaign] = await db.select().from(campaigns)
            .where(and(eq(campaigns.id, id), eq(campaigns.userId, session.user.id)))
          if (!campaign) { controller.close(); return }

          const [sent]    = await db.select({ n: count() }).from(messageLogs).where(and(eq(messageLogs.campaignId, id), eq(messageLogs.status, 'sent')))
          const [failed]  = await db.select({ n: count() }).from(messageLogs).where(and(eq(messageLogs.campaignId, id), eq(messageLogs.status, 'failed')))
          const [pending] = await db.select({ n: count() }).from(messageLogs).where(and(eq(messageLogs.campaignId, id), eq(messageLogs.status, 'pending')))

          send({
            status:       campaign.status,
            sentCount:    campaign.sentCount,
            failedCount:  campaign.failedCount,
            totalCount:   campaign.contactsCount,
            sent:         sent.n,
            failed:       failed.n,
            pending:      pending.n,
          })

          if (['completed', 'failed'].includes(campaign.status)) {
            controller.close()
            return
          }
        } catch {
          controller.close()
          return
        }
        setTimeout(poll, 2000)
      }

      poll()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
