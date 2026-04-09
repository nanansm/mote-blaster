import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { subscriptions, dailyUsage } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getTodayWIB } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const userId = session.user.id
    const plan   = (session.user as any).plan as string

    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId))

    const today    = getTodayWIB()
    const [usage]  = await db.select({ sentCount: dailyUsage.sentCount }).from(dailyUsage)
      .where(and(eq(dailyUsage.userId, userId), eq(dailyUsage.date, today)))

    const dailyUsed  = usage?.sentCount ?? 0
    const dailyLimit = plan === 'pro' ? null : Number(process.env.FREE_PLAN_DAILY_LIMIT || 50)

    return Response.json({ plan, subscription: sub ?? null, dailyUsed, dailyLimit })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
