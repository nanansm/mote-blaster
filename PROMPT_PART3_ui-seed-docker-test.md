## ══════════════════════════════════════════
## FASE 8 — SEED SCRIPT
## ══════════════════════════════════════════

**`src/scripts/seed-owner.ts`:**
```typescript
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db } from '../lib/db'
import { users, accounts } from '../lib/db/schema'
import bcrypt from 'bcryptjs'
import { createId } from '@paralleldrive/cuid2'

async function main() {
  const email    = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    console.error('❌ Set ADMIN_EMAIL dan ADMIN_PASSWORD di .env.local')
    process.exit(1)
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing) {
    console.log(`ℹ️  Owner ${email} sudah ada.`)
    process.exit(0)
  }

  const hash   = await bcrypt.hash(password, 12)
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
```

---

## ══════════════════════════════════════════
## FASE 9 — DOCKERFILE & COMPOSE
## ══════════════════════════════════════════

**`Dockerfile`:**
```dockerfile
# Stage 1: Install deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Runner (image sekecil mungkin)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static     ./.next/static
COPY --from=builder /app/public           ./public

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

**`docker-compose.yml`:**
```yaml
version: '3.8'

services:
  app:
    build: .
    restart: unless-stopped
    ports: ["3000:3000"]
    environment:
      DATABASE_URL:                postgres://postgres:postgres@db:5432/mote
      REDIS_URL:                   redis://redis:6379
      BETTER_AUTH_SECRET:          dev_secret_32_chars_minimum_ganti_ini
      BETTER_AUTH_URL:             http://localhost:3000
      NEXT_PUBLIC_APP_URL:         http://localhost:3000
      GOOGLE_CLIENT_ID:            ${GOOGLE_CLIENT_ID:-placeholder}
      GOOGLE_CLIENT_SECRET:        ${GOOGLE_CLIENT_SECRET:-placeholder}
      GOOGLE_SERVICE_ACCOUNT_JSON: '{"type":"service_account","project_id":"placeholder"}'
      WPPCONNECT_BASE_URL:         http://wppconnect:21465
      WPPCONNECT_SECRET_KEY:       local_secret
      XENDIT_SECRET_KEY:           xnd_dev_placeholder
      XENDIT_WEBHOOK_TOKEN:        local_token
      XENDIT_PRO_PLAN_PRICE:       "99000"
      FREE_PLAN_DAILY_LIMIT:       "50"
      FREE_PLAN_MAX_INSTANCES:     "1"
      FREE_PLAN_MAX_CAMPAIGNS:     "2"
      MIN_DELAY_SECONDS:           "10"
      ADMIN_EMAIL:                 ${ADMIN_EMAIL:-admin@example.com}
      ADMIN_PASSWORD:              ${ADMIN_PASSWORD:-changeme}
    depends_on:
      db:    { condition: service_healthy }
      redis: { condition: service_healthy }

  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: mote
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d mote"]
      interval: 5s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly no --save ""
    ports: ["6379:6379"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  wppconnect:
    image: wppconnect/server:latest
    restart: unless-stopped
    ports: ["21465:21465"]
    environment:
      SECRET_KEY: local_secret
      HOST: 0.0.0.0
    volumes: [wppdata:/usr/src/wppconnect/userDataDir]

volumes:
  pgdata:
  redisdata:
  wppdata:
```

---

## ══════════════════════════════════════════
## FASE 10 — JALANKAN & VERIFIKASI DI BROWSER
## ══════════════════════════════════════════

Setelah SEMUA kode selesai, jalankan langkah ini berurutan:

### Step 1 — TypeScript check
```bash
npm run typecheck
```
Jika ada error → fix semua, jangan lanjut.

### Step 2 — Start database dan Redis
```bash
docker run -d --name mote-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mote \
  -p 5432:5432 \
  postgres:15-alpine

docker run -d --name mote-redis \
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --appendonly no --save ""

# Tunggu siap
sleep 5
echo "Checking PostgreSQL..."
until docker exec mote-pg pg_isready -U postgres -d mote 2>/dev/null; do sleep 1; done
echo "✓ PostgreSQL ready"
until docker exec mote-redis redis-cli ping 2>/dev/null | grep -q PONG; do sleep 1; done
echo "✓ Redis ready"
```

### Step 3 — Migration
```bash
npm run db:migrate
```

### Step 4 — Seed owner
```bash
npm run seed:owner
```
Output: `✅ Owner dibuat: smnanan@motekreatif.com`

### Step 5 — Start dev server
```bash
npm run dev
```
Tunggu: `✓ Ready` dan `[Mote Blaster] Worker started ✓`

### Step 6 — Buka dan verifikasi SEMUA URL ini

| URL | Yang harus tampil |
|---|---|
| `http://localhost:3000` | Landing page |
| `http://localhost:3000/login` | Tombol Google login |
| `http://localhost:3000/admin-login` | Form email+password (dark) |
| Login di admin-login dengan ADMIN_EMAIL+ADMIN_PASSWORD | Redirect ke /admin |
| `http://localhost:3000/admin` | 6 stat cards + charts |
| `http://localhost:3000/admin/subscribers` | ★ 3 summary cards + tabel subscribers |
| `http://localhost:3000/admin/users` | Tabel all users |
| `http://localhost:3000/admin/revenue` | Revenue page |
| `http://localhost:3000/dashboard` | **Redirect ke /login** |
| `http://localhost:3000/connection` | **Redirect ke /login** |
| `http://localhost:3000/campaigns` | **Redirect ke /login** |

Jika ada halaman yang error atau tidak tampil → **fix dulu sebelum lanjut**.

### Step 7 — Tampilkan laporan akhir
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  MOTE BLASTER v2 — BUILD COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dev Server:  http://localhost:3000

Owner Panel:
  Login:          /admin-login
  Overview:       /admin
  Subscribers:    /admin/subscribers  ★
  All Users:      /admin/users
  Revenue:        /admin/revenue

User App:
  Landing:        /
  Login:          /login  (Google OAuth)
  Dashboard:      /dashboard  (protected)
  WA Instances:   /connection  (protected)
  Campaigns:      /campaigns  (protected)
  Billing:        /billing  (protected)

Database:   ✅ Migration selesai
Owner:      ✅ smnanan@motekreatif.com seeded
Worker:     ✅ BullMQ running

NEXT STEPS:
  1. Isi GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET di .env.local
  2. Google OAuth callback URL:
     http://localhost:3000/api/auth/callback/google
  3. Untuk Easypanel deploy: gunakan Dockerfile + docker-compose.yml
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## CHECKLIST FINAL

**Jangan bilang selesai sebelum semua ini ter-centang:**

### Code
- [ ] `npm run typecheck` → 0 error
- [ ] Tidak ada `any` yang tidak diperlukan
- [ ] Semua API route punya try/catch
- [ ] `.env.local` tidak ter-commit (ada di `.gitignore`)
- [ ] `.env.example` ada

### Architecture
- [ ] `next.config.ts`: `output: 'standalone'`, `instrumentationHook: true`
- [ ] `src/instrumentation.ts` ada dengan `register()`
- [ ] pg Pool singleton (`g._pgPool`)
- [ ] BullMQ Queue singleton (`g._blastQueue`)
- [ ] BullMQ Worker singleton (`g._worker`), `concurrency: 1`
- [ ] Redis: `lazyConnect: true`

### Auth
- [ ] Tabel better-auth: `user`, `session`, `account`, `verification` (singular!)
- [ ] `emailAndPassword.enabled: true` di auth config
- [ ] `additionalFields` mendaftarkan `plan` dan `role`
- [ ] `/api/admin/*` semua pakai `requireOwner()`
- [ ] `(admin)/layout.tsx` redirect ke `/admin-login` jika bukan owner

### Pages
- [ ] Landing page berjalan
- [ ] Admin login berjalan (dark theme)
- [ ] `/admin/subscribers` berjalan dengan 3 summary cards + tabel
- [ ] Tabel subscribers punya kolom: User, Plan, WA Instances (dengan progress bar), Joined, Subscription
- [ ] Filter tab Free/Pro berfungsi
- [ ] Search berfungsi (debounced)
- [ ] Pagination berfungsi
- [ ] `/dashboard` redirect ke `/login` jika tidak ada session

### Deployment
- [ ] `Dockerfile` valid (3 stage)
- [ ] `docker-compose.yml` valid dengan healthcheck
- [ ] `health check endpoint` ada: `GET /api/health`
- [ ] `.dockerignore` ada

---

## JIKA ADA ERROR

**"Table not found" dari better-auth:**
→ Nama tabel harus singular: `user`, `session`, `account`, `verification`

**"Cannot connect to Redis":**
→ Jalankan `docker run` untuk Redis dulu

**"instrumentationHook is not recognized":**
→ Pastikan Next.js versi 15: `cat package.json | grep '"next"'`

**TypeScript error di Drizzle `and(...conditions)`:**
→ Import `and` dari `drizzle-orm`: `import { and, eq, ... } from 'drizzle-orm'`
→ Jika conditions array bisa kosong, gunakan: `conditions.length ? and(...conditions) : undefined`

**Halaman blank:**
→ Buka DevTools (F12) → Console → lihat error spesifiknya

---

*Mulai dari Fase 1 sekarang. Kerjakan berurutan. Jangan loncat fase.*
*Full rebuild — hapus semua kode lama dulu.*
