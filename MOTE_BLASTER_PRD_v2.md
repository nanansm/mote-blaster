# 📋 PRODUCT REQUIREMENTS DOCUMENT (PRD)
# Mote Blaster — WhatsApp Blast SaaS
# Version 2.0 — Next.js Full-Stack Stack

**Version:** 2.0.0
**Last Updated:** 2025
**Status:** Ready for Development
**Stack:** Next.js 15 · Drizzle ORM · better-auth · PostgreSQL · Redis · BullMQ · TailwindCSS · shadcn/ui

---

## 📌 TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Project Structure](#4-project-structure)
5. [Feature Requirements — User](#5-feature-requirements--user)
6. [Owner / Admin Panel](#6-owner--admin-panel)
7. [Database Schema](#7-database-schema)
8. [API Routes](#8-api-routes)
9. [Flow Diagrams](#9-flow-diagrams)
10. [UI/UX Requirements](#10-uiux-requirements)
11. [Third-Party Integrations](#11-third-party-integrations)
12. [Easypanel Deployment](#12-easypanel-deployment)
13. [Environment Variables](#13-environment-variables)
14. [Security Requirements](#14-security-requirements)
15. [Implementation Notes for Claude Code](#15-implementation-notes-for-claude-code)

---

## 1. PROJECT OVERVIEW

**App Name:** Mote Blaster
**Type:** WhatsApp Bulk Messaging (Blasting) SaaS Web Application
**Primary Language:** English (UI), Indonesian (support docs)

### 1.1 Description
Mote Blaster adalah SaaS web application yang memungkinkan user mengirim pesan WhatsApp massal (blast) menggunakan WPPConnect Server sebagai engine WhatsApp. User dapat mengelola campaign, upload database kontak via CSV atau Google Sheets, dan mempersonalisasi template pesan. Platform menawarkan dua subscription tier: Free dan Pro.

### 1.2 Business Rules
| Rule | Free Plan | Pro Plan |
|---|---|---|
| Daily blast limit | 50 messages/day | Unlimited |
| Minimum delay antar pesan | 10 detik | 10 detik (mandatory) |
| WhatsApp instances | 1 | 5 |
| Active campaigns | 2 | Unlimited |
| Harga | Rp 0 | Rp 99.000/bulan via Xendit |

> ⚠️ **CRITICAL:** Delay minimum 10 detik antar pesan adalah WAJIB di SEMUA plan. Di-enforce di level BullMQ queue dan TIDAK BISA di-bypass. Ini melindungi akun WhatsApp user dari banned.

### 1.3 User Roles
| Role | Akses |
|---|---|
| `user` | Dashboard, campaigns, billing, WA instances milik sendiri |
| `owner` | Admin panel khusus — lihat semua user, revenue, statistik platform |

> Owner login menggunakan **email + password** (bukan Google OAuth). Hanya satu akun owner yang exist, email dan password di-set melalui environment variable dan di-seed via script satu kali.

---

## 2. TECH STACK

### 2.1 Satu Next.js App (Full-Stack)
| Layer | Technology | Keterangan |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | Frontend + API dalam 1 app, 1 Docker service |
| Language | **TypeScript** (strict) | Type safety penuh |
| Styling | **TailwindCSS v3 + shadcn/ui** | Komponen siap pakai |
| Auth | **better-auth** | Google OAuth untuk user, email+password untuk owner |
| ORM | **Drizzle ORM** | Type-safe, ringan, migration mudah |
| Database | **PostgreSQL 15** | Managed oleh Easypanel |
| Queue | **BullMQ + IORedis** | Message queue untuk blast |
| Cache | **Redis 7** | Managed oleh Easypanel |
| Server State | **TanStack Query v5** | Data fetching + caching di client |
| Forms | **React Hook Form + Zod** | Validasi form + schema |
| Charts | **Recharts** | Dashboard & owner panel charts |
| Real-time | **Server-Sent Events (SSE)** | Campaign progress updates |
| WA Engine | **WPPConnect REST API** | Service terpisah di Easypanel |
| Payment | **Xendit** | Recurring subscription IDR |
| Google Sheets | **Google Sheets API v4** | Import kontak dari sheet |
| CSV | **papaparse** | Parse CSV file |
| Password | **bcryptjs** | Hash password owner |

### 2.2 Infrastructure di Easypanel
| Service | Type | Keterangan |
|---|---|---|
| `app` | Next.js App (GitHub) | **1 service = frontend + backend** |
| `db` | PostgreSQL | Managed Easypanel |
| `redis` | Redis | Managed Easypanel |
| `wppconnect` | Docker Image | `wppconnect/server:latest` |

> 💡 **Keunggulan vs stack lama (React + Express terpisah):** Hanya 1 Dockerfile, 1 service app di Easypanel. Tidak ada masalah CORS, tidak ada masalah cookie cross-domain, tidak ada nginx reverse proxy yang rumit. Frontend dan API berada di origin yang sama.

---

## 3. SYSTEM ARCHITECTURE

### 3.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                           EASYPANEL                              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              NEXT.JS APP  (Port 3000)                      │  │
│  │                                                            │  │
│  │   ┌─────────────────────┐   ┌──────────────────────────┐  │  │
│  │   │   Pages / UI        │   │   API Route Handlers     │  │  │
│  │   │   (React, RSC)      │◀──│   /api/auth/[...all]     │  │  │
│  │   │                     │   │   /api/dashboard          │  │  │
│  │   │   /           (pub) │   │   /api/instances/*        │  │  │
│  │   │   /login      (pub) │   │   /api/campaigns/*        │  │  │
│  │   │   /dashboard  (auth)│   │   /api/billing/*          │  │  │
│  │   │   /connection (auth)│   │   /api/admin/*            │  │  │
│  │   │   /campaigns  (auth)│   └──────────────────────────┘  │  │
│  │   │   /billing    (auth)│                                  │  │
│  │   │   /admin  (owner)   │   ┌──────────────────────────┐  │  │
│  │   │   /admin-login(pub) │   │   BullMQ Worker          │  │  │
│  │   └─────────────────────┘   │   (runs in same process) │  │  │
│  │                             └──────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────┘  │
│           │                        │                             │
│    ┌──────▼──────┐        ┌────────▼──────┐   ┌──────────────┐  │
│    │ PostgreSQL  │        │     Redis     │   │ WPPConnect   │  │
│    │   (db)      │        │  BullMQ Queue │   │ (Port 21465) │  │
│    └─────────────┘        └───────────────┘   └──────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                                 │
                  ┌──────────────┼───────────────┐
                  │              │               │
           ┌──────▼───┐   ┌──────▼───┐   ┌──────▼────┐
           │  Google  │   │  Xendit  │   │  Google   │
           │  OAuth   │   │ Payment  │   │  Sheets   │
           └──────────┘   └──────────┘   └───────────┘
```

### 3.2 Auth Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    better-auth                          │
│                                                         │
│  ┌──────────────────────┐  ┌───────────────────────┐   │
│  │  Google OAuth        │  │  Email + Password     │   │
│  │  (untuk user biasa)  │  │  (khusus owner/admin) │   │
│  │                      │  │                       │   │
│  │  /api/auth/signin/   │  │  /api/auth/signin/    │   │
│  │    social → google   │  │    email              │   │
│  └──────────────────────┘  └───────────────────────┘   │
│                                                         │
│  Session disimpan di cookie httpOnly (same-origin)      │
│  Tidak ada JWT manual, tidak ada refresh token manual   │
└─────────────────────────────────────────────────────────┘
```

### 3.3 BullMQ Queue Architecture

```
User klik "Start Campaign"
         │
         ▼
POST /api/campaigns/[id]/start
         │
         ▼
Validasi: instance connected? plan limits OK?
         │
         ▼
db: UPDATE campaigns SET status='running', startedAt=now()
db: INSERT message_logs untuk setiap kontak (status='pending')
         │
         ▼
BullMQ addBulk(jobs) dengan delay bertahap:
  job[0].delay = 0ms
  job[1].delay = 10_000ms   (10 detik)
  job[2].delay = 20_000ms
  job[N].delay = N × 10_000ms
         │
         ▼
Worker (jalan di proses yang sama dengan Next.js server):
  │
  ├──▶ Cek dailyUsage.sentCount >= FREE_PLAN_DAILY_LIMIT?
  │        └── Ya (FREE plan) → MessageLog.status = 'skipped', lanjut
  │
  ├──▶ Render template: "Halo {{name}}" → "Halo Budi"
  │
  ├──▶ Normalisasi phone: "0812..." → "62812..."
  │
  ├──▶ POST http://wppconnect:21465/api/{session}/send-message
  │        ├── 200 OK → status='sent', sentCount++, dailyUsage++
  │        └── Error  → retry max 2x (delay 15s)
  │                     Setelah 2x gagal → status='failed'
  │
  └──▶ Emit SSE event → client update progress bar real-time

Semua job selesai → campaign.status = 'completed'
```

---

## 4. PROJECT STRUCTURE

```
mote-blaster/
├── src/
│   ├── app/
│   │   │
│   │   ├── (public)/                     # Route group: halaman publik
│   │   │   ├── page.tsx                  # Landing page (/)
│   │   │   └── login/
│   │   │       └── page.tsx              # Login page (/login)
│   │   │
│   │   ├── (dashboard)/                  # Route group: user dashboard (auth required)
│   │   │   ├── layout.tsx                # Auth guard + sidebar layout
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx              # Overview stats (/dashboard)
│   │   │   ├── connection/
│   │   │   │   └── page.tsx              # WA Instances (/connection)
│   │   │   ├── campaigns/
│   │   │   │   ├── page.tsx              # Campaign list (/campaigns)
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx          # Create campaign wizard
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx          # Campaign detail + logs
│   │   │   └── billing/
│   │   │       └── page.tsx              # Billing (/billing)
│   │   │
│   │   ├── (admin)/                      # Route group: owner panel (owner only)
│   │   │   ├── layout.tsx                # Owner auth guard + admin layout
│   │   │   └── admin/
│   │   │       ├── page.tsx              # Admin overview (/admin)
│   │   │       ├── users/
│   │   │       │   └── page.tsx          # All users table (/admin/users)
│   │   │       └── revenue/
│   │   │           └── page.tsx          # Revenue data (/admin/revenue)
│   │   │
│   │   ├── admin-login/
│   │   │   └── page.tsx                  # Owner login page (/admin-login)
│   │   │                                 # Form: email + password
│   │   │                                 # URL ini tidak dilink dari UI user biasa
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...all]/
│   │       │       └── route.ts          # better-auth handler
│   │       ├── dashboard/
│   │       │   └── route.ts              # GET stats + chart data
│   │       ├── instances/
│   │       │   ├── route.ts              # GET list, POST create
│   │       │   └── [id]/
│   │       │       ├── route.ts          # GET, DELETE
│   │       │       ├── connect/
│   │       │       │   └── route.ts      # POST connect/reconnect
│   │       │       └── qr/
│   │       │           └── route.ts      # GET QR code
│   │       ├── campaigns/
│   │       │   ├── route.ts              # GET list, POST create
│   │       │   ├── upload-csv/
│   │       │   │   └── route.ts          # POST upload CSV
│   │       │   ├── fetch-sheet/
│   │       │   │   └── route.ts          # POST Google Sheets
│   │       │   └── [id]/
│   │       │       ├── route.ts          # GET, PUT, DELETE
│   │       │       ├── start/route.ts    # POST mulai blast
│   │       │       ├── pause/route.ts    # POST pause
│   │       │       ├── logs/route.ts     # GET message logs
│   │       │       ├── export/route.ts   # GET CSV export
│   │       │       └── progress/route.ts # GET SSE stream
│   │       ├── billing/
│   │       │   ├── route.ts              # GET info subscription
│   │       │   ├── subscribe/route.ts    # POST buat subscription
│   │       │   ├── cancel/route.ts       # POST cancel
│   │       │   └── webhook/route.ts      # POST Xendit webhook (public)
│   │       └── admin/
│   │           ├── stats/route.ts        # GET platform stats
│   │           ├── users/route.ts        # GET all users
│   │           └── revenue/route.ts      # GET revenue data
│   │
│   ├── components/
│   │   ├── ui/                           # shadcn/ui components (auto-generated)
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx               # User dashboard sidebar
│   │   │   ├── AdminSidebar.tsx          # Admin panel sidebar
│   │   │   └── Header.tsx
│   │   └── shared/
│   │       ├── QRCodeModal.tsx
│   │       ├── CampaignWizard/
│   │       │   ├── index.tsx
│   │       │   ├── Step1Basic.tsx
│   │       │   ├── Step2Contacts.tsx
│   │       │   ├── Step3Message.tsx
│   │       │   └── Step4Review.tsx
│   │       ├── UpgradeBanner.tsx
│   │       └── PlanLimitBadge.tsx
│   │
│   ├── lib/
│   │   ├── auth.ts                       # better-auth instance + config
│   │   ├── auth-client.ts                # better-auth client (browser)
│   │   ├── db/
│   │   │   ├── index.ts                  # Drizzle client
│   │   │   └── schema.ts                 # Semua tabel Drizzle
│   │   ├── queue/
│   │   │   ├── index.ts                  # BullMQ Queue instance
│   │   │   └── worker.ts                 # BullMQ Worker (blast processor)
│   │   ├── wppconnect.ts                 # WPPConnect REST client
│   │   ├── xendit.ts                     # Xendit client
│   │   ├── google-sheets.ts              # Google Sheets API client
│   │   ├── csv-parser.ts                 # Parse CSV + normalisasi phone
│   │   └── template-engine.ts            # Substitusi {{variable}}
│   │
│   ├── hooks/
│   │   ├── useSession.ts                 # better-auth session hook
│   │   └── useCampaignProgress.ts        # SSE hook untuk real-time
│   │
│   ├── scripts/
│   │   └── seed-owner.ts                 # Script satu kali: buat akun owner
│   │
│   └── types/
│       └── index.ts
│
├── drizzle/
│   └── migrations/                       # Auto-generated oleh drizzle-kit
│
├── public/
├── Dockerfile
├── docker-compose.yml
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── components.json
├── package.json
└── tsconfig.json
```

---

## 5. FEATURE REQUIREMENTS — USER

### 5.1 Landing Page (`/`)
- Hero section dengan nama "Mote Blaster" + tagline
- Features section (6 fitur utama)
- Pricing section: Free vs Pro cards
- CTA:
  - "Sign Up" / "Login" → Google OAuth
  - "Go to Dashboard" → tampil jika sudah login, redirect ke `/dashboard`
- Design: soft blue (`#EFF6FF` bg, `#3B82F6` primary)

### 5.2 Authentication (better-auth + Google OAuth)
- User biasa login HANYA via Google OAuth
- Flow:
  1. Klik login → `authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })`
  2. Redirect ke Google → user approve
  3. better-auth callback: cari user by email
     - Tidak ada? → INSERT user baru (`plan = 'free'`, `role = 'user'`)
     - Ada? → load user existing
  4. better-auth set session cookie (httpOnly, secure, SameSite=Lax)
  5. Redirect ke `/dashboard`
- Session management otomatis oleh better-auth, tidak perlu handle manual

### 5.3 Dashboard Overview (`/dashboard`)
- Stat Cards:
  - 📤 Messages Sent (bulan ini)
  - ❌ Failed Messages (bulan ini)
  - 📱 Active Instances (status = connected)
  - 🚀 Active Campaigns (status = running atau pending)
- Charts:
  - Line Chart: aktivitas pesan 30 hari terakhir (sent vs failed per hari)
  - Pie Chart: distribusi status campaign
- Daily Usage Bar: untuk FREE user — progress X/50 pesan hari ini
- Upgrade Banner: tampil untuk FREE user, CTA ke `/billing`

### 5.4 WA Connection (`/connection`)
- List semua WA instances milik user
- Tiap instance card:
  - Nama instance + nomor HP (jika connected)
  - Status badge: `CONNECTED` / `DISCONNECTED` / `CONNECTING` / `QR_CODE` / `ERROR`
  - QR Code modal: saat status `QR_CODE`
  - Auto-refresh status setiap 5 detik (`refetchInterval: 5000`)
- Actions:
  - Connect / Reconnect → `POST /api/instances/[id]/connect`
  - Delete → `DELETE /api/instances/[id]` (konfirmasi modal)
- Add New Instance:
  - FREE: disabled jika sudah ada 1, tooltip "Upgrade to Pro for more instances"
  - PRO: maksimal 5 instances

### 5.5 Campaigns (`/campaigns`)
- List campaign dengan pagination (10/halaman), filter by status
- Create Campaign wizard 4 langkah:
  - **Step 1:** Nama campaign + pilih WA Instance
  - **Step 2:** Import kontak — toggle CSV Upload ATAU Google Sheets URL
    - CSV: kolom `phone` wajib, kolom lain → template variables
    - Sheets: paste URL sheet yang dishare publik
    - Preview 5 kontak pertama + total count
  - **Step 3:** Template pesan
    - Textarea dengan variabel `{{name}}`, `{{custom1}}`, dll.
    - Live preview render pesan dengan data kontak pertama
    - Toggle delay variation (random 10–30 detik)
  - **Step 4:** Review & Send / Save Draft
- Campaign Detail: message logs per kontak, export CSV
- FREE limit: max 2 campaign aktif atau pending

### 5.6 Billing (`/billing`)
- Tampil plan saat ini (Free / Pro)
- FREE: usage hari ini (X/50) + CTA upgrade
- PRO: status subscription, tanggal renewal, nominal
- Tombol "Upgrade to Pro" → Xendit payment page
- Tombol "Cancel Subscription" (PRO only, konfirmasi modal)
- Tabel riwayat invoice (status, tanggal, nominal)

---

## 6. OWNER / ADMIN PANEL

> Halaman khusus untuk owner (smnanan@motekreatif.com) memonitor seluruh platform. Tidak bisa diakses oleh user biasa.

### 6.1 Admin Login (`/admin-login`)
- Form sederhana: Email + Password
- Tidak menggunakan Google OAuth — email+password via better-auth
- Jika berhasil → redirect ke `/admin`
- Jika gagal → error "Invalid credentials"
- URL `/admin-login` tidak dilink dari UI user biasa — owner akses langsung via URL bar

### 6.2 Admin Auth Guard
Setiap halaman dan API di bawah `/admin` wajib cek:
1. Apakah ada session aktif?
2. Apakah `session.user.role === 'owner'`?
3. Jika tidak → redirect ke `/admin-login` (halaman) atau 403 (API)

### 6.3 Admin Overview (`/admin`)
Stat Cards platform-wide:
- 👥 Total Users
- 👥 Active Users Bulan Ini (user dengan ≥1 campaign aktif/selesai bulan ini)
- 💎 Pro Subscribers (user dengan plan=pro dan subscription aktif)
- 💰 MRR — Monthly Recurring Revenue (total Pro subscriber × Rp 99.000)
- 📤 Total Pesan Dikirim (all time)
- 📢 Total Campaigns Created (all time)

Charts:
- Line Chart: User registrations per hari (30 hari terakhir)
- Bar Chart: Revenue per bulan (6 bulan terakhir, dalam jutaan IDR)
- Line Chart: Pesan dikirim per hari (30 hari terakhir, platform-wide)

Recent Signups Table: 10 user terbaru (avatar, nama, email, plan, tanggal daftar)

### 6.4 Admin Users (`/admin/users`)
Tabel semua user dengan kolom:
- Avatar + Nama
- Email
- Plan (badge Free / Pro)
- Jumlah Instances
- Jumlah Campaigns
- Total pesan dikirim (all time)
- Tanggal daftar
- Status subscription (jika Pro: tanggal expiry)

Fitur:
- Search by nama atau email
- Filter by plan (All / Free / Pro)
- Sort by: Tanggal daftar, Total pesan, Nama
- Pagination (20 per halaman)

### 6.5 Admin Revenue (`/admin/revenue`)
Summary Cards:
- MRR (bulan ini)
- Total revenue all time
- Jumlah Pro subscriber aktif
- Churn bulan ini (subscription yang cancelled bulan ini)

Revenue Table: semua subscription dengan kolom:
- Nama user + email
- Status (Active / Cancelled / Expired)
- Tanggal mulai + tanggal renewal/cancelled
- Nominal (Rp 99.000)
- Xendit subscription ID

Bar Chart: Revenue per bulan (12 bulan terakhir)
Export CSV: semua data revenue

### 6.6 Admin Sidebar Navigation
```
📊  Overview          → /admin
👥  Users             → /admin/users
💰  Revenue           → /admin/revenue
─────────────────────
🔒  Logged in as: [ADMIN_EMAIL]
🚪  Logout            → clear session → /admin-login
```

---

## 7. DATABASE SCHEMA (Drizzle ORM)

```typescript
// src/lib/db/schema.ts
import {
  pgTable, text, integer, timestamp, boolean,
  pgEnum, unique, date, json
} from 'drizzle-orm/pg-core'
import { createId } from '@paralleldrive/cuid2'

// ─── ENUMS ───────────────────────────────────────────────────────────────────

export const planEnum = pgEnum('plan', ['free', 'pro'])
export const roleEnum = pgEnum('role', ['user', 'owner'])

export const instanceStatusEnum = pgEnum('instance_status', [
  'disconnected', 'connecting', 'qr_code', 'connected', 'error'
])
export const campaignStatusEnum = pgEnum('campaign_status', [
  'draft', 'pending', 'running', 'completed', 'failed', 'paused'
])
export const messageStatusEnum = pgEnum('message_status', [
  'pending', 'sent', 'failed', 'skipped'
])
export const contactSourceEnum = pgEnum('contact_source', ['csv', 'google_sheets'])
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active', 'cancelled', 'expired', 'unpaid'
])

// ─── BETTER-AUTH TABLES ──────────────────────────────────────────────────────
// Nama tabel dan kolom WAJIB persis seperti ini — better-auth case-sensitive

export const users = pgTable('user', {
  id:            text('id').primaryKey().$defaultFn(() => createId()),
  name:          text('name').notNull(),
  email:         text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image:         text('image'),
  createdAt:     timestamp('created_at').notNull().defaultNow(),
  updatedAt:     timestamp('updated_at').notNull().defaultNow(),
  // ── Field tambahan (extend better-auth user) ──
  plan:          planEnum('plan').notNull().default('free'),
  role:          roleEnum('role').notNull().default('user'),
  // role = 'owner' HANYA untuk satu akun owner
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
  password:              text('password'), // dipakai untuk owner email+password login
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

// ─── APP TABLES ──────────────────────────────────────────────────────────────

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
  scheduledAt:     timestamp('scheduled_at'),
  startedAt:       timestamp('started_at'),
  completedAt:     timestamp('completed_at'),
  createdAt:       timestamp('created_at').notNull().defaultNow(),
  updatedAt:       timestamp('updated_at').notNull().defaultNow(),
})

export const contacts = pgTable('contacts', {
  id:         text('id').primaryKey().$defaultFn(() => createId()),
  campaignId: text('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  phone:      text('phone').notNull(),      // E.164: 628123456789
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
}, (table) => ({
  uniqueLog: unique().on(table.campaignId, table.contactPhone),
}))

export const dailyUsage = pgTable('daily_usage', {
  id:        text('id').primaryKey().$defaultFn(() => createId()),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date:      date('date').notNull(),          // YYYY-MM-DD dalam timezone WIB (UTC+7)
  sentCount: integer('sent_count').notNull().default(0),
}, (table) => ({
  uniqueUsage: unique().on(table.userId, table.date),
}))

export const subscriptions = pgTable('subscriptions', {
  id:                   text('id').primaryKey().$defaultFn(() => createId()),
  userId:               text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  xenditSubscriptionId: text('xendit_subscription_id').notNull().unique(),
  xenditCustomerId:     text('xendit_customer_id').notNull(),
  status:               subscriptionStatusEnum('status').notNull().default('active'),
  planName:             text('plan_name').notNull().default('pro'),
  amount:               integer('amount').notNull(),    // dalam IDR, contoh: 99000
  currency:             text('currency').notNull().default('IDR'),
  currentPeriodStart:   timestamp('current_period_start').notNull(),
  currentPeriodEnd:     timestamp('current_period_end').notNull(),
  cancelledAt:          timestamp('cancelled_at'),
  createdAt:            timestamp('created_at').notNull().defaultNow(),
  updatedAt:            timestamp('updated_at').notNull().defaultNow(),
})
```

---

## 8. API ROUTES (Next.js Route Handlers)

### Pattern Auth Check di Setiap User Route:
```typescript
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
  // ... logic
}
```

### Pattern Auth Check di Setiap Admin Route:
```typescript
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || (session.user as any).role !== 'owner') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  // ... admin logic
}
```

### 8.1 Auth (better-auth)
```
GET/POST /api/auth/[...all]
  better-auth handler otomatis menangani:
  - GET  /api/auth/signin/google         → redirect Google OAuth
  - GET  /api/auth/callback/google       → handle OAuth callback
  - POST /api/auth/signin/email          → owner email+password login
  - POST /api/auth/signout               → logout, hapus session
  - GET  /api/auth/get-session           → cek session aktif
```

### 8.2 Dashboard (User)
```
GET /api/dashboard
  Auth: user session required
  Response: {
    sentCount: number,          // bulan ini
    failedCount: number,        // bulan ini
    activeInstances: number,
    activeCampaigns: number,
    dailySentCount: number,     // hari ini (WIB)
    dailyRemaining: number,     // hanya relevan untuk FREE user
    dailyChart: { date, sent, failed }[],
    campaignChart: { status, count }[]
  }
```

### 8.3 Instances
```
GET  /api/instances
  Auth: user required
  Response: Instance[]

POST /api/instances
  Auth: user required
  Body: { name: string }
  Validasi: FREE max 1, PRO max 5
  Response: Instance

GET    /api/instances/[id]         → Instance detail
DELETE /api/instances/[id]         → Stop WPPConnect session + hapus DB

POST /api/instances/[id]/connect
  Action: start/restart WPPConnect session
  Response: { status, qrCode?: string }

GET /api/instances/[id]/qr
  Response: { qrCode: string }   // base64
```

### 8.4 Campaigns
```
GET  /api/campaigns
  Query: ?page=1&limit=10&status=running
  Response: { data: Campaign[], total, page, totalPages }

POST /api/campaigns
  Body: { name, instanceId, messageTemplate, contactSource, contacts?: Contact[] }
  Validasi: FREE max 2 active/pending campaigns

GET    /api/campaigns/[id]           → Campaign + stats
PUT    /api/campaigns/[id]           → Update (hanya jika status=draft)
DELETE /api/campaigns/[id]

POST /api/campaigns/[id]/start
  Action: validasi → INSERT message_logs → BullMQ addBulk dengan staggered delay
  Response: { success: true, jobsQueued: number }

POST /api/campaigns/[id]/pause
  Action: pause semua pending/delayed jobs di BullMQ

GET /api/campaigns/[id]/logs
  Query: ?page=1&limit=50&status=failed
  Response: { data: MessageLog[], total }

GET /api/campaigns/[id]/export
  Response: CSV file (Content-Type: text/csv)

GET /api/campaigns/[id]/progress
  Response: SSE stream
  Events: { campaignId, sentCount, failedCount, status, totalCount }

POST /api/campaigns/upload-csv
  Body: FormData (field: 'file', .csv only, max 5MB)
  Response: { totalCount, preview: Contact[5], columns: string[] }

POST /api/campaigns/fetch-sheet
  Body: { url: string }
  Response: { totalCount, preview: Contact[5], columns: string[] }
```

### 8.5 Billing
```
GET  /api/billing
  Response: { plan, subscription?, invoices[] }

POST /api/billing/subscribe
  Action: buat Xendit customer + subscription
  Response: { paymentUrl: string }

POST /api/billing/cancel
  Action: cancel Xendit subscription

POST /api/billing/webhook
  Auth: TIDAK perlu (public, verify x-callback-token header)
  Events handled:
    - invoice.paid           → user.plan='pro', subscription ACTIVE
    - invoice.expired        → subscription EXPIRED
    - subscription.cancelled → user.plan='free', subscription CANCELLED
```

### 8.6 Admin API (owner only)
```
GET /api/admin/stats
  Auth: role=owner required
  Response: {
    totalUsers,
    activeUsersThisMonth,
    proSubscribers,
    mrr,                      // dalam IDR
    totalMessagesSent,
    totalCampaigns,
    recentSignups: User[10],
    userGrowthChart: { date, count }[],     // 30 hari
    revenueChart: { month, revenue }[],      // 6 bulan
    messageSentChart: { date, count }[]      // 30 hari
  }

GET /api/admin/users
  Auth: role=owner required
  Query: ?page=1&limit=20&search=nama&plan=pro&sort=createdAt
  Response: {
    data: {
      id, name, email, plan, role,
      instanceCount, campaignCount, totalMessagesSent,
      createdAt, subscription?
    }[],
    total, page, totalPages
  }

GET /api/admin/revenue
  Auth: role=owner required
  Query: ?page=1&limit=20
  Response: {
    summary: { mrr, totalRevenue, activeSubscribers, churnThisMonth },
    revenueChart: { month, revenue }[],    // 12 bulan
    data: Subscription[]
  }
```

---

## 9. FLOW DIAGRAMS

### 9.1 User Auth Flow (Google OAuth)
```
User klik "Login with Google"
  │
  ▼
authClient.signIn.social({ provider: 'google', callbackURL: '/dashboard' })
  │
  ▼
Redirect ke accounts.google.com (Google consent screen)
  │
  ▼ User approve
Google redirect ke /api/auth/callback/google
  │
  ▼
better-auth proses callback:
  ├── Cari user by email di tabel 'user'
  ├── Tidak ada? → INSERT user baru (plan='free', role='user')
  └── Ada? → load user existing
  │
  ▼
better-auth buat session, set cookie httpOnly
  │
  ▼
Redirect ke /dashboard
```

### 9.2 Owner Login Flow
```
Owner buka /admin-login (langsung via URL bar)
  │
  ▼
Isi form: email + password
  │
  ▼
authClient.signIn.email({ email, password })
→ POST /api/auth/signin/email
  │
  ▼
better-auth verifikasi:
  ├── Cari user by email
  ├── Compare password dengan bcrypt hash di tabel 'account'
  └── Cek role === 'owner'
  │
  ├── Gagal? → tampil error "Invalid credentials"
  └── Berhasil? → buat session, set cookie
  │
  ▼
Redirect ke /admin
  │
  ▼
Admin layout cek session.user.role === 'owner'?
  ├── Tidak? → redirect ke /admin-login
  └── Ya? → render admin panel
```

### 9.3 Setup Owner Account (Satu Kali Saat Deploy)
```
Owner account TIDAK dibuat via UI.
Dibuat via seed script setelah deploy pertama.

1. Set env vars di Easypanel:
   ADMIN_EMAIL=smnanan@motekreatif.com
   ADMIN_PASSWORD=[password-pilihan-owner]

2. Jalankan di terminal Easypanel service 'app':
   npx drizzle-kit migrate
   npx tsx src/scripts/seed-owner.ts

3. Script akan:
   - Baca ADMIN_EMAIL dan ADMIN_PASSWORD dari env
   - Hash password dengan bcrypt (cost 12)
   - INSERT ke tabel 'user' (role='owner')
   - INSERT ke tabel 'account' (providerId='credential', password=hash)

4. Coba login di /admin-login
```

### 9.4 Campaign Blast Flow
```
User klik "Start Campaign"
  │
  ▼
POST /api/campaigns/[id]/start
  │
  ▼
Server-side validasi:
  ├── Instance status = 'connected'? → jika tidak, error
  ├── Campaign status = 'draft' atau 'pending'? → jika tidak, error
  └── FREE plan: daily limit belum habis? → jika habis, error
  │
  ▼
db: UPDATE campaigns SET status='running', startedAt=now()
db: INSERT message_logs (satu row per kontak, status='pending')
  │
  ▼
bullMQ.addBulk(contacts.map((c, i) => ({
  name: 'send-message',
  data: { campaignId, contactId, instanceId, ... },
  opts: { delay: i * 10_000, attempts: 3, backoff: { type:'fixed', delay:15_000 } }
})))
  │
  ▼
Worker proses setiap job:
  1. Cek dailyUsage >= FREE_PLAN_DAILY_LIMIT (50) → SKIPPED jika ya
  2. renderTemplate("Halo {{name}}", { name: "Budi" }) → "Halo Budi"
  3. normalizePhone("0812345") → "62812345"
  4. POST http://mote_wppconnect:21465/api/{session}/send-message
     - OK → status='sent', sentCount++, dailyUsage++
     - Error → retry (max 2 kali, delay 15s)
     - Gagal semua → status='failed'
  5. Emit SSE event progress ke client
  │
  ▼
Semua job selesai → campaign.status = 'completed'
```

### 9.5 Xendit Payment Flow
```
User klik "Upgrade to Pro"
  │
  ▼
POST /api/billing/subscribe
  │
  ▼
Server: buat Xendit Customer (jika belum ada)
Server: buat Xendit Recurring Subscription
Server: simpan pending subscription ke DB
  │
  ▼
Response: { paymentUrl }
Frontend redirect user ke Xendit payment page
  │
  ▼ User bayar
Xendit kirim webhook ke POST /api/billing/webhook
  │
  ▼
Server verifikasi x-callback-token header
  │
  ▼
Handle event:
  invoice.paid:
    → subscription.status = 'active'
    → user.plan = 'pro'
  invoice.expired:
    → subscription.status = 'expired'
  subscription.cancelled:
    → subscription.status = 'cancelled'
    → user.plan = 'free'
```

---

## 10. UI/UX REQUIREMENTS

### 10.1 Color Palette
```css
/* User Dashboard */
--primary:       #3B82F6;   /* Blue 500 */
--primary-dark:  #1D4ED8;   /* Blue 700 */
--primary-light: #DBEAFE;   /* Blue 100 */
--bg:            #F8FAFC;   /* Slate 50 */
--bg-card:       #FFFFFF;
--bg-sidebar:    #EFF6FF;   /* Blue 50 */
--text:          #1E293B;   /* Slate 800 */
--text-muted:    #64748B;   /* Slate 500 */
--border:        #E2E8F0;   /* Slate 200 */
--success:       #22C55E;
--error:         #EF4444;
--warning:       #F59E0B;

/* Admin Panel — sedikit berbeda agar jelas ini halaman owner */
--admin-sidebar-bg:    #0F172A;  /* Slate 900 — gelap */
--admin-sidebar-text:  #E2E8F0;
--admin-accent:        #6366F1;  /* Indigo 500 */
```

### 10.2 Layout
- Sidebar width: 240px (collapsible di mobile)
- Content max-width: 1200px, centered
- Card border-radius: 12px
- Font: Inter (via `next/font/google`)

### 10.3 User Dashboard Sidebar
```
🏠  Dashboard        → /dashboard
📱  WA Connection    → /connection
📢  Campaigns        → /campaigns
💳  Billing          → /billing
─────────────────────
[Avatar] Nama User
🚪  Logout
```

### 10.4 Admin Panel Sidebar (gelap, distinct)
```
📊  Overview         → /admin
👥  Users            → /admin/users
💰  Revenue          → /admin/revenue
─────────────────────
🔒  Owner
🚪  Logout
```

### 10.5 Component Behavior
- Loading skeleton di semua data fetch (Suspense + skeleton)
- Toast notification (shadcn/ui Sonner) untuk setiap aksi sukses/gagal
- Konfirmasi dialog sebelum aksi destruktif (delete, cancel subscription)
- Form validation on blur + on submit dengan pesan error yang jelas
- Empty state dengan ilustrasi + CTA yang helpfull
- Semua batas plan (limit) ditampilkan inline, tidak disembunyikan dari user

---

## 11. THIRD-PARTY INTEGRATIONS

### 11.1 better-auth Config
```typescript
// src/lib/auth.ts
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
    }
  }),
  emailAndPassword: {
    enabled: true,  // dipakai untuk owner login
  },
  socialProviders: {
    google: {
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    cookieCache: { enabled: true, maxAge: 300 },  // 5 menit cache
  },
  user: {
    additionalFields: {
      plan: { type: 'string', defaultValue: 'free', required: false },
      role: { type: 'string', defaultValue: 'user', required: false },
    },
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL!],
})

// src/lib/auth-client.ts
import { createAuthClient } from 'better-auth/react'
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL!,
})
```

### 11.2 BullMQ + instrumentation.ts
```typescript
// src/instrumentation.ts
// Worker WAJIB distart saat Next.js server boot via instrumentation hook

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startWorker } = await import('./lib/queue/worker')
    await startWorker()
    console.log('[Worker] BullMQ blast worker started')
  }
}

// next.config.ts — TAMBAHKAN:
const nextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,  // enable instrumentation.ts
  },
}
```

### 11.3 WPPConnect REST Client
```typescript
// src/lib/wppconnect.ts
const BASE_URL = process.env.WPPCONNECT_BASE_URL!   // http://mote_wppconnect:21465
const SECRET   = process.env.WPPCONNECT_SECRET_KEY!

