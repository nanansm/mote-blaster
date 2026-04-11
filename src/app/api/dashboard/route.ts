import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { campaigns, messageLogs, instances, dailyUsage } from '@/lib/db/schema'
import { eq, and, gte, sql, count, inArray } from 'drizzle-orm'
import { getTodayWIB } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const userId = session.user.id
    const isPro  = (session.user as any).plan === 'pro'

    // Awal bulan ini
    const now       = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Sent & failed bulan ini
    const [monthlySent] = await db
      .select({ total: sql<number>`COALESCE(SUM(${campaigns.sentCount}), 0)` })
      .from(campaigns)
      .where(and(eq(campaigns.userId, userId), gte(campaigns.createdAt, monthStart)))

    const [monthlyFailed] = await db
      .select({ total: sql<number>`COALESCE(SUM(${campaigns.failedCount}), 0)` })
      .from(campaigns)
      .where(and(eq(campaigns.userId, userId), gte(campaigns.createdAt, monthStart)))

    // Active instances
    const [activeInstances] = await db
      .select({ count: count() })
      .from(instances)
      .where(and(eq(instances.userId, userId), eq(instances.status, 'connected')))

    // Active campaigns
    const [activeCampaigns] = await db
      .select({ count: count() })
      .from(campaigns)
      .where(and(eq(campaigns.userId, userId), inArray(campaigns.status, ['running', 'pending'])))

    // Daily usage
    const today = getTodayWIB()
    const [todayUsage] = await db
      .select({ sentCount: dailyUsage.sentCount })
      .from(dailyUsage)
      .where(and(eq(dailyUsage.userId, userId), eq(dailyUsage.date, today)))

    const dailySentCount  = todayUsage?.sentCount ?? 0
    const dailyLimit      = isPro ? Infinity : Number(process.env.FREE_PLAN_DAILY_LIMIT || 50)
    const dailyRemaining  = isPro ? null : Math.max(0, dailyLimit - dailySentCount)

    // Daily chart (30 hari terakhir) dari daily_usage
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

    const dailyRows = await db
      .select({ date: dailyUsage.date, sent: dailyUsage.sentCount })
      .from(dailyUsage)
      .where(and(eq(dailyUsage.userId, userId), gte(dailyUsage.date, thirtyDaysAgoStr)))
      .orderBy(dailyUsage.date)

    const dailyChart = dailyRows.map(r => ({ date: r.date, sent: r.sent, failed: 0 }))

    const sentLast30Days = dailyRows.reduce((sum, r) => sum + r.sent, 0)

    return Response.json({
      sentCount:       Number(monthlySent.total),
      failedCount:     Number(monthlyFailed.total),
      activeInstances: activeInstances.count,
      activeCampaigns: activeCampaigns.count,
      dailySentCount,
      dailyRemaining,
      sentToday:       dailySentCount,
      sentLast30Days,
      dailyChart,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    console.error('[API /dashboard]', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
