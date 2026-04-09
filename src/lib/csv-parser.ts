import Papa from 'papaparse'
import { normalizePhone } from './utils'

export function parseCSVContent(content: string) {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true, skipEmptyLines: true,
    transformHeader: h => h.toLowerCase().trim(),
  })
  if (!result.data[0] || !('phone' in result.data[0])) throw new Error("CSV harus punya kolom 'phone'")
  return result.data.filter(r => r.phone?.trim()).map(r => ({ ...r, phone: normalizePhone(r.phone) }))
}
