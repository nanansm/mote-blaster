'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PlanDialog {
  open: boolean
  userId: string
  userName: string
  currentPlan: 'free' | 'pro'
}

// Default expiry: 30 days from now
function defaultExpiry(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().split('T')[0]
}

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const [search, setSearch]               = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage]                   = useState(1)
  const [planDialog, setPlanDialog] = useState<PlanDialog | null>(null)

  // Upgrade to Pro modal (with date picker)
  const [upgradeOpen, setUpgradeOpen]   = useState(false)
  const [upgradeUserId, setUpgradeUserId] = useState('')
  const [upgradeUserName, setUpgradeUserName] = useState('')
  const [upgradeDate, setUpgradeDate]   = useState(defaultExpiry())

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
    mutationFn: async ({ userId, plan, proExpiresAt }: { userId: string; plan: 'free' | 'pro'; proExpiresAt?: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, ...(proExpiresAt ? { proExpiresAt } : {}) }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      return d
    },
    onSuccess: (_, { plan, proExpiresAt }) => {
      if (plan === 'pro') {
        toast.success(`${upgradeUserName} berhasil di-upgrade ke Pro hingga ${proExpiresAt}`)
        setUpgradeOpen(false)
      } else {
        const name = planDialog?.userName ?? ''
        toast.success(`Plan ${name} berhasil diubah ke Free`)
        setPlanDialog(null)
      }
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
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">User</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Plan</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium hidden lg:table-cell">Pro Expires</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium hidden md:table-cell">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(data?.data ?? []).map((u: any) => {
                  const proActive = u.plan === 'pro' && u.proExpiresAt && new Date(u.proExpiresAt) > new Date()
                  return (
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
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${proActive ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                          {proActive ? '⭐ Pro' : 'Free'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 hidden lg:table-cell">
                        {u.proExpiresAt
                          ? <span className={new Date(u.proExpiresAt) > new Date() ? 'text-green-600' : 'text-red-400'}>
                              {new Date(u.proExpiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          : '—'
                        }
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 hidden md:table-cell">
                        {new Date(u.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.plan === 'free' ? (
                          <button
                            onClick={() => {
                              setUpgradeUserId(u.id)
                              setUpgradeUserName(u.name)
                              setUpgradeDate(defaultExpiry())
                              setUpgradeOpen(true)
                            }}
                            className="px-2 py-1 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-md transition-colors min-h-[32px]"
                          >
                            ↑ Upgrade ke Pro
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
                  )
                })}
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

      {/* Upgrade to Pro Dialog (with date picker) */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade ke Pro</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-slate-600">
              Set tanggal kadaluarsa Pro Plan untuk <strong>{upgradeUserName}</strong>.
            </p>
            <div className="space-y-1.5">
              <Label>Pro Berlaku Hingga</Label>
              <Input
                type="date"
                value={upgradeDate}
                onChange={e => setUpgradeDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeOpen(false)}>Batal</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              disabled={!upgradeDate || changePlanMutation.isPending}
              onClick={() => changePlanMutation.mutate({
                userId: upgradeUserId,
                plan: 'pro',
                proExpiresAt: new Date(upgradeDate + 'T23:59:59').toISOString(),
              })}
            >
              {changePlanMutation.isPending ? 'Menyimpan...' : 'Upgrade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Downgrade Confirm Dialog */}
      <AlertDialog
        open={!!planDialog?.open}
        onOpenChange={(open: boolean) => { if (!open) setPlanDialog(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Downgrade ke Free</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah kamu yakin ingin downgrade plan <strong>{planDialog?.userName}</strong> ke <strong>Free</strong>?
              Akses Pro akan langsung dicabut.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => planDialog && changePlanMutation.mutate({ userId: planDialog.userId, plan: 'free' })}
              disabled={changePlanMutation.isPending}
            >
              {changePlanMutation.isPending ? 'Mengubah...' : 'Downgrade'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
