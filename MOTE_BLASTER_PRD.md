# 📋 PRODUCT REQUIREMENTS DOCUMENT (PRD)
# Mote Blaster — WhatsApp Blast Web Application

**Version:** 1.0.0  
**Last Updated:** 2025  
**Status:** Ready for Development  

---

## 📌 TABLE OF CONTENTS

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [System Architecture](#3-system-architecture)
4. [Project Structure](#4-project-structure)
5. [Feature Requirements](#5-feature-requirements)
6. [Database Schema](#6-database-schema)
7. [API Endpoints](#7-api-endpoints)
8. [Flow Diagrams](#8-flow-diagrams)
9. [UI/UX Requirements](#9-uiux-requirements)
10. [Third-Party Integrations](#10-third-party-integrations)
11. [Easypanel Deployment](#11-easypanel-deployment)
12. [Environment Variables](#12-environment-variables)
13. [Security Requirements](#13-security-requirements)

---

## 1. PROJECT OVERVIEW

**App Name:** Mote Blaster  
**Type:** WhatsApp Bulk Messaging (Blasting) Web Application  
**Primary Language:** English (UI), Indonesian (support docs)

### 1.1 Description
Mote Blaster is a SaaS web application that allows users to send bulk WhatsApp messages (blasts) using WPPConnect Server as the WhatsApp engine. Users can manage campaigns, upload contact databases via CSV or Google Sheets, and personalize message templates. The platform offers two subscription tiers: Free and Pro.

### 1.2 Business Rules
| Rule | Free Plan | Pro Plan |
|---|---|---|
| Daily blast limit | 50 messages/day | Unlimited |
| Minimum delay between messages | 10 seconds | 10 seconds (mandatory) |
| WhatsApp instances | 1 | 5 |
| Active campaigns | 2 | Unlimited |
| Price | Rp 0 | Subscription (monthly recurring via Xendit) |

> ⚠️ **IMPORTANT:** The 10-second minimum delay between messages is MANDATORY on all plans to avoid WhatsApp account bans. This is enforced at the backend queue level and cannot be bypassed.

---

## 2. TECH STACK

### 2.1 Frontend
| Layer | Technology |
|---|---|
| Framework | **React 18 + Vite + TypeScript** |
| Styling | **TailwindCSS + shadcn/ui** |
| State Management | **Zustand** |
| Server State / Fetching | **TanStack Query (React Query v5)** |
| Routing | **React Router v6** |
| Charts | **Recharts** |
| Form Handling | **React Hook Form + Zod** |
| HTTP Client | **Axios** |
| Auth | Google OAuth 2.0 via backend redirect |

### 2.2 Backend
| Layer | Technology |
|---|---|
| Runtime | **Node.js 20 LTS** |
| Framework | **Express.js + TypeScript** |
| ORM | **Prisma** |
| Database | **PostgreSQL 15** |
| Auth | **Google OAuth 2.0 (Passport.js)** + **JWT (access + refresh token)** |
| Message Queue | **Bull + Redis** |
| WebSocket | **Socket.io** (real-time dashboard updates) |
| Validation | **Zod** |
| WA Integration | **WPPConnect REST API** (separate service) |
| Payment | **Xendit SDK** |
| Google Sheets | **Google Sheets API v4** |
| File Upload | **Multer** |
| CSV Parsing | **csv-parse** |

### 2.3 Infrastructure (Easypanel)
| Service | Stack |
|---|---|
| Frontend App | React + Vite (Static / Nginx) |
| Backend API | Node.js Express |
| Database | PostgreSQL (Easypanel managed) |
| Cache / Queue | Redis (Easypanel managed) |
| WA Engine | WPPConnect Server (separate service) |

---

## 3. SYSTEM ARCHITECTURE

### 3.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         EASYPANEL                                │
│                                                                  │
│  ┌─────────────────┐     ┌─────────────────┐                    │
│  │   FRONTEND      │────▶│   BACKEND API   │                    │
│  │  React + Vite   │     │  Express + TS   │                    │
│  │  (Port 5173/80) │◀────│  (Port 3001)    │                    │
│  └─────────────────┘     └────────┬────────┘                    │
│                                   │                              │
│              ┌────────────────────┼────────────────────┐        │
│              │                    │                    │        │
│  ┌───────────▼───┐   ┌────────────▼──────┐  ┌────────▼──────┐ │
│  │  PostgreSQL   │   │      Redis         │  │ WPPConnect    │ │
│  │  (Port 5432)  │   │  (Bull Queue)      │  │ Server        │ │
│  │               │   │  (Port 6379)       │  │ (Port 21465)  │ │
│  └───────────────┘   └────────────────────┘  └───────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                               │
                    ┌──────────┼───────────────┐
                    │          │               │
             ┌──────▼───┐  ┌──▼──────┐  ┌────▼──────┐
             │  Google  │  │ Xendit  │  │  Google   │
             │  OAuth   │  │ Payment │  │  Sheets   │
             └──────────┘  └─────────┘  └───────────┘
```

### 3.2 Message Queue Architecture

```
User triggers Campaign
        │
        ▼
Backend API creates Campaign record (status: PENDING)
        │
        ▼
Bull Queue: add all recipient jobs to queue
        │
        ▼
Queue Worker picks up job (1 job = 1 recipient)
        │
        ├──▶ Check daily limit (Free: 50/day)
        │         │
        │    Limit exceeded? → Mark message SKIPPED, stop
        │
        ├──▶ Enforce 10s minimum delay (rate limiter per instance)
        │
        ├──▶ Call WPPConnect REST API → sendMessage
        │
        ├──▶ Success → update MessageLog status = SENT
        │
        └──▶ Failure → update MessageLog status = FAILED, retry up to 2x
```

---

## 4. PROJECT STRUCTURE

### 4.1 Monorepo Layout
```
mote-blaster/
├── frontend/                    # React + Vite app
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components
│   │   │   ├── layout/          # Sidebar, Navbar, etc.
│   │   │   └── shared/          # Reusable components
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── Dashboard/
│   │   │   │   ├── Overview.tsx
│   │   │   │   ├── WAConnection.tsx
│   │   │   │   ├── Campaigns.tsx
│   │   │   │   └── Billing.tsx
│   │   │   └── Auth/
│   │   │       ├── Login.tsx
│   │   │       └── Callback.tsx
│   │   ├── stores/              # Zustand stores
│   │   ├── hooks/               # Custom hooks
│   │   ├── services/            # API service functions
│   │   ├── lib/                 # Utils, axios config
│   │   ├── types/               # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── package.json
│
├── backend/                     # Express + TypeScript
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts      # Prisma client
│   │   │   ├── redis.ts         # Redis/Bull config
│   │   │   ├── passport.ts      # Google OAuth strategy
│   │   │   └── wppconnect.ts    # WPPConnect REST client
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── instance.controller.ts
│   │   │   ├── campaign.controller.ts
│   │   │   └── billing.controller.ts
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── plan.middleware.ts  # Check plan limits
│   │   │   └── error.middleware.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── dashboard.routes.ts
│   │   │   ├── instance.routes.ts
│   │   │   ├── campaign.routes.ts
│   │   │   └── billing.routes.ts
│   │   ├── services/
│   │   │   ├── wppconnect.service.ts
│   │   │   ├── xendit.service.ts
│   │   │   ├── googleSheets.service.ts
│   │   │   └── messageQueue.service.ts
│   │   ├── jobs/
│   │   │   └── blast.worker.ts  # Bull queue worker
│   │   ├── utils/
│   │   │   ├── jwt.ts
│   │   │   ├── csvParser.ts
│   │   │   └── templateEngine.ts  # Variable substitution
│   │   ├── types/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── Dockerfile
│   ├── tsconfig.json
│   └── package.json
│
├── docker-compose.yml           # Local development
└── README.md
```

---

## 5. FEATURE REQUIREMENTS

### 5.1 Landing Page
- **Route:** `/` (public)
- **Sections:**
  - Hero section with product name "Mote Blaster" and tagline
  - Features section (highlight Free vs Pro)
  - Pricing section (Free vs Pro cards)
  - CTA buttons:
    - **"Sign Up"** → triggers Google OAuth
    - **"Login"** → triggers Google OAuth
    - **"Go to Dashboard"** → shows if user is already authenticated (redirects to `/dashboard`)
- **Design:** Clean, soft blue color palette (`#EFF6FF` bg, `#3B82F6` primary, `#1D4ED8` accent)

### 5.2 Authentication
- **Method:** Google OAuth 2.0 ONLY (no email/password)
- **Flow:**
  1. User clicks "Sign Up" or "Login"
  2. Redirect to Google OAuth consent screen
  3. Google redirects back to `/auth/google/callback`
  4. Backend creates or finds user record
  5. Backend issues JWT access token (15min) + refresh token (7 days)
  6. Frontend stores tokens in `httpOnly` cookies
  7. Redirect to `/dashboard`
- **Auto-assign plan:** New users automatically get `FREE` plan
- **Token refresh:** Silent refresh before expiry using refresh token endpoint

### 5.3 Dashboard — Overview Page
- **Route:** `/dashboard` (authenticated)
- **Stat Cards (top row):**
  - 📤 **Messages Sent** — total sent messages (current month)
  - ❌ **Failed Messages** — total failed messages (current month)
  - 📱 **Active Instances** — number of connected WA instances
  - 🚀 **Active Campaigns** — campaigns currently running or scheduled
- **Charts:**
  - **Line Chart:** Message activity over the last 30 days (sent vs failed per day)
  - **Donut/Pie Chart:** Campaign status distribution (sent, failed, pending, running)
- **Upgrade Banner:** A prominent card/banner visible to FREE users showing Pro plan benefits with a CTA button "Upgrade to Pro"

### 5.4 Dashboard — WA Connection Page
- **Route:** `/dashboard/connection` (authenticated)
- **Features:**
  - List all WA instances belonging to the user
  - Each instance card shows:
    - Instance name
    - Phone number (if connected)
    - Status badge: `CONNECTED` / `DISCONNECTED` / `CONNECTING` / `QR_CODE`
    - QR Code modal: shows scannable QR code when status is `QR_CODE`
    - Real-time status updates via WebSocket/polling (every 5 seconds)
  - **Actions per instance:**
    - **"Connect / Reconnect"** — calls WPPConnect to start/restart session
    - **"Delete Instance"** — stops session and removes from WPPConnect + database (confirmation modal required)
  - **"Add New Instance"** button:
    - FREE plan: only 1 instance allowed — button disabled if 1 already exists, tooltip shows "Upgrade to Pro for more instances"
    - PRO plan: up to 5 instances
  - Instance limit enforcement with inline notice

### 5.5 Dashboard — Campaigns Page
- **Route:** `/dashboard/campaigns` (authenticated)
- **Campaign List:**
  - Table/card list of all campaigns
  - Columns: Name, Status, Total Recipients, Sent, Failed, Created At, Actions
  - Filter by status (All, Running, Completed, Failed, Draft)
  - Pagination (10 per page)
- **Create Campaign (Modal or Page):**
  - **Step 1 — Basic Info:**
    - Campaign Name (required, max 100 chars)
    - Select WA Instance (dropdown from connected instances)
  - **Step 2 — Contacts:**
    - Source toggle: **"Upload CSV"** OR **"Google Sheets Link"**
    - **CSV Upload:**
      - Accept `.csv` files only
      - Required column: `phone` (international format, e.g., `628123456789`)
      - Optional columns: `name`, `custom1`, `custom2`, etc. — these become template variables
      - Preview first 5 rows after upload
    - **Google Sheets:**
      - Input field: "Paste Google Sheet URL"
      - Requirements notice: "Make sure sharing is set to 'Anyone with link can view'"
      - On submit: backend fetches sheet data via Google Sheets API
      - Sheet must have header row with at least a `phone` column
  - **Step 3 — Message:**
    - Text area: Message template
    - Variable support: `{{name}}`, `{{custom1}}`, `{{custom2}}` etc.
    - Character counter
    - Preview panel: shows rendered message with first contact's data substituted
    - Toggle: "Add delay variation" (random 10–30s for more natural sending)
  - **Step 4 — Review & Send:**
    - Summary: campaign name, instance, total contacts, message preview
    - "Send Now" button → starts campaign immediately
    - "Save as Draft" button
- **Campaign Detail View:**
  - Shows all message logs (recipient, status, sent_at, error)
  - Download report as CSV
- **FREE plan limit:** max 2 active/pending campaigns — show upgrade CTA if limit reached

### 5.6 Dashboard — Billing Page
- **Route:** `/dashboard/billing` (authenticated)
- **Current plan display:**
  - Current plan (Free / Pro)
  - If Pro: subscription status, next billing date, amount
  - If Free: usage stats (e.g., 35/50 messages today)
- **Upgrade to Pro:**
  - Price card with Pro features
  - "Subscribe Now" button → creates Xendit recurring invoice → redirect to Xendit payment page
- **Cancel Subscription:**
  - "Cancel Subscription" button (only for Pro users) → confirmation modal → calls Xendit to cancel
- **Billing History:**
  - Table of past invoices with status (paid/unpaid/expired)

---

## 6. DATABASE SCHEMA

### 6.1 Prisma Schema
```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ENUMS ──────────────────────────────────────────────────────────────────

enum Plan {
  FREE
  PRO
}

enum InstanceStatus {
  DISCONNECTED
  CONNECTING
  QR_CODE
  CONNECTED
  ERROR
}

enum CampaignStatus {
  DRAFT
  PENDING
  RUNNING
  COMPLETED
  FAILED
  PAUSED
}

enum MessageStatus {
  PENDING
  SENT
  FAILED
  SKIPPED
}

enum ContactSource {
  CSV
  GOOGLE_SHEETS
}

enum SubscriptionStatus {
  ACTIVE
  CANCELLED
  EXPIRED
  UNPAID
}

// ─── MODELS ─────────────────────────────────────────────────────────────────

model User {
  id              String    @id @default(cuid())
  googleId        String    @unique
  email           String    @unique
  name            String
  avatarUrl       String?
  plan            Plan      @default(FREE)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  instances       Instance[]
  campaigns       Campaign[]
  subscription    Subscription?
  refreshTokens   RefreshToken[]
  dailyUsage      DailyUsage[]

  @@map("users")
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("refresh_tokens")
}

model Instance {
  id            String         @id @default(cuid())
  userId        String
  name          String         // Display name (e.g., "Main Account")
  sessionName   String         @unique  // WPPConnect session name
  phoneNumber   String?        // Connected phone number
  status        InstanceStatus @default(DISCONNECTED)
  lastConnected DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  campaigns     Campaign[]

  @@map("instances")
}

model Campaign {
  id             String         @id @default(cuid())
  userId         String
  instanceId     String
  name           String
  messageTemplate String        // Template with {{variables}}
  status         CampaignStatus @default(DRAFT)
  contactSource  ContactSource
  contactsCount  Int            @default(0)
  sentCount      Int            @default(0)
  failedCount    Int            @default(0)
  scheduledAt    DateTime?
  startedAt      DateTime?
  completedAt    DateTime?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  user           User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  instance       Instance       @relation(fields: [instanceId], references: [id])
  contacts       Contact[]
  messageLogs    MessageLog[]

  @@map("campaigns")
}

model Contact {
  id          String   @id @default(cuid())
  campaignId  String
  phone       String   // E.164 format: 628123456789
  name        String?
  variables   Json?    // { "custom1": "value", "custom2": "value" }
  createdAt   DateTime @default(now())

  campaign    Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@map("contacts")
}

model MessageLog {
  id          String        @id @default(cuid())
  campaignId  String
  contactPhone String
  contactName  String?
  renderedMessage String?   // Final message after variable substitution
  status      MessageStatus @default(PENDING)
  error       String?
  sentAt      DateTime?
  createdAt   DateTime      @default(now())

  campaign    Campaign      @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@map("message_logs")
}

model DailyUsage {
  id        String   @id @default(cuid())
  userId    String
  date      DateTime @db.Date  // Stored as date only (YYYY-MM-DD)
  sentCount Int      @default(0)

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@map("daily_usage")
}

model Subscription {
  id                    String             @id @default(cuid())
  userId                String             @unique
  xenditSubscriptionId  String             @unique
  xenditCustomerId      String
  status                SubscriptionStatus @default(ACTIVE)
  planName              String             @default("PRO")
  amount                Int                // in IDR (e.g., 99000)
  currency              String             @default("IDR")
  currentPeriodStart    DateTime
  currentPeriodEnd      DateTime
  cancelledAt           DateTime?
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  user                  User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("subscriptions")
}
```

---

## 7. API ENDPOINTS

### Base URL: `/api/v1`

### 7.1 Auth Endpoints
```
GET  /auth/google                    → Redirect to Google OAuth
GET  /auth/google/callback           → Handle OAuth callback, set cookies, redirect to /dashboard
POST /auth/refresh                   → Refresh access token using refresh token cookie
POST /auth/logout                    → Clear tokens, invalidate refresh token
GET  /auth/me                        → Get current authenticated user info
```

### 7.2 Dashboard Endpoints
```
GET  /dashboard/stats                → Overview stats (sent, failed, active instances, active campaigns)
GET  /dashboard/chart/daily?days=30  → Message counts per day for the last N days
GET  /dashboard/chart/campaigns      → Campaign status distribution
```

### 7.3 Instance (WA Connection) Endpoints
```
GET    /instances                    → List all instances for authenticated user
POST   /instances                    → Create new instance
  Body: { name: string }
GET    /instances/:id                → Get single instance details + status
POST   /instances/:id/connect        → Start/restart WPPConnect session, returns { qrCode?: string, status }
GET    /instances/:id/qr             → Get current QR code for scanning
DELETE /instances/:id                → Stop session + delete instance
```

### 7.4 Campaign Endpoints
```
GET    /campaigns                    → List campaigns (with pagination & filter)
  Query: ?page=1&limit=10&status=RUNNING
POST   /campaigns                    → Create new campaign (draft)
  Body: { name, instanceId, messageTemplate, contactSource, contacts?, googleSheetUrl? }
GET    /campaigns/:id                → Get campaign details
PUT    /campaigns/:id                → Update campaign (only if DRAFT)
DELETE /campaigns/:id                → Delete campaign
POST   /campaigns/:id/start          → Start sending campaign
POST   /campaigns/:id/pause          → Pause running campaign
POST   /campaigns/upload-csv         → Upload CSV file, returns parsed contacts array
  Body: multipart/form-data, field: "file"
POST   /campaigns/fetch-sheet        → Fetch contacts from Google Sheets URL
  Body: { url: string }
GET    /campaigns/:id/logs           → Get message logs for campaign
  Query: ?page=1&limit=50&status=FAILED
GET    /campaigns/:id/export         → Export message logs as CSV download
```

### 7.5 Billing Endpoints
```
GET    /billing/plans                → Get available plans and pricing
GET    /billing/subscription         → Get current subscription details
POST   /billing/subscribe            → Create Xendit subscription, returns payment URL
  Body: { planId: "PRO" }
POST   /billing/cancel               → Cancel current subscription
GET    /billing/invoices             → Get billing history
POST   /billing/webhook              → Xendit webhook receiver (public, verified by token)
```

### 7.6 WebSocket Events (Socket.io)
```
// Client subscribes to instance status updates
socket.emit('subscribe:instance', { instanceId })

// Server emits:
socket.on('instance:status', { instanceId, status, qrCode? })
socket.on('campaign:progress', { campaignId, sentCount, failedCount, status })
socket.on('message:sent', { campaignId, contactPhone, status })
```

---

## 8. FLOW DIAGRAMS

### 8.1 User Authentication Flow
```mermaid
flowchart TD
    A([User visits Landing Page]) --> B{Already logged in?}
    B -->|Yes| C[Show 'Go to Dashboard' button]
    B -->|No| D[Show Sign Up / Login buttons]
    C --> E([Dashboard])
    D --> F[User clicks Sign Up or Login]
    F --> G[Redirect to Google OAuth]
    G --> H{User grants permission?}
    H -->|No| I[Redirect back to Landing with error]
    H -->|Yes| J[Google returns auth code to /auth/google/callback]
    J --> K{User exists in DB?}
    K -->|No| L[Create new User with FREE plan]
    K -->|Yes| M[Load existing User]
    L --> N[Generate JWT Access Token + Refresh Token]
    M --> N
    N --> O[Set httpOnly cookies: access_token, refresh_token]
    O --> E
```

### 8.2 WA Instance Connection Flow
```mermaid
flowchart TD
    A([User opens WA Connection Page]) --> B[Load instances from API]
    B --> C{Instance exists?}
    C -->|No| D[Show 'Add Instance' button]
    C -->|Yes| E[Display instance card with status]
    D --> F[User clicks Add Instance]
    F --> G{Plan is FREE and already has 1 instance?}
    G -->|Yes| H[Show Upgrade to Pro modal]
    G -->|No| I[Show Create Instance form: enter name]
    I --> J[POST /instances → create in DB + WPPConnect]
    J --> E
    E --> K{Status?}
    K -->|DISCONNECTED| L[Show 'Connect' button]
    K -->|QR_CODE| M[Show QR Code modal - scan with phone]
    K -->|CONNECTED| N[Show green Connected badge + phone number]
    K -->|ERROR| O[Show error + Reconnect button]
    L --> P[User clicks Connect]
    P --> Q[POST /instances/:id/connect]
    Q --> R[WPPConnect generates QR code]
    R --> M
    M --> S[User scans QR with WhatsApp]
    S --> T[WPPConnect emits session connected event]
    T --> U[Backend updates instance status to CONNECTED]
    U --> V[WebSocket pushes status update to frontend]
    V --> N
```

### 8.3 Campaign Creation Flow
```mermaid
flowchart TD
    A([User opens Campaigns Page]) --> B[Click 'Create Campaign']
    B --> C{Plan FREE + has 2 campaigns?}
    C -->|Yes| D[Show Upgrade to Pro CTA]
    C -->|No| E[Open Create Campaign wizard]
    E --> F[Step 1: Enter Campaign Name + Select Instance]
    F --> G{Instance connected?}
    G -->|No| H[Warning: Select a connected WA instance]
    G -->|Yes| I[Step 2: Choose Contact Source]
    I --> J{Source type?}
    J -->|CSV Upload| K[Upload .csv file]
    J -->|Google Sheets| L[Paste Google Sheet URL]
    K --> M[Backend parses CSV]
    L --> N[Backend fetches Google Sheet via API]
    M --> O{Valid? Has phone column?}
    N --> O
    O -->|No| P[Show validation error]
    O -->|Yes| Q[Show preview: first 5 contacts + total count]
    Q --> R[Step 3: Write Message Template]
    R --> S[Use variables like {{name}}, {{custom1}}]
    S --> T[Live preview panel renders message]
    T --> U[Step 4: Review Summary]
    U --> V{Action?}
    V -->|Save Draft| W[POST /campaigns → status: DRAFT]
    V -->|Send Now| X[POST /campaigns → POST /campaigns/:id/start]
    X --> Y[Backend validates plan limits]
    Y --> Z{Limit OK?}
    Z -->|No| AA[Return error: daily limit reached]
    Z -->|Yes| AB[Create Contact records in DB]
    AB --> AC[Add jobs to Bull queue]
    AC --> AD[Campaign status → RUNNING]
    AD --> AE[Queue workers start processing with 10s delay]
    AE --> AF[Real-time progress via WebSocket]
```

### 8.4 Message Sending Queue Flow
```mermaid
flowchart TD
    A([Campaign started]) --> B[Backend: create MessageLog entries status=PENDING]
    B --> C[Add all contacts as jobs to Bull queue]
    C --> D[Bull Worker picks up job]
    D --> E{Check daily sent count for user}
    E -->|FREE plan + count >= 50| F[Update MessageLog status=SKIPPED]
    F --> G[Mark campaign COMPLETED if all processed]
    E -->|OK| H[Check last message sent time for this instance]
    H --> I{Time since last < 10 seconds?}
    I -->|Yes| J[Delay job: wait remaining time]
    J --> D
    I -->|No| K[Render message template with contact variables]
    K --> L[Call WPPConnect REST API: POST /api/:session/send-message]
    L --> M{API Response?}
    M -->|Success 200| N[Update MessageLog status=SENT, sentAt=now]
    M -->|Error 4xx/5xx| O{Retry count < 2?}
    O -->|Yes| P[Wait 15s, retry job]
    P --> L
    O -->|No| Q[Update MessageLog status=FAILED, save error]
    N --> R[Increment DailyUsage count]
    Q --> R
    R --> S[Update Campaign sentCount/failedCount]
    S --> T[Emit WebSocket event: campaign:progress]
    T --> U{All contacts processed?}
    U -->|No| V[Pick next job]
    V --> D
    U -->|Yes| W[Update Campaign status=COMPLETED]
    W --> X[Emit WebSocket: campaign complete]
```

### 8.5 Subscription / Payment Flow
```mermaid
flowchart TD
    A([User clicks Upgrade to Pro]) --> B[Frontend calls POST /billing/subscribe]
    B --> C[Backend creates Xendit Customer if not exists]
    C --> D[Backend creates Xendit Recurring Plan/Subscription]
    D --> E[Xendit returns payment URL]
    E --> F[Backend saves pending subscription to DB]
    F --> G[Frontend redirects user to Xendit payment page]
    G --> H{User completes payment?}
    H -->|Cancelled| I[User redirected back to /dashboard/billing]
    H -->|Paid| J[Xendit sends webhook to POST /billing/webhook]
    J --> K[Backend verifies Xendit webhook signature]
    K --> L{Signature valid?}
    L -->|No| M[Return 400 Bad Request]
    L -->|Yes| N{Event type?}
    N -->|invoice.paid| O[Update Subscription status=ACTIVE]
    O --> P[Update User plan=PRO]
    P --> Q[Set currentPeriodEnd date]
    N -->|invoice.expired or payment failed| R[Update Subscription status=UNPAID]
    R --> S[Downgrade User plan=FREE after grace period 3 days]
    N -->|subscription.cancelled| T[Update Subscription status=CANCELLED]
    T --> U[Schedule plan downgrade at period end]
    Q --> V[WebSocket or polling: notify frontend plan updated]
    V --> W([User now on Pro plan])
```

### 8.6 Google Sheets Contact Import Flow
```mermaid
flowchart TD
    A([User pastes Google Sheets URL]) --> B[Frontend calls POST /campaigns/fetch-sheet]
    B --> C[Backend extracts Spreadsheet ID from URL]
    C --> D[Backend calls Google Sheets API v4]
    D --> E{API Response?}
    E -->|403 Forbidden| F[Return error: Sheet is private. Set sharing to Anyone with link - view]
    E -->|404 Not Found| G[Return error: Sheet not found. Check the URL]
    E -->|200 OK| H[Parse rows: first row = headers]
    H --> I{Has 'phone' column?}
    I -->|No| J[Return error: Sheet must have a 'phone' header column]
    I -->|Yes| K[Map all rows to contact objects]
    K --> L[Validate phone numbers: remove non-digits, ensure 10+ digits]
    L --> M[Return preview: first 5 contacts + totalCount]
    M --> N[Frontend shows preview table]
    N --> O[User confirms and proceeds to next step]
```

---

## 9. UI/UX REQUIREMENTS

### 9.1 Color Palette
```css
/* Primary Colors */
--color-primary:        #3B82F6;   /* Blue 500 - buttons, links */
--color-primary-dark:   #1D4ED8;   /* Blue 700 - hover states */
--color-primary-light:  #DBEAFE;   /* Blue 100 - highlights */

/* Background */
--color-bg-base:        #F8FAFC;   /* Slate 50 - page background */
--color-bg-card:        #FFFFFF;   /* White - cards */
--color-bg-sidebar:     #EFF6FF;   /* Blue 50 - sidebar */

/* Text */
--color-text-primary:   #1E293B;   /* Slate 800 */
--color-text-secondary: #64748B;   /* Slate 500 */
--color-text-muted:     #94A3B8;   /* Slate 400 */

/* Status Colors */
--color-success:        #22C55E;   /* Green 500 */
--color-error:          #EF4444;   /* Red 500 */
--color-warning:        #F59E0B;   /* Amber 500 */
--color-info:           #3B82F6;   /* Blue 500 */

/* Borders */
--color-border:         #E2E8F0;   /* Slate 200 */
```

### 9.2 Typography
- **Font:** Inter (Google Fonts)
- **Base size:** 14px
- **Headings:** Semibold, scale: H1(28px), H2(22px), H3(18px), H4(16px)

### 9.3 Layout
- **Sidebar width:** 240px (collapsible to 64px on mobile)
- **Content max-width:** 1200px
- **Card border-radius:** 12px
- **Shadow:** `0 1px 3px rgba(0,0,0,0.08)`
- **Spacing unit:** 4px (use Tailwind's 4-based scale)

### 9.4 Sidebar Navigation Items
```
📊  Overview          → /dashboard
📱  WA Connection     → /dashboard/connection
📢  Campaigns         → /dashboard/campaigns
💳  Billing           → /dashboard/billing
───────────────────────
👤  [User avatar + name]
🚪  Logout
```

### 9.5 Component Behavior
- All data tables have loading skeleton states
- All mutations show toast notifications (success/error)
- Modals use shadcn/ui Dialog component
- Forms validate on blur and on submit
- Empty states have helpful illustrations + CTAs
- FREE plan limitations shown inline (not hidden)

---

## 10. THIRD-PARTY INTEGRATIONS

### 10.1 WPPConnect Server

**Base URL:** `http://wppconnect:21465` (internal Docker network)  
**Authentication:** Bearer token (static API token set in WPPConnect env)

#### Key API calls used:
```
POST /api/:session/start-session     → Start a new session (triggers QR generation)
GET  /api/:session/status-session    → Get session status
GET  /api/:session/qrcode-session    → Get current QR code image/base64
POST /api/:session/send-message      → Send a text message
  Body: { phone: "628123456789", message: "Hello {{name}}" }
POST /api/:session/close-session     → Close/disconnect session
DELETE /api/:session                 → Delete session completely
```

#### WPPConnect instance naming convention:
```
Session name = user_{userId}_instance_{instanceId}
Example: user_clxxx123_instance_clyyy456
```

#### Backend polling/webhook for status:
- Poll `/api/:session/status-session` every 5 seconds per active instance
- OR configure WPPConnect webhook to push events to `POST /api/v1/internal/wpp-webhook`

### 10.2 Google OAuth 2.0

**Scopes required:**
- `openid`
- `profile`
- `email`

**Passport.js Strategy config:**
```typescript
// config/passport.ts
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL, // https://yourdomain.com/api/v1/auth/google/callback
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  // find or create user in DB
}));
```

### 10.3 Google Sheets API

**Authentication:** Service Account (no user OAuth needed — sheets must be public/view)

**Setup:**
1. Create Google Cloud Service Account
2. Download JSON key
3. Enable Google Sheets API in Google Cloud Console
4. Pass service account credentials in env as JSON string

```typescript
// services/googleSheets.service.ts
import { google } from 'googleapis';

const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  })
});

async function fetchSheetData(spreadsheetId: string, range = 'A:Z') {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range
  });
  return response.data.values; // 2D array
}
```

**URL parsing helper:**
```typescript
function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}
```

### 10.4 Xendit Payment Gateway

**Integration type:** Recurring Subscription (Invoice-based)  
**Currency:** IDR  
**Pro Plan Price:** Rp 99.000/month (configurable in env)

**Flow:**
1. Create Xendit Customer → get `customer_id`
2. Create Xendit Recurring Plan → get `plan_id`
3. Create Xendit Subscription → get payment link URL
4. User pays on Xendit page
5. Xendit sends webhook event to `/api/v1/billing/webhook`
6. Backend handles: `invoice.paid`, `invoice.expired`, `subscription.cancelled`

**Webhook verification:**
```typescript
// Verify webhook by comparing x-callback-token header
const callbackToken = req.headers['x-callback-token'];
if (callbackToken !== process.env.XENDIT_WEBHOOK_TOKEN) {
  return res.status(400).json({ error: 'Invalid webhook token' });
}
```

---

## 11. EASYPANEL DEPLOYMENT

### 11.1 Services to Create in Easypanel

Create the following 5 services in Easypanel:

| Service Name | Type | Port | Notes |
|---|---|---|---|
| `mote-frontend` | App | 80 | React + Nginx |
| `mote-backend` | App | 3001 | Node.js API |
| `mote-db` | PostgreSQL | 5432 | Managed by Easypanel |
| `mote-redis` | Redis | 6379 | Managed by Easypanel |
| `wppconnect` | App | 21465 | WPPConnect Server |

### 11.2 Frontend Dockerfile
```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 11.3 Frontend nginx.conf
```nginx
# frontend/nginx.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Handle React Router (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to backend (optional: can use env var instead)
    location /api/ {
        proxy_pass http://mote-backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    gzip on;
    gzip_types text/plain application/javascript text/css application/json;
}
```

### 11.4 Backend Dockerfile
```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# Run Prisma migrations on startup
RUN npm install prisma --save-dev
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

### 11.5 WPPConnect Dockerfile
```dockerfile
# wppconnect/Dockerfile
FROM wppconnect/server:latest
ENV PORT=21465
ENV SECRET_KEY=your_secret_key_here
ENV WEBHOOK_URL=http://mote-backend:3001/api/v1/internal/wpp-webhook
EXPOSE 21465
```

Or use the official Docker image directly in Easypanel:
```
Image: wppconnect/server:latest
Port: 21465
Environment:
  - SECRET_KEY=your_wppconnect_secret
  - WEBHOOK_URL=http://mote-backend:3001/api/v1/internal/wpp-webhook
  - WEBHOOK_ALLOWED_EVENTS=qrcode-updated,status-find,session-logged-out
```

### 11.6 Docker Compose (for local development)
```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "5173:80"
    environment:
      - VITE_API_URL=http://localhost:3001/api/v1
      - VITE_WS_URL=http://localhost:3001
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/mote_blaster
      - REDIS_URL=redis://redis:6379
      - WPPCONNECT_BASE_URL=http://wppconnect:21465
      - WPPCONNECT_SECRET_KEY=your_secret_key
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - GOOGLE_CALLBACK_URL=http://localhost:3001/api/v1/auth/google/callback
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - XENDIT_SECRET_KEY=${XENDIT_SECRET_KEY}
      - XENDIT_WEBHOOK_TOKEN=${XENDIT_WEBHOOK_TOKEN}
      - GOOGLE_SERVICE_ACCOUNT_JSON=${GOOGLE_SERVICE_ACCOUNT_JSON}
      - FRONTEND_URL=http://localhost:5173
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=mote_blaster
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

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
      - SECRET_KEY=your_secret_key
    volumes:
      - wppdata:/usr/src/wppconnect/userDataDir

volumes:
  pgdata:
  redisdata:
  wppdata:
```

### 11.7 Easypanel Deployment Steps

1. **Create new project** in Easypanel (e.g., `mote-blaster`)

2. **Add PostgreSQL service:**
   - Name: `mote-db`
   - Note the auto-generated connection string

3. **Add Redis service:**
   - Name: `mote-redis`
   - Note the auto-generated connection URL

4. **Add WPPConnect service:**
   - Source: Docker Image → `wppconnect/server:latest`
   - Port: `21465`
   - Set env variables

5. **Add Backend service:**
   - Source: GitHub repo → `./backend`
   - Port: `3001`
   - Set all environment variables (see Section 12)
   - Health check: `GET /health`

6. **Add Frontend service:**
   - Source: GitHub repo → `./frontend`
   - Port: `80`
   - Build args: `VITE_API_URL=https://api.yourdomain.com/api/v1`

7. **Configure domains in Easypanel:**
   - `yourdomain.com` → Frontend service
   - `api.yourdomain.com` → Backend service
   - SSL is automatically handled by Easypanel (Let's Encrypt)

---

## 12. ENVIRONMENT VARIABLES

### 12.1 Backend (.env)
```env
# Server
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com

# Database
DATABASE_URL=postgresql://user:password@mote-db:5432/mote_blaster

# Redis
REDIS_URL=redis://mote-redis:6379

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://api.yourdomain.com/api/v1/auth/google/callback

# Google Sheets (Service Account JSON as escaped string)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}

# WPPConnect
WPPCONNECT_BASE_URL=http://wppconnect:21465
WPPCONNECT_SECRET_KEY=your_wppconnect_secret_key

# Xendit
XENDIT_SECRET_KEY=xnd_production_xxxxxxxxx
XENDIT_WEBHOOK_TOKEN=your_xendit_webhook_verification_token
XENDIT_PRO_PLAN_PRICE=99000
XENDIT_PRO_PLAN_NAME=Mote Blaster Pro

# Plan Limits
FREE_PLAN_DAILY_LIMIT=50
FREE_PLAN_MAX_INSTANCES=1
FREE_PLAN_MAX_CAMPAIGNS=2
MIN_DELAY_SECONDS=10
```

### 12.2 Frontend (.env / build args)
```env
VITE_API_URL=https://api.yourdomain.com/api/v1
VITE_WS_URL=https://api.yourdomain.com
VITE_APP_NAME=Mote Blaster
```

---

## 13. SECURITY REQUIREMENTS

1. **All API routes** (except `/auth/*`, `/billing/webhook`, `/health`) require valid JWT access token
2. **httpOnly cookies** for storing tokens — never expose to JavaScript
3. **CSRF protection** on state-changing endpoints
4. **Rate limiting:** 100 req/min per IP on all API routes using `express-rate-limit`
5. **Input sanitization:** All user inputs sanitized before DB storage
6. **Xendit webhook:** Verify `x-callback-token` header on every incoming webhook
7. **WPPConnect API key:** Never exposed to frontend — all WPPConnect calls go through backend
8. **CORS:** Only allow requests from `FRONTEND_URL` origin
9. **Helmet.js:** Set secure HTTP headers
10. **Plan enforcement:** All plan limit checks happen **server-side** — never trust client-side plan info
11. **File upload:** Validate MIME type + size (max 5MB for CSV)
12. **Google Sheets URLs:** Validate URL format before making API calls to prevent SSRF

---

## 14. IMPORTANT IMPLEMENTATION NOTES FOR CLAUDE CODE

> These notes are specifically for the AI developer to understand key decisions:

1. **Message Delay is Non-Negotiable:** The 10-second minimum delay between messages MUST be enforced at the Bull queue level using a rate limiter (1 job per 10 seconds per WPPConnect instance). Use `bull-rate-limiter` or implement custom delay logic. This protects users' WhatsApp accounts from being banned.

2. **Daily Limit Reset:** The `DailyUsage` table tracks sent messages per user per calendar day (in WIB/UTC+7). Reset happens automatically via the date-based unique constraint — each new day creates a new record.

3. **WPPConnect Session Names:** Each user's WhatsApp instance must have a unique session name in WPPConnect. Use the format `uid_{userId}_iid_{instanceId}` (shortened to avoid length issues).

4. **Google Sheets Access:** The app uses a Service Account to read sheets. Users must set sheet sharing to "Anyone with the link can view." The Service Account does NOT need to be added as a collaborator.

5. **Xendit Recurring:** Use Xendit's Recurring Payment API (not the one-time Invoice API). The subscription auto-renews monthly. Handle `invoice.paid` to keep the subscription active.

6. **WebSocket for Real-time:** Use Socket.io rooms named `user:{userId}` so each user only receives their own events. Authenticate socket connections using the same JWT access token.

7. **CSV Phone Normalization:** Strip all non-digit characters from phone numbers. If number starts with `0`, replace with `62`. If starts with `+`, remove the `+`. Always store in E.164 format without `+`.

8. **Template Variables:** Use `{{variableName}}` syntax. Available variables come from CSV/sheet column headers. Always provide `{{name}}` fallback to the phone number if name is empty.

9. **Queue Persistence:** Bull queues are backed by Redis. On backend restart, unfinished jobs will resume automatically. Handle `campaign.status = RUNNING` on startup to reconnect orphaned jobs.

10. **Easypanel Internal Network:** Services in the same Easypanel project communicate via service names (e.g., `http://mote-backend:3001`). Never use `localhost` in Docker service-to-service calls.

---

*End of PRD — Mote Blaster v1.0.0*
*This document contains all requirements necessary to build the complete application.*
