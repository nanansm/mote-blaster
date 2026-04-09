import { NextRequest } from 'next/server'
import { requireOwner } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { subscriptions, users } from '@/lib/db/schema'
import { eq, sql, desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const session = await requireOwner()
    if (session instanceof Response) return session

    const [mrrResult] = await db.select({ mrr: sql<number>`COALESCE(SUM(${subscriptions.amount}), 0)` })
      .from(subscriptions).where(eq(subscriptions.status, 'active'))

    const subList = await db
      .select({
        id:                   subscriptions.id,
        userId:               subscriptions.userId,
        status:               subscriptions.status,
        amount:               subscriptions.amount,
        currency:             subscriptions.currency,
        currentPeriodStart:   subscriptions.currentPeriodStart,
        currentPeriodEnd:     subscriptions.currentPeriodEnd,
        cancelledAt:          subscriptions.cancelledAt,
        createdAt:            subscriptions.createdAt,
        userName:             users.name,
        userEmail:            users.email,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .orderBy(desc(subscriptions.createdAt))

    return Response.json({ mrr: Number(mrrResult.mrr), subscriptions: subList })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
