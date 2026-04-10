'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'

interface PlanDialog {
  open: boolean
  userId: string
  userName: string
  currentPlan: 'free' | 'pro'
}

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [planDialog, setPlanDialog] = useState<PlanDialog | null>(null)

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), ...(debouncedSearch ? { search: debouncedSearch } : {}) })
      const res = await fetch(`/api/admin/users?${params}`)
      return res.json()
    },
  })

  const changePlanMutation = useMutation({
    mutationFn: async ({ userId, plan }: { userId: string; plan: 'free' | 'pro' }) => {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      return d
    },
    onSuccess: (_, { plan }) => {
      const name = planDialog?.userName ?? ''
      toast.success(`Plan ${name} berhasil diubah ke ${plan}`)
      setPlanDialog(null)
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const newPlan = planDialog?.currentPlan === 'free' ? 'pro' : 'free'

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <h1 className="text-xl md:text-2xl font-semibold text-slate-800">All Users</h1>
        <input
          type="search"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">User</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Plan</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium hidden md:table-cell">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(data?.data ?? []).map((u: any) => (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{u.name}</p>
                          <p className="text-xs text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.plan === 'pro' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                        {u.plan === 'pro' ? '⭐ Pro' : 'Free'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell">
                      {new Date(u.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.plan === 'free' ? (
                        <button
                          onClick={() => setPlanDialog({ open: true, userId: u.id, userName: u.name, currentPlan: 'free' })}
                          className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors min-h-[32px]"
                        >
                          ↑ Upgrade to Pro
                        </button>
                      ) : (
                        <button
                          onClick={() => setPlanDialog({ open: true, userId: u.id, userName: u.name, currentPlan: 'pro' })}
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
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex gap-2 px-4 py-3 border-t border-slate-100 justify-end">
              <button disabled={page <= 1} onClick={() => setPage(p => p-1)} className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 min-h-[36px]">Previous</button>
              <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p+1)} className="px-3 py-1 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 min-h-[36px]">Next</button>
            </div>
          )}
        </div>
      )}

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
              onClick={() => planDialog && changePlanMutation.mutate({ userId: planDialog.userId, plan: newPlan })}
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
