import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { users, instances, aiAgents, chatRecordingConfigs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { isProActive } from '@/lib/plan-helpers'
import { encrypt, decrypt } from '@/lib/ai-agent/crypto'

async function checkPro(userId: string) {
  const [u] = await db
    .select({ plan: users.plan, proExpiresAt: users.proExpiresAt })
    .from(users).where(eq(users.id, userId))
  return u && isProActive(u)
}

export async function GET() {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const pro = await checkPro(session.user.id)
    if (!pro) return Response.json({ error: 'Fitur ini hanya tersedia untuk paket Pro aktif' }, { status: 403 })

    const [agent] = await db
      .select({
        id:             aiAgents.id,
        instanceId:     aiAgents.instanceId,
        instanceName:   instances.name,
        isActive:       aiAgents.isActive,
        provider:       aiAgents.provider,
        model:          aiAgents.model,
        systemPrompt:   aiAgents.systemPrompt,
        strictRules:    aiAgents.strictRules,
        mediaReplyText: aiAgents.mediaReplyText,
        sheetConfigId:  aiAgents.sheetConfigId,
        createdAt:      aiAgents.createdAt,
      })
      .from(aiAgents)
      .leftJoin(instances, eq(aiAgents.instanceId, instances.id))
      .where(eq(aiAgents.userId, session.user.id))
      .limit(1)

    if (!agent) return Response.json({ data: null })

    // Return masked API key (never send plaintext)
    return Response.json({ data: { ...agent, apiKey: '••••••••' } })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    const pro = await checkPro(session.user.id)
    if (!pro) return Response.json({ error: 'Fitur ini hanya tersedia untuk paket Pro aktif' }, { status: 403 })

    const body = await req.json() as {
      instanceId:     string
      provider:       string
      apiKey:         string
      model:          string
      systemPrompt:   string
      strictRules:    string
      mediaReplyText: string
      sheetConfigId:  string | null
    }

    const { instanceId, provider, apiKey, model, systemPrompt, strictRules, mediaReplyText, sheetConfigId } = body

    if (!instanceId || !provider || !apiKey || !model) {
      return Response.json({ error: 'instanceId, provider, apiKey, dan model wajib diisi' }, { status: 400 })
    }

    // Verify instance belongs to user
    const [inst] = await db
      .select({ id: instances.id })
      .from(instances)
      .where(and(eq(instances.id, instanceId), eq(instances.userId, session.user.id)))
    if (!inst) return Response.json({ error: 'Instance tidak ditemukan' }, { status: 404 })

    // Verify sheet config belongs to user if provided
    if (sheetConfigId) {
      const [cfg] = await db
        .select({ id: chatRecordingConfigs.id })
        .from(chatRecordingConfigs)
        .where(and(eq(chatRecordingConfigs.id, sheetConfigId), eq(chatRecordingConfigs.userId, session.user.id)))
      if (!cfg) return Response.json({ error: 'Konfigurasi sheet tidak ditemukan' }, { status: 404 })
    }

    // Upsert: max 1 agent per user
    const [existing] = await db
      .select({ id: aiAgents.id, apiKey: aiAgents.apiKey })
      .from(aiAgents)
      .where(eq(aiAgents.userId, session.user.id))

    // Determine which API key to store
    const isNewKey = apiKey && apiKey !== '••••••••' && apiKey !== '__keep__'
    const keyToStore = isNewKey ? encrypt(apiKey) : (existing?.apiKey ?? null)

    if (!keyToStore) {
      return Response.json({ error: 'API key wajib diisi' }, { status: 400 })
    }

    if (existing) {
      const [updated] = await db
        .update(aiAgents)
        .set({
          instanceId,
          provider,
          apiKey:         keyToStore,
          model,
          systemPrompt:   systemPrompt ?? '',
          strictRules:    strictRules ?? '',
          mediaReplyText: mediaReplyText || 'Mohon maaf, saat ini saya hanya bisa membalas pesan teks.',
          sheetConfigId:  sheetConfigId || null,
          updatedAt:      new Date(),
        })
        .where(eq(aiAgents.id, existing.id))
        .returning()
      return Response.json({ data: { ...updated, apiKey: '••••••••' } })
    }

    const [created] = await db
      .insert(aiAgents)
      .values({
        userId:         session.user.id,
        instanceId,
        provider,
        apiKey:         keyToStore,
        model,
        systemPrompt:   systemPrompt ?? '',
        strictRules:    strictRules ?? '',
        mediaReplyText: mediaReplyText || 'Mohon maaf, saat ini saya hanya bisa membalas pesan teks.',
        sheetConfigId:  sheetConfigId || null,
        isActive:       false,
      })
      .returning()

    return Response.json({ data: { ...created, apiKey: '••••••••' } }, { status: 201 })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    await db.delete(aiAgents).where(eq(aiAgents.userId, session.user.id))
    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Server error' }, { status: 500 })
  }
}
