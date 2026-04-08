# ══════════════════════════════════════════════════════════════════
# MOTE BLASTER v2 — FULL REBUILD PROMPT FOR CLAUDE CODE
# Baca SEMUA bagian ini dari awal sampai akhir sebelum
# menulis satu baris kode pun.
# ══════════════════════════════════════════════════════════════════

## PERINTAH UTAMA

Hapus semua kode lama yang ada di folder ini dan **bangun ulang dari nol**.
Jangan pertahankan satu file pun dari versi sebelumnya kecuali `.env.local`
(jika sudah ada). Ini adalah full rebuild, bukan incremental update.

---

## IDENTITAS & MISI

Kamu adalah senior full-stack engineer. Tugasmu membangun **Mote Blaster** —
WhatsApp Blast SaaS — menggunakan Next.js 15 full-stack. Semua keputusan teknis
harus mempertimbangkan satu hal utama: **berjalan ringan di VPS Easypanel
dengan RAM 1–2 GB.**

---

## PRINSIP WAJIB (JANGAN SKIP)

### P1 — Satu App, Satu Container
Frontend + API + background worker ada dalam **satu Next.js app**.
Deploy ke Easypanel = 1 Docker container. Tidak ada monorepo.

### P2 — Hemat Memory di Setiap Baris Kode
| Resource | Aturan |
|---|---|
| pg Pool | Singleton, max 10 connections |
| Redis / IORedis | Singleton, `lazyConnect: true` |
| BullMQ Queue | Singleton |
| BullMQ Worker | Singleton, `concurrency: 1` |
| Completed jobs | `removeOnComplete: 100` |
| Failed jobs | `removeOnFail: 200` |
| Redis persistence | Dimatikan (`--appendonly no --save ""`) |

### P3 — Build Size Kecil
- `output: 'standalone'` di `next.config.ts` — WAJIB
- `.dockerignore` ketat (exclude `node_modules`, `.next`, `.git`)
- Named imports only — tidak ada `import * as`
- Tidak ada library duplikat fungsi

### P4 — Selesai = Bisa Dibuka di Browser
Setelah semua kode ditulis, jalankan app lokal, buka semua halaman di browser,
verifikasi tidak ada error. Jangan stop sebelum semua URL di checklist terbuka.

---

## STACK FINAL

| Layer | Library |
|---|---|
| Framework | Next.js 15 App Router, TypeScript strict |
| Auth | better-auth (Google OAuth + email+password) |
| ORM | Drizzle ORM + `pg` |
| Database | PostgreSQL 15 |
| Queue | BullMQ + IORedis |
| Styling | TailwindCSS v3 + shadcn/ui |
| Data fetching | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Real-time | Server-Sent Events (SSE) |
| Payment | Xendit Recurring |
| WA Engine | WPPConnect REST API |
| CSV | papaparse |
| Password | bcryptjs |
| Sheets | Google Sheets API v4 |

---

## STRUKTUR DIREKTORI FINAL

