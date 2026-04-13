import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { users, aiAgents } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { isProActive } from '@/lib/plan-helpers'

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const [u] = await db
      .select({ plan: users.plan, proExpiresAt: users.proExpiresAt })
      .from(users).where(eq(users.id, session.user.id))
    if (!u || !isProActive(u)) {
      return Response.json({ error: 'Fitur ini hanya tersedia untuk paket Pro aktif' }, { status: 403 })
    }

    const { isActive } = await req.json() as { isActive: boolean }

    const [agent] = await db
      .select({ id: aiAgents.id })
      .from(aiAgents)
      .where(eq(aiAgents.userId, session.user.id))

    if (!agent) {
      return Response.json({ error: 'AI Agent belum dikonfigurasi' }, { status: 404 })
    }

    const [updated] = await db
      .update(aiAgents)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(aiAgents.id, agent.id))
      .returning()

    return Response.json({ data: { isActive: updated.isActive } })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
