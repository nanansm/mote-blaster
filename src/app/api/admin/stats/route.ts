import { NextRequest } from 'next/server'
import { requireOwner } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { users, campaigns, messageLogs, subscriptions } from '@/lib/db/schema'
import { eq, count, sql, desc, gte, and } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const session = await requireOwner()
    if (session instanceof Response) return session

    const [totalUsers]  = await db.select({ n: count() }).from(users).where(eq(users.role, 'user'))
    const [freeUsers]   = await db.select({ n: count() }).from(users).where(and(eq(users.role, 'user'), eq(users.plan, 'free')))
    const [proUsers]    = await db.select({ n: count() }).from(users).where(and(eq(users.role, 'user'), eq(users.plan, 'pro')))
    const [totalCampaigns] = await db.select({ n: count() }).from(campaigns)
    const [totalMessages]  = await db.select({ total: sql<number>`COALESCE(SUM(${campaigns.sentCount}), 0)` }).from(campaigns)

    // MRR
    const [mrrResult] = await db.select({ mrr: sql<number>`COALESCE(SUM(${subscriptions.amount}), 0)` })
      .from(subscriptions).where(eq(subscriptions.status, 'active'))

    // Active users this month (had at least 1 campaign in current month)
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const [activeUsers] = await db.select({ n: sql<number>`COUNT(DISTINCT ${campaigns.userId})` })
      .from(campaigns).where(gte(campaigns.createdAt, monthStart))

    // Recent signups
    const recentSignups = await db.select().from(users).where(eq(users.role, 'user'))
      .orderBy(desc(users.createdAt)).limit(10)

    return Response.json({
      totalUsers:          totalUsers.n,
      freeUsers:           freeUsers.n,
      proUsers:            proUsers.n,
      activeUsersThisMonth: Number(activeUsers.n),
      mrr:                 Number(mrrResult.mrr),
      totalMessagesSent:   Number(totalMessages.total),
      totalCampaigns:      totalCampaigns.n,
      recentSignups,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
