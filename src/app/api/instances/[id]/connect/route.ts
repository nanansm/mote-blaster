import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { instances } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { startSession, getSessionStatus } from '@/lib/baileys'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const { id } = await params
    const [row] = await db.select().from(instances)
      .where(and(eq(instances.id, id), eq(instances.userId, session.user.id)))
    if (!row) return Response.json({ error: 'Not found' }, { status: 404 })

    // Mulai session (non-blocking — Baileys akan emit events)
    startSession(row.sessionName, session.user.id, id).catch((e) =>
      console.error(`[Baileys] startSession error:`, e)
    )

    // Tunggu sebentar lalu baca status (QR biasanya ready dalam ~2 detik)
    await new Promise((r) => setTimeout(r, 2500))

    const { status, qrDataUrl } = getSessionStatus(row.sessionName)

    return Response.json({ status, qrCode: qrDataUrl ?? null })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
