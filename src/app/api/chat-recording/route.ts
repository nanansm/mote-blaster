import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { users, instances, chatRecordingConfigs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { isProActive } from '@/lib/plan-helpers'

async function checkPro(userId: string) {
  const [u] = await db.select({ plan: users.plan, proExpiresAt: users.proExpiresAt })
    .from(users).where(eq(users.id, userId))
  return u && isProActive(u)
}

export async function GET() {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const pro = await checkPro(session.user.id)
    if (!pro) return Response.json({ error: 'Fitur ini hanya tersedia untuk paket Pro aktif' }, { status: 403 })

    const configs = await db
      .select({
        id:            chatRecordingConfigs.id,
        instanceId:    chatRecordingConfigs.instanceId,
        instanceName:  instances.name,
        spreadsheetId: chatRecordingConfigs.spreadsheetId,
        sheetName:     chatRecordingConfigs.sheetName,
        isActive:      chatRecordingConfigs.isActive,
        createdAt:     chatRecordingConfigs.createdAt,
      })
      .from(chatRecordingConfigs)
      .leftJoin(instances, eq(chatRecordingConfigs.instanceId, instances.id))
      .where(eq(chatRecordingConfigs.userId, session.user.id))

    return Response.json({ data: configs })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const pro = await checkPro(session.user.id)
    if (!pro) return Response.json({ error: 'Fitur ini hanya tersedia untuk paket Pro aktif' }, { status: 403 })

    const { instanceId, spreadsheetId, sheetName } = await req.json()
    if (!instanceId || !spreadsheetId) {
      return Response.json({ error: 'instanceId dan spreadsheetId wajib diisi' }, { status: 400 })
    }

    // Verify instance belongs to user
    const [inst] = await db.select({ id: instances.id })
      .from(instances)
      .where(and(eq(instances.id, instanceId), eq(instances.userId, session.user.id)))
    if (!inst) return Response.json({ error: 'Instance tidak ditemukan' }, { status: 404 })

    const [config] = await db.insert(chatRecordingConfigs).values({
      userId:        session.user.id,
      instanceId,
      spreadsheetId: spreadsheetId.trim(),
      sheetName:     (sheetName?.trim() || 'Sheet1'),
      isActive:      true,
    }).returning()

    return Response.json({ data: config }, { status: 201 })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
