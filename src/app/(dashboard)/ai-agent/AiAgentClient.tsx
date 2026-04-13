'use client'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Bot, Eye, EyeOff, ChevronDown, ChevronUp, Loader2, Check, AlertCircle, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ── Types ─────────────────────────────────────────────────────────────
interface Instance {
  id:     string
  name:   string
  status: string
}

interface SheetConfig {
  id:           string
  instanceName: string | null
  spreadsheetId: string
  sheetName:    string
}

interface AgentData {
  id:             string
  instanceId:     string
  instanceName:   string | null
  isActive:       boolean
  provider:       string
  model:          string
  systemPrompt:   string
  strictRules:    string
  mediaReplyText: string
  sheetConfigId:  string | null
}

interface PausedChat {
  id:          string
  phoneNumber: string
  pausedAt:    string
  resumeAt:    string
}

type TabId = 'config' | 'prompt' | 'paused'

const TABS: { id: TabId; label: string }[] = [
  { id: 'config', label: 'Konfigurasi AI' },
  { id: 'prompt', label: 'Prompt' },
  { id: 'paused', label: 'Paused Chat' },
]

const PROVIDERS = [
  { value: 'gemini',      label: 'Gemini (Google)' },
  { value: 'chatgpt',     label: 'ChatGPT (OpenAI)' },
  { value: 'claude',      label: 'Claude (Anthropic)' },
  { value: 'perplexity',  label: 'Perplexity' },
  { value: 'groq',        label: 'Groq' },
  { value: 'deepseek',    label: 'Deepseek' },
  { value: 'openrouter',  label: 'OpenRouter' },
  { value: 'mistral',     label: 'Mistral' },
  { value: 'cohere',      label: 'Cohere' },
]

