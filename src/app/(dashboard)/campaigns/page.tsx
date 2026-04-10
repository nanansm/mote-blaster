'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, Eye, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'

const statusColor: Record<string, string> = {
  draft:     'bg-slate-100 text-slate-600',
  pending:   'bg-amber-100 text-amber-700',
  running:   'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  failed:    'bg-red-100 text-red-600',
  paused:    'bg-orange-100 text-orange-700',
}

const STATUSES = ['', 'draft', 'pending', 'running', 'completed', 'failed', 'paused']

export default function CampaignsPage() {
  const qc = useQueryClient()
  const [status, setStatus] = useState('')
  const [page, setPage]     = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns', status, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '10', ...(status ? { status } : {}) })
      const res = await fetch(`/api/campaigns?${params}`)
      return res.json()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
    },
    onSuccess: () => { toast.success('Campaign dihapus'); qc.invalidateQueries({ queryKey: ['campaigns'] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const pauseMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/campaigns/${id}/pause`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
    },
    onSuccess: () => { toast.success('Campaign di-pause'); qc.invalidateQueries({ queryKey: ['campaigns'] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const campaigns = data?.data ?? []
  const pagination = data?.pagination

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-semibold text-slate-800">Campaigns</h1>
        <Link href="/campaigns/new" className="shrink-0">
          <Button className="min-h-[44px]"><Plus size={16} className="mr-2" /> <span className="hidden sm:inline">Buat Campaign</span><span className="sm:hidden">Buat</span></Button>
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1) }}
            className={`px-3 md:px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
              status === s ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="font-medium">Belum ada campaign</p>
          <p className="text-sm mt-1">Klik tombol di atas untuk membuat campaign baru</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Nama</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium">Progress</th>
                  <th className="text-left px-4 py-3 text-slate-600 font-medium hidden md:table-cell">Dibuat</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c: any) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[160px] truncate">{c.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[c.status] ?? ''}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {c.sentCount}/{c.contactsCount}
                      {c.failedCount > 0 && <span className="text-red-400 ml-1">({c.failedCount} fail)</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs hidden md:table-cell">
                      {new Date(c.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Link href={`/campaigns/${c.id}`}>
                          <Button size="sm" variant="outline" className="min-h-[36px]"><Eye size={14} /></Button>
                        </Link>
                        {c.status === 'running' && (
                          <Button size="sm" variant="outline" onClick={() => pauseMutation.mutate(c.id)} className="min-h-[36px]">
                            <Pause size={14} />
                          </Button>
                        )}
                        {['draft', 'paused'].includes(c.status) && (
                          <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(c.id)} className="min-h-[36px]">
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                {((page-1)*10)+1}–{Math.min(page*10, pagination.total)} of {pagination.total}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p-1)} className="min-h-[36px]">Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p+1)} className="min-h-[36px]">Next</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
