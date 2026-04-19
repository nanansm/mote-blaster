import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { campaigns } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getBlastQueue } from '@/lib/queue'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const { id } = await params
    const [campaign] = await db.select().from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, session.user.id)))
    if (!campaign) return Response.json({ error: 'Not found' }, { status: 404 })

    await db.update(campaigns).set({ status: 'paused', updatedAt: new Date() }).where(eq(campaigns.id, id))

    // Drain queued jobs for this campaign
    try {
      const queue = getBlastQueue()
      const jobs = await queue.getJobs(['waiting', 'delayed', 'prioritized'])
      const campaignJobs = jobs.filter(j => j.data?.campaignId === id)
      await Promise.allSettled(campaignJobs.map(j => j.remove()))
    } catch (e) {
      console.error('[Pause] Failed to drain queue jobs:', e)
    }

    return Response.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
