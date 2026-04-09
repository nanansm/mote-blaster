import { NextRequest } from 'next/server'
import { requireOwner } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, ilike, or, count, desc, and } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const session = await requireOwner()
    if (session instanceof Response) return session

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const page   = Math.max(1, Number(searchParams.get('page') || '1'))
    const limit  = 20
    const offset = (page - 1) * limit

    const conditions: any[] = [eq(users.role, 'user')]
    if (search) conditions.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`)))

    const data = await db.select().from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt))
      .limit(limit).offset(offset)

    const [{ total }] = await db.select({ total: count() }).from(users).where(and(...conditions))

    return Response.json({
      data,
      pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
