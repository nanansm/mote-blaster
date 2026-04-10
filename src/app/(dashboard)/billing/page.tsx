'use client'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/lib/utils'
import { Zap, CheckCircle } from 'lucide-react'

export default function BillingPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['billing'],
    queryFn: async () => {
      const res = await fetch('/api/billing')
      return res.json()
    },
  })

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/billing/subscribe', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      return d
    },
    onSuccess: (d) => {
      if (d.paymentUrl) window.open(d.paymentUrl, '_blank')
      else toast.error('Gagal mendapatkan link pembayaran')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/billing/cancel', { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
    },
    onSuccess: () => { toast.success('Subscription dibatalkan'); refetch() },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return <div className="p-4 md:p-8 text-slate-400">Loading...</div>

  const { plan, subscription, dailyUsed, dailyLimit } = data ?? {}
  const isPro = plan === 'pro'

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6 max-w-2xl">
      <h1 className="text-xl md:text-2xl font-semibold text-slate-800">Billing</h1>

      {/* Current Plan */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-800">Plan Saat Ini</h2>
            <p className={`text-2xl md:text-3xl font-bold mt-2 ${isPro ? 'text-blue-600' : 'text-slate-700'}`}>
              {isPro ? '⭐ Pro' : 'Free'}
            </p>
          </div>
          {isPro && subscription && (
            <div className="text-right text-sm text-slate-500">
              <p>Active until</p>
              <p className="font-medium text-slate-700">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          )}
        </div>

        {/* Daily usage */}
        {!isPro && dailyLimit && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-500">Kuota Harian</span>
              <span className="font-medium">{dailyUsed}/{dailyLimit}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${(dailyUsed / dailyLimit) >= 0.9 ? 'bg-red-400' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, (dailyUsed / dailyLimit) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Upgrade / Cancel */}
      {!isPro ? (
        <div className="rounded-xl border-2 border-blue-500 bg-blue-600 p-5 md:p-6 text-white">
          <h2 className="text-xl font-bold flex items-center gap-2"><Zap size={20} /> Upgrade ke Pro</h2>
          <p className="text-blue-100 text-sm mt-1">Kirim pesan tanpa batas, 5 instance, analytics lengkap</p>
          <p className="text-2xl md:text-3xl font-bold mt-4">{formatRupiah(99000)}<span className="text-base font-normal text-blue-200">/bulan</span></p>
          <ul className="mt-4 space-y-1 text-sm text-blue-100">
            {['Pesan tak terbatas', '5 instance WhatsApp', 'Campaign tak terbatas', 'Google Sheets import', 'Export laporan CSV'].map(f => (
              <li key={f} className="flex items-center gap-2"><CheckCircle size={14} /> {f}</li>
            ))}
          </ul>
          <Button
            className="mt-6 bg-white text-blue-600 hover:bg-blue-50 w-full min-h-[44px]"
            onClick={() => subscribeMutation.mutate()}
            disabled={subscribeMutation.isPending}
          >
            {subscribeMutation.isPending ? 'Loading...' : 'Upgrade Sekarang'}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
          <h2 className="font-semibold text-slate-800 mb-1">Kelola Subscription</h2>
          <p className="text-sm text-slate-500 mb-4">Membatalkan subscription akan menurunkan plan ke Free pada akhir periode.</p>
          <Button
            variant="destructive"
            className="min-h-[44px]"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? 'Membatalkan...' : 'Batalkan Subscription'}
          </Button>
        </div>
      )}
    </div>
  )
}