```
mote-blaster/
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx                      # Landing (/)
│   │   │   └── login/page.tsx                # User login
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                    # Auth guard + sidebar
│   │   │   ├── dashboard/page.tsx            # Overview (/dashboard)
│   │   │   ├── connection/page.tsx           # WA Instances
│   │   │   ├── campaigns/
│   │   │   │   ├── page.tsx                  # List
│   │   │   │   ├── new/page.tsx              # Wizard
│   │   │   │   └── [id]/page.tsx             # Detail
│   │   │   └── billing/page.tsx              # Billing
│   │   │
│   │   ├── (admin)/
│   │   │   ├── layout.tsx                    # Owner auth guard
│   │   │   └── admin/
│   │   │       ├── page.tsx                  # Overview (/admin)
│   │   │       ├── subscribers/page.tsx      # ★ HALAMAN BARU
│   │   │       ├── users/page.tsx            # All users
│   │   │       └── revenue/page.tsx          # Revenue
│   │   │
│   │   ├── admin-login/page.tsx              # Owner login
│   │   │
│   │   └── api/
│   │       ├── auth/[...all]/route.ts
│   │       ├── health/route.ts               # Health check
│   │       ├── dashboard/route.ts
│   │       ├── instances/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── connect/route.ts
│   │       │       └── qr/route.ts
│   │       ├── campaigns/
│   │       │   ├── route.ts
│   │       │   ├── upload-csv/route.ts
│   │       │   ├── fetch-sheet/route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── start/route.ts
│   │       │       ├── pause/route.ts
│   │       │       ├── logs/route.ts
│   │       │       ├── export/route.ts
│   │       │       └── progress/route.ts
│   │       ├── billing/
│   │       │   ├── route.ts
│   │       │   ├── subscribe/route.ts
│   │       │   ├── cancel/route.ts
│   │       │   └── webhook/route.ts
│   │       └── admin/
│   │           ├── stats/route.ts
│   │           ├── subscribers/route.ts      # ★ ENDPOINT BARU
│   │           ├── users/route.ts
│   │           └── revenue/route.ts
│   │
│   ├── components/
│   │   ├── ui/                               # shadcn/ui auto-generated
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── AdminSidebar.tsx
│   │   │   └── Header.tsx
│   │   └── shared/
│   │       ├── QRCodeModal.tsx
│   │       ├── UpgradeBanner.tsx
│   │       ├── StatCard.tsx
│   │       └── campaign-wizard/
│   │           ├── index.tsx
│   │           ├── Step1Basic.tsx
│   │           ├── Step2Contacts.tsx
│   │           ├── Step3Message.tsx
│   │           └── Step4Review.tsx
│   │
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── auth-client.ts
│   │   ├── auth-helpers.ts
│   │   ├── db/
│   │   │   ├── index.ts
│   │   │   └── schema.ts
│   │   ├── queue/
│   │   │   ├── index.ts
│   │   │   └── worker.ts
│   │   ├── wppconnect.ts
│   │   ├── xendit.ts
│   │   ├── google-sheets.ts
│   │   ├── csv-parser.ts
│   │   ├── template-engine.ts
│   │   └── utils.ts
│   │
│   ├── hooks/
│   │   └── useCampaignProgress.ts
│   ├── scripts/
│   │   └── seed-owner.ts
│   ├── types/index.ts
│   └── instrumentation.ts
│
├── drizzle/migrations/
├── public/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── drizzle.config.ts
├── next.config.ts
├── components.json
├── .env.local
├── .env.example
└── .gitignore
```

---

## ══════════════════════════════════════════
## FASE 1 — SETUP PROJECT
## ══════════════════════════════════════════

### 1.1 Hapus kode lama
```bash
# Hapus semua file kecuali .env.local (jika ada)
find . -maxdepth 1 \
  ! -name '.' \
  ! -name '.env.local' \
  ! -name '.git' \
  -exec rm -rf {} + 2>/dev/null || true
```

### 1.2 Init Next.js 15
```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack \
  --yes
```

### 1.3 Install semua dependencies (satu perintah)
```bash
npm install \
  better-auth \
  drizzle-orm pg \
  @paralleldrive/cuid2 \
  bullmq ioredis \
  bcryptjs \
  papaparse \
  googleapis \
  @tanstack/react-query \
  react-hook-form @hookform/resolvers zod \
  recharts \
  sonner \
  lucide-react \
  clsx tailwind-merge

npm install -D \
  drizzle-kit \
  tsx \
  dotenv \
  @types/pg \
  @types/bcryptjs \
  @types/papaparse
```

### 1.4 Setup shadcn/ui
```bash
npx shadcn@latest init --defaults --yes
npx shadcn@latest add --yes \
  button card dialog input label \
  table badge avatar skeleton \
  dropdown-menu sheet tabs progress \
  separator select textarea alert-dialog \
  sonner tooltip
```

