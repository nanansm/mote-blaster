'use client'
import { useQuery } from '@tanstack/react-query'
import { StatCard } from '@/components/shared/StatCard'
import { formatRupiah } from '@/lib/utils'
import { Users, UserCheck, CreditCard, MessageSquare, Megaphone } from 'lucide-react'

export default function AdminPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/stats')
      return res.json()
    },
    refetchInterval: 60_000,
  })

  if (isLoading) return (
    <div className="space-y-5 md:space-y-6">
      <div className="h-8 bg-slate-200 rounded animate-pulse w-40" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-24 md:h-28 bg-slate-100 rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  const d = data ?? {}

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="text-xl md:text-2xl font-semibold text-slate-800">Admin Overview</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <StatCard title="Total Users"    value={d.totalUsers ?? 0}                     icon={<Users size={20} />}       color="slate" />
        <StatCard title="Free Users"     value={d.freeUsers ?? 0}                      icon={<Users size={20} />}       color="slate" />
        <StatCard title="Pro Users"      value={d.proUsers ?? 0}                       icon={<UserCheck size={20} />}   color="blue" />
        <StatCard title="MRR"            value={formatRupiah(d.mrr ?? 0)}              icon={<CreditCard size={20} />}  color="green" />
        <StatCard title="Total Messages" value={(d.totalMessagesSent ?? 0).toLocaleString()} icon={<MessageSquare size={20} />} color="blue" />
        <StatCard title="Total Campaigns" value={d.totalCampaigns ?? 0}               icon={<Megaphone size={20} />}   color="slate" />
      </div>

      {/* Recent Signups */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Recent Signups</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 md:px-6 py-3 text-slate-500 font-medium">User</th>
                <th className="text-left px-4 md:px-6 py-3 text-slate-500 font-medium">Plan</th>
                <th className="text-left px-4 md:px-6 py-3 text-slate-500 font-medium hidden md:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody>
              {(d.recentSignups ?? []).map((u: any) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 md:px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 truncate">{u.name}</p>
                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.plan === 'pro' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                      {u.plan === 'pro' ? '⭐ Pro' : 'Free'}
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-3 text-xs text-slate-400 hidden md:table-cell">
                    {new Date(u.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
