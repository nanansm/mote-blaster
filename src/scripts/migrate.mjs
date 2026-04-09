// Pure-JS migration runner — no drizzle-kit CLI required.
// Uses pg directly (always present in standalone node_modules).
// Run: node migrate.mjs   (cwd must be /app in container)

import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Pool } = pg
const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('[migrate] DATABASE_URL is not set')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  // Tracking table (idempotent)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id      SERIAL PRIMARY KEY,
      tag     TEXT UNIQUE NOT NULL,
      applied_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
    )
  `)

  const { rows: applied } = await pool.query('SELECT tag FROM _migrations ORDER BY id')
  const done = new Set(applied.map((r) => r.tag))

  // Resolve migrations dir relative to this script's location OR cwd
  const candidates = [
    join(__dirname, '../../drizzle/migrations'),   // src/scripts/ -> drizzle/
    join(process.cwd(), 'drizzle/migrations'),      // container /app
  ]
  let migrationsDir = candidates[0]
  for (const c of candidates) {
    try {
      await readdir(c)
      migrationsDir = c
      break
    } catch { /* try next */ }
  }

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort()

  let count = 0
  for (const file of files) {
    const tag = file.replace('.sql', '')
    if (done.has(tag)) {
      console.log(`[migrate] skip   ${file}`)
      continue
    }

    const sql = await readFile(join(migrationsDir, file), 'utf-8')

    // Drizzle uses "--> statement-breakpoint" to separate DDL statements
    const statements = sql
      .split('--> statement-breakpoint')
      .map((s) => s.trim())
      .filter(Boolean)

    for (const stmt of statements) {
      await pool.query(stmt)
    }

    await pool.query('INSERT INTO _migrations (tag) VALUES ($1)', [tag])
    console.log(`[migrate] applied ${file}`)
    count++
  }

  await pool.end()
  console.log(`[migrate] done — ${count} migration(s) applied`)
}

main().catch((err) => {
  console.error('[migrate] FATAL:', err.message)
  process.exit(1)
})
