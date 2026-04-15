'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Wifi, WifiOff, QrCode, Trash2, RefreshCw, Smartphone } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const statusLabel: Record<string, string> = {
  connected:    'Terhubung',
  disconnected: 'Tidak Terhubung',
  connecting:   'Menghubungkan...',
  qr_code:      'Scan QR Code',
  error:        'Ada Masalah',
}

const statusColor: Record<string, string> = {
  connected:    'text-green-700 bg-green-100',
  disconnected: 'text-slate-500 bg-slate-100',
  connecting:   'text-amber-700 bg-amber-100',
  qr_code:      'text-blue-700 bg-blue-100',
  error:        'text-red-600 bg-red-100',
}

const borderColor: Record<string, string> = {
  connected:    'border-l-green-500',
  disconnected: 'border-l-slate-300',
  connecting:   'border-l-amber-500',
  qr_code:      'border-l-blue-500',
  error:        'border-l-red-500',
}

export default function ConnectionPage() {
  const qc = useQueryClient()
  const [newName, setNewName]         = useState('')
  const [showNew, setShowNew]         = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [qrModal, setQrModal]         = useState<{ open: boolean; qrCode?: string; id?: string }>({ open: false })

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
      toast.success('Nomor WhatsApp ditambahkan')
      qc.invalidateQueries({ queryKey: ['instances'] })
      setShowNew(false)
      setNewName('')
    },
    onError: (e: Error) => {
      if (e.message.includes('Paket Free') || e.message.includes('1 nomor WhatsApp')) {
        toast.error('Paket Free hanya bisa 1 nomor WhatsApp.')
      } else {
        toast.error(e.message)
      }
    },
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
      toast.success('Nomor WA dihapus')
      qc.invalidateQueries({ queryKey: ['instances'] })
      setDeleteConfirm(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const instances = data?.data ?? []

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">Nomor WhatsApp</h1>
          <p className="text-sm text-slate-500 mt-0.5">Kelola nomor WA yang kamu gunakan untuk kirim pesan</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="min-h-[44px]">
          <Plus size={16} className="mr-2" /> Tambah Nomor WA
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(2)].map((_, i) => <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : instances.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mb-5">
            <Smartphone size={40} className="text-amber-500" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Hubungkan Nomor WhatsApp Kamu</h2>
          <p className="text-sm text-slate-500 max-w-xs mb-6">
            Sambungkan nomor WhatsApp yang akan kamu gunakan untuk kirim pesan massal.
          </p>
          <Button onClick={() => setShowNew(true)} className="min-h-[44px]">
            <Plus size={16} className="mr-2" /> Sambungkan Nomor WA
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {instances.map((inst: any) => (
            <div
              key={inst.id}
              className={`rounded-xl border border-slate-200 bg-white p-4 md:p-5 space-y-3 border-l-4 ${borderColor[inst.status] ?? 'border-l-slate-200'} hover:shadow-sm transition-shadow`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${inst.status === 'connected' ? 'bg-green-100' : 'bg-slate-100'}`}>
                  {inst.status === 'connected'
                    ? <Wifi size={20} className="text-green-600" />
                    : <WifiOff size={20} className="text-slate-400" />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{inst.name}</p>
                  <p className="text-xs text-slate-400 truncate">{inst.phoneNumber ?? inst.sessionName}</p>
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[inst.status] ?? ''}`}>
                  {statusLabel[inst.status] ?? inst.status}
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  {inst.status !== 'connected' && (
                    <Button size="sm" variant="outline" onClick={() => connectMutation.mutate(inst.id)} disabled={connectMutation.isPending} className="min-h-[36px]">
                      <QrCode size={14} className="mr-1" /> Hubungkan
                    </Button>
                  )}
                  {inst.status === 'connected' && (
                    <Button size="sm" variant="outline" onClick={() => connectMutation.mutate(inst.id)} className="min-h-[36px]">
                      <RefreshCw size={14} className="mr-1" /> Refresh
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDeleteConfirm(inst.id)}
                    className="min-h-[36px]"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog tambah nomor WA baru */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambahkan Nomor WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Nama nomor WA (misal: Toko ABC)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && newName.trim() && createMutation.mutate()}
            />
            <Button
              className="w-full min-h-[44px]"
              onClick={() => createMutation.mutate()}
              disabled={!newName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Menghubungkan...' : 'Sambungkan'}
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
          <div className="flex flex-col items-center py-4 gap-4">
            {qrModal.qrCode && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={qrModal.qrCode} alt="QR Code" className="w-56 h-56 md:w-64 md:h-64 rounded-xl" />
            )}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 w-full space-y-2">
              <p className="text-sm font-semibold text-amber-800">Cara scan QR Code:</p>
              <ol className="text-sm text-amber-700 space-y-1 list-decimal ml-4">
                <li>Buka WhatsApp di HP kamu</li>
                <li>Ketuk ikon titik tiga (⋮) → <strong>Perangkat Tertaut</strong></li>
                <li>Ketuk <strong>Tautkan Perangkat</strong></li>
                <li>Arahkan kamera ke QR Code di atas</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={open => { if (!open) setDeleteConfirm(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Nomor WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua data pengiriman dan catat chat yang terhubung ke nomor ini akan ikut terhapus. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
