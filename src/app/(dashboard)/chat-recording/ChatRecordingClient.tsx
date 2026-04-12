'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Lock, MessageSquare, Plus, Trash2, ToggleLeft, ToggleRight, Edit2, Copy } from 'lucide-react'
import Link from 'next/link'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Config {
  id: string
  instanceId: string
  instanceName: string | null
  spreadsheetId: string
  sheetName: string
  isActive: boolean
  createdAt: string
}

interface Instance {
  id: string
  name: string
}

function ProGate() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-5">
        <Lock size={28} className="text-amber-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-800 mb-2">Fitur Pro Eksklusif</h2>
      <p className="text-slate-500 max-w-sm mb-6">
        Fitur ini hanya tersedia untuk paket Pro. Upgrade sekarang untuk merekam semua chat masuk ke Google Sheets secara otomatis.
      </p>
      <Link href="/billing">
        <Button className="bg-[#F5A623] hover:bg-[#e09616] text-white font-bold rounded-full px-8">
          Upgrade ke Pro
        </Button>
      </Link>
    </div>
  )
}

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={handleCopy}
      title="Copy email"
      className="ml-2 shrink-0 p-1 rounded hover:bg-amber-100 text-amber-600 transition-colors"
    >
      <Copy size={13} />
      {copied && <span className="sr-only">Copied!</span>}
    </button>
  )
}

