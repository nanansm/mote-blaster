import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { campaigns, contacts, messageLogs, instances } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getBlastQueue } from '@/lib/queue'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const { id } = await params
    const userId = session.user.id
    const isPro  = (session.user as any).plan === 'pro'

    const [campaign] = await db.select().from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
    if (!campaign) return Response.json({ error: 'Not found' }, { status: 404 })
    if (!['draft', 'pending', 'paused'].includes(campaign.status)) {
      return Response.json({ error: 'Campaign tidak bisa distart dari status ini' }, { status: 400 })
    }

    const [instance] = await db.select().from(instances).where(eq(instances.id, campaign.instanceId))
    if (!instance || instance.status !== 'connected') {
      return Response.json({ error: 'Instance WhatsApp belum terconnect' }, { status: 400 })
    }

    // Get contacts
    const contactList = await db.select().from(contacts).where(eq(contacts.campaignId, id))
    if (contactList.length === 0) return Response.json({ error: 'Campaign tidak punya kontak' }, { status: 400 })

    // Update status
    await db.update(campaigns).set({ status: 'running', startedAt: new Date(), updatedAt: new Date() }).where(eq(campaigns.id, id))

    // Insert message logs (skip duplicates)
    await db.insert(messageLogs).values(
      contactList.map(c => ({
        campaignId:   id,
        contactPhone: c.phone,
        contactName:  c.name,
        status:       'pending' as const,
      }))
    ).onConflictDoNothing()

    const body = await req.json().catch(() => ({}))
    const minDelay = Math.max(15, Number(body.minDelay ?? process.env.MIN_DELAY_SECONDS ?? 15))
    const maxDelay = Math.max(minDelay + 1, Number(body.maxDelay ?? minDelay + 15))

    const getRandomDelay = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1) + min) * 1000

    const queue = getBlastQueue()

    const jobs = contactList.map((c, index) => ({
      name: 'send-message',
      data: {
        campaignId:      id,
        contactPhone:    c.phone,
        contactName:     c.name ?? null,
        variables:       (c.variables as Record<string, string>) ?? {},
        messageTemplate: campaign.messageTemplate,
        sessionName:     instance.sessionName,
        userId,
        isPro,
      },
      opts: {
        delay: index === 0 ? 0 : getRandomDelay(minDelay, maxDelay) * index,
        attempts: 3,
        backoff: { type: 'fixed' as const, delay: 15_000 },
      },
    }))

    await queue.addBulk(jobs)

    return Response.json({ jobsQueued: jobs.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
