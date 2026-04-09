import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { users, subscriptions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { xendit } from '@/lib/xendit'

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('x-callback-token') ?? ''
    if (!xendit.verifyToken(token)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { event, data } = body

    if (event === 'invoice.paid') {
      const userId = data?.metadata?.userId
      if (!userId) return Response.json({ ok: true })

      await db.update(users).set({ plan: 'pro', updatedAt: new Date() }).where(eq(users.id, userId))

      await db.insert(subscriptions).values({
        userId,
        xenditSubscriptionId: data.recurring_plan_id ?? data.id,
        xenditCustomerId:     data.customer_id ?? '',
        status:               'active',
        amount:               data.amount,
        currency:             data.currency ?? 'IDR',
        currentPeriodStart:   new Date(data.paid_at ?? Date.now()),
        currentPeriodEnd:     new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }).onConflictDoUpdate({
        target: [subscriptions.userId],
        set:    { status: 'active', currentPeriodStart: new Date(data.paid_at ?? Date.now()), currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), updatedAt: new Date() },
      })
    }

    if (event === 'invoice.expired') {
      const userId = data?.metadata?.userId
      if (userId) {
        await db.update(subscriptions).set({ status: 'expired', updatedAt: new Date() }).where(eq(subscriptions.userId, userId))
      }
    }

    if (event === 'subscription.cancelled' || event === 'recurring_plan.deactivated') {
      const userId = data?.metadata?.userId
      if (userId) {
        await db.update(users).set({ plan: 'free', updatedAt: new Date() }).where(eq(users.id, userId))
        await db.update(subscriptions).set({ status: 'cancelled', cancelledAt: new Date(), updatedAt: new Date() }).where(eq(subscriptions.userId, userId))
      }
    }

    return Response.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    console.error('[Webhook]', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