export default function ChatRecordingClient({ serviceAccountEmail }: { serviceAccountEmail: string | null }) {
  const qc = useQueryClient()
  const [formOpen, setFormOpen]     = useState(false)
  const [editOpen, setEditOpen]     = useState(false)
  const [deleteId, setDeleteId]     = useState<string | null>(null)
  const [editConfig, setEditConfig] = useState<Config | null>(null)

  // Form state
  const [instanceId, setInstanceId]       = useState('')
  const [spreadsheetId, setSpreadsheetId] = useState('')
  const [sheetName, setSheetName]         = useState('Sheet1')
  const [editSheet, setEditSheet]         = useState('')
  const [editSsId, setEditSsId]           = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['chat-recording'],
    queryFn: async () => {
      const res = await fetch('/api/chat-recording')
      const json = await res.json()
      if (!res.ok) throw Object.assign(new Error(json.error), { status: res.status })
      return json
    },
  })

  const { data: instancesData } = useQuery({
    queryKey: ['instances'],
    queryFn: async () => {
      const res = await fetch('/api/instances')
      return res.json()
    },
  })

  const instances: Instance[] = instancesData?.data ?? []
  const configs: Config[]     = data?.data ?? []
  const isPro = !(error && (error as any).status === 403)

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/chat-recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId, spreadsheetId, sheetName }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json
    },
    onSuccess: () => {
      toast.success('Chat recording berhasil ditambahkan!')
      setFormOpen(false)
      setInstanceId(''); setSpreadsheetId(''); setSheetName('Sheet1')
      qc.invalidateQueries({ queryKey: ['chat-recording'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/chat-recording/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json
    },
    onSuccess: () => {
      toast.success('Berhasil diperbarui')
      setEditOpen(false)
      qc.invalidateQueries({ queryKey: ['chat-recording'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/chat-recording/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      return json
    },
    onSuccess: () => {
      toast.success('Config berhasil dihapus')
      setDeleteId(null)
      qc.invalidateQueries({ queryKey: ['chat-recording'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) return (
    <div className="p-4 md:p-8 space-y-4">
      <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
      {[1, 2].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  )

  if (!isPro) return (
    <div className="p-4 md:p-8">
      <ProGate />
    </div>
  )

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={22} className="text-amber-500" />
          <h1 className="text-xl md:text-2xl font-semibold text-slate-800">WA Chat Recording</h1>
        </div>
        <Button
          onClick={() => setFormOpen(true)}
          className="bg-[#1a3a2a] hover:bg-[#1a3a2a]/90 text-white rounded-full gap-2"
        >
          <Plus size={16} /> Tambah Recording
        </Button>
      </div>

      {/* Tutorial Box */}
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-5 text-sm text-slate-700 space-y-2">
        <p className="font-bold text-amber-700 mb-2">Cara Setup Chat Recording:</p>
        <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed">
          <li>Buka Google Sheets dan buat spreadsheet baru (atau gunakan yang sudah ada)</li>
          <li>Klik tombol <strong>Share</strong> di kanan atas spreadsheet</li>
          <li>
            Tambahkan email service account berikut sebagai <strong>Editor</strong>:
            <div className="mt-2 flex items-center bg-white rounded border border-amber-200 px-3 py-2">
              <span className="font-mono text-xs break-all select-all flex-1">
                {serviceAccountEmail ?? '(service account email tidak tersedia)'}
              </span>
              {serviceAccountEmail && <CopyEmailButton email={serviceAccountEmail} />}
            </div>
          </li>
          <li>
            Copy <strong>Spreadsheet ID</strong> dari URL:<br />
            <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-amber-200">
              https://docs.google.com/spreadsheets/d/<strong>[SPREADSHEET_ID]</strong>/edit
            </span>
          </li>
          <li>Masukkan Spreadsheet ID dan nama Sheet di form di atas</li>
          <li>Klik simpan — chat recording otomatis berjalan!</li>
        </ol>
        <p className="text-xs text-slate-500 mt-2">
          Catatan: Header (Date, Name, Phone, Chat) dibuat otomatis · Hanya chat pribadi yang direcord · Pastikan instance WhatsApp connected
        </p>
      </div>

      {/* Config List */}
      {configs.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p>Belum ada chat recording aktif.</p>
          <p className="text-sm mt-1">Klik "Tambah Recording" untuk mulai.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 truncate">{c.instanceName ?? c.instanceId}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sheet: <span className="font-mono">{c.spreadsheetId}</span> · Tab: <span className="font-mono">{c.sheetName}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Toggle */}
                <button
                  onClick={() => updateMutation.mutate({ id: c.id, data: { isActive: !c.isActive } })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                  style={{
                    background: c.isActive ? '#dcfce7' : '#f1f5f9',
                    color: c.isActive ? '#15803d' : '#64748b',
                  }}
                >
                  {c.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  {c.isActive ? 'Aktif' : 'Nonaktif'}
                </button>

                {/* Edit */}
                <button
                  onClick={() => {
                    setEditConfig(c)
                    setEditSsId(c.spreadsheetId)
                    setEditSheet(c.sheetName)
                    setEditOpen(true)
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                  title="Edit"
                >
                  <Edit2 size={15} />
                </button>

                {/* Delete */}
                <button
                  onClick={() => setDeleteId(c.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                  title="Hapus"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Chat Recording</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Instance WhatsApp</Label>
              <select
                value={instanceId}
                onChange={e => setInstanceId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              >
                <option value="">Pilih instance...</option>
                {instances.map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Spreadsheet ID</Label>
              <Input
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
                value={spreadsheetId}
                onChange={e => setSpreadsheetId(e.target.value)}
              />
              <p className="text-xs text-slate-400">Ambil dari URL Google Sheets — bagian antara /d/ dan /edit</p>
            </div>
            <div className="space-y-1.5">
              <Label>Nama Sheet / Tab</Label>
              <Input
                placeholder="Sheet1"
                value={sheetName}
                onChange={e => setSheetName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Batal</Button>
            <Button
              className="bg-[#1a3a2a] hover:bg-[#1a3a2a]/90 text-white"
              onClick={() => createMutation.mutate()}
              disabled={!instanceId || !spreadsheetId || createMutation.isPending}
            >
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Chat Recording</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Spreadsheet ID</Label>
              <Input value={editSsId} onChange={e => setEditSsId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nama Sheet / Tab</Label>
              <Input value={editSheet} onChange={e => setEditSheet(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Batal</Button>
            <Button
              className="bg-[#1a3a2a] hover:bg-[#1a3a2a]/90 text-white"
              onClick={() => editConfig && updateMutation.mutate({
                id: editConfig.id,
                data: { spreadsheetId: editSsId, sheetName: editSheet },
              })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Chat Recording?</AlertDialogTitle>
            <AlertDialogDescription>
              Config ini akan dihapus permanen dan chat tidak akan direcord lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
