import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { campaigns, contacts, messageLogs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const { id } = await params
    const [row] = await db.select().from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, session.user.id)))
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ data: row })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const { id } = await params
    const [row] = await db.select().from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, session.user.id)))
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 })
    if (row.status !== 'draft') return Response.json({ error: 'Hanya campaign draft yang bisa diubah' }, { status: 400 })

    const body = await req.json()
    const [updated] = await db.update(campaigns).set({
      name:            body.name ?? row.name,
      messageTemplate: body.messageTemplate ?? row.messageTemplate,
      instanceId:      body.instanceId ?? row.instanceId,
      updatedAt:       new Date(),
    }).where(eq(campaigns.id, id)).returning()

    return Response.json({ data: updated })
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
    const [row] = await db.select().from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, session.user.id)))
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 })

    await db.delete(campaigns).where(eq(campaigns.id, id))
    return Response.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
