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

  if (isLoading) return <div className="p-8 text-slate-400">Loading...</div>
  if (!campaign)  return <div className="p-8 text-red-500">Campaign tidak ditemukan</div>

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
    <div className="p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="outline" size="sm"><ArrowLeft size={14} className="mr-1" /> Back</Button>
        </Link>
        <h1 className="text-2xl font-semibold text-slate-800 flex-1">{campaign.name}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor[campaign.status] ?? ''}`}>
          {campaign.status}
        </span>
      </div>

      {/* Progress */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Progress</span>
          <span className="font-medium text-slate-700">{sent} / {total} ({pct}%)</span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex gap-6 text-sm">
          <div><span className="text-green-600 font-semibold">{sent}</span><span className="text-slate-400 ml-1">sent</span></div>
          <div><span className="text-red-500 font-semibold">{failed}</span><span className="text-slate-400 ml-1">failed</span></div>
          <div><span className="text-slate-600 font-semibold">{total - sent - failed}</span><span className="text-slate-400 ml-1">pending</span></div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {['draft', 'paused'].includes(campaign.status) && (
          <Button onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
            <Play size={16} className="mr-2" /> {startMutation.isPending ? 'Starting...' : 'Start Campaign'}
          </Button>
        )}
        {campaign.status === 'running' && (
          <Button variant="outline" onClick={() => pauseMutation.mutate()} disabled={pauseMutation.isPending}>
            <Pause size={16} className="mr-2" /> Pause
          </Button>
        )}
        <Button variant="outline" onClick={handleExport}>
          <Download size={16} className="mr-2" /> Export CSV
        </Button>
      </div>

      {/* Logs */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Message Logs</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-2 text-slate-500 font-medium">Phone</th>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">Name</th>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">Status</th>
              <th className="text-left px-4 py-2 text-slate-500 font-medium">Sent At</th>
            </tr>
          </thead>
          <tbody>
            {(logsData?.data ?? []).map((log: any) => (
              <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-700">{log.contactPhone}</td>
                <td className="px-4 py-2 text-slate-500">{log.contactName ?? '-'}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    log.status === 'sent'    ? 'bg-green-100 text-green-700' :
                    log.status === 'failed'  ? 'bg-red-100 text-red-600' :
                    log.status === 'skipped' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{log.status}</span>
                </td>
                <td className="px-4 py-2 text-slate-400 text-xs">
                  {log.sentAt ? new Date(log.sentAt).toLocaleString('id-ID') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logsData?.pagination && logsData.pagination.totalPages > 1 && (
          <div className="flex gap-2 px-4 py-3 border-t border-slate-100">
            <Button size="sm" variant="outline" disabled={logPage <= 1} onClick={() => setLogPage(p => p-1)}>Previous</Button>
            <Button size="sm" variant="outline" disabled={logPage >= logsData.pagination.totalPages} onClick={() => setLogPage(p => p+1)}>Next</Button>
          </div>
        )}
      </div>
    </div>
  )
}
