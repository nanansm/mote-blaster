import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { subscriptions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { xendit } from '@/lib/xendit'

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, session.user.id))
    if (!sub) return Response.json({ error: 'Tidak ada subscription aktif' }, { status: 404 })

    await xendit.cancelSubscription(sub.xenditSubscriptionId)
    await db.update(subscriptions).set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id))

    return Response.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
