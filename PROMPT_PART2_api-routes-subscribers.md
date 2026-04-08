## ══════════════════════════════════════════
## FASE 6 — API ROUTES
## ══════════════════════════════════════════

### Pattern wajib untuk setiap route:
```typescript
import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth-helpers'  // atau requireOwner untuk admin
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const session = await requireUser()
    if (session instanceof Response) return session

    // ... logic

    return Response.json({ data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    console.error('[API /route]', msg)
    return Response.json({ error: msg }, { status: 500 })
  }
}
```

### Semua route yang harus diimplementasikan:

**`GET /api/dashboard`** — stats milik user:
```
sentCount (bulan ini), failedCount (bulan ini),
activeInstances (status=connected), activeCampaigns (status in running/pending),
dailySentCount, dailyRemaining (FREE user),
dailyChart: [{ date, sent, failed }] 30 hari,
campaignChart: [{ status, count }]
```

**`GET /api/instances`** — list instances milik user
**`POST /api/instances`** — buat instance; validasi: FREE max 1, PRO max 5
**`GET /api/instances/[id]`** — single instance
**`DELETE /api/instances/[id]`** — close WPP session + delete DB
**`POST /api/instances/[id]/connect`** — start WPP session → `{ status, qrCode? }`
**`GET /api/instances/[id]/qr`** → `{ qrCode: string }`

**`GET /api/campaigns`** — list + pagination `?page&limit&status`
**`POST /api/campaigns`** — buat draft; validasi FREE max 2 active
**`GET /api/campaigns/[id]`** — detail
**`PUT /api/campaigns/[id]`** — update (draft only)
**`DELETE /api/campaigns/[id]`** — delete

**`POST /api/campaigns/[id]/start`:**
```
1. Validasi: instance connected, campaign draft/pending
2. UPDATE campaigns status='running'
3. INSERT message_logs per kontak (onConflictDoNothing)
4. blastQueue.addBulk — delay = index × MIN_DELAY_SECONDS × 1000
5. Return { jobsQueued }
```

**`POST /api/campaigns/[id]/pause`** — UPDATE status='paused'
**`GET /api/campaigns/[id]/logs`** — paginated logs `?page&limit&status`
**`GET /api/campaigns/[id]/export`** — CSV download
**`GET /api/campaigns/[id]/progress`** — SSE stream (poll tiap 2s, tutup saat completed/failed)
**`POST /api/campaigns/upload-csv`** — parse CSV → `{ totalCount, preview, columns }`
**`POST /api/campaigns/fetch-sheet`** — fetch sheet → `{ totalCount, preview, columns }`

**`GET /api/billing`** → `{ plan, subscription?, dailyUsed, dailyLimit }`
**`POST /api/billing/subscribe`** → Xendit → `{ paymentUrl }`
**`POST /api/billing/cancel`** → cancel Xendit
**`POST /api/billing/webhook`** — PUBLIC, verify x-callback-token:
- `invoice.paid` → user.plan='pro', subscription active
- `invoice.expired` → subscription expired
- `subscription.cancelled` → user.plan='free', subscription cancelled

**`GET /api/admin/stats`** — (owner) platform stats:
```
totalUsers, freeUsers, proUsers,
activeUsersThisMonth, mrr,
totalMessagesSent, totalCampaigns,
recentSignups: User[10],
userGrowthChart, revenueChart, messageSentChart
```

---

## ══════════════════════════════════════════
## HALAMAN BARU: /api/admin/subscribers
## ══════════════════════════════════════════

