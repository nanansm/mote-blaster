import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// SINGLETON PATTERN — jangan buat Pool baru per request
const g = global as typeof global & { _pgPool?: Pool }

if (!g._pgPool) {
  g._pgPool = new Pool({
    connectionString:        process.env.DATABASE_URL!,
    max:                     10,
    idleTimeoutMillis:       30_000,
    connectionTimeoutMillis: 2_000,
  })
}

export const db = drizzle(g._pgPool, { schema })
export type DB = typeof db