// Session name format: uid_{userId.slice(0,8)}_iid_{instanceId.slice(0,8)}
// Contoh: uid_clxxx123_iid_clyyy456

async function sendMessage(session: string, phone: string, message: string) {
  const res = await fetch(`${BASE_URL}/api/${session}/send-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SECRET}`,
    },
    body: JSON.stringify({ phone, message }),
  })
  if (!res.ok) throw new Error(`WPPConnect error: ${res.status}`)
  return res.json()
}
```

### 11.4 Google Sheets
```typescript
// src/lib/google-sheets.ts
import { google } from 'googleapis'

const sheetsClient = google.sheets({
  version: 'v4',
  auth: new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  }),
})

// User TIDAK perlu invite service account. Cukup set sheet ke
// "Anyone with the link can view".

function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match?.[1] ?? null
}
```

### 11.5 Xendit
```
Integration: Xendit Recurring Subscription
Currency: IDR
Pro Plan Price: dari env XENDIT_PRO_PLAN_PRICE (default: 99000)

Webhook events yang di-handle di POST /api/billing/webhook:
- invoice.paid           → subscription ACTIVE, user.plan = 'pro'
- invoice.expired        → subscription EXPIRED
- subscription.cancelled → subscription CANCELLED, user.plan = 'free'

Verifikasi webhook: header x-callback-token === env XENDIT_WEBHOOK_TOKEN
```

---

## 12. EASYPANEL DEPLOYMENT

### 12.1 Services di Easypanel

| Service | Type | Port |
|---|---|---|
| `app` | App (GitHub) | 3000 |
| `db` | PostgreSQL | 5432 |
| `redis` | Redis | 6379 |
| `wppconnect` | Docker Image `wppconnect/server:latest` | 21465 |

### 12.2 Dockerfile (di root project)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Runner ──────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static     ./.next/static
COPY --from=builder /app/public           ./public

# Scripts untuk migration dan seed
COPY --from=builder /app/drizzle         ./drizzle
COPY --from=builder /app/src/scripts     ./src/scripts
COPY --from=builder /app/node_modules    ./node_modules

EXPOSE 3000
CMD ["node", "server.js"]
```