### 1.5 File konfigurasi

**`next.config.ts`:**
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
  poweredByHeader: false,
  compress: true,
}

export default nextConfig
```

**`drizzle.config.ts`:**
```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema:   './src/lib/db/schema.ts',
  out:      './drizzle/migrations',
  dialect:  'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

**`package.json` — tambah/ganti scripts:**
```json
{
  "scripts": {
    "dev":          "next dev",
    "build":        "next build",
    "start":        "next start",
    "lint":         "next lint",
    "typecheck":    "tsc --noEmit",
    "db:generate":  "drizzle-kit generate",
    "db:migrate":   "drizzle-kit migrate",
    "db:studio":    "drizzle-kit studio",
    "seed:owner":   "tsx --env-file=.env.local src/scripts/seed-owner.ts"
  }
}
```

**`.env.local`** (jika belum ada, buat baru; jika sudah ada, jangan timpa):
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
BETTER_AUTH_SECRET=dev_secret_wajib_min_32_karakter_ganti_ini_ya
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/mote
REDIS_URL=redis://localhost:6379
GOOGLE_CLIENT_ID=isi_dari_google_cloud_console
GOOGLE_CLIENT_SECRET=isi_dari_google_cloud_console
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"placeholder"}
WPPCONNECT_BASE_URL=http://localhost:21465
WPPCONNECT_SECRET_KEY=local_wpp_secret
XENDIT_SECRET_KEY=xnd_development_placeholder
XENDIT_WEBHOOK_TOKEN=local_webhook_token
XENDIT_PRO_PLAN_PRICE=99000
XENDIT_PRO_PLAN_NAME=Mote Blaster Pro
FREE_PLAN_DAILY_LIMIT=50
FREE_PLAN_MAX_INSTANCES=1
FREE_PLAN_MAX_CAMPAIGNS=2
MIN_DELAY_SECONDS=10
ADMIN_EMAIL=smnanan@motekreatif.com
ADMIN_PASSWORD=isi_password_owner_kamu_disini
```

**`.env.example`** (untuk GitHub, semua value dikosongkan):
```env
NEXT_PUBLIC_APP_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=
DATABASE_URL=
REDIS_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_SERVICE_ACCOUNT_JSON=
WPPCONNECT_BASE_URL=
WPPCONNECT_SECRET_KEY=
XENDIT_SECRET_KEY=
XENDIT_WEBHOOK_TOKEN=
XENDIT_PRO_PLAN_PRICE=
XENDIT_PRO_PLAN_NAME=
FREE_PLAN_DAILY_LIMIT=
FREE_PLAN_MAX_INSTANCES=
FREE_PLAN_MAX_CAMPAIGNS=
MIN_DELAY_SECONDS=
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

**`.gitignore`** — pastikan ada baris ini:
```
.env
.env.local
.env.production
.env.*.local
node_modules/
.next/
*.log
```

**`.dockerignore`:**
```
node_modules
.next
.git
.env*
*.md
coverage
.vscode
drizzle/migrations
```

---

## ══════════════════════════════════════════
## FASE 2 — DATABASE SCHEMA
## ══════════════════════════════════════════

**`src/lib/db/index.ts`:**
```typescript
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

// SINGLETON PATTERN — jangan buat Pool baru per request
const g = global as typeof global & { _pgPool?: Pool }

if (!g._pgPool) {
  g._pgPool = new Pool({
    connectionString:      process.env.DATABASE_URL!,
    max:                   10,
    idleTimeoutMillis:     30_000,
    connectionTimeoutMillis: 2_000,
  })
}

export const db = drizzle(g._pgPool, { schema })
export type DB = typeof db
```

