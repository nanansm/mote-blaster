import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { fetchSheetRows } from '@/lib/google-sheets'

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const body = await req.json()
    const { url } = body
    if (!url) return Response.json({ error: 'URL Google Sheets wajib diisi' }, { status: 400 })

    const rows    = await fetchSheetRows(url)
    const columns = rows.length > 0 ? Object.keys(rows[0]) : []

    const userPlan = (session.user as any).plan
    if (userPlan === 'free' && rows.length > 50) {
      return Response.json({
        error: 'Paket Free hanya bisa mengimport maksimal 50 kontak. Upgrade ke Pro untuk import kontak unlimited.',
        limitExceeded: true,
        count: rows.length,
        limit: 50,
      }, { status: 403 })
    }

    return Response.json({
      totalCount: rows.length,
      rows,                    // semua kontak — disimpan di state wizard
      preview:    rows.slice(0, 5),
      columns,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 400 })
  }
}
