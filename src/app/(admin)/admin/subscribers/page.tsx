'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'

interface SubscriberRow {
  id:                    string
  name:                  string
  email:                 string
  image:                 string | null
  plan:                  'free' | 'pro'
  createdAt:             string
  instanceCount:         number
  subscriptionStatus:    string | null
  subscriptionPeriodEnd: string | null
  subscriptionCancelled: string | null
}

interface PlanDialog {
  open: boolean
  userId: string
  userName: string
  currentPlan: 'free' | 'pro'
}

function useSubscribers(plan: string, search: string, page: number) {
  return useQuery({
    queryKey: ['admin-subscribers', plan, search, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(plan   ? { plan }   : {}),
        ...(search ? { search } : {}),
        page: String(page),
      })
      const res = await fetch(`/api/admin/subscribers?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
    staleTime: 30_000,
  })
}

export default function SubscribersPage() {
  const qc = useQueryClient()
  const [plan,   setPlan]   = useState<'free' | 'pro' | ''>('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [planDialog, setPlanDialog] = useState<PlanDialog | null>(null)

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useSubscribers(plan, debouncedSearch, page)

  const changePlanMutation = useMutation({
    mutationFn: async ({ userId, newPlan }: { userId: string; newPlan: 'free' | 'pro' }) => {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      return d
    },
    onSuccess: (_, { newPlan }) => {
      const name = planDialog?.userName ?? ''
      toast.success(`Plan ${name} berhasil diubah ke ${newPlan}`)
      setPlanDialog(null)
      qc.invalidateQueries({ queryKey: ['admin-subscribers'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const newPlan = planDialog?.currentPlan === 'free' ? 'pro' : 'free'

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-slate-800">Subscribers</h1>
        <input
          type="search"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <SummaryCard title="Total Users" value={data?.summary.total ?? 0} color="slate" />
        <SummaryCard title="Free Plan"   value={data?.summary.free  ?? 0} color="slate"
          onClick={() => { setPlan(plan === 'free' ? '' : 'free'); setPage(1) }}
          active={plan === 'free'} />
        <SummaryCard title="Pro Plan"    value={data?.summary.pro   ?? 0} color="blue"
          onClick={() => { setPlan(plan === 'pro' ? '' : 'pro'); setPage(1) }}
          active={plan === 'pro'} />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {[
          { label: 'All',       value: ''     },
          { label: 'Free Plan', value: 'free' },
          { label: 'Pro Plan',  value: 'pro'  },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => { setPlan(tab.value as any); setPage(1) }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
              plan === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <SubscribersTableSkeleton />
      ) : (
        <SubscribersTable
          rows={data?.data ?? []}
          onPageChange={setPage}
          pagination={data?.pagination}
          onChangePlan={(userId, userName, currentPlan) =>
            setPlanDialog({ open: true, userId, userName, currentPlan })
          }
        />
      )}

      {/* Plan change dialog */}
      <AlertDialog
        open={!!planDialog?.open}
        onOpenChange={(open: boolean) => { if (!open) setPlanDialog(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ubah Plan User</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah kamu yakin ingin mengubah plan <strong>{planDialog?.userName}</strong> dari{' '}
              <strong>{planDialog?.currentPlan}</strong> ke <strong>{newPlan}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => planDialog && changePlanMutation.mutate({ userId: planDialog.userId, newPlan })}
              disabled={changePlanMutation.isPending}
            >
              {changePlanMutation.isPending ? 'Mengubah...' : 'Konfirmasi'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SubscribersTable({ rows, pagination, onPageChange, onChangePlan }: {
  rows: SubscriberRow[]
  pagination?: { page: number; totalPages: number; total: number; limit: number }
  onPageChange: (p: number) => void
  onChangePlan: (userId: string, userName: string, currentPlan: 'free' | 'pro') => void
}) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-lg font-medium">No subscribers found</p>
        <p className="text-sm mt-1">Try adjusting your search or filter</p>
      </div>
    )
  }

  const maxInstances = (plan: string) => plan === 'pro' ? 5 : 1

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-slate-600 font-medium">User</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Plan</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium hidden lg:table-cell">WA Instances</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium hidden md:table-cell">Joined</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium hidden lg:table-cell">Subscription</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium text-sm shrink-0">
                      {row.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">{row.name}</p>
                      <p className="text-xs text-slate-400 truncate">{row.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {row.plan === 'pro' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                      ⭐ Pro
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                      Free
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">{row.instanceCount}</span>
                      <span className="text-slate-400">/ {maxInstances(row.plan)}</span>
                    </div>
                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          row.instanceCount >= maxInstances(row.plan) ? 'bg-amber-400' : 'bg-green-400'
                        }`}
                        style={{ width: `${Math.min(100, (row.instanceCount / maxInstances(row.plan)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs hidden md:table-cell">
                  {new Date(row.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {row.plan === 'pro' && row.subscriptionStatus ? (
                    <div>
                      {row.subscriptionStatus === 'active' && row.subscriptionPeriodEnd ? (
                        <div>
                          <span className="text-xs text-green-600 font-medium">Active</span>
                          <p className="text-xs text-slate-400">
                            until {new Date(row.subscriptionPeriodEnd).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      ) : row.subscriptionStatus === 'cancelled' ? (
                        <span className="text-xs text-red-500 font-medium">Cancelled</span>
                      ) : (
                        <span className="text-xs text-amber-500 font-medium capitalize">{row.subscriptionStatus}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {row.plan === 'free' ? (
                    <button
                      onClick={() => onChangePlan(row.id, row.name, 'free')}
                      className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors min-h-[32px] whitespace-nowrap"
                    >
                      ↑ Upgrade to Pro
                    </button>
                  ) : (
                    <button
                      onClick={() => onChangePlan(row.id, row.name, 'pro')}
                      className="px-2 py-1 text-xs font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors min-h-[32px]"
                    >
                      ↓ Downgrade
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">
            Showing {((pagination.page - 1) * pagination.limit) + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 min-h-[36px]"
            >
              Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 min-h-[36px]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SubscribersTableSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-slate-100 rounded animate-pulse w-32" />
            <div className="h-2 bg-slate-100 rounded animate-pulse w-48" />
          </div>
          <div className="h-5 bg-slate-100 rounded-full animate-pulse w-12" />
          <div className="h-3 bg-slate-100 rounded animate-pulse w-16" />
        </div>
      ))}
    </div>
  )
}

function SummaryCard({ title, value, color, onClick, active }: {
  title:   string
  value:   number
  color:   'slate' | 'blue'
  onClick?: () => void
  active?:  boolean
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-3 md:p-5 transition-all ${
        onClick ? 'cursor-pointer' : ''
      } ${
        active
          ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-200'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <p className="text-xs md:text-sm text-slate-500">{title}</p>
      <p className={`text-2xl md:text-3xl font-bold mt-1 ${color === 'blue' ? 'text-blue-600' : 'text-slate-800'}`}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}
