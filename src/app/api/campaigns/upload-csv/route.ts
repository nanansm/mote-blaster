import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { parseCSVContent } from '@/lib/csv-parser'

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return Response.json({ error: 'File tidak ditemukan' }, { status: 400 })

    const content = await file.text()
    const rows    = parseCSVContent(content)
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
