import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { instances } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getSessionStatus } from '@/lib/baileys'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const { id } = await params
    const [row] = await db.select().from(instances)
      .where(and(eq(instances.id, id), eq(instances.userId, session.user.id)))
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 })

    const { status, qrDataUrl } = getSessionStatus(row.sessionName)

    if (!qrDataUrl) {
      return Response.json({ error: 'QR code belum tersedia', status }, { status: 404 })
    }

    return Response.json({ qrCode: qrDataUrl, status })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
