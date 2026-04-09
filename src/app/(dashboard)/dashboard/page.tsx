'use client'
import { useQuery } from '@tanstack/react-query'
import { StatCard } from '@/components/shared/StatCard'
import { UpgradeBanner } from '@/components/shared/UpgradeBanner'
import { MessageSquare, AlertCircle, Smartphone, Megaphone } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard')
      return res.json()
    },
    refetchInterval: 30_000,
  })

  if (isLoading) return (
    <div className="p-8 space-y-6">
      <div className="h-8 bg-slate-100 rounded animate-pulse w-48" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  const d = data ?? {}
  const plan = d.dailyRemaining !== null ? 'free' : 'pro'

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>

      {/* Upgrade Banner */}
      {plan === 'free' && d.dailyRemaining !== undefined && (
        <UpgradeBanner dailyUsed={d.dailySentCount ?? 0} dailyLimit={50} />
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Pesan Terkirim (Bulan Ini)" value={(d.sentCount ?? 0).toLocaleString()} icon={<MessageSquare size={20} />} color="blue" />
        <StatCard title="Pesan Gagal"  value={(d.failedCount ?? 0).toLocaleString()}  icon={<AlertCircle size={20} />} color="red" />
        <StatCard title="Instance Aktif" value={d.activeInstances ?? 0} icon={<Smartphone size={20} />} color="green" />
        <StatCard title="Campaign Aktif" value={d.activeCampaigns ?? 0} icon={<Megaphone size={20} />} color="slate" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily sent */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Pesan Terkirim (30 Hari)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={d.dailyChart ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="sent" stroke="#2563EB" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Campaign by status */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Campaign by Status</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d.campaignChart ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563EB" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
