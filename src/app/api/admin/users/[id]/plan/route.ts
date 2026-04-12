import { NextRequest } from 'next/server'
import { requireOwner } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireOwner()
    if (session instanceof Response) return session

    const { id } = await params
    const { plan, proExpiresAt } = await req.json()

    if (plan !== 'free' && plan !== 'pro') {
      return Response.json({ error: 'Plan must be free or pro' }, { status: 400 })
    }

    const updateData: Partial<typeof users.$inferInsert> = {
      plan,
      updatedAt: new Date(),
    }

    if (plan === 'pro') {
      // Set proExpiresAt if provided, otherwise default to 30 days
      if (proExpiresAt) {
        updateData.proExpiresAt = new Date(proExpiresAt)
      } else {
        const d = new Date()
        d.setDate(d.getDate() + 30)
        updateData.proExpiresAt = d
      }
    } else {
      // Downgrading to free: clear expiry
      updateData.proExpiresAt = null
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning({ id: users.id, name: users.name, plan: users.plan, proExpiresAt: users.proExpiresAt })

    if (!updated) {
      return Response.json({ error: 'User not found' }, { status: 404 })
    }

    return Response.json({ data: updated })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
