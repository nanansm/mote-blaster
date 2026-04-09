'use client'
import { useQuery } from '@tanstack/react-query'
import { formatRupiah } from '@/lib/utils'

export default function AdminRevenuePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-revenue'],
    queryFn: async () => {
      const res = await fetch('/api/admin/revenue')
      return res.json()
    },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800">Revenue</h1>

      {/* MRR Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">Monthly Recurring Revenue (MRR)</p>
        <p className="text-4xl font-bold text-green-600 mt-1">{isLoading ? '...' : formatRupiah(data?.mrr ?? 0)}</p>
      </div>

      {/* Subscriptions table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-700">Subscriptions</h2>
        </div>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />)}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 text-slate-500 font-medium">User</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Period End</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {(data?.subscriptions ?? []).map((s: any) => (
                <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{s.userName}</p>
                    <p className="text-xs text-slate-400">{s.userEmail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.status === 'active'    ? 'bg-green-100 text-green-700' :
                      s.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                      'bg-amber-100 text-amber-700'
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{formatRupiah(s.amount)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(s.currentPeriodEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(s.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
              {(data?.subscriptions ?? []).length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-slate-400">Belum ada subscription</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
