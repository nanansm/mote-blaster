'use client'
import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useCampaignProgress } from '@/hooks/useCampaignProgress'
import { Play, Pause, Download, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const qc = useQueryClient()
  const [logPage, setLogPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${id}`)
      return res.json()
    },
    refetchInterval: 5000,
  })

  const { data: logsData } = useQuery({
    queryKey: ['campaign-logs', id, logPage],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${id}/logs?page=${logPage}&limit=20`)
      return res.json()
    },
  })

  const campaign  = data?.data
  const isRunning = campaign?.status === 'running'
  const progress  = useCampaignProgress(id, isRunning)

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/campaigns/${id}/start`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      return d
    },
    onSuccess: (d) => { toast.success(`${d.jobsQueued} pesan dijadwalkan`); qc.invalidateQueries({ queryKey: ['campaign', id] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const pauseMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/campaigns/${id}/pause`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
    },
    onSuccess: () => { toast.success('Campaign di-pause'); qc.invalidateQueries({ queryKey: ['campaign', id] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const handleExport = () => {
    window.open(`/api/campaigns/${id}/export`, '_blank')
  }

  if (isLoading) return <div className="p-4 md:p-8 text-slate-400">Loading...</div>
  if (!campaign)  return <div className="p-4 md:p-8 text-red-500">Campaign tidak ditemukan</div>

  const total    = campaign.contactsCount
  const sent     = progress?.sentCount ?? campaign.sentCount
  const failed   = progress?.failedCount ?? campaign.failedCount
  const pct      = total > 0 ? Math.round((sent / total) * 100) : 0

  const statusColor: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600', pending: 'bg-amber-100 text-amber-700',
    running: 'bg-blue-100 text-blue-700', completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-600', paused: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <Link href="/campaigns">
          <Button variant="outline" size="sm" className="min-h-[40px]"><ArrowLeft size={14} className="mr-1" /> Back</Button>
        </Link>
        <h1 className="text-xl md:text-2xl font-semibold text-slate-800 flex-1 min-w-0 truncate">{campaign.name}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor[campaign.status] ?? ''} shrink-0`}>
          {campaign.status}
        </span>
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Progress</span>
          <span className="font-medium text-slate-700">{sent} / {total} ({pct}%)</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg bg-green-50 p-3 text-center">
            <span className="text-green-600 font-bold text-lg block">{sent}</span>
            <span className="text-slate-400 text-xs">sent</span>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-center">
            <span className="text-red-500 font-bold text-lg block">{failed}</span>
            <span className="text-slate-400 text-xs">failed</span>
          </div>
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <span className="text-slate-600 font-bold text-lg block">{total - sent - failed}</span>
            <span className="text-slate-400 text-xs">pending</span>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-center">
            <span className="text-blue-600 font-bold text-lg block">{total}</span>
            <span className="text-slate-400 text-xs">total</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 md:gap-3">
        {['draft', 'paused'].includes(campaign.status) && (
          <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending} className="min-h-[44px]">
            <Play size={16} className="mr-2" /> {startMutation.isPending ? 'Starting...' : 'Start Campaign'}
          </Button>
        )}
        {campaign.status === 'running' && (
          <Button variant="outline" onClick={() => pauseMutation.mutate()} disabled={pauseMutation.isPending} className="min-h-[44px]">
            <Pause size={16} className="mr-2" /> Pause
          </Button>
        )}
        <Button variant="outline" onClick={handleExport} className="min-h-[44px]">
          <Download size={16} className="mr-2" /> Export CSV
        </Button>
      </div>

      {/* Logs */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Message Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-2 text-slate-500 font-medium">Phone</th>
                <th className="text-left px-4 py-2 text-slate-500 font-medium hidden sm:table-cell">Name</th>
                <th className="text-left px-4 py-2 text-slate-500 font-medium">Status</th>
                <th className="text-left px-4 py-2 text-slate-500 font-medium hidden md:table-cell">Sent At</th>
              </tr>
            </thead>
            <tbody>
              {(logsData?.data ?? []).map((log: any) => (
                <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700">{log.contactPhone}</td>
                  <td className="px-4 py-2 text-slate-500 hidden sm:table-cell">{log.contactName ?? '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      log.status === 'sent'    ? 'bg-green-100 text-green-700' :
                      log.status === 'failed'  ? 'bg-red-100 text-red-600' :
                      log.status === 'skipped' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{log.status}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-400 text-xs hidden md:table-cell">
                    {log.sentAt ? new Date(log.sentAt).toLocaleString('id-ID') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logsData?.pagination && logsData.pagination.totalPages > 1 && (
          <div className="flex gap-2 px-4 py-3 border-t border-slate-100">
            <Button size="sm" variant="outline" disabled={logPage <= 1} onClick={() => setLogPage(p => p-1)} className="min-h-[36px]">Previous</Button>
            <Button size="sm" variant="outline" disabled={logPage >= logsData.pagination.totalPages} onClick={() => setLogPage(p => p+1)} className="min-h-[36px]">Next</Button>
          </div>
        )}
      </div>
    </div>
  )
}