**`src/app/api/admin/subscribers/route.ts`:**
```typescript
import { NextRequest } from 'next/server'
import { requireOwner } from '@/lib/auth-helpers'
import { db } from '@/lib/db'
import { users, instances, subscriptions } from '@/lib/db/schema'
import { eq, ilike, or, count, sql, desc, and } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const session = await requireOwner()
    if (session instanceof Response) return session

    const { searchParams } = new URL(req.url)
    const plan   = searchParams.get('plan')   // 'free' | 'pro' | null = all
    const search = searchParams.get('search') || ''
    const page   = Math.max(1, Number(searchParams.get('page') || '1'))
    const limit  = 20
    const offset = (page - 1) * limit

    // Subquery: hitung instance per user
    const instanceCountSq = db
      .select({
        userId:        instances.userId,
        instanceCount: count(instances.id).as('instance_count'),
      })
      .from(instances)
      .groupBy(instances.userId)
      .as('instance_counts')

    // Build kondisi WHERE
    const conditions = []
    if (plan === 'free') conditions.push(eq(users.plan, 'free'))
    if (plan === 'pro')  conditions.push(eq(users.plan, 'pro'))
    if (search) conditions.push(
      or(
        ilike(users.name,  `%${search}%`),
        ilike(users.email, `%${search}%`),
      )
    )
    // Exclude owner dari list
    conditions.push(eq(users.role, 'user'))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Query utama
    const rows = await db
      .select({
        id:            users.id,
        name:          users.name,
        email:         users.email,
        image:         users.image,
        plan:          users.plan,
        createdAt:     users.createdAt,
        instanceCount: sql<number>`COALESCE(${instanceCountSq.instanceCount}, 0)`,
        // Untuk PRO: ambil data subscription
        subscriptionStatus:    subscriptions.status,
        subscriptionAmount:    subscriptions.amount,
        subscriptionPeriodEnd: subscriptions.currentPeriodEnd,
        subscriptionCancelled: subscriptions.cancelledAt,
      })
      .from(users)
      .leftJoin(instanceCountSq, eq(users.id, instanceCountSq.userId))
      .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset)

    // Hitung total untuk pagination
    const [{ total }] = await db
      .select({ total: count(users.id) })
      .from(users)
      .where(whereClause)

    // Hitung summary stats
    const [freeCount]  = await db.select({ n: count() }).from(users).where(and(eq(users.plan, 'free'), eq(users.role, 'user')))
    const [proCount]   = await db.select({ n: count() }).from(users).where(and(eq(users.plan, 'pro'),  eq(users.role, 'user')))
    const [totalCount] = await db.select({ n: count() }).from(users).where(eq(users.role, 'user'))

    return Response.json({
      summary: {
        total:    totalCount.n,
        free:     freeCount.n,
        pro:      proCount.n,
      },
      data: rows,
      pagination: {
        page,
        limit,
        total:      Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error'
    return Response.json({ error: msg }, { status: 500 })
  }
}
```

**`GET /api/admin/users`** — list semua user + search/filter/pagination (sama seperti subscribers tapi tanpa detail subscription)
**`GET /api/admin/revenue`** — revenue data + subscriptions table

---

## ══════════════════════════════════════════
## FASE 7 — PAGES & UI
## ══════════════════════════════════════════

### Design tokens
```
User dashboard sidebar:  bg-blue-50  border-r border-blue-100
Admin panel sidebar:     bg-slate-900 text-slate-100
Primary:                 blue-600 (#2563EB)
Admin accent:            indigo-400
Card:                    rounded-xl border border-slate-200 bg-white shadow-sm p-6
```

### Root layout

**`src/app/layout.tsx`:**
```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mote Blaster',
  description: 'WhatsApp Blast SaaS',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  )
}
```

**`src/app/providers.tsx`:**
```tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false } },
  }))
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
```

### Dashboard layout & sidebar

**`src/app/(dashboard)/layout.tsx`:**
```tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={session.user as any} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
```

**`src/components/layout/Sidebar.tsx`** — navigasi:
- 📊 Dashboard → `/dashboard`
- 📱 WA Connection → `/connection`
- 📢 Campaigns → `/campaigns`
- 💳 Billing → `/billing`
- Divider
- Avatar + nama + email
- Logout button

### Admin layout & sidebar

