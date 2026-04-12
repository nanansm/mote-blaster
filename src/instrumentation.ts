export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startWorker } = await import('./lib/queue/worker')
    await startWorker()

    const { startChatRecordWorker } = await import('./lib/queue/chat-record-worker')
    await startChatRecordWorker()

    // Jangan restore sessions di production saat startup —
    // user connect manual via dashboard, mencegah memory spike
    if (process.env.NODE_ENV !== 'production') {
      setTimeout(async () => {
        try {
          const { restoreSessions } = await import('./lib/baileys/index')
          await restoreSessions()
        } catch (e) {
          console.error('[Session] Restore error:', e)
        }
      }, 10_000)
    }
  }
}
