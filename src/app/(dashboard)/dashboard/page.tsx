'use client'
import { useQuery } from '@tanstack/react-query'
import { StatCard } from '@/components/shared/StatCard'
import { UpgradeBanner } from '@/components/shared/UpgradeBanner'
import { MessageSquare, AlertCircle, Smartphone, Megaphone, Send, BarChart2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { authClient } from '@/lib/auth-client'

export default function DashboardPage() {
  const { data: session } = authClient.useSession()
  const firstName = session?.user?.name?.split(' ')[0] ?? 'Kamu'

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard')
      return res.json()
    },
    refetchInterval: 30_000,
  })

  if (isLoading) return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="h-8 bg-slate-100 rounded animate-pulse w-56" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  const d = data ?? {}
  const plan = d.dailyRemaining !== null ? 'free' : 'pro'

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">Halo, {firstName}! 👋</h1>
        <p className="text-sm text-slate-500 mt-0.5">Selamat datang di dashboard Mote Blaster</p>
      </div>

      {/* Upgrade Banner */}
      {plan === 'free' && d.dailyRemaining !== undefined && (
        <UpgradeBanner dailyUsed={d.dailySentCount ?? 0} dailyLimit={50} />
      )}

      {/* Highlight cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl bg-amber-400 text-[#1a3a2a] p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/30 rounded-xl flex items-center justify-center shrink-0">
            <Send size={24} />
          </div>
          <div>
            <p className="text-[#1a3a2a]/70 text-sm font-medium">Pesan Terkirim Hari Ini</p>
            <p className="text-3xl font-bold mt-0.5">{(d.sentToday ?? 0).toLocaleString()}</p>
            <p className="text-[#1a3a2a]/60 text-xs mt-0.5">dari batas harian plan kamu</p>
          </div>
        </div>
        <div className="rounded-xl bg-[#1a3a2a] text-white p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <BarChart2 size={24} />
          </div>
          <div>
            <p className="text-white/70 text-sm font-medium">Pesan Terkirim 30 Hari</p>
            <p className="text-3xl font-bold mt-0.5">{(d.sentLast30Days ?? 0).toLocaleString()}</p>
            <p className="text-white/60 text-xs mt-0.5">total pesan berhasil terkirim</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Pesan Terkirim (Bulan Ini)" value={(d.sentCount ?? 0).toLocaleString()} icon={<MessageSquare size={18} />} color="blue" />
        <StatCard title="Pesan Gagal"        value={(d.failedCount ?? 0).toLocaleString()}  icon={<AlertCircle size={18} />} color="red" />
        <StatCard title="Nomor WA Aktif"     value={d.activeInstances ?? 0}                 icon={<Smartphone size={18} />}  color="green" />
        <StatCard title="Pengiriman Aktif"   value={d.activeCampaigns ?? 0}                 icon={<Megaphone size={18} />}   color="amber" />
      </div>

      {/* Daily chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-5">Grafik Pesan Terkirim (30 Hari Terakhir)</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={d.dailyChart ?? []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="sent" stroke="#d97706" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