**`src/app/(admin)/layout.tsx`:**
```tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth-helpers'
import { AdminSidebar } from '@/components/layout/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session || (session.user as any).role !== 'owner') redirect('/admin-login')
  return (
    <div className="flex h-screen">
      <AdminSidebar email={(session.user as any).email} />
      <main className="flex-1 overflow-y-auto bg-slate-50 p-8">{children}</main>
    </div>
  )
}
```

**`src/components/layout/AdminSidebar.tsx`** — navigasi (dark sidebar `bg-slate-900`):
- 📊 Overview → `/admin`
- 👥 Subscribers → `/admin/subscribers`   ← **TAMBAHKAN INI**
- 🙍 All Users → `/admin/users`
- 💰 Revenue → `/admin/revenue`
- Divider
- Icon kunci + email owner
- Logout button

### Halaman user-facing

**`src/app/(public)/page.tsx`** — Landing page:
- Navbar: logo + tombol Login/Dashboard
- Hero section: tagline + 2 CTA
- Features: 6 feature cards (grid 3 kolom)
- Pricing: Free vs Pro cards
- Footer

**`src/app/(public)/login/page.tsx`** — centered card:
- Logo + judul
- Tombol "Continue with Google"
- `authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })`

**`src/app/(dashboard)/dashboard/page.tsx`** — 4 stat cards + charts + upgrade banner

**`src/app/(dashboard)/connection/page.tsx`** — WA instances dengan auto-refresh 5s, QR modal

**`src/app/(dashboard)/campaigns/page.tsx`** — list campaigns, filter tabs, pagination

**`src/app/(dashboard)/campaigns/new/page.tsx`** — 4-step wizard:
- Step 1: nama + pilih instance
- Step 2: CSV upload atau Google Sheets URL + preview
- Step 3: template + live preview + delay toggle
- Step 4: review + send/draft

**`src/app/(dashboard)/campaigns/[id]/page.tsx`** — detail + SSE progress + logs table + export

**`src/app/(dashboard)/billing/page.tsx`** — plan card + upgrade/cancel + invoice history

**`src/app/admin-login/page.tsx`** — dark theme form (bg-slate-900):
```tsx
// Form email + password
// authClient.signIn.email({ email, password, callbackURL: '/admin' })
// Error message di bawah form jika gagal
```

### Halaman admin

**`src/app/(admin)/admin/page.tsx`** — Admin Overview:
- 6 stat cards: Total Users, Free Users, Pro Users, MRR, Total Messages, Total Campaigns
- 3 Recharts (semua `'use client'`):
  - Line chart: user growth 30 hari
  - Bar chart: revenue 6 bulan
  - Line chart: messages 30 hari
- Recent signups table

---

## ══════════════════════════════════════════
## ★ HALAMAN BARU: /admin/subscribers
## ══════════════════════════════════════════

**`src/app/(admin)/admin/subscribers/page.tsx`:**

Ini adalah halaman utama owner untuk melihat semua user berdasarkan plan mereka
dan berapa instance WhatsApp yang mereka pakai.

Implementasikan dengan spesifikasi berikut:

### Layout halaman
```
┌─────────────────────────────────────────────────────────────┐
│  Subscribers                              [Search...]  [All ▼]│
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Total    │  │ Free     │  │ Pro      │                   │
│  │ XXX      │  │ XXX      │  │ XXX      │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
├─────────────────────────────────────────────────────────────┤
│  Filter tabs: [All] [Free Plan] [Pro Plan]                  │
├─────────────────────────────────────────────────────────────┤
│  Tabel subscribers...                                        │
└─────────────────────────────────────────────────────────────┘
```

### Summary cards (3 cards di atas tabel)
- **Total Users** — total semua user (exclude owner)
- **Free Plan** — jumlah user dengan plan=free, badge abu-abu
- **Pro Plan** — jumlah user dengan plan=pro, badge biru

### Filter tabs
- Tab "All" → tampil semua user
- Tab "Free Plan" → filter plan=free
- Tab "Pro Plan" → filter plan=pro