### 12.3 next.config.ts
```typescript
const nextConfig = {
  output: 'standalone',               // WAJIB untuk Docker
  experimental: {
    instrumentationHook: true,        // WAJIB untuk BullMQ worker
  },
}
export default nextConfig
```

### 12.4 package.json scripts
```json
{
  "scripts": {
    "dev":          "next dev",
    "build":        "next build",
    "start":        "next start",
    "db:generate":  "drizzle-kit generate",
    "db:migrate":   "drizzle-kit migrate",
    "db:studio":    "drizzle-kit studio",
    "seed:owner":   "tsx src/scripts/seed-owner.ts"
  }
}
```

### 12.5 Owner Seed Script
```typescript
// src/scripts/seed-owner.ts
// Jalankan SATU KALI setelah deploy pertama:
//   npx tsx src/scripts/seed-owner.ts
//
// ⚠️  JANGAN hardcode email atau password di file ini.
//    Semua dari environment variable.

import 'dotenv/config'
import { db } from '../lib/db'
import { users, accounts } from '../lib/db/schema'
import bcrypt from 'bcryptjs'
import { createId } from '@paralleldrive/cuid2'

async function seedOwner() {
  const email    = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD env vars first')
  }

  const hashedPassword = await bcrypt.hash(password, 12)
  const userId = createId()
  const now = new Date()

  // Insert user
  await db.insert(users).values({
    id: userId,
    name: 'Owner',
    email,
    emailVerified: true,
    plan: 'free',
    role: 'owner',
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing()

  // Insert account (credential provider untuk email+password)
  await db.insert(accounts).values({
    id: createId(),
    accountId: email,
    providerId: 'credential',
    userId,
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing()

  console.log(`✅ Owner account created: ${email}`)
  console.log(`   Login di: /admin-login`)
  process.exit(0)
}

seedOwner().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
```

