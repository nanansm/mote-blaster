'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, Eye, Play, Pause } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Campaigns</h1>
        <Link href="/campaigns/new">
          <Button><Plus size={16} className="mr-2" /> Buat Campaign</Button>
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 border-b border-slate-200">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1) }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Nama</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Progress</th>
                <th className="text-left px-4 py-3 text-slate-600 font-medium">Dibuat</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c: any) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[c.status] ?? ''}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {c.sentCount}/{c.contactsCount} sent
                    {c.failedCount > 0 && <span className="text-red-400 ml-1">({c.failedCount} failed)</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(c.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Link href={`/campaigns/${c.id}`}>
                        <Button size="sm" variant="outline"><Eye size={14} /></Button>
                      </Link>
                      {c.status === 'running' && (
                        <Button size="sm" variant="outline" onClick={() => pauseMutation.mutate(c.id)}>
                          <Pause size={14} />
                        </Button>
                      )}
                      {['draft', 'paused'].includes(c.status) && (
                        <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(c.id)}>
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">
                {((page-1)*10)+1}–{Math.min(page*10, pagination.total)} of {pagination.total}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p-1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p+1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
