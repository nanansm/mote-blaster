'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { Zap } from 'lucide-react'

export function UpgradeBanner({ dailyUsed, dailyLimit }: { dailyUsed: number; dailyLimit: number }) {
  const [loading, setLoading] = useState(false)
  const pct = Math.min(100, (dailyUsed / dailyLimit) * 100)

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/billing/subscribe', { method: 'POST' })
      const data = await res.json()
      if (data.paymentUrl) window.open(data.paymentUrl, '_blank')
      else toast.error(data.error ?? 'Gagal membuat link pembayaran')
    } catch {
      toast.error('Gagal terhubung ke server')
    } finally {
      setLoading(false)
    }
  }

  if (pct < 80) return null

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-800">
          {dailyUsed}/{dailyLimit} pesan terkirim hari ini ({pct.toFixed(0)}%)
        </p>
        <div className="mt-1 h-2 bg-amber-100 rounded-full overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <button
        onClick={handleUpgrade}
        disabled={loading}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
      >
        <Zap size={14} />
        {loading ? 'Loading...' : 'Upgrade ke Pro'}
      </button>
    </div>
  )
}