// ── Toggle component ──────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-amber-400' : 'bg-slate-200'
      }`}
    >
      <span
        className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
          checked ? 'translate-x-7' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

// ── Tutorial Accordion ────────────────────────────────────────────────
function TutorialAccordion({ title, children, open, onToggle }: {
  title: string
  children: React.ReactNode
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📖</span>
          <span className="font-semibold text-slate-800 text-sm">{title}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 text-sm text-slate-700 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────
export default function AiAgentClient() {
  // Auth/plan state
  const [isPro, setIsPro]             = useState<boolean | null>(null)
  const [loadingPage, setLoadingPage] = useState(true)

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('config')

  // Agent data
  const [agent, setAgent]           = useState<AgentData | null>(null)
  const [instances, setInstances]   = useState<Instance[]>([])
  const [sheets, setSheets]         = useState<SheetConfig[]>([])
  const [pausedChats, setPausedChats] = useState<PausedChat[]>([])

  // Form state — Config tab
  const [provider, setProvider]         = useState('gemini')
  const [apiKey, setApiKey]             = useState('')
  const [showApiKey, setShowApiKey]     = useState(false)
  const [model, setModel]               = useState('')
  const [models, setModels]             = useState<string[]>([])
  const [keyVerified, setKeyVerified]   = useState(false)
  const [instanceId, setInstanceId]     = useState('')
  const [sheetConfigId, setSheetConfigId] = useState('')

  // Form state — Prompt tab
  const [systemPrompt, setSystemPrompt]       = useState('')
  const [strictRules, setStrictRules]         = useState('')
  const [mediaReplyText, setMediaReplyText]   = useState('Mohon maaf, saat ini saya hanya bisa membalas pesan teks.')

  // UI state
  const [verifying, setVerifying]           = useState(false)
  const [savingConfig, setSavingConfig]     = useState(false)
  const [savingPrompt, setSavingPrompt]     = useState(false)
  const [toggling, setToggling]             = useState(false)
  const [tutorialConfigOpen, setTutorialConfigOpen] = useState(false)
  const [tutorialPromptOpen, setTutorialPromptOpen] = useState(false)
  const [tutorialPausedOpen, setTutorialPausedOpen] = useState(false)

  const pausedInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Load data ───────────────────────────────────────────────────────
  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Poll paused chats every 60s
  useEffect(() => {
    pausedInterval.current = setInterval(loadPausedChats, 60_000)
    return () => { if (pausedInterval.current) clearInterval(pausedInterval.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadAll() {
    setLoadingPage(true)
    try {
      const [agentRes, instRes, sheetRes] = await Promise.all([
        fetch('/api/ai-agent'),
        fetch('/api/instances'),
        fetch('/api/chat-recording'),
      ])

      if (agentRes.status === 403) {
        setIsPro(false)
        setLoadingPage(false)
        return
      }
      setIsPro(true)

      const agentData = await agentRes.json()
      if (agentData.data) {
        const a = agentData.data as AgentData
        setAgent(a)
        setProvider(a.provider)
        setModel(a.model)
        setModels([a.model])
        setInstanceId(a.instanceId)
        setSheetConfigId(a.sheetConfigId ?? '')
        setSystemPrompt(a.systemPrompt)
        setStrictRules(a.strictRules)
        setMediaReplyText(a.mediaReplyText)
      }

      const instData = await instRes.json()
      setInstances(instData.data ?? [])

      if (sheetRes.ok) {
        const sheetData = await sheetRes.json()
        setSheets(sheetData.data ?? [])
      }

      await loadPausedChats()
    } catch {
      toast.error('Gagal memuat data')
    } finally {
      setLoadingPage(false)
    }
  }

  async function loadPausedChats() {
    try {
      const res = await fetch('/api/ai-agent/paused-chats')
      if (res.ok) {
        const data = await res.json()
        setPausedChats(data.data ?? [])
      }
    } catch {}
  }

  // ── Verify API key ──────────────────────────────────────────────────
  async function handleVerify() {
    if (!apiKey.trim()) { toast.error('Masukkan API key terlebih dahulu'); return }
    setVerifying(true)
    setKeyVerified(false)
    setModels([])
    setModel('')
    try {
      const res  = await fetch('/api/ai-agent/verify-key', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ provider, apiKey }),
      })
      const data = await res.json()
      if (data.valid) {
        setKeyVerified(true)
        setModels(data.models ?? [])
        if (data.models?.length > 0) setModel(data.models[0])
        toast.success('API key valid!')
      } else {
        toast.error(data.error ?? 'API key tidak valid')
      }
    } catch {
      toast.error('Gagal verifikasi API key')
    } finally {
      setVerifying(false)
    }
  }

  // ── Save config (Tab 1) ─────────────────────────────────────────────
  async function handleSaveConfig() {
    if (!instanceId) { toast.error('Pilih WA instance terlebih dahulu'); return }
    if (!provider)   { toast.error('Pilih provider LLM'); return }
    if (!model)      { toast.error('Pilih model LLM'); return }

    if (apiKey && apiKey !== '••••••••' && !keyVerified) {
      toast.error('Verifikasi API key terlebih dahulu')
      return
    }

    if (!agent && (!apiKey || apiKey === '••••••••')) {
      toast.error('API key wajib diisi untuk agent baru')
      return
    }

    setSavingConfig(true)
    try {
      const body: Record<string, unknown> = {
        instanceId,
        provider,
        model,
        systemPrompt,
        strictRules,
        mediaReplyText,
        sheetConfigId: sheetConfigId || null,
        apiKey: (apiKey && apiKey !== '••••••••') ? apiKey : '__keep__',
      }

      const res  = await fetch('/api/ai-agent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Gagal menyimpan'); return }
      setAgent(data.data)
      setApiKey('')
      toast.success('Konfigurasi AI Agent tersimpan!')
    } catch {
      toast.error('Gagal menyimpan konfigurasi')
    } finally {
      setSavingConfig(false)
    }
  }

  // ── Save prompt (Tab 2) ─────────────────────────────────────────────
  async function handleSavePrompt() {
    if (!agent) {
      toast.error('Simpan Konfigurasi AI terlebih dahulu di tab "Konfigurasi AI"')
      return
    }

    setSavingPrompt(true)
    try {
      const body: Record<string, unknown> = {
        instanceId: agent.instanceId,
        provider:   agent.provider,
        model:      agent.model,
        systemPrompt,
        strictRules,
        mediaReplyText,
        sheetConfigId: agent.sheetConfigId ?? null,
        apiKey: '__keep__',
      }

      const res  = await fetch('/api/ai-agent', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Gagal menyimpan'); return }
      setAgent(data.data)
      toast.success('Prompt tersimpan!')
    } catch {
      toast.error('Gagal menyimpan prompt')
    } finally {
      setSavingPrompt(false)
    }
  }

  // ── Toggle active ───────────────────────────────────────────────────
  async function handleToggle(val: boolean) {
    if (!agent) { toast.error('Simpan konfigurasi terlebih dahulu'); return }
    setToggling(true)
    try {
      const res  = await fetch('/api/ai-agent/toggle', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ isActive: val }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Gagal mengubah status'); return }
      setAgent((prev) => prev ? { ...prev, isActive: data.data.isActive } : prev)
      toast.success(val ? 'AI Agent diaktifkan' : 'AI Agent dinonaktifkan')
    } catch {
      toast.error('Gagal mengubah status AI Agent')
    } finally {
      setToggling(false)
    }
  }

  // ── When provider changes, reset verification ──────────────────────
  function handleProviderChange(val: string) {
    setProvider(val)
    setKeyVerified(false)
    setModels([])
    setModel('')
    setApiKey('')
  }

  // ── Helpers ─────────────────────────────────────────────────────────
  function formatRemaining(resumeAt: string) {
    const diff = new Date(resumeAt).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const mins = Math.ceil(diff / 60_000)
    if (mins < 60) return `${mins} menit lagi`
    const hrs = Math.floor(mins / 60)
    const rem = mins % 60
    return rem > 0 ? `${hrs}j ${rem}m lagi` : `${hrs} jam lagi`
  }

  // ── Loading / not pro ───────────────────────────────────────────────
  if (loadingPage) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    )
  }

  if (!isPro) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
          <Bot className="mx-auto mb-4 text-amber-500" size={48} />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Fitur AI Agent</h2>
          <p className="text-slate-600 mb-6">
            Fitur AI Agent hanya tersedia untuk pengguna <strong>Pro</strong>.
            Upgrade sekarang untuk mengaktifkan chatbot WhatsApp otomatis berbasis AI.
          </p>
          <Button
            onClick={async () => {
              const res  = await fetch('/api/billing/subscribe', { method: 'POST' })
              const data = await res.json()
              if (data.paymentUrl) window.open(data.paymentUrl, '_blank')
              else toast.error(data.error ?? 'Gagal membuat link pembayaran')
            }}
            className="bg-amber-400 hover:bg-amber-500 text-[#1a3a2a] font-bold"
          >
            Upgrade ke Pro
          </Button>
        </div>
      </div>
    )
  }

  // ── Main UI ─────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 space-y-5">
      {/* Header — always visible */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Bot size={24} className="text-amber-500 shrink-0" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">AI Agent</h1>
            <p className="text-sm text-slate-500">Chatbot WhatsApp otomatis berbasis AI</p>
          </div>
          <Badge className="bg-amber-400 text-[#1a3a2a] text-xs font-bold">PRO</Badge>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-medium text-slate-600">
            {agent?.isActive ? 'Aktif' : 'Nonaktif'}
          </span>
          <Toggle
            checked={agent?.isActive ?? false}
            onChange={handleToggle}
            disabled={toggling || !agent}
          />
        </div>
      </div>

      {/* Tab navigation — same pattern as Campaigns */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 md:px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Konfigurasi AI ─────────────────────────────────────── */}
      {activeTab === 'config' && (
        <div className="space-y-5">
          {/* Provider */}
          <div className="space-y-1.5">
            <Label htmlFor="provider">Provider LLM</Label>
            <Select value={provider} onValueChange={(v) => handleProviderChange(v ?? '')}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Pilih provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key + Verify */}
          <div className="space-y-1.5">
            <Label htmlFor="apikey">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="apikey"
                  type={showApiKey ? 'text' : 'password'}
                  placeholder={agent ? 'Kosongkan untuk mempertahankan key lama' : 'Masukkan API key...'}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value)
                    setKeyVerified(false)
                    setModels([])
                    setModel('')
                  }}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Button
                variant="outline"
                onClick={handleVerify}
                disabled={verifying || !apiKey.trim() || apiKey === '••••••••'}
                className="shrink-0"
              >
                {verifying
                  ? <Loader2 size={16} className="animate-spin" />
                  : keyVerified
                    ? <><Check size={14} className="text-green-500 mr-1" /> Verified</>
                    : 'Verify'
                }
              </Button>
            </div>
            {keyVerified && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Check size={12} /> API key valid
              </p>
            )}
          </div>

          {/* Model — shown only after verify or if existing agent */}
          {(models.length > 0 || (agent && model)) && (
            <div className="space-y-1.5">
              <Label htmlFor="model">Model</Label>
              <Select value={model} onValueChange={(v) => setModel(v ?? '')}>
                <SelectTrigger id="model">
                  <SelectValue placeholder="Pilih model" />
                </SelectTrigger>
                <SelectContent>
                  {models.length > 0
                    ? models.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)
                    : <SelectItem value={model}>{model}</SelectItem>
                  }
                </SelectContent>
              </Select>
            </div>
          )}

          {/* WA Instance */}
          <div className="space-y-1.5">
            <Label htmlFor="instance">WA Instance</Label>
            <Select value={instanceId} onValueChange={(v) => setInstanceId(v ?? '')}>
              <SelectTrigger id="instance">
                <SelectValue placeholder="Pilih WA instance" />
              </SelectTrigger>
              <SelectContent>
                {instances.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    {inst.name}
                    <span className={`ml-2 text-xs ${inst.status === 'connected' ? 'text-green-500' : 'text-slate-400'}`}>
                      ({inst.status})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Google Sheet */}
          <div className="space-y-1.5">
            <Label htmlFor="sheet">Google Sheet (dari WA Chat Recording)</Label>
            <Select value={sheetConfigId} onValueChange={(v) => setSheetConfigId(v ?? '')}>
              <SelectTrigger id="sheet">
                <SelectValue placeholder="Pilih konfigurasi sheet (opsional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Tidak pakai sheet —</SelectItem>
                {sheets.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.instanceName ? `${s.instanceName} — ` : ''}{s.sheetName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500">
              Digunakan untuk konteks percakapan &amp; nomor exclude. Harus dari WA Chat Recording yang sudah dikonfigurasi.
            </p>
          </div>

          {/* Save config button */}
          <Button
            onClick={handleSaveConfig}
            disabled={savingConfig}
            className="w-full bg-[#1a3a2a] hover:bg-[#1a3a2a]/90 text-white"
          >
            {savingConfig ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
            💾 Simpan Konfigurasi
          </Button>

          {/* Tutorial accordion */}
          <TutorialAccordion
            title="Cara Setup AI Agent"
            open={tutorialConfigOpen}
            onToggle={() => setTutorialConfigOpen((v) => !v)}
          >
            <ol className="space-y-2 pl-4 list-decimal leading-relaxed">
              <li>Pilih provider LLM (kami rekomendasikan <strong>Gemini</strong> untuk pemula — gratis!)</li>
              <li>Dapatkan API key dari provider yang dipilih</li>
              <li>Paste API key dan klik <strong>Verify</strong> untuk memastikan key valid</li>
              <li>Pilih model AI yang ingin digunakan</li>
              <li>Pilih WA Instance yang sudah ter-connect</li>
              <li>Pilih Google Sheet yang sudah di-setup di WA Chat Recording</li>
              <li>Klik Simpan, lalu aktifkan toggle di atas</li>
            </ol>
            <div className="mt-3">
              <p className="text-sm font-medium text-slate-700 mb-2">🎥 Cara Mendapatkan API Key</p>
              <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                <p className="text-slate-400 text-sm">Video tutorial akan ditampilkan di sini</p>
              </div>
            </div>
          </TutorialAccordion>
        </div>
      )}

      {/* ── Tab 2: Prompt ─────────────────────────────────────────────── */}
      {activeTab === 'prompt' && (
        <div className="space-y-5">
          {/* System Prompt */}
          <div className="space-y-1.5">
            <Label htmlFor="systemprompt">System Prompt</Label>
            <Textarea
              id="systemprompt"
              placeholder="Contoh: Kamu adalah asisten customer service toko online kami. Jawab dengan ramah dan profesional dalam Bahasa Indonesia."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={5}
              className="resize-y min-h-[120px]"
            />
          </div>

          {/* Strict Rules */}
          <div className="space-y-1.5">
            <Label htmlFor="strictrules">Strict Rules</Label>
            <Textarea
              id="strictrules"
              placeholder={`Contoh:\n1. Jangan pernah kasih diskon tanpa approval admin\n2. Jangan jawab pertanyaan di luar produk\n3. Jika customer minta bicara manusia, bilang akan dihubungi admin segera`}
              value={strictRules}
              onChange={(e) => setStrictRules(e.target.value)}
              rows={5}
              className="resize-y min-h-[120px]"
            />
            <p className="text-xs text-slate-500">Rules ini ditambahkan setelah system prompt dan wajib diikuti oleh AI.</p>
          </div>

          {/* Media Reply Text */}
          <div className="space-y-1.5">
            <Label htmlFor="mediareply">Balas Pesan Media (foto/voice/file)</Label>
            <Textarea
              id="mediareply"
              value={mediaReplyText}
              onChange={(e) => setMediaReplyText(e.target.value)}
              rows={3}
              className="resize-y min-h-[80px]"
            />
            <p className="text-xs text-slate-500">Pesan otomatis yang dikirim jika customer mengirim foto, voice note, atau file.</p>
          </div>

          {/* Save prompt button */}
          <Button
            onClick={handleSavePrompt}
            disabled={savingPrompt}
            className="w-full bg-[#1a3a2a] hover:bg-[#1a3a2a]/90 text-white"
          >
            {savingPrompt ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
            💾 Simpan Prompt
          </Button>

          {/* Tutorial accordion */}
          <TutorialAccordion
            title="Tips Menulis Prompt yang Efektif"
            open={tutorialPromptOpen}
            onToggle={() => setTutorialPromptOpen((v) => !v)}
          >
            <ul className="space-y-1.5 pl-4 list-disc leading-relaxed">
              <li>Mulai dengan mendeskripsikan peran AI (contoh: &ldquo;Kamu adalah CS toko X&rdquo;)</li>
              <li>Tentukan gaya bicara (formal/informal, bahasa yang digunakan)</li>
              <li>Berikan konteks tentang bisnis kamu (produk, layanan, jam operasional)</li>
              <li>Tentukan batasan di Strict Rules — apa yang TIDAK boleh dijawab AI</li>
              <li>Gunakan bahasa yang natural dan spesifik</li>
              <li>Test prompt kamu dengan mengirim chat ke nomor WA yang sudah di-connect</li>
              <li>Perbaiki prompt secara berkala berdasarkan hasil percakapan di Google Sheet</li>
            </ul>
          </TutorialAccordion>
        </div>
      )}

      {/* ── Tab 3: Paused Chat ─────────────────────────────────────────── */}
      {activeTab === 'paused' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Auto-refresh setiap 60 detik</p>
            <Button variant="outline" size="sm" onClick={loadPausedChats} className="text-xs">
              Refresh
            </Button>
          </div>

          {pausedChats.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">Tidak ada chat yang sedang di-pause</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-4 py-3 text-slate-600 font-medium">Nomor WhatsApp</th>
                      <th className="text-left px-4 py-3 text-slate-600 font-medium">Sisa Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pausedChats.map((p) => (
                      <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono text-slate-800">{p.phoneNumber}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 text-xs font-medium">
                            <AlertCircle size={11} />
                            {formatRemaining(p.resumeAt)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tutorial accordion */}
          <TutorialAccordion
            title="Tentang Human Takeover"
            open={tutorialPausedOpen}
            onToggle={() => setTutorialPausedOpen((v) => !v)}
          >
            <ul className="space-y-1.5 pl-4 list-disc leading-relaxed">
              <li>Jika kamu reply chat secara manual dari HP, AI Agent otomatis berhenti untuk nomor tersebut selama <strong>1 jam</strong></li>
              <li>Setelah 1 jam, jika ada chat baru dari nomor tersebut, AI akan aktif kembali</li>
              <li>Nomor yang ada di kolom &ldquo;exclude_number&rdquo; di Google Sheet tidak akan pernah dibalas AI</li>
            </ul>
          </TutorialAccordion>
        </div>
      )}
    </div>
  )
}
