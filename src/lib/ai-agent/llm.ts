export interface LLMMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface LLMConfig {
  provider:     string
  apiKey:       string
  model:        string
  systemPrompt: string
  strictRules:  string
  messages:     LLMMessage[]
}

/** Unified LLM caller — all providers, single interface. */
export async function callLLM(cfg: LLMConfig): Promise<string> {
  const system = cfg.strictRules
    ? `${cfg.systemPrompt}\n\nSTRICT RULES:\n${cfg.strictRules}`
    : cfg.systemPrompt

  switch (cfg.provider) {
    case 'gemini':
      return callGemini(cfg.apiKey, cfg.model, system, cfg.messages)
    case 'chatgpt':
      return callOpenAICompat('https://api.openai.com', cfg.apiKey, cfg.model, system, cfg.messages)
    case 'claude':
      return callClaude(cfg.apiKey, cfg.model, system, cfg.messages)
    case 'perplexity':
      return callOpenAICompat('https://api.perplexity.ai', cfg.apiKey, cfg.model, system, cfg.messages)
    case 'groq':
      return callOpenAICompat('https://api.groq.com/openai', cfg.apiKey, cfg.model, system, cfg.messages)
    case 'deepseek':
      return callOpenAICompat('https://api.deepseek.com', cfg.apiKey, cfg.model, system, cfg.messages)
    case 'openrouter':
      return callOpenAICompat('https://openrouter.ai/api', cfg.apiKey, cfg.model, system, cfg.messages)
    case 'mistral':
      return callOpenAICompat('https://api.mistral.ai', cfg.apiKey, cfg.model, system, cfg.messages)
    case 'cohere':
      return callCohere(cfg.apiKey, cfg.model, system, cfg.messages)
    default:
      throw new Error(`Unknown LLM provider: ${cfg.provider}`)
  }
}

// ── OpenAI-compatible providers ───────────────────────────────────────
async function callOpenAICompat(
  base: string,
  apiKey: string,
  model: string,
  system: string,
  messages: LLMMessage[],
): Promise<string> {
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...messages],
      max_tokens: 1024,
    }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`${base} ${res.status}: ${txt}`)
  }
  const data = await res.json() as { choices: { message: { content: string } }[] }
  return data.choices?.[0]?.message?.content ?? ''
}

// ── Gemini ────────────────────────────────────────────────────────────
async function callGemini(
  apiKey: string,
  model: string,
  system: string,
  messages: LLMMessage[],
): Promise<string> {
  const contents = messages.map((m) => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: 1024 },
      }),
    },
  )
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Gemini ${res.status}: ${txt}`)
  }
  const data = await res.json() as {
    candidates: { content: { parts: { text: string }[] } }[]
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// ── Claude ────────────────────────────────────────────────────────────
async function callClaude(
  apiKey: string,
  model: string,
  system: string,
  messages: LLMMessage[],
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      messages,
    }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Claude ${res.status}: ${txt}`)
  }
  const data = await res.json() as { content: { type: string; text: string }[] }
  return data.content?.find((c) => c.type === 'text')?.text ?? ''
}

// ── Cohere ────────────────────────────────────────────────────────────
async function callCohere(
  apiKey: string,
  model: string,
  system: string,
  messages: LLMMessage[],
): Promise<string> {
  const res = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      system,
      messages,
      max_tokens: 1024,
    }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`Cohere ${res.status}: ${txt}`)
  }
  const data = await res.json() as {
    message: { content: { type: string; text: string }[] }
  }
  return data.message?.content?.find((c) => c.type === 'text')?.text ?? ''
}