### 12.6 Langkah Deploy di Easypanel

**1. Buat project baru** → nama: `mote`

**2. Tambah PostgreSQL**
- Name: `db`
- Catat internal connection string: `postgres://postgres:PWD@mote_db:5432/mote`

**3. Tambah Redis**
- Name: `redis`
- Catat internal URL: `redis://default:PWD@mote_redis:6379`

**4. Tambah WPPConnect**
- Source: Docker Image → `wppconnect/server:latest`
- Port: `21465`
- Environment:
  ```
  SECRET_KEY=ganti_dengan_secret_panjang_acak
  HOST=0.0.0.0
  PORT=21465
  ```

**5. Tambah App**
- Source: GitHub → repo `mote-blaster`, branch `main`
- Build Path: `/` (root project)
- Port: `3000`
- Set semua environment variables (lihat Section 13)

**6. Assign domain ke service `app`**
- Contoh: `mote-blaster.85c4o8.easypanel.host`
- Update env `BETTER_AUTH_URL` dan `NEXT_PUBLIC_APP_URL` ke domain ini
- Update Google OAuth Authorized redirect URI ke:
  `https://[domain]/api/auth/callback/google`

**7. Setelah deploy berhasil — jalankan di terminal service `app`:**
```bash
npx drizzle-kit migrate
npx tsx src/scripts/seed-owner.ts
```

