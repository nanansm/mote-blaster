import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { instances } from '@/lib/db/schema'
import { eq, count } from 'drizzle-orm'
import { makeSessionName } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const data = await db.select().from(instances).where(eq(instances.userId, session.user.id))
    return Response.json({ data })
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

    const [{ total }] = await db.select({ total: count() }).from(instances).where(eq(instances.userId, userId))
    const MAX_FREE_INSTANCES = 1
    const maxInstances = isPro ? 5 : MAX_FREE_INSTANCES
    if (Number(total) >= maxInstances) {
      if (!isPro) {
        return Response.json({ error: 'Paket Free hanya bisa menghubungkan 1 nomor WhatsApp. Upgrade ke Pro untuk lebih banyak.' }, { status: 403 })
      }
      return Response.json({ error: `Maksimal ${maxInstances} instance untuk plan Anda` }, { status: 400 })
    }

    const body = await req.json()
    const name = (body.name as string)?.trim()
    if (!name) return Response.json({ error: 'Nama instance wajib diisi' }, { status: 400 })

    const [created] = await db.insert(instances).values({
      userId,
      name,
      sessionName: makeSessionName(userId, crypto.randomUUID()),
    }).returning()

    return Response.json({ data: created }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
