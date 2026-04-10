// Plain CJS migration runner — no drizzle-kit, no TypeScript.
// Runs all pending SQL files from ./drizzle/migrations/ in order.
// Each SQL file uses "--> statement-breakpoint" to delimit statements.
// After migrations, seeds the owner account if ADMIN_EMAIL + ADMIN_PASSWORD are set.

const { Pool }                  = require('pg')
const fs                        = require('fs')
const path                      = require('path')
const { randomBytes, scrypt }   = require('node:crypto')
const { randomUUID }            = require('node:crypto')

// Hash password dengan Scrypt — algoritma yang sama dengan better-auth
// Format output: "salt:key" (hex)
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString('hex')
    scrypt(
      password.normalize('NFKC'),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (err, key) => {
        if (err) reject(err)
        else resolve(`${salt}:${key.toString('hex')}`)
      }
    )
  })
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('[migrate] ERROR: DATABASE_URL is not set')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    // Create tracking table (idempotent) — never DROP existing tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS __drizzle_migrations (
        id         SERIAL PRIMARY KEY,
        hash       TEXT NOT NULL UNIQUE,
        created_at BIGINT
      )
    `)

    const { rows: applied } = await pool.query('SELECT hash FROM __drizzle_migrations ORDER BY id')
    const done = new Set(applied.map((r) => r.hash))

    const dir = path.join(__dirname, 'drizzle', 'migrations')
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()

    let count = 0
    for (const file of files) {
      if (done.has(file)) {
        console.log('[migrate] skip   ', file)
        continue
      }

      console.log('[migrate] running ', file)
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

      await pool.query(
        'INSERT INTO __drizzle_migrations (hash, created_at) VALUES ($1, $2)',
        [file, Date.now()]
      )
      console.log('[migrate] applied', file)
      count++
    }

    console.log(`[migrate] done — ${count} migration(s) applied`)

    // ── Seed owner ──────────────────────────────────────────────────────
    const adminEmail    = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    if (adminEmail && adminPassword) {
      console.log(`[migrate] seeding owner: ${adminEmail}`)

      const { rows: existing } = await pool.query(
        `SELECT id FROM "user" WHERE email = $1 LIMIT 1`,
        [adminEmail]
      )

      if (existing.length > 0) {
        // Update password jika owner sudah ada
        const hash = await hashPassword(adminPassword)
        await pool.query(
          `UPDATE account SET password = $1 WHERE user_id = $2`,
          [hash, existing[0].id]
        )
        console.log(`[migrate] owner password updated`)
      } else {
        // Insert owner baru
        const hash    = await hashPassword(adminPassword)
        const userId  = randomUUID()
        const now     = new Date().toISOString()

        await pool.query(
          `INSERT INTO "user" (id, name, email, email_verified, plan, role, created_at, updated_at)
           VALUES ($1, $2, $3, true, 'free', 'owner', $4, $4)
           ON CONFLICT DO NOTHING`,
          [userId, 'Owner', adminEmail, now]
        )
        await pool.query(
          `INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
           VALUES ($1, $2, 'credential', $3, $4, $5, $5)
           ON CONFLICT DO NOTHING`,
          [randomUUID(), adminEmail, userId, hash, now]
        )
        console.log(`[migrate] owner created: ${adminEmail}`)
      }
    } else {
      console.log('[migrate] ADMIN_EMAIL/ADMIN_PASSWORD not set, skipping owner seed')
    }
  } finally {
    await pool.end()
  }
}

main().catch((e) => {
  console.error('[migrate] FATAL:', e.message)
  process.exit(1)
})
