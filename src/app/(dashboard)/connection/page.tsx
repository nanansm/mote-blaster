'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Wifi, WifiOff, QrCode, Trash2, RefreshCw } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const statusColor: Record<string, string> = {
  connected:    'text-green-600 bg-green-50',
  disconnected: 'text-slate-500 bg-slate-100',
  connecting:   'text-amber-600 bg-amber-50',
  qr_code:      'text-blue-600 bg-blue-50',
  error:        'text-red-600 bg-red-50',
}

export default function ConnectionPage() {
  const qc = useQueryClient()
  const [newName, setNewName]   = useState('')
  const [showNew, setShowNew]   = useState(false)
  const [qrModal, setQrModal]   = useState<{ open: boolean; qrCode?: string; id?: string }>({ open: false })

  const { data, isLoading } = useQuery({
    queryKey: ['instances'],
    queryFn: async () => {
      const res = await fetch('/api/instances')
      return res.json()
    },
    refetchInterval: 5000,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      return d
    },
    onSuccess: () => {
      toast.success('Instance dibuat')
      qc.invalidateQueries({ queryKey: ['instances'] })
      setShowNew(false)
      setNewName('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const connectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/instances/${id}/connect`, { method: 'POST' })
      const d   = await res.json()
      if (!res.ok) throw new Error(d.error)
      return d
    },
    onSuccess: (d, id) => {
      qc.invalidateQueries({ queryKey: ['instances'] })
      if (d.status === 'qr_code' && d.qrCode) {
        setQrModal({ open: true, qrCode: d.qrCode, id })
      } else {
        toast.success('Terhubung!')
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/instances/${id}`, { method: 'DELETE' })
      const d   = await res.json()
      if (!res.ok) throw new Error(d.error)
    },
    onSuccess: () => {
      toast.success('Instance dihapus')
      qc.invalidateQueries({ queryKey: ['instances'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const instances = data?.data ?? []

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">WhatsApp Instances</h1>
        <Button onClick={() => setShowNew(true)}>
          <Plus size={16} className="mr-2" /> Tambah Instance
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : instances.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Wifi size={40} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium">Belum ada instance</p>
          <p className="text-sm mt-1">Klik tombol di atas untuk menambahkan instance WhatsApp</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {instances.map((inst: any) => (
            <div key={inst.id} className="rounded-xl border border-slate-200 bg-white p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  {inst.status === 'connected' ? <Wifi size={20} className="text-green-600" /> : <WifiOff size={20} className="text-slate-400" />}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{inst.name}</p>
                  <p className="text-xs text-slate-400">{inst.phoneNumber ?? inst.sessionName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[inst.status] ?? ''}`}>
                  {inst.status}
                </span>
                {inst.status !== 'connected' && (
                  <Button size="sm" variant="outline" onClick={() => connectMutation.mutate(inst.id)} disabled={connectMutation.isPending}>
                    <QrCode size={14} className="mr-1" /> Connect
                  </Button>
                )}
                {inst.status === 'connected' && (
                  <Button size="sm" variant="outline" onClick={() => connectMutation.mutate(inst.id)}>
                    <RefreshCw size={14} className="mr-1" /> Refresh
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(inst.id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New instance dialog */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Instance WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Nama instance (misal: Toko ABC)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
            <Button
              className="w-full"
              onClick={() => createMutation.mutate()}
              disabled={!newName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Membuat...' : 'Buat Instance'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR code modal */}
      <Dialog open={qrModal.open} onOpenChange={o => setQrModal(s => ({ ...s, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan QR Code WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            {qrModal.qrCode && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={qrModal.qrCode} alt="QR Code" className="w-64 h-64" />
            )}
            <p className="text-sm text-slate-500 mt-4 text-center">
              Buka WhatsApp → Perangkat Tertaut → Tautkan Perangkat → Scan QR
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
