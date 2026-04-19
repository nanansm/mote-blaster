import { Worker, type Job } from 'bullmq'
import { getRedis } from './index'
import { db } from '@/lib/db'
import { contacts } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { normalizePhone } from '@/lib/utils'
import { getSocketForValidation } from '@/lib/baileys'

export interface WaValidateJobData {
  contactId:   string
  phone:       string
  sessionName: string
}

const g = global as typeof global & { _waValidateWorker?: Worker }

export async function startWaValidateWorker() {
  if (g._waValidateWorker) return

  g._waValidateWorker = new Worker<WaValidateJobData>('wa-validate', async (job: Job<WaValidateJobData>) => {
    const { contactId, phone, sessionName } = job.data

    const sock = getSocketForValidation(sessionName)
    if (!sock) return  // session not connected — leave isValidWa as null

    const normalized = normalizePhone(phone)
    try {
      const result = await sock.onWhatsApp(normalized + '@s.whatsapp.net')
      const isValid = result?.[0]?.exists ?? false
      await db.update(contacts).set({ isValidWa: isValid }).where(eq(contacts.id, contactId))
    } catch {
      // validation failed — leave as null, don't mark as invalid
    }

    // Small delay to avoid spamming WA servers
    await new Promise(r => setTimeout(r, 1_500))
  }, {
    connection:  getRedis(),
    concurrency: 1,
  })

  g._waValidateWorker.on('error', (e) => console.error('[WaValidate Worker]', e))
  console.log('[Mote Blaster] WA Validate Worker started ✓')
}
