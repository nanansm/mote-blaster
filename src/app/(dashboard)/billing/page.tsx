'use client'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { formatRupiah } from '@/lib/utils'
import { Zap, CheckCircle } from 'lucide-react'

export default function BillingPage() {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

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
    onSuccess: () => {
      toast.success('Langganan dibatalkan')
      setShowCancelConfirm(false)
      refetch()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return <div className="p-4 md:p-8 text-slate-400">Memuat...</div>

  const { plan, subscription, dailyUsed, dailyLimit } = data ?? {}
  const isPro = plan === 'pro'

  const expireDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">Langganan</h1>
        <p className="text-sm text-slate-500 mt-0.5">Kelola paket langganan kamu</p>
      </div>

      {/* Plan saat ini */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-800">Paket Saat Ini</h2>
            <div className="flex items-center gap-2 mt-2">
              <p className={`text-2xl md:text-3xl font-bold ${isPro ? 'text-amber-600' : 'text-slate-700'}`}>
                {isPro ? '⭐ Pro' : 'Free'}
              </p>
              {isPro && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">AKTIF</span>
              )}
            </div>
          </div>
          {isPro && expireDate && (
            <div className="text-right text-sm text-slate-500">
              <p>Aktif hingga</p>
              <p className="font-semibold text-slate-700">{expireDate}</p>
            </div>
          )}
        </div>

        {/* Kuota harian */}
        {!isPro && dailyLimit && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-slate-500">Kuota Harian</span>
              <span className="font-medium text-slate-700">{dailyUsed}/{dailyLimit}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${(dailyUsed / dailyLimit) >= 0.9 ? 'bg-red-400' : 'bg-amber-400'}`}
                style={{ width: `${Math.min(100, (dailyUsed / dailyLimit) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Upgrade / Atur Langganan */}
      {!isPro ? (
        <div className="rounded-xl border-2 border-amber-400 bg-amber-400 p-5 md:p-6 text-[#1a3a2a]">
          <h2 className="text-xl font-bold flex items-center gap-2"><Zap size={20} /> Upgrade ke Pro</h2>
          <p className="text-[#1a3a2a]/70 text-sm mt-1">Kirim pesan tanpa batas, 5 nomor WhatsApp, analytics lengkap</p>
          <p className="text-2xl md:text-3xl font-bold mt-4 text-[#1a3a2a]">
            {formatRupiah(99000)}<span className="text-base font-normal text-[#1a3a2a]/70">/bulan</span>
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-[#1a3a2a]/80">
            {['Pesan tak terbatas', '5 nomor WhatsApp', 'Campaign tak terbatas', 'Google Sheets import', 'Export laporan CSV'].map(f => (
              <li key={f} className="flex items-center gap-2"><CheckCircle size={14} className="text-[#1a3a2a]" /> {f}</li>
            ))}
          </ul>
          <Button
            className="mt-6 bg-[#1a3a2a] text-amber-400 hover:bg-[#1a3a2a]/90 w-full min-h-[44px]"
            onClick={() => subscribeMutation.mutate()}
            disabled={subscribeMutation.isPending}
          >
            {subscribeMutation.isPending ? 'Memuat...' : 'Upgrade Sekarang'}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
          <h2 className="font-semibold text-slate-800 mb-1">Atur Langganan</h2>
          <p className="text-sm text-slate-500 mb-4">
            Membatalkan langganan akan menurunkan paket ke Free pada akhir periode.
            {expireDate && ` Paket Pro tetap aktif sampai ${expireDate}.`}
          </p>
          <Button
            variant="destructive"
            className="min-h-[44px]"
            onClick={() => setShowCancelConfirm(true)}
            disabled={cancelMutation.isPending}
          >
            Batalkan Langganan
          </Button>
        </div>
      )}

      {/* Konfirmasi batal langganan */}
      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Yakin batalkan langganan?</AlertDialogTitle>
            <AlertDialogDescription>
              Paket Pro kamu tetap aktif sampai{expireDate ? ` ${expireDate}` : ' akhir periode'}. Setelah itu, akun akan otomatis turun ke paket Free.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? 'Membatalkan...' : 'Ya, Batalkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
