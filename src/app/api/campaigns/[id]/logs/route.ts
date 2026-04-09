import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { campaigns, messageLogs } from '@/lib/db/schema'
import { eq, and, count, desc } from 'drizzle-orm'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const page   = Math.max(1, Number(searchParams.get('page') || '1'))
    const limit  = Number(searchParams.get('limit') || '20')
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    // Verify campaign ownership
    const [campaign] = await db.select({ id: campaigns.id }).from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, session.user.id)))
    if (!campaign) return Response.json({ error: 'Not found' }, { status: 404 })

    const conditions = [eq(messageLogs.campaignId, id)]
    if (status) conditions.push(eq(messageLogs.status, status as any))

    const data = await db.select().from(messageLogs)
      .where(and(...conditions))
      .orderBy(desc(messageLogs.createdAt))
      .limit(limit).offset(offset)

    const [{ total }] = await db.select({ total: count() }).from(messageLogs).where(and(...conditions))

    return Response.json({ data, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
