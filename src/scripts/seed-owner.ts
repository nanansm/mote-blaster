import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db } from '../lib/db'
import { users, accounts } from '../lib/db/schema'
import { createId } from '@paralleldrive/cuid2'
import { randomBytes, scrypt } from 'node:crypto'

// Gunakan algoritma Scrypt yang sama dengan better-auth (@better-auth/utils/password)
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const key  = await new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (err, key) => err ? reject(err) : resolve(key)
    )
  })
  return `${salt}:${key.toString('hex')}`
}

async function main() {
  const email    = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    console.error('❌ Set ADMIN_EMAIL dan ADMIN_PASSWORD di .env.local')
    process.exit(1)
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing) {
    // Update password jika sudah ada
    console.log(`ℹ️  Owner ${email} sudah ada, update password...`)
    const hash = await hashPassword(password)
    await db.update(accounts)
      .set({ password: hash, updatedAt: new Date() })
      .where(eq(accounts.userId, existing.id))
    console.log(`✅ Password diupdate untuk: ${email}`)
    process.exit(0)
  }

  const hash   = await hashPassword(password)
  const userId = createId()
  const now    = new Date()

  await db.insert(users).values({
    id: userId, name: 'Owner', email,
    emailVerified: true, plan: 'free', role: 'owner',
    createdAt: now, updatedAt: now,
  })
  await db.insert(accounts).values({
    id: createId(), accountId: email, providerId: 'credential',
    userId, password: hash, createdAt: now, updatedAt: now,
  })

  console.log(`✅ Owner dibuat: ${email}`)
  console.log(`   Login: http://localhost:3000/admin-login`)
  process.exit(0)
}

main().catch(e => { console.error('❌', e); process.exit(1) })