### Search
- Input search (debounce 300ms)
- Search by nama atau email

### Tabel subscribers — kolom:

| Kolom | Detail |
|---|---|
| **User** | Avatar (huruf pertama nama) + Nama + Email di bawahnya |
| **Plan** | Badge: "Free" (abu-abu) atau "Pro" (biru dengan icon bintang) |
| **WhatsApp Instances** | Angka instances milik user + progress bar kecil di bawahnya. FREE: X/1, PRO: X/5. Jika 0 → tampilkan "No instances" dengan teks muted |
| **Instance Status** | Mini badges status per instance: hijau (connected), abu-abu (disconnected), kuning (qr_code). Jika tidak ada instance → dash "-" |
| **Joined** | Tanggal daftar dalam format "12 Jan 2025" |
| **Subscription** | Jika PRO: "Active until [tanggal]" atau "Cancelled". Jika FREE: "-" |

### Row expansion (opsional tapi lebih baik)
Saat baris di-klik, expand untuk menampilkan:
- List nama instances + status + nomor HP (jika connected)
- Total campaigns milik user
- Total pesan dikirim

### Pagination
- 20 rows per halaman
- Tombol prev/next + info "Showing X-Y of Z"

### Implementasi komponen:
```tsx
'use client'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

interface SubscriberRow {
  id:                    string
  name:                  string
  email:                 string
  image:                 string | null
  plan:                  'free' | 'pro'
  createdAt:             string
  instanceCount:         number
  subscriptionStatus:    string | null
  subscriptionPeriodEnd: string | null
  subscriptionCancelled: string | null
}

// Fetch dari GET /api/admin/subscribers?plan=&search=&page=
function useSubscribers(plan: string, search: string, page: number) {
  return useQuery({
    queryKey: ['admin-subscribers', plan, search, page],
    queryFn:  async () => {
      const params = new URLSearchParams({
        ...(plan   ? { plan }   : {}),
        ...(search ? { search } : {}),
        page: String(page),
      })
      const res = await fetch(`/api/admin/subscribers?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
    staleTime: 30_000,
  })
}

export default function SubscribersPage() {
  const [plan,   setPlan]   = useState<'free' | 'pro' | ''>('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useSubscribers(plan, debouncedSearch, page)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Subscribers</h1>
        <input
          type="search"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-64 px-3 py-2 text-sm border border-slate-200 rounded-lg
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryCard
          title="Total Users"
          value={data?.summary.total ?? 0}
          color="slate"
        />
        <SummaryCard
          title="Free Plan"
          value={data?.summary.free ?? 0}
          color="slate"
          onClick={() => { setPlan('free'); setPage(1) }}
          active={plan === 'free'}
        />
        <SummaryCard
          title="Pro Plan"
          value={data?.summary.pro ?? 0}
          color="blue"
          onClick={() => { setPlan('pro'); setPage(1) }}
          active={plan === 'pro'}
        />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { label: 'All',       value: ''     },
          { label: 'Free Plan', value: 'free' },
          { label: 'Pro Plan',  value: 'pro'  },
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => { setPlan(tab.value as any); setPage(1) }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              plan === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <SubscribersTableSkeleton />
      ) : (
        <SubscribersTable
          rows={data?.data ?? []}
          onPageChange={setPage}
          pagination={data?.pagination}
        />
      )}
    </div>
  )
}

