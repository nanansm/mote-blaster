import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { aiAgents, aiAgentPausedChats } from '@/lib/db/schema'
import { eq, and, gt } from 'drizzle-orm'

export async function GET() {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const [agent] = await db
      .select({ id: aiAgents.id })
      .from(aiAgents)
      .where(eq(aiAgents.userId, session.user.id))

    if (!agent) return Response.json({ data: [] })

    const now = new Date()
    const paused = await db
      .select({
        id:          aiAgentPausedChats.id,
        phoneNumber: aiAgentPausedChats.phoneNumber,
        pausedAt:    aiAgentPausedChats.pausedAt,
        resumeAt:    aiAgentPausedChats.resumeAt,
      })
      .from(aiAgentPausedChats)
      .where(and(
        eq(aiAgentPausedChats.agentId, agent.id),
        gt(aiAgentPausedChats.resumeAt, now),
      ))

    return Response.json({ data: paused })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
