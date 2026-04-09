import { NextRequest } from 'next/server'
import { requireOwner } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { users, instances, subscriptions } from '@/lib/db/schema'
import { eq, ilike, or, count, sql, desc, and } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const session = await requireOwner()
    if (session instanceof Response) return session

    const { searchParams } = new URL(req.url)
    const plan   = searchParams.get('plan')
    const search = searchParams.get('search') || ''
    const page   = Math.max(1, Number(searchParams.get('page') || '1'))
    const limit  = 20
    const offset = (page - 1) * limit

    // Subquery: hitung instance per user
    const instanceCountSq = db
      .select({
        userId:        instances.userId,
        instanceCount: count(instances.id).as('instance_count'),
      })
      .from(instances)
      .groupBy(instances.userId)
      .as('instance_counts')

    // Build kondisi WHERE
    const conditions: any[] = []
    if (plan === 'free') conditions.push(eq(users.plan, 'free'))
    if (plan === 'pro')  conditions.push(eq(users.plan, 'pro'))
    if (search) conditions.push(
      or(
        ilike(users.name,  `%${search}%`),
        ilike(users.email, `%${search}%`),
      )
    )
    conditions.push(eq(users.role, 'user'))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db
      .select({
        id:            users.id,
        name:          users.name,
        email:         users.email,
        image:         users.image,
        plan:          users.plan,
        createdAt:     users.createdAt,
        instanceCount: sql<number>`COALESCE(${instanceCountSq.instanceCount}, 0)`,
        subscriptionStatus:    subscriptions.status,
        subscriptionAmount:    subscriptions.amount,
        subscriptionPeriodEnd: subscriptions.currentPeriodEnd,
        subscriptionCancelled: subscriptions.cancelledAt,
      })
      .from(users)
      .leftJoin(instanceCountSq, eq(users.id, instanceCountSq.userId))
      .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset)

    const [{ total }] = await db
      .select({ total: count(users.id) })
      .from(users)
      .where(whereClause)

    const [freeCount]  = await db.select({ n: count() }).from(users).where(and(eq(users.plan, 'free'), eq(users.role, 'user')))
    const [proCount]   = await db.select({ n: count() }).from(users).where(and(eq(users.plan, 'pro'),  eq(users.role, 'user')))
    const [totalCount] = await db.select({ n: count() }).from(users).where(eq(users.role, 'user'))

    return Response.json({
      summary: {
        total: totalCount.n,
        free:  freeCount.n,
        pro:   proCount.n,
      },
      data: rows,
      pagination: {
        page,
        limit,
        total:      Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
