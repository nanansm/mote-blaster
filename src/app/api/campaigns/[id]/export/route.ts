import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { campaigns, messageLogs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const { id } = await params
    const [campaign] = await db.select().from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, session.user.id)))
    if (!campaign) return Response.json({ error: 'Not found' }, { status: 404 })

    const logs = await db.select().from(messageLogs).where(eq(messageLogs.campaignId, id))

    const header = 'Phone,Name,Status,SentAt,Error\n'
    const rows = logs.map(l =>
      [l.contactPhone, l.contactName ?? '', l.status, l.sentAt?.toISOString() ?? '', l.error ?? '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n')

    return new Response(header + rows, {
      headers: {
        'Content-Type':        'text/csv',
        'Content-Disposition': `attachment; filename="campaign-${id}-logs.csv"`,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
