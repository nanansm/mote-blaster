export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startWorker } = await import('./lib/queue/worker')
    await startWorker()

    // Restore sessions yang sebelumnya connected/connecting/qr_code
    try {
      const { db }       = await import('./lib/db')
      const { instances } = await import('./lib/db/schema')
      const { ne }       = await import('drizzle-orm')
      const { startSession } = await import('./lib/baileys')

      const activeInstances = await db
        .select({ sessionName: instances.sessionName, userId: instances.userId, id: instances.id })
        .from(instances)
        .where(ne(instances.status, 'disconnected'))

      for (const inst of activeInstances) {
        startSession(inst.sessionName, inst.userId, inst.id).catch((e) =>
          console.error(`[Baileys] Restore ${inst.sessionName}:`, e)
        )
      }

      if (activeInstances.length > 0) {
        console.log(`[Mote Blaster] Restoring ${activeInstances.length} session(s) ✓`)
      }
    } catch (e) {
      console.error('[Mote Blaster] Session restore error:', e)
    }
  }
}
