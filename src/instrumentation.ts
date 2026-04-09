export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startWorker } = await import('./lib/queue/worker')
    await startWorker()

    // Delay restore sessions agar server sempat ready dulu
    setTimeout(async () => {
      try {
        const { restoreSessions } = await import('./lib/baileys/index')
        await restoreSessions()
      } catch (e) {
        console.error('[Session] Restore error:', e)
      }
    }, 10_000) // tunggu 10 detik setelah server ready
  }
}