**8. Test owner login:**
- Buka `https://[domain]/admin-login`
- Login dengan ADMIN_EMAIL + ADMIN_PASSWORD

### 12.7 Docker Compose (Local Development)
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL:                "postgres://postgres:postgres@db:5432/mote"
      REDIS_URL:                   "redis://redis:6379"
      BETTER_AUTH_SECRET:          "local_secret_ganti_ini_min_32_karakter"
      BETTER_AUTH_URL:             "http://localhost:3000"
      NEXT_PUBLIC_APP_URL:         "http://localhost:3000"
      GOOGLE_CLIENT_ID:            "${GOOGLE_CLIENT_ID}"
      GOOGLE_CLIENT_SECRET:        "${GOOGLE_CLIENT_SECRET}"
      WPPCONNECT_BASE_URL:         "http://wppconnect:21465"
      WPPCONNECT_SECRET_KEY:       "local_wpp_secret"
      XENDIT_SECRET_KEY:           "${XENDIT_SECRET_KEY}"
      XENDIT_WEBHOOK_TOKEN:        "${XENDIT_WEBHOOK_TOKEN}"
      XENDIT_PRO_PLAN_PRICE:       "99000"
      XENDIT_PRO_PLAN_NAME:        "Mote Blaster Pro"
      GOOGLE_SERVICE_ACCOUNT_JSON: "${GOOGLE_SERVICE_ACCOUNT_JSON}"
      FREE_PLAN_DAILY_LIMIT:       "50"
      FREE_PLAN_MAX_INSTANCES:     "1"
      FREE_PLAN_MAX_CAMPAIGNS:     "2"
      MIN_DELAY_SECONDS:           "10"
      ADMIN_EMAIL:                 "${ADMIN_EMAIL}"
      ADMIN_PASSWORD:              "${ADMIN_PASSWORD}"
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER:     postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB:       mote
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

  wppconnect:
    image: wppconnect/server:latest
    ports:
      - "21465:21465"
    environment:
      - SECRET_KEY=local_wpp_secret
      - HOST=0.0.0.0
    volumes:
      - wppdata:/usr/src/wppconnect/userDataDir

