# Mote Blaster

A SaaS WhatsApp bulk messaging platform built with React, Node.js, and Prisma.

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript, TailwindCSS, shadcn/ui, TanStack Query, Zustand
- **Backend**: Express + TypeScript, Prisma ORM, PostgreSQL, Redis + Bull, Socket.io
- **Integrations**: WPPConnect Server, Google OAuth, Xendit Payments, Google Sheets

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15
- Redis 7
- WPPConnect Server
- Google Cloud OAuth credentials
- Xendit account

### Local Development

1. Clone the repository and install dependencies:

```bash
# Backend
cd backend
npm install
npx prisma generate

# Frontend
cd ../frontend
npm install
```

2. Set up environment variables:

```bash
# Backend .env
cp backend/.env.example backend/.env
# Edit backend/.env with your values

# Frontend .env
cp frontend/.env.example frontend/.env
```

3. Start with Docker Compose (recommended):

```bash
docker-compose up -d
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- WPPConnect on port 21465
- Backend API on port 3001
- Frontend on port 5173

4. Run migrations:

```bash
docker-compose exec backend npx prisma migrate dev
```

5. Access the app at http://localhost:5173

## Project Structure

```
mote-blaster/
├── frontend/           # React + Vite app
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── stores/
│   │   └── lib/
│   └── public/
├── backend/            # Express API
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── prisma/
├── docker-compose.yml
└── README.md
```

## Features

- Google OAuth 2.0 authentication
- WhatsApp instance management via WPPConnect
- Campaign creation with CSV/Google Sheets import
- Personalized message templates with variable substitution
- Real-time campaign progress tracking
- Rate-limited message sending (10s minimum delay)
- Subscription billing via Xendit
- Free and Pro tier plans

## Deployment

Deploy to Easypanel following Section 11 of the PRD.

## License

Proprietary - All rights reserved
