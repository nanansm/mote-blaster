import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { instances } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { closeSession, getSessionStatus } from '@/lib/baileys'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const { id } = await params
    const [row] = await db.select().from(instances)
      .where(and(eq(instances.id, id), eq(instances.userId, session.user.id)))
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 })

    // Enrichment: status dari Baileys in-memory (lebih real-time dari DB)
    const live = getSessionStatus(row.sessionName)
    const data = { ...row, liveStatus: live.status }

    return Response.json({ data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const { id } = await params
    const [row] = await db.select().from(instances)
      .where(and(eq(instances.id, id), eq(instances.userId, session.user.id)))
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 })

    await closeSession(row.sessionName)
    await db.delete(instances).where(eq(instances.id, id))

    return Response.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