volumes:
  pgdata:
  redisdata:
  wppdata:
```

---

## 13. ENVIRONMENT VARIABLES

```env
# ─── App URL ──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://mote-blaster.85c4o8.easypanel.host

# ─── better-auth ─────────────────────────────────────────────────────────────
# Generate random string min 32 karakter untuk BETTER_AUTH_SECRET
# Contoh: openssl rand -base64 32
BETTER_AUTH_SECRET=buat_random_string_minimal_32_karakter
BETTER_AUTH_URL=https://mote-blaster.85c4o8.easypanel.host

# ─── Database (Easypanel internal) ───────────────────────────────────────────
DATABASE_URL=postgres://postgres:PASSWORD@mote_db:5432/mote

# ─── Redis (Easypanel internal) ──────────────────────────────────────────────
REDIS_URL=redis://default:PASSWORD@mote_redis:6379

# ─── Google OAuth ────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret

# ─── Google Sheets Service Account ───────────────────────────────────────────
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"..."}

# ─── WPPConnect (Easypanel internal) ─────────────────────────────────────────
WPPCONNECT_BASE_URL=http://mote_wppconnect:21465
WPPCONNECT_SECRET_KEY=secret_yang_sama_dengan_env_wppconnect_service

# ─── Xendit ──────────────────────────────────────────────────────────────────
XENDIT_SECRET_KEY=xnd_production_xxxxxxxxx
XENDIT_WEBHOOK_TOKEN=your_xendit_webhook_verification_token
XENDIT_PRO_PLAN_PRICE=99000
XENDIT_PRO_PLAN_NAME=Mote Blaster Pro