**`src/lib/db/schema.ts`** — tulis PERSIS ini (jangan ada perubahan nama tabel):
```typescript
import {
  pgTable, pgEnum, text, integer, boolean,
  timestamp, date, json, unique,
} from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

// ── Enums ──────────────────────────────────────────────────────────

export const planEnum   = pgEnum('plan',   ['free', 'pro'])
export const roleEnum   = pgEnum('role',   ['user', 'owner'])

export const instanceStatusEnum = pgEnum('instance_status', [
  'disconnected', 'connecting', 'qr_code', 'connected', 'error',
])
export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft', 'pending', 'running', 'completed', 'failed', 'paused',
])
export const messageStatusEnum = pgEnum('message_status', [
  'pending', 'sent', 'failed', 'skipped',
])
export const contactSourceEnum    = pgEnum('contact_source',    ['csv', 'google_sheets'])
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active', 'cancelled', 'expired', 'unpaid',
])

// ── better-auth tables ─────────────────────────────────────────────
// NAMA TABEL HARUS SINGULAR: 'user', 'session', 'account', 'verification'
// better-auth case-sensitive!

export const users = pgTable('user', {
  id:            text('id').primaryKey().$defaultFn(() => createId()),
  name:          text('name').notNull(),
  email:         text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image:         text('image'),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().defaultNow(),
  // Extended fields (didaftarkan di better-auth additionalFields)
  plan:          planEnum('plan').notNull().default('free'),
  role:          roleEnum('role').notNull().default('user'),
})

export const sessions = pgTable('session', {
  id:        text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token:     text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
})

export const accounts = pgTable('account', {
  id:                    text('id').primaryKey(),
  accountId:             text('account_id').notNull(),
  providerId:            text('provider_id').notNull(),
  userId:                text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken:           text('access_token'),
  refreshToken:          text('refresh_token'),
  idToken:               text('id_token'),
  accessTokenExpiresAt:  timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope:                 text('scope'),
  password:              text('password'),  // untuk owner email+password
  createdAt:             timestamp('created_at').notNull(),
  updatedAt:             timestamp('updated_at').notNull(),
})

export const verifications = pgTable('verification', {
  id:         text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value:      text('value').notNull(),
  expiresAt:  timestamp('expires_at').notNull(),
  createdAt:  timestamp('created_at'),
  updatedAt:  timestamp('updated_at'),
})

// ── App tables ─────────────────────────────────────────────────────

export const instances = pgTable('instances', {
  id:            text('id').primaryKey().$defaultFn(() => createId()),
  userId:        text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:          text('name').notNull(),
  sessionName:   text('session_name').notNull().unique(),
  phoneNumber:   text('phone_number'),
  status:        instanceStatusEnum('status').notNull().default('disconnected'),
  lastConnected: timestamp('last_connected'),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().defaultNow(),
})

export const campaigns = pgTable('campaigns', {
  id:              text('id').primaryKey().$defaultFn(() => createId()),
  userId:          text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  instanceId:      text('instance_id').notNull().references(() => instances.id),
  name:            text('name').notNull(),
  messageTemplate: text('message_template').notNull(),
  status:          campaignStatusEnum('status').notNull().default('draft'),
  contactSource:   contactSourceEnum('contact_source').notNull(),
  contactsCount:   integer('contacts_count').notNull().default(0),
  sentCount:       integer('sent_count').notNull().default(0),
  failedCount:     integer('failed_count').notNull().default(0),
  startedAt:       timestamp('started_at'),
  completedAt:     timestamp('completed_at'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
  updatedAt:       timestamp('updated_at').notNull().defaultNow(),
})

export const contacts = pgTable('contacts', {
  id:         text('id').primaryKey().$defaultFn(() => createId()),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  phone:      text('phone').notNull(),
  name:       text('name'),
  variables:  json('variables').$type<Record<string, string>>(),
  createdAt:  timestamp('created_at').notNull().defaultNow(),
})

export const messageLogs = pgTable('message_logs', {
  id:              text('id').primaryKey().$defaultFn(() => createId()),
  campaignId:      text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  contactPhone:    text('contact_phone').notNull(),
  contactName:     text('contact_name'),
  renderedMessage: text('rendered_message'),
  status:          messageStatusEnum('status').notNull().default('pending'),
  error:           text('error'),
  sentAt:          timestamp('sent_at'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
}, (t) => ({ uq: unique().on(t.campaignId, t.contactPhone) }))

export const dailyUsage = pgTable('daily_usage', {
  id:        text('id').primaryKey().$defaultFn(() => createId()),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date:      date('date').notNull(),  // YYYY-MM-DD dalam WIB (UTC+7)
  sentCount: integer('sent_count').notNull().default(0),
}, (t) => ({ uq: unique().on(t.userId, t.date) }))

export const subscriptions = pgTable('subscriptions', {
  id:                   text('id').primaryKey().$defaultFn(() => createId()),
  userId:               text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  xenditSubscriptionId: text('xendit_subscription_id').notNull().unique(),
  xenditCustomerId:     text('xendit_customer_id').notNull(),
  status:               subscriptionStatusEnum('status').notNull().default('active'),
  amount:               integer('amount').notNull(),  // dalam IDR
  currency:             text('currency').notNull().default('IDR'),
  currentPeriodStart:   timestamp('current_period_start').notNull(),
  currentPeriodEnd:     timestamp('current_period_end').notNull(),
  cancelledAt:          timestamp('cancelled_at'),
  createdAt:            timestamp('created_at').notNull().defaultNow(),
  updatedAt:            timestamp('updated_at').notNull().defaultNow(),
})

// ── Inferred types ─────────────────────────────────────────────────
export type User         = typeof users.$inferSelect
export type Instance     = typeof instances.$inferSelect
export type Campaign     = typeof campaigns.$inferSelect
export type Contact      = typeof contacts.$inferSelect
export type MessageLog   = typeof messageLogs.$inferSelect
export type Subscription = typeof subscriptions.$inferSelect
```

