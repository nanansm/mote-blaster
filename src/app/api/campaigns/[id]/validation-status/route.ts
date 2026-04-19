import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { campaigns, contacts } from '@/lib/db/schema'
import { eq, and, count, isNull, isNotNull } from 'drizzle-orm'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const { id } = await params
    const [campaign] = await db.select({ id: campaigns.id })
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, session.user.id)))
    if (!campaign) return Response.json({ error: 'Not found' }, { status: 404 })

    const [{ total }] = await db.select({ total: count() })
      .from(contacts).where(eq(contacts.campaignId, id))

    const [{ valid }] = await db.select({ valid: count() })
      .from(contacts)
      .where(and(eq(contacts.campaignId, id), eq(contacts.isValidWa, true)))

    const [{ invalid }] = await db.select({ invalid: count() })
      .from(contacts)
      .where(and(eq(contacts.campaignId, id), eq(contacts.isValidWa, false)))

    const [{ pending }] = await db.select({ pending: count() })
      .from(contacts)
      .where(and(eq(contacts.campaignId, id), isNull(contacts.isValidWa)))

    const totalNum    = Number(total)
    const validNum    = Number(valid)
    const invalidNum  = Number(invalid)
    const pendingNum  = Number(pending)

    return Response.json({
      total:     totalNum,
      validated: validNum + invalidNum,
      valid:     validNum,
      invalid:   invalidNum,
      pending:   pendingNum,
    })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
