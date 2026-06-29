# 12% Café ☕

Full-stack specialty coffee e-commerce with PWA, gamification, and admin dashboard.

**Stack:** React 19 + TypeScript + Tailwind CSS + Vite (client) · Node/Express + Prisma + PostgreSQL (server) · Stripe

---

## Quick Start

```bash
pnpm install
pnpm setup    # copies .env, runs Prisma migrations, seeds DB
pnpm dev      # client → localhost:5173 · server → localhost:3001
```

### Prerequisites

- **Node.js** ≥ 22.14
- **pnpm** ≥ 11.5 (`npm install -g pnpm`)
- **PostgreSQL** 17+ (or SQLite for local dev — change `DATABASE_URL` in `.env`)

### Environment Variables

Copy `.env.example` → `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret for auth tokens (change for production) |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key (sk_test_...) |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook signing secret (whsec_...) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe publishable key (pk_test_...) |
| `VITE_VAPID_PUBLIC_KEY` | 🔔 | VAPID public key for push notifications |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | 📧 | SMTP credentials for transactional emails |

---

## Project Structure

```
├── client/          # React SPA (Vite)
│   ├── src/
│   │   ├── admin/       # Admin dashboard pages
│   │   ├── components/  # Shared UI components
│   │   ├── hooks/       # React hooks (cart, barista, PWA, etc.)
│   │   ├── pages/       # Route pages (public + profile)
│   │   ├── services/    # API client + Stripe helpers
│   │   └── store/       # Zustand stores
│   └── public/          # Static assets, PWA manifest
├── server/          # Express API
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── middleware/   # Auth, validation, rate limiting
│   │   └── jobs/        # Background tasks (billing, push)
│   └── prisma/       # Schema + migrations + seed
├── docs/            # Architecture docs, mitigation plan
└── specs/           # Feature specifications & plans
```

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start client + server concurrently |
| `pnpm build` | Build client + server for production |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm test` | Run all tests (client + server) |
| `pnpm lint` | ESLint check (flat config) |
| `pnpm format` | Prettier check |
| `pnpm format:fix` | Auto-format all source files |
| `pnpm clean` | Remove `dist/` and `node_modules` |
| `pnpm docker:up` | Start PostgreSQL via Docker Compose |

### Database

```bash
# From server/ directory
pnpm db:setup    # generate Prisma client + migrate + seed
pnpm db:seed     # seed sample data
pnpm db:reset    # drop + recreate + seed
```

---

## Key Features

### Public
- **Shop** — product catalog with filters (category, process, roast)
- **Subscriptions** — recurring coffee plans (starter, connoisseur, business)
- **Recipes** — brew guides (V60, AeroPress, espresso) with step-by-step live mode
- **Barista Levels** — XP, achievements, leaderboard
- **Quiz** — personalized coffee recommendations
- **PWA** — installable, offline-capable, push notifications

### Admin (`/admin/`)
- CRUD: Products, Orders, Subscriptions, Recipes, Promo Codes, Reviews, Users
- Inventory management with stock movements
- Logistics panel with tracking
- Financial dashboard (revenue, MRR, margins)
- Admin audit log
- CSV export for all data tables
- Push notification management

---

## Architecture

- **Monorepo** via pnpm workspaces
- **Auth**: JWT-based, separate flows for user and admin
- **Payments**: Stripe with saved card support, idempotency keys
- **Prisma**: PostgreSQL in production, SQLite for local dev
- **PWA**: `injectManifest` strategy with update prompt flow
- **State**: Zustand for global state (cart, user), React context for admin modules

---

## Testing

```bash
pnpm test                    # all tests
pnpm --filter client test    # client only
pnpm --filter server test    # server only
pnpm test:watch              # watch mode
```

---

## Docker

```bash
pnpm docker:up      # start PostgreSQL
pnpm docker:build   # build production images
pnpm docker:down    # stop services
```

### Production Build

```bash
pnpm build
pnpm --filter server start   # runs built server on :3001
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS, Shadcn/ui, Framer Motion |
| Backend | Node.js 22+, Express, TypeScript |
| Database | PostgreSQL 17 (Prisma ORM) |
| Payments | Stripe (Payment Intents, Saved Cards) |
| PWA | Vite PWA Plugin, Workbox, Push API |
| CI | GitHub Actions (lint → typecheck → test) |
| Linting | ESLint 10 (flat config), Prettier, TypeScript strict |

---

## Deployment

- **Production:** Railway (Node) with PostgreSQL add-on
- **Static preview:** `pnpm --filter client preview`
- **Tunnel for PWA testing:** `pnpm docker:up` (with tunnel compose)
