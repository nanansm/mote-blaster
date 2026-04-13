import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'

// Hardcoded model lists for providers without a /models endpoint
const CLAUDE_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-haiku-20240307',
]

const PERPLEXITY_MODELS = [
  'sonar',
  'sonar-pro',
  'sonar-reasoning',
  'sonar-reasoning-pro',
]

interface VerifyResult {
  valid:  boolean
  models: string[]
  error?: string
}

async function verifyGemini(apiKey: string): Promise<VerifyResult> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(10_000) },
    )
    if (!res.ok) return { valid: false, models: [], error: `HTTP ${res.status}` }
    const data = await res.json() as {
      models: { name: string; supportedGenerationMethods?: string[] }[]
    }
    const models = (data.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => m.name.replace('models/', ''))
      .filter(Boolean)
    return { valid: true, models }
  } catch (e) {
    return { valid: false, models: [], error: e instanceof Error ? e.message : 'Error' }
  }
}

async function verifyOpenAICompat(
  base: string,
  apiKey: string,
  filterFn: (id: string) => boolean,
): Promise<VerifyResult> {
  try {
    const res = await fetch(`${base}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal:  AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { valid: false, models: [], error: `HTTP ${res.status}` }
    const data = await res.json() as { data: { id: string; owned_by?: string }[] }
    const models = (data.data ?? []).map((m) => m.id).filter(filterFn)
    return { valid: true, models }
  } catch (e) {
    return { valid: false, models: [], error: e instanceof Error ? e.message : 'Error' }
  }
}

async function verifyClaude(apiKey: string): Promise<VerifyResult> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-3-haiku-20240307',
        max_tokens: 5,
        messages:   [{ role: 'user', content: 'Hi' }],
      }),
      signal: AbortSignal.timeout(15_000),
    })
    // 200 = valid, 401/403 = invalid key
    if (res.status === 401 || res.status === 403) return { valid: false, models: [], error: 'Invalid API key' }
    return { valid: true, models: CLAUDE_MODELS }
  } catch (e) {
    return { valid: false, models: [], error: e instanceof Error ? e.message : 'Error' }
  }
}

async function verifyPerplexity(apiKey: string): Promise<VerifyResult> {
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:    'sonar',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (res.status === 401 || res.status === 403) return { valid: false, models: [], error: 'Invalid API key' }
    return { valid: true, models: PERPLEXITY_MODELS }
  } catch (e) {
    return { valid: false, models: [], error: e instanceof Error ? e.message : 'Error' }
  }
}

async function verifyCohere(apiKey: string): Promise<VerifyResult> {
  try {
    const res = await fetch('https://api.cohere.com/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept:        'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { valid: false, models: [], error: `HTTP ${res.status}` }
    const data = await res.json() as { models: { name: string; endpoints?: string[] }[] }
    const EXCLUDED = ['embed', 'classify', 'rerank', 'summarize', 'generate']
    const models = (data.models ?? [])
      .filter((m) => {
        const name = m.name.toLowerCase()
        return !EXCLUDED.some((e) => name.includes(e)) && (m.endpoints ?? []).includes('chat')
      })
      .map((m) => m.name)
    return { valid: true, models }
  } catch (e) {
    return { valid: false, models: [], error: e instanceof Error ? e.message : 'Error' }
  }
}

async function verifyOpenRouter(apiKey: string): Promise<VerifyResult> {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal:  AbortSignal.timeout(10_000),
    })
    if (!res.ok) return { valid: false, models: [], error: `HTTP ${res.status}` }
    const data = await res.json() as {
      data: { id: string; context_length?: number; architecture?: { modality?: string } }[]
    }
    const SKIP_KEYWORDS = ['embed', 'tts', 'whisper', 'dall-e', 'vision', 'image']
    const models = (data.data ?? [])
      .filter((m) => {
        if (!m.context_length || m.context_length <= 0) return false
        const id = m.id.toLowerCase()
        if (SKIP_KEYWORDS.some((k) => id.includes(k))) return false
        const modality = m.architecture?.modality ?? ''
        if (modality.includes('image') || modality === 'text->image') return false
        return true
      })
      .map((m) => m.id)
    return { valid: true, models }
  } catch (e) {
    return { valid: false, models: [], error: e instanceof Error ? e.message : 'Error' }
  }
}

function filterChatGPT(id: string) {
  return id.startsWith('gpt-') || id.startsWith('chatgpt-') || id.startsWith('o1') || id.startsWith('o3')
}

function filterGroq(id: string) {
  const SKIP = ['embed', 'whisper', 'tts', 'vision']
  const lower = id.toLowerCase()
  return !SKIP.some((k) => lower.includes(k))
}

function filterDeepseek(id: string) {
  return id.toLowerCase().includes('deepseek') || id.toLowerCase().includes('chat')
}

function filterMistral(id: string) {
  const SKIP = ['embed', 'moderation', 'ocr']
  const lower = id.toLowerCase()
  return !SKIP.some((k) => lower.includes(k))
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const { provider, apiKey } = await req.json() as { provider: string; apiKey: string }
    if (!provider || !apiKey) {
      return Response.json({ error: 'provider dan apiKey wajib diisi' }, { status: 400 })
    }

    let result: VerifyResult

    switch (provider) {
      case 'gemini':
        result = await verifyGemini(apiKey)
        break
      case 'chatgpt':
        result = await verifyOpenAICompat('https://api.openai.com', apiKey, filterChatGPT)
        break
      case 'claude':
        result = await verifyClaude(apiKey)
        break
      case 'perplexity':
        result = await verifyPerplexity(apiKey)
        break
      case 'groq':
        result = await verifyOpenAICompat('https://api.groq.com/openai', apiKey, filterGroq)
        break
      case 'deepseek':
        result = await verifyOpenAICompat('https://api.deepseek.com', apiKey, filterDeepseek)
        break
      case 'openrouter':
        result = await verifyOpenRouter(apiKey)
        break
      case 'mistral':
        result = await verifyOpenAICompat('https://api.mistral.ai', apiKey, filterMistral)
        break
      case 'cohere':
        result = await verifyCohere(apiKey)
        break
      default:
        return Response.json({ error: `Provider tidak dikenal: ${provider}` }, { status: 400 })
    }

    return Response.json(result)
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