# ─── Plan Limits ─────────────────────────────────────────────────────────────
FREE_PLAN_DAILY_LIMIT=50
FREE_PLAN_MAX_INSTANCES=1
FREE_PLAN_MAX_CAMPAIGNS=2
MIN_DELAY_SECONDS=10

# ─── Owner / Admin ───────────────────────────────────────────────────────────
# Email owner — digunakan saat seed dan identifikasi role
ADMIN_EMAIL=smnanan@motekreatif.com
# Password owner — ISI SENDIRI, jangan pernah commit ke GitHub atau share
# Setelah seed:owner dijalankan, env ini tetap harus ada untuk better-auth
ADMIN_PASSWORD=isi_password_kamu_disini
```

> ⚠️ **PENTING:**
> - File `.env` WAJIB ada di `.gitignore` — JANGAN commit ke GitHub
> - Di Easypanel, set env vars melalui UI panel "Environment Variables"
> - `BETTER_AUTH_SECRET` adalah kunci enkripsi session — simpan baik-baik, jangan ganti setelah production

---

## 14. SECURITY REQUIREMENTS

1. **Session via httpOnly cookie** — better-auth handle otomatis, token TIDAK pernah di localStorage
2. **Same-origin** — frontend + backend dalam 1 Next.js app → tidak ada CORS issue sama sekali
3. **Admin route guard** — SETIAP request ke `/api/admin/*` wajib cek `role === 'owner'` di server
4. **Admin page guard** — layout.tsx di route group `(admin)` wajib redirect ke `/admin-login` jika bukan owner
5. **Password hashing** — owner password di-hash dengan bcrypt (cost factor 12) sebelum disimpan ke DB
6. **Rate limiting** — gunakan middleware, 100 req/min per IP pada semua route
7. **Input sanitization** — semua input user disanitasi sebelum disimpan ke DB
8. **Xendit webhook verification** — verifikasi `x-callback-token` header di setiap incoming webhook
9. **WPPConnect key** — TIDAK pernah dikirim ke client. Semua call WPPConnect dari server saja
10. **CSV validation** — validasi MIME type + ukuran file (max 5MB) sebelum parsing
11. **Google Sheets URL** — validasi format URL sebelum memanggil API (cegah SSRF)
12. **Plan enforcement** — SEMUA cek batas plan dilakukan server-side. JANGAN percaya data dari client
13. **Admin URL** — `/admin-login` tidak dilink dari UI publik. Security by authentication, bukan by obscurity

---

## 15. IMPLEMENTATION NOTES FOR CLAUDE CODE

> Catatan spesifik agar tidak salah implementasi:

### 15.1 better-auth — Nama Tabel WAJIB Persis Ini
```
Tabel: 'user' (bukan 'users')
Tabel: 'session' (bukan 'sessions')
Tabel: 'account' (bukan 'accounts')
Tabel: 'verification'
```
better-auth case-sensitive terhadap nama tabel. Jika nama tabel berbeda, auth tidak akan bisa jalan.

### 15.2 better-auth — Extend User Fields
Field `plan` dan `role` ditambahkan ke tabel `user` yang sudah ada. Di config `betterAuth`, daftarkan di `user.additionalFields`. Ini diperlukan agar better-auth ikut menyertakan field ini dalam session object.

### 15.3 Owner Login — Gunakan Email+Password Provider
```typescript
// Di admin-login page:
const { error } = await authClient.signIn.email({
  email,
  password,
  callbackURL: '/admin',
})
```
Bukan `signIn.social`. Provider `emailAndPassword` harus di-enable di `betterAuth` config.

### 15.4 BullMQ Worker — WAJIB Start via instrumentation.ts
Worker TIDAK boleh di-start di route handler karena akan buat instance baru setiap request.
Gunakan `src/instrumentation.ts` dengan guard `process.env.NEXT_RUNTIME === 'nodejs'` agar tidak jalan di Edge runtime.
Di `next.config.ts` tambahkan `experimental: { instrumentationHook: true }`.

### 15.5 Delay 10 Detik — Non-Negotiable
```typescript
// BENAR — delay di job options (queue-level, restart-safe)
bullMQ.addBulk(contacts.map((c, i) => ({
  name: 'send-message',
  data: { ... },
  opts: { delay: i * 10_000 }  // ← delay di sini
})))

// SALAH — setTimeout di dalam worker (tidak restart-safe)
await new Promise(r => setTimeout(r, 10_000))  // ← jangan begini
```

### 15.6 Daily Limit — Timezone WIB (UTC+7)
```typescript
// Dapatkan tanggal hari ini dalam WIB
const todayWIB = new Date().toLocaleDateString('en-CA', {
  timeZone: 'Asia/Jakarta'
})
// Format: "2025-06-15"
// Gunakan ini sebagai key di tabel daily_usage
```

### 15.7 WPPConnect Session Naming
```typescript
// Format: uid_{userId.slice(0,8)}_iid_{instanceId.slice(0,8)}
// Jaga nama pendek, WPPConnect ada batasan panjang
const sessionName = `uid_${userId.slice(0,8)}_iid_${instanceId.slice(0,8)}`
```

### 15.8 Phone Number Normalization
```typescript
function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '')          // hapus semua non-digit
  if (digits.startsWith('0'))   digits = '62' + digits.slice(1)
  else if (!digits.startsWith('62')) digits = '62' + digits
  return digits   // hasil: 628123456789 (tanpa +)
}
```

### 15.9 Template Variable Substitution
```typescript
function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
}
// "Halo {{name}}, kamu dari {{kota}}"
// + { name: "Budi", kota: "Jakarta" }
// → "Halo Budi, kamu dari Jakarta"
// Variable tidak dikenal → string kosong (bukan "{{variableName}}")
```

### 15.10 SSE (Server-Sent Events) untuk Real-time Progress
```typescript
// GET /api/campaigns/[id]/progress
export async function GET(req: Request) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }
      // Polling DB atau subscribe Redis pub/sub untuk progress update
      const interval = setInterval(async () => {
        const campaign = await getCampaignProgress(campaignId)
        send(campaign)
        if (campaign.status === 'completed' || campaign.status === 'failed') {
          clearInterval(interval)
          controller.close()
        }
      }, 2000)
    }
  })
  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    }
  })
}
```

### 15.11 Easypanel Internal Network Naming
```
Format nama internal: {project-name}_{service-name}
Contoh project 'mote':
  - PostgreSQL → mote_db
  - Redis      → mote_redis
  - WPPConnect → mote_wppconnect

JANGAN gunakan 'localhost' untuk komunikasi antar service.
```

### 15.12 Google OAuth Callback URL
```
URL callback better-auth (berbeda dari stack lama yang pakai Passport.js):
https://[domain]/api/auth/callback/google

Daftarkan URL ini di Google Cloud Console:
APIs & Services → Credentials → OAuth 2.0 Client → Authorized redirect URIs
```

### 15.13 Checklist Deploy Pertama
```
□ Buat 4 services di Easypanel: app, db, redis, wppconnect
□ Set semua env vars di service 'app'
□ Pastikan WPPCONNECT_SECRET_KEY sama dengan env di wppconnect service
□ Assign domain ke service 'app'
□ Update Google OAuth authorized redirect URI ke domain baru
□ Push code ke GitHub → Easypanel auto-build
□ Setelah build sukses, buka terminal service 'app':
    npx drizzle-kit migrate
    npx tsx src/scripts/seed-owner.ts
□ Test user login: klik Login di landing page
□ Test owner login: buka /admin-login, masukkan ADMIN_EMAIL + ADMIN_PASSWORD
□ Verifikasi /admin hanya bisa diakses owner
□ Verifikasi /dashboard tidak bisa diakses tanpa login
```

---

*End of PRD — Mote Blaster v2.0*
*Stack: Next.js 15 · Drizzle ORM · better-auth · PostgreSQL · Redis · BullMQ · TailwindCSS v3 · shadcn/ui*
*Deployment: Easypanel — 1 service Next.js app (no CORS, no nginx proxy, no cross-origin cookie issues)*
