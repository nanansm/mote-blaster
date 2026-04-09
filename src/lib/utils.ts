import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export function getTodayWIB(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

export function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('0'))        d = '62' + d.slice(1)
  else if (!d.startsWith('62')) d = '62' + d
  return d
}

export function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

export function makeSessionName(userId: string, instanceId: string): string {
  return `uid_${userId.slice(0, 8)}_iid_${instanceId.slice(0, 8)}`
}
