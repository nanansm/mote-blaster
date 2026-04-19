import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { users, chatRecordingConfigs, chatRecordingLogs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { isProActive } from '@/lib/plan-helpers'

async function checkPro(userId: string) {
  const [u] = await db.select({ plan: users.plan, proExpiresAt: users.proExpiresAt })
    .from(users).where(eq(users.id, userId))
  return u && isProActive(u)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const pro = await checkPro(session.user.id)
    if (!pro) return Response.json({ error: 'Fitur ini hanya tersedia untuk paket Pro aktif' }, { status: 403 })

    const { id } = await params
    const body = await req.json()

    const updateData: Partial<typeof chatRecordingConfigs.$inferInsert> = { updatedAt: new Date() }
    if (typeof body.isActive === 'boolean') updateData.isActive = body.isActive
    if (typeof body.spreadsheetId === 'string') updateData.spreadsheetId = body.spreadsheetId.trim()
    if (typeof body.sheetName === 'string') updateData.sheetName = body.sheetName.trim()

    const [updated] = await db
      .update(chatRecordingConfigs)
      .set(updateData)
      .where(and(eq(chatRecordingConfigs.id, id), eq(chatRecordingConfigs.userId, session.user.id)))
      .returning()

    if (!updated) return Response.json({ error: 'Config tidak ditemukan' }, { status: 404 })

    return Response.json({ data: updated })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const pro = await checkPro(session.user.id)
    if (!pro) return Response.json({ error: 'Fitur ini hanya tersedia untuk paket Pro aktif' }, { status: 403 })

    const { id } = await params

    // Verify ownership before deleting
    const [existing] = await db.select({ id: chatRecordingConfigs.id })
      .from(chatRecordingConfigs)
      .where(and(eq(chatRecordingConfigs.id, id), eq(chatRecordingConfigs.userId, session.user.id)))
    if (!existing) return Response.json({ error: 'Config tidak ditemukan' }, { status: 404 })

    // Use transaction: delete logs first (FK constraint), then config
    await db.transaction(async (tx) => {
      await tx.delete(chatRecordingLogs).where(eq(chatRecordingLogs.configId, id))
      await tx.delete(chatRecordingConfigs).where(eq(chatRecordingConfigs.id, id))
    })

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
