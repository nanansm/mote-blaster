import { google } from 'googleapis'

function sheets() {
  let creds = {}
  try { creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}') } catch {}
  return google.sheets({ version: 'v4',
    auth: new google.auth.GoogleAuth({ credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] }) })
}

export function extractId(url: string) {
  return url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] ?? null
}

export async function fetchSheetRows(url: string): Promise<Record<string, string>[]> {
  const id = extractId(url)
  if (!id) throw new Error('URL Google Sheets tidak valid')
  const res = await sheets().spreadsheets.values.get({ spreadsheetId: id, range: 'A:Z' })
  const rows = res.data.values as string[][] | undefined
  if (!rows || rows.length < 2) throw new Error('Sheet kosong')
  const headers = rows[0].map(h => h.toLowerCase().trim())
  if (!headers.includes('phone')) throw new Error("Sheet harus punya kolom 'phone'")
  return rows.slice(1).map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])))
}