Setelah schema selesai:
```bash
npm run db:generate
```

---

## ══════════════════════════════════════════
## FASE 3 — AUTHENTICATION
## ══════════════════════════════════════════

**`src/lib/auth.ts`:**
```typescript
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user:         schema.users,
      session:      schema.sessions,
      account:      schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: { enabled: true },   // untuk owner login
  socialProviders: {
    google: {
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    cookieCache: { enabled: true, maxAge: 300 },
  },
  user: {
    additionalFields: {
      plan: { type: 'string', defaultValue: 'free', required: false, input: false },
      role: { type: 'string', defaultValue: 'user', required: false, input: false },
    },
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
})
```

**`src/lib/auth-client.ts`:**
```typescript
'use client'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
})
```

**`src/lib/auth-helpers.ts`:**
```typescript
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

export async function requireUser() {
  const session = await getSession()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return session
}

export async function requireOwner() {
  const session = await getSession()
  const role = (session?.user as any)?.role
  if (!session || role !== 'owner') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  return session
}
```

**`src/app/api/auth/[...all]/route.ts`:**
```typescript
import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'
export const { GET, POST } = toNextJsHandler(auth)
```

**`src/app/api/health/route.ts`:**
```typescript
export async function GET() {
  return Response.json({ status: 'ok', ts: Date.now() })
}
```

---

## ══════════════════════════════════════════
## FASE 4 — BULLMQ SINGLETON
## ══════════════════════════════════════════

**`src/lib/queue/index.ts`:**
```typescript
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
```

