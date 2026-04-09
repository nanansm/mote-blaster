// Plain CJS migration runner — no drizzle-kit, no TypeScript.
// Runs all pending SQL files from ./drizzle/migrations/ in order.
// Each SQL file uses "--> statement-breakpoint" to delimit statements.

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('[migrate] ERROR: DATABASE_URL is not set')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    // Drop all tables from old/incompatible schema for a clean start
    await pool.query(`
      DROP TABLE IF EXISTS
        message_logs, contacts, campaigns, instances,
        daily_usage, subscriptions,
        verification, account, session, "user",
        refresh_tokens, accounts, users, sessions,
        _migrations
      CASCADE
    `)
    console.log('[migrate] dropped old tables')

    // Create tracking table (idempotent)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        tag        TEXT UNIQUE NOT NULL,
        applied_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      )
    `)

    const { rows: applied } = await pool.query('SELECT tag FROM _migrations ORDER BY id')
    const done = new Set(applied.map((r) => r.tag))

    const dir = path.join(__dirname, 'drizzle', 'migrations')
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()

    let count = 0
    for (const file of files) {
      const tag = file.replace('.sql', '')

      if (done.has(tag)) {
        console.log('[migrate] skip   ', file)
        continue
      }

      console.log('[migrate] running', file)
      const sql = fs.readFileSync(path.join(dir, file), 'utf8')

      // Drizzle separates statements with "--> statement-breakpoint"
      const statements = sql
        .split('--> statement-breakpoint')
        .map((s) => s.trim())
        .filter(Boolean)

      for (const stmt of statements) {
        try {
          await pool.query(stmt)
        } catch (e) {
          // 42P07 = duplicate table, 42710 = duplicate type/object
          if (e.code === '42P07' || e.code === '42710') {
            console.log('[migrate] already exists, skipping statement')
          } else {
            throw e
          }
        }
      }

      await pool.query('INSERT INTO _migrations (tag) VALUES ($1)', [tag])
      console.log('[migrate] applied', file)
      count++
    }

    console.log(`[migrate] done — ${count} migration(s) applied`)
  } finally {
    await pool.end()
  }
}

main().catch((e) => {
  console.error('[migrate] FATAL:', e.message)
  process.exit(1)
})
