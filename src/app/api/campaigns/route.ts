import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { campaigns, contacts } from '@/lib/db/schema'
import { eq, and, count, inArray, desc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const { searchParams } = new URL(req.url)
    const page    = Math.max(1, Number(searchParams.get('page') || '1'))
    const limit   = Number(searchParams.get('limit') || '10')
    const status  = searchParams.get('status')
    const offset  = (page - 1) * limit

    const conditions = [eq(campaigns.userId, session.user.id)]
    if (status) conditions.push(eq(campaigns.status, status as any))

    const data = await db.select().from(campaigns)
      .where(and(...conditions))
      .orderBy(desc(campaigns.createdAt))
      .limit(limit).offset(offset)

    const [{ total }] = await db.select({ total: count() }).from(campaigns).where(and(...conditions))

    return Response.json({ data, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const userId = session.user.id
    const isPro  = (session.user as any).plan === 'pro'

    if (!isPro) {
      const MAX_FREE_CAMPAIGNS = 1
      const [{ total }] = await db.select({ total: count() }).from(campaigns)
        .where(and(eq(campaigns.userId, userId), inArray(campaigns.status, ['draft', 'pending', 'running', 'paused', 'completed'])))
      if (Number(total) >= MAX_FREE_CAMPAIGNS) {
        return Response.json({ error: 'Paket Free hanya bisa membuat 1 campaign. Upgrade ke Pro untuk campaign unlimited.' }, { status: 403 })
      }
    }

    const body = await req.json()
    // rows: array of { phone, name?, ...variables } dikirim dari wizard
    const rows: Record<string, string>[] = body.contacts ?? []

    const [created] = await db.insert(campaigns).values({
      userId,
      instanceId:      body.instanceId,
      name:            body.name,
      messageTemplate: body.messageTemplate,
      contactSource:   body.contactSource,
      contactsCount:   rows.length || body.contactsCount || 0,
    }).returning()

    // Insert contacts ke DB
    if (rows.length > 0) {
      const contactValues = rows.map((r) => {
        const { phone, name, ...rest } = r
        return {
          campaignId: created.id,
          phone,
          name:      name ?? null,
          variables: Object.keys(rest).length > 0 ? rest : null,
        }
      })
      await db.insert(contacts).values(contactValues)
    }

    return Response.json({ data: created }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