// Komponen tabel
function SubscribersTable({ rows, pagination, onPageChange }: {
  rows: SubscriberRow[]
  pagination?: { page: number; totalPages: number; total: number; limit: number }
  onPageChange: (p: number) => void
}) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <p className="text-lg font-medium">No subscribers found</p>
        <p className="text-sm mt-1">Try adjusting your search or filter</p>
      </div>
    )
  }

  const maxInstances = (plan: string) => plan === 'pro' ? 5 : 1

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left px-4 py-3 text-slate-600 font-medium">User</th>
            <th className="text-left px-4 py-3 text-slate-600 font-medium">Plan</th>
            <th className="text-left px-4 py-3 text-slate-600 font-medium">WA Instances</th>
            <th className="text-left px-4 py-3 text-slate-600 font-medium">Joined</th>
            <th className="text-left px-4 py-3 text-slate-600 font-medium">Subscription</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
              {/* User kolom */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600
                                  flex items-center justify-center font-medium text-sm flex-shrink-0">
                    {row.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{row.name}</p>
                    <p className="text-xs text-slate-400">{row.email}</p>
                  </div>
                </div>
              </td>

              {/* Plan kolom */}
              <td className="px-4 py-3">
                {row.plan === 'pro' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full
                                   bg-blue-100 text-blue-700 text-xs font-medium">
                    ⭐ Pro
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full
                                   bg-slate-100 text-slate-600 text-xs font-medium">
                    Free
                  </span>
                )}
              </td>

              {/* WA Instances kolom */}
              <td className="px-4 py-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-700">{row.instanceCount}</span>
                    <span className="text-slate-400">/ {maxInstances(row.plan)}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        row.instanceCount >= maxInstances(row.plan)
                          ? 'bg-amber-400'
                          : 'bg-green-400'
                      }`}
                      style={{ width: `${Math.min(100, (row.instanceCount / maxInstances(row.plan)) * 100)}%` }}
                    />
                  </div>
                  {row.instanceCount === 0 && (
                    <p className="text-xs text-slate-400">No instances yet</p>
                  )}
                </div>
              </td>

              {/* Joined kolom */}
              <td className="px-4 py-3 text-slate-500 text-xs">
                {new Date(row.createdAt).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </td>

              {/* Subscription kolom */}
              <td className="px-4 py-3">
                {row.plan === 'pro' && row.subscriptionStatus ? (
                  <div>
                    {row.subscriptionStatus === 'active' && row.subscriptionPeriodEnd ? (
                      <div>
                        <span className="text-xs text-green-600 font-medium">Active</span>
                        <p className="text-xs text-slate-400">
                          until {new Date(row.subscriptionPeriodEnd).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </div>
                    ) : row.subscriptionStatus === 'cancelled' ? (
                      <span className="text-xs text-red-500 font-medium">Cancelled</span>
                    ) : (
                      <span className="text-xs text-amber-500 font-medium capitalize">
                        {row.subscriptionStatus}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <span className="text-xs text-slate-400">
            Showing {((pagination.page - 1) * pagination.limit) + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="px-3 py-1 text-sm border border-slate-200 rounded-lg
                         disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="px-3 py-1 text-sm border border-slate-200 rounded-lg
                         disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Skeleton loading
function SubscribersTableSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-slate-100 rounded animate-pulse w-32" />
            <div className="h-2 bg-slate-100 rounded animate-pulse w-48" />
          </div>
          <div className="h-5 bg-slate-100 rounded-full animate-pulse w-12" />
          <div className="h-3 bg-slate-100 rounded animate-pulse w-16" />
        </div>
      ))}
    </div>
  )
}

// Summary card component
function SummaryCard({
  title, value, color, onClick, active
}: {
  title: string
  value: number
  color: 'slate' | 'blue'
  onClick?: () => void
  active?: boolean
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border p-5 transition-all ${
        onClick ? 'cursor-pointer' : ''
      } ${
        active
          ? 'border-blue-300 bg-blue-50 ring-2 ring-blue-200'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <p className="text-sm text-slate-500">{title}</p>
      <p className={`text-3xl font-bold mt-1 ${
        color === 'blue' ? 'text-blue-600' : 'text-slate-800'
      }`}>{value.toLocaleString()}</p>
    </div>
  )
}
```

**`src/app/(admin)/admin/users/page.tsx`** — tabel semua user dengan kolom:
Avatar, Nama, Email, Plan badge, Instances, Campaigns, Total Messages, Joined

**`src/app/(admin)/admin/revenue/page.tsx`** — MRR summary + bar chart + subscription table

---