**`src/lib/queue/worker.ts`:**
```typescript
import { Worker, type Job } from 'bullmq'
import { getRedis } from './index'
import { db } from '@/lib/db'
import { messageLogs, campaigns, dailyUsage } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { renderTemplate } from '@/lib/template-engine'
import { normalizePhone, getTodayWIB } from '@/lib/utils'
import { wpp } from '@/lib/wppconnect'

const g = global as typeof global & { _worker?: Worker }

export interface BlastJobData {
  campaignId:      string
  contactPhone:    string
  contactName:     string | null
  variables:       Record<string, string>
  messageTemplate: string
  sessionName:     string
  userId:          string
  isPro:           boolean
}

export async function startWorker() {
  if (g._worker) return

  g._worker = new Worker<BlastJobData>('blast', async (job: Job<BlastJobData>) => {
    const { campaignId, contactPhone, contactName, variables,
            messageTemplate, sessionName, userId, isPro } = job.data

    // 1. Cek daily limit (FREE plan)
    if (!isPro) {
      const limit = Number(process.env.FREE_PLAN_DAILY_LIMIT) || 50
      const today = getTodayWIB()
      const [usage] = await db
        .select({ count: dailyUsage.sentCount })
        .from(dailyUsage)
        .where(and(eq(dailyUsage.userId, userId), eq(dailyUsage.date, today)))

      if (usage && usage.count >= limit) {
        await db.update(messageLogs)
          .set({ status: 'skipped' })
          .where(and(
            eq(messageLogs.campaignId, campaignId),
            eq(messageLogs.contactPhone, contactPhone),
          ))
        return
      }
    }

    // 2. Render + normalisasi
    const rendered = renderTemplate(messageTemplate, {
      name: contactName || contactPhone,
      ...variables,
    })
    const phone = normalizePhone(contactPhone)

    // 3. Kirim pesan
    try {
      await wpp.sendMessage(sessionName, phone, rendered)

      await db.update(messageLogs).set({
        status: 'sent', renderedMessage: rendered, sentAt: new Date(),
      }).where(and(
        eq(messageLogs.campaignId, campaignId),
        eq(messageLogs.contactPhone, contactPhone),
      ))
      await db.update(campaigns).set({
        sentCount: sql`${campaigns.sentCount} + 1`, updatedAt: new Date(),
      }).where(eq(campaigns.id, campaignId))

      const today = getTodayWIB()
      await db.insert(dailyUsage)
        .values({ userId, date: today, sentCount: 1 })
        .onConflictDoUpdate({
          target: [dailyUsage.userId, dailyUsage.date],
          set:    { sentCount: sql`${dailyUsage.sentCount} + 1` },
        })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await db.update(messageLogs).set({ status: 'failed', error: msg })
        .where(and(
          eq(messageLogs.campaignId, campaignId),
          eq(messageLogs.contactPhone, contactPhone),
        ))
      await db.update(campaigns).set({
        failedCount: sql`${campaigns.failedCount} + 1`, updatedAt: new Date(),
      }).where(eq(campaigns.id, campaignId))
      throw err
    }
  }, {
    connection:  getRedis(),
    concurrency: 1,
  })

  g._worker.on('error', (e) => console.error('[Worker]', e))
  g._worker.on('failed', (job, e) => console.error(`[Worker] Job ${job?.id} failed:`, e.message))

  // Mark orphaned 'running' campaigns as 'paused'
  try {
    await db.update(campaigns).set({ status: 'paused' }).where(eq(campaigns.status, 'running'))
  } catch {}

  console.log('[Mote Blaster] Worker started ✓')
}
```

**`src/instrumentation.ts`:**
```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startWorker } = await import('./lib/queue/worker')
    await startWorker()
  }
}
```

---

## ══════════════════════════════════════════
## FASE 5 — UTILITIES
## ══════════════════════════════════════════

**`src/lib/utils.ts`:**
```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export function getTodayWIB(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
}

export function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, '')
  if (d.startsWith('0'))        d = '62' + d.slice(1)
  else if (!d.startsWith('62')) d = '62' + d
  return d
}

export function formatRupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
  }).format(n)
}

export function makeSessionName(userId: string, instanceId: string): string {
  return `uid_${userId.slice(0, 8)}_iid_${instanceId.slice(0, 8)}`
}
```

