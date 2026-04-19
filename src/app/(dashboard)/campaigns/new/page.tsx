'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ChevronRight, ChevronLeft, Upload, Link2, CheckCircle, Download, Info, Loader2 } from 'lucide-react'
import { BlastingRules } from '@/components/shared/BlastingRules'

type Step = 1 | 2 | 3 | 4
type Source = 'csv' | 'google_sheets' | ''

interface ContactRow {
  phone: string
  name?: string
  [key: string]: string | undefined
}

interface ParseResult {
  totalCount: number
  rows: ContactRow[]
  preview: ContactRow[]
  columns: string[]
}

interface ValidationStatus {
  total: number
  validated: number
  valid: number
  invalid: number
  pending: number
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [step, setStep]       = useState<Step>(1)
  const [loading, setLoading] = useState(false)

  // Step 1
  const [name, setName]             = useState('')
  const [instanceId, setInstanceId] = useState('')

  // Step 2
  const [source, setSource]           = useState<Source>('')
  const [sheetUrl, setSheetUrl]       = useState('')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)

  // Step 3
  const [template, setTemplate] = useState('')
  const [minDelay, setMinDelay] = useState(30)
  const [maxDelay, setMaxDelay] = useState(60)
  const [delayError, setDelayError] = useState('')

  // Step 4: created campaign
  const [campaignId, setCampaignId]           = useState<string | null>(null)
  const [creatingCampaign, setCreatingCampaign] = useState(false)
  const [showWarning, setShowWarning]         = useState(false)
  const [validationStatus, setValidationStatus] = useState<ValidationStatus | null>(null)
  const validationPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Instances list
  const { data: instData } = useQuery({
    queryKey: ['instances'],
    queryFn:  async () => { const res = await fetch('/api/instances'); return res.json() },
  })
  const instances = (instData?.data ?? []).filter((i: any) => i.status === 'connected')

  const handleDownloadTemplate = () => {
    const csv  = 'phone,name,custom1\n628123456789,Budi,nilai1\n08987654321,Siti,nilai2\n'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'template-kontak.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleCSVUpload = async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    try {
      const res  = await fetch('/api/campaigns/upload-csv', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      setParseResult(data)
      setSource('csv')
    } catch {
      toast.error('Gagal upload CSV')
    }
  }

  const handleSheetFetch = async () => {
    if (!sheetUrl.trim()) return
    setLoading(true)
    try {
      const res  = await fetch('/api/campaigns/fetch-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: sheetUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setParseResult(data)
      setSource('google_sheets')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Create campaign as draft when entering step 4
  const handleEnterStep4 = async () => {
    if (!parseResult || parseResult.rows.length === 0) {
      toast.error('Tidak ada kontak.')
      return
    }
    // If campaign already created, just move to step 4
    if (campaignId) { setStep(4); return }

    setCreatingCampaign(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          instanceId,
          messageTemplate: template,
          contactSource:   source,
          contactsCount:   parseResult.rows.length,
          contacts:        parseResult.rows,
        }),
      })
      const campaign = await res.json()
      if (!res.ok) throw new Error(campaign.error)
      setCampaignId(campaign.data.id)
      setStep(4)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCreatingCampaign(false)
    }
  }

  // Poll validation status when in step 4
  useEffect(() => {
    if (step !== 4 || !campaignId) return

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/validation-status`)
        if (res.ok) setValidationStatus(await res.json())
      } catch {}
    }

    fetchStatus()
    validationPollRef.current = setInterval(fetchStatus, 3_000)
    return () => { if (validationPollRef.current) clearInterval(validationPollRef.current) }
  }, [step, campaignId])

  // Stop polling when all validated
  useEffect(() => {
    if (validationStatus && validationStatus.pending === 0 && validationPollRef.current) {
      clearInterval(validationPollRef.current)
      validationPollRef.current = null
    }
  }, [validationStatus])

  const handleStartBlast = async () => {
    if (!campaignId) return
    setLoading(true)
    try {
      const startRes  = await fetch(`/api/campaigns/${campaignId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minDelay, maxDelay }),
      })
      const startData = await startRes.json()
      if (!startRes.ok) throw new Error(startData.error)
      toast.success(`${startData.jobsQueued} pesan dijadwalkan!`)
      router.push('/campaigns')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const steps = ['Basic Info', 'Contacts', 'Message', 'Review']

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-semibold text-slate-800">Buat Campaign Baru</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 md:gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
              i + 1 < step  ? 'bg-green-500 text-white' :
              i + 1 === step ? 'bg-amber-500 text-white' :
              'bg-slate-100 text-slate-400'
            }`}>
              {i + 1 < step ? <CheckCircle size={14} /> : i + 1}
            </div>
            <span className={`text-sm hidden sm:inline ${i + 1 === step ? 'font-medium text-slate-800' : 'text-slate-400'}`}>{s}</span>
            {i < steps.length - 1 && <ChevronRight size={14} className="text-slate-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="space-y-4">
          <BlastingRules />
          <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6 space-y-4">
            <h2 className="font-semibold text-slate-800">Informasi Dasar</h2>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Nama Campaign</label>
              <Input placeholder="Promo Lebaran 2025" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Nomor WhatsApp</label>
              {instances.length === 0 ? (
                <p className="text-sm text-red-500">Belum ada nomor WA yang terhubung. Hubungkan nomor WhatsApp dulu di menu Nomor WA.</p>
              ) : (
                <Select value={instanceId} onValueChange={(v) => setInstanceId(v ?? '')}>
                  <SelectTrigger><SelectValue placeholder="Pilih nomor WA..." /></SelectTrigger>
                  <SelectContent>
                    {instances.map((i: any) => (
                      <SelectItem key={i.id} value={i.id}>{i.name} ({i.phoneNumber ?? i.sessionName})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Button className="w-full min-h-[44px] bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setStep(2)} disabled={!name || !instanceId}>
              Lanjut <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Import Kontak */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6 space-y-4">
            <h2 className="font-semibold text-slate-800">Import Kontak</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Upload CSV */}
              <label className={`flex flex-col items-center justify-center gap-2 p-4 border-2 rounded-xl cursor-pointer transition-colors min-h-[100px] ${
                source === 'csv' ? 'border-amber-500 bg-amber-50' : 'border-dashed border-slate-200 hover:border-slate-300'
              }`}>
                <Upload size={20} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Upload CSV</span>
                {source === 'csv' && <span className="text-xs text-amber-600">✓ File terpilih</span>}
                <input type="file" accept=".csv" className="hidden"
                  onChange={e => e.target.files?.[0] && handleCSVUpload(e.target.files[0])} />
              </label>

              {/* Google Sheets */}
              <div className={`flex flex-col gap-2 p-4 border-2 rounded-xl transition-colors ${
                source === 'google_sheets' ? 'border-amber-500 bg-amber-50' : 'border-dashed border-slate-200'
              }`}>
                <Link2 size={20} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-600">Google Sheets</span>
                <Input
                  placeholder="https://docs.google.com/..."
                  value={sheetUrl}
                  onChange={e => setSheetUrl(e.target.value)}
                  className="text-xs"
                />
                <Button size="sm" variant="outline" onClick={handleSheetFetch} disabled={loading} className="min-h-[40px]">
                  {loading ? 'Loading...' : 'Ambil Data'}
                </Button>
              </div>
            </div>

            {parseResult && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                <p className="text-sm font-medium text-green-700">✓ {parseResult.totalCount} kontak ditemukan</p>
                <p className="text-xs text-green-600 mt-0.5">Kolom: {parseResult.columns.join(', ')}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="min-h-[44px]"><ChevronLeft size={16} className="mr-1" /> Back</Button>
              <Button className="flex-1 min-h-[44px] bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setStep(3)} disabled={!parseResult}>
                Lanjut <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>

          {/* Tutorial CSV */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-amber-600 shrink-0" />
              <h3 className="text-sm font-semibold text-amber-800">Format CSV yang Benar</h3>
            </div>
            <ul className="text-xs text-amber-700 space-y-1 ml-5 list-disc">
              <li>Kolom <strong>wajib</strong> bernama: <code className="bg-amber-100 px-1 rounded">phone</code></li>
              <li>Kolom <code className="bg-amber-100 px-1 rounded">name</code> untuk personalisasi (opsional)</li>
              <li>Kolom lain akan jadi variabel template <code className="bg-amber-100 px-1 rounded">{'{{kolom}}'}</code> (opsional)</li>
              <li>Format nomor: <code className="bg-amber-100 px-1 rounded">628xxx</code> atau <code className="bg-amber-100 px-1 rounded">08xxx</code> (otomatis dikonversi)</li>
            </ul>
            <div>
              <p className="text-xs font-medium text-amber-700 mb-1">Contoh isi CSV:</p>
              <pre className="bg-white border border-amber-200 rounded p-2 text-xs text-slate-700 font-mono overflow-x-auto">
{`phone,name,kota
628123456789,Budi,Jakarta
08987654321,Siti,Bandung`}
              </pre>
            </div>
            <Button size="sm" variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-100 h-8 text-xs"
              onClick={handleDownloadTemplate}>
              <Download size={13} className="mr-1.5" /> Download Template CSV
            </Button>
          </div>

          {/* Tutorial Google Sheets */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-amber-600 shrink-0" />
              <h3 className="text-sm font-semibold text-amber-800">Cara Pakai Google Sheets</h3>
            </div>
            <ul className="text-xs text-amber-700 space-y-1 ml-5 list-disc">
              <li>Baris pertama sheet <strong>wajib</strong> berisi header kolom</li>
              <li>Kolom pertama <strong>wajib</strong> bernama: <code className="bg-amber-100 px-1 rounded">phone</code></li>
              <li>Pastikan sharing sheet diset ke: <strong>"Anyone with the link can view"</strong></li>
              <li>Copy URL sheet dari address bar browser</li>
            </ul>
            <ol className="text-xs text-amber-700 space-y-0.5 ml-4 list-decimal">
              <li>Buka Google Sheets kamu</li>
              <li>Klik <strong>Share</strong> → Anyone with the link → <strong>Viewer</strong></li>
              <li>Copy link → Paste di kolom URL di atas</li>
              <li>Klik <strong>"Ambil Data"</strong></li>
            </ol>
          </div>
        </div>
      )}

      {/* Step 3: Template */}
      {step === 3 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Template Pesan</h2>
          <p className="text-xs text-slate-500">
            Gunakan <code className="bg-slate-100 px-1 rounded">{'{{variabel}}'}</code> untuk personalisasi.
            Kolom tersedia: {parseResult?.columns.join(', ')}
          </p>
          <Textarea
            placeholder="Halo {{name}}, kami punya promo spesial untuk kamu di {{kota}}!"
            value={template}
            onChange={e => setTemplate(e.target.value)}
            rows={6}
          />
          {template && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
              <p className="text-xs font-medium text-slate-500 mb-1">Preview (variabel diganti [nama_kolom]):</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {template.replace(/\{\{(\w+)\}\}/g, (_, k) => `[${k}]`)}
              </p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Pengaturan Delay Antar Pesan</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Delay Minimum (detik)</label>
                <Input
                  type="number"
                  min={15}
                  value={minDelay}
                  onChange={e => {
                    const v = Number(e.target.value)
                    setMinDelay(v)
                    if (v < 15) setDelayError('Delay minimum tidak boleh kurang dari 15 detik')
                    else if (maxDelay <= v) setDelayError('Delay maksimum harus lebih besar dari minimum')
                    else setDelayError('')
                  }}
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Delay Maksimum (detik)</label>
                <Input
                  type="number"
                  min={15}
                  value={maxDelay}
                  onChange={e => {
                    const v = Number(e.target.value)
                    setMaxDelay(v)
                    if (minDelay < 15) setDelayError('Delay minimum tidak boleh kurang dari 15 detik')
                    else if (v <= minDelay) setDelayError('Delay maksimum harus lebih besar dari minimum')
                    else setDelayError('')
                  }}
                />
              </div>
            </div>
            {delayError && <p className="text-xs text-red-500 mt-1">{delayError}</p>}
            <p className="text-xs text-slate-500 mt-2">
              Sistem akan menggunakan delay acak antara {minDelay} dan {maxDelay} detik antar setiap pesan. Semakin besar delay, semakin aman akun WhatsApp kamu.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(2)} className="min-h-[44px]"><ChevronLeft size={16} className="mr-1" /> Back</Button>
            <Button
              className="flex-1 min-h-[44px] bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleEnterStep4}
              disabled={!template.trim() || !!delayError || minDelay < 15 || maxDelay <= minDelay || creatingCampaign}
            >
              {creatingCampaign ? <><Loader2 size={16} className="animate-spin mr-2" />Menyiapkan...</> : <>Lanjut <ChevronRight size={16} className="ml-1" /></>}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-6 space-y-4">
            <h2 className="font-semibold text-slate-800">Review & Kirim</h2>
            <div className="space-y-0 text-sm divide-y divide-slate-100">
              {[
                ['Nama Campaign',  name],
                ['Sumber Kontak',  source === 'csv' ? 'Upload CSV' : 'Google Sheets'],
                ['Total Kontak',   String(parseResult?.totalCount ?? 0)],
                ['Delay',          `${minDelay}–${maxDelay} detik (acak)`],
                ['Estimasi waktu', parseResult?.totalCount
                  ? `~${Math.ceil((parseResult.totalCount * ((minDelay + maxDelay) / 2)) / 60)} menit`
                  : '-'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2.5">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-800">{value}</span>
                </div>
              ))}
            </div>

            {parseResult && parseResult.preview.length > 0 && (
              <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
                <p className="text-xs font-medium text-slate-500 mb-2">Preview kontak (3 pertama):</p>
                <div className="space-y-1">
                  {parseResult.preview.slice(0, 3).map((r, i) => (
                    <p key={i} className="text-xs font-mono text-slate-600">
                      {r.phone}{r.name ? ` — ${r.name}` : ''}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(3)} className="min-h-[44px]">
                <ChevronLeft size={16} className="mr-1" /> Back
              </Button>
              <Button
                variant="outline"
                className="flex-1 min-h-[44px]"
                onClick={() => router.push('/campaigns')}
              >
                Simpan Draft
              </Button>
              <Button
                className="flex-1 min-h-[44px] bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => setShowWarning(true)}
                disabled={loading}
              >
                Kirim Sekarang
              </Button>
            </div>
          </div>

          {/* Validation summary card */}
          {validationStatus && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                📊 Hasil Validasi Kontak
                {validationStatus.pending > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-100 rounded-full px-2 py-0.5">
                    <Loader2 size={11} className="animate-spin" /> Sedang mengecek...
                  </span>
                )}
              </h3>
              <div className="space-y-1.5 text-sm">
                <p className="flex items-center gap-2 text-green-700">
                  <span className="text-base">✅</span>
                  Nomor aktif di WhatsApp: <strong>{validationStatus.valid}</strong>
                </p>
                <p className="flex items-center gap-2 text-red-600">
                  <span className="text-base">❌</span>
                  Nomor tidak aktif / tidak ditemukan: <strong>{validationStatus.invalid}</strong>
                </p>
                {validationStatus.pending > 0 && (
                  <p className="flex items-center gap-2 text-slate-500">
                    <span className="text-base">⏳</span>
                    Belum dicek: <strong>{validationStatus.pending}</strong>
                  </p>
                )}
              </div>
              <p className="text-xs text-amber-700">Pesan hanya akan dikirim ke nomor yang aktif. Kamu tetap bisa mulai sekarang.</p>
            </div>
          )}
        </div>
      )}

      {/* Warning dialog sebelum blast */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Sebelum Mulai Kirim</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <span className="font-medium text-slate-700 block">Tips agar nomor WA kamu aman:</span>
              <span className="block text-sm text-slate-600">• Pastikan kontak adalah orang yang mengenal kamu / pernah berinteraksi</span>
              <span className="block text-sm text-slate-600">• Delay sudah diset {minDelay}–{maxDelay} detik (disarankan 30–60 detik)</span>
              <span className="block text-sm text-slate-600">• Untuk nomor baru ({'<'}3 bulan), maksimal 100 pesan/hari</span>
              <span className="block text-sm text-slate-600">• Gunakan fitur multi nomor WA untuk kontak yang banyak</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => { setShowWarning(false); handleStartBlast() }}
              disabled={loading}
            >
              {loading ? 'Mengirim...' : 'Mengerti, Mulai Kirim'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
