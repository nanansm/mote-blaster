import { Queue } from 'bullmq'
import IORedis from 'ioredis'

const g = global as typeof global & { _redis?: IORedis; _blastQueue?: Queue }

export function getRedis(): IORedis {
  if (g._redis) return g._redis
  const url = new URL(process.env.REDIS_URL || 'redis://localhost:6379')
  g._redis = new IORedis({
    host:                 url.hostname,
    port:                 Number(url.port) || 6379,
    username:             url.username || undefined,
    password:             url.password ? decodeURIComponent(url.password) : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck:     false,
    lazyConnect:          true,
  })
  g._redis.on('error', (e) => {
    if (!e.message.includes('ECONNREFUSED')) console.error('[Redis]', e.message)
  })
  return g._redis
}

export function getBlastQueue(): Queue {
  if (g._blastQueue) return g._blastQueue
  g._blastQueue = new Queue('blast', {
    connection: getRedis(),
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail:     200,
      attempts:         3,
      backoff: { type: 'fixed', delay: 15_000 },
    },
  })
  return g._blastQueue
}