**`src/lib/template-engine.ts`:**
```typescript
export function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '')
}
export function extractVariables(tpl: string): string[] {
  return [...new Set([...tpl.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))]
}
```

**`src/lib/wppconnect.ts`:**
```typescript
const base   = () => process.env.WPPCONNECT_BASE_URL!
const secret = () => process.env.WPPCONNECT_SECRET_KEY!

async function req<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${secret()}`, ...init?.headers },
  })
  if (!res.ok) throw new Error(`WPP ${res.status}: ${await res.text().catch(() => '')}`)
  return res.json() as Promise<T>
}

export const wpp = {
  startSession:  (s: string) => req(`/api/${s}/start-session`, { method: 'POST' }),
  getStatus:     (s: string) => req<{ status: string }>(`/api/${s}/status-session`),
  getQRCode:     (s: string) => req<{ qrcode: string }>(`/api/${s}/qrcode-session`),
  closeSession:  (s: string) => req(`/api/${s}/close-session`, { method: 'POST' }),
  deleteSession: (s: string) => req(`/api/${s}`, { method: 'DELETE' }),
  sendMessage:   (s: string, phone: string, message: string) =>
    req(`/api/${s}/send-message`, { method: 'POST', body: JSON.stringify({ phone, message }) }),
}
```

**`src/lib/google-sheets.ts`:**
```typescript
import { google } from 'googleapis'

function sheets() {
  let creds = {}
  try { creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}') } catch {}
  return google.sheets({ version: 'v4',
    auth: new google.auth.GoogleAuth({ credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] }) })
}

export function extractId(url: string) {
  return url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] ?? null
}

export async function fetchSheetRows(url: string): Promise<Record<string, string>[]> {
  const id = extractId(url)
  if (!id) throw new Error('URL Google Sheets tidak valid')
  const res = await sheets().spreadsheets.values.get({ spreadsheetId: id, range: 'A:Z' })
  const rows = res.data.values as string[][] | undefined
  if (!rows || rows.length < 2) throw new Error('Sheet kosong')
  const headers = rows[0].map(h => h.toLowerCase().trim())
  if (!headers.includes('phone')) throw new Error("Sheet harus punya kolom 'phone'")
  return rows.slice(1).map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])))
}
```

**`src/lib/csv-parser.ts`:**
```typescript
import Papa from 'papaparse'
import { normalizePhone } from './utils'

export function parseCSVContent(content: string) {
  const result = Papa.parse<Record<string, string>>(content, {
    header: true, skipEmptyLines: true,
    transformHeader: h => h.toLowerCase().trim(),
  })
  if (!result.data[0] || !('phone' in result.data[0])) throw new Error("CSV harus punya kolom 'phone'")
  return result.data.filter(r => r.phone?.trim()).map(r => ({ ...r, phone: normalizePhone(r.phone) }))
}
```

**`src/lib/xendit.ts`:**
```typescript
const XENDIT_API = 'https://api.xendit.co'
const auth = () => `Basic ${Buffer.from(`${process.env.XENDIT_SECRET_KEY}:`).toString('base64')}`
const headers = () => ({ 'Authorization': auth(), 'Content-Type': 'application/json' })

async function xFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${XENDIT_API}${path}`, { ...init, headers: { ...headers(), ...init?.headers } })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message || `Xendit ${res.status}`)
  return body as T
}

export const xendit = {
  createCustomer:     (d: unknown) => xFetch('/customers', { method: 'POST', body: JSON.stringify(d) }),
  createSubscription: (d: unknown) => xFetch('/recurring/plans', { method: 'POST', body: JSON.stringify(d) }),
  cancelSubscription: (id: string) => xFetch(`/recurring/plans/${id}/deactivate`, { method: 'POST' }),
  verifyToken:        (t: string)  => t === process.env.XENDIT_WEBHOOK_TOKEN,
}
```

---

