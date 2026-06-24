# 12% Café - Project Context

## Overview
Full-stack specialty coffee web app. User-facing features: recipes (V60, AeroPress, Espresso), Stripe payments, cart system, PWA. Admin dashboard for content management (promos, users, recipes).

**Tech Stack:**
- Client: React 19, TypeScript, Tailwind CSS, Shadcn/ui
- Server: Node/Express, TypeScript, Stripe API
- Database: PostgreSQL (production) / SQLite (local dev) via Prisma ORM (`server/prisma/schema.prisma`)
- Monorepo: pnpm workspaces (client/, server/)

## Recent Work (2026-05-30 to 2026-06-23, Sprints 003-004)

### Feature Sprint (May 2026) - SHIPPED
- Stripe integration with saved cards
- Cart drawer UI
- Recipe gating (unlock via purchase)
- PWA setup
- Docker configuration fixes

### Admin Overhaul (June 2026) - SHIPPED
- Reusable admin infrastructure: `useModuleList`, `usePagination`, `ModuleContext`, CSV export
- Fixed two-ConfirmDialog gotcha in modals
- Fixed promo type bug

### Bug Fix + UX Sprint (June 2026) - SHIPPED
- Stripe: `confirmCardPayment` → `confirmPayment`, idempotency key refresh on retry
- Recipe steps: server-side duration validation (5–3600s)
- RecipeLiveMode: AnimatePresence fix, mobile swipe gestures
- Checkout: hide address suggestion when field filled

### Gamification MVP (June 2026) - SHIPPED
- **Barista Levels:** XP per brew `(baseXp[difficulty] ?? 20) + (rating-1)*5`, level = `floor(totalXp/100)+1`
- Schema: `BaristaProfile`, `BrewLog`, `Achievement`, `AchievementUnlock` (Prisma)
- API: `POST /api/barista/brew-logs`, `GET /api/barista/:userId/profile`, `GET /api/barista/leaderboard`
- Frontend: `useBarista` hook, `BrewLogForm` modal, `BaristaProfile` page, `Leaderboard` page
- RecipeLiveMode: "Registrar este Brew" CTA on last step
- Toasts: XP earned + achievement unlocks (staggered)
- Auth: uses `requireUserAuth`/`UserAuthRequest` (NOT admin auth)
- 4 achievements seeded: `first_brew` ☕ `five_brews` 🎯 `ten_brews` ⚡ `perfect_brew` ⭐
- Routes: `/perfil/barista/:userId`, `/leaderboard`
- Nav: Ranking in desktop Navbar + mobile BottomNav (5-column grid)
- Homepage: "Aprende con cada taza" section promotes recipes + barista system

### Security & Bug-Fix Sprint (June 2026) - SHIPPED
- **IDOR fixes:** `DELETE /users/me/payment-methods/:pmId` and `POST /users/me/payment-methods/default` now verify pm.customer === user.stripeCustomerId before acting
- **Order field injection:** `POST /orders` whitelisted fields instead of `...req.body` spread (prevented status:DELIVERED injection)
- **Input validation:** email format + length on register/login, review name/comment/email, subscription name/email, promo code, user update (name, avatarUrl cap 80KB)
- **Email normalization:** toLowerCase on register, login, admin login, subscription create
- **Payment quantity:** validated 1–99 integer before Stripe call
- **Barista:** achievement alreadyUnlocked check compared UUID to slug (always false → duplicate unlock 500); fixed by including achievement relation. XP now uses atomic `increment`. Profile creation uses `upsert`. `checkAndUnlockAchievements` uses COUNT queries instead of full fetch.
- **RecipeLiveMode:** guard against 0-step recipes. BrewLogForm: double-submit guard + revokeObjectURL.
- **Rate limiting:** added to `POST /promo-codes/validate` (30/15min)
- **Leaderboard:** NaN guard on limit param, error state with retry button

### Design Refinement Sprint (June 2026) - SHIPPED
- **Phase A — Navbar:** Collapse desktop nav to 4 primary links (Tienda, Recetas, Suscripciones, Nosotros) + secondary links (Paquetes, Galería, Ranking, Logros, Quiz) in "Más" dropdown
- **Phase B — Theme fixes:** Add dark variants to `.card-light` (fixes About origins visibility). RecipeLiveMode stays always-dark (cinema mode). Prisma schema verified (PostgreSQL for production, SQLite for local dev via .env)
- **Phase C — Cart UX:** Success toast on `addItem()`, styled stock badges (amber "bajo", red "agotado")
- **Phase D — Quiz:** Responsive grid for recommended coffees (gap-6)
- **Phase E — Checkout:** Promo input alignment + dark mode border consistency
- **Phase F — Subscriptions redesign:**
  - CoffeePicker: search by region, flavor notes display, plan benefit badges
  - Plan cards: offer badges (POPULAR / EARLY ACCESS / CUSTOM)
  - B2B flow: EMPRESARIAL plan → consultation form (empresa, rfc, contacto*) → `POST /api/subscriptions/b2b-inquiry` → B2BInquiry model
- **Phase G — Recipes:** Difficulty filter (Fácil, Media, Difícil) + method grouping (Filtro, Inmersión, Espresso, Especiales) + API `?difficulty=MEDIA` support
- **Execution:** 12 caveman:cavecrew-builder subagents in parallel, 3 commits (b9fabff, 97d6f9a, c608bb5), 522 insertions across 13 files

### Light Mode Audit & Fix Sprint (June 2026) - SHIPPED
- **Phase 1 — Footer/Navbar contrast:** gold-500 → gold-600 on cream bg (unreadable fix), coffee-600 → coffee-700 icons
- **Phase 2 — Difficulty badges:** DIFFICULTY_COLORS from dark-only to dual-theme (green-700 light/green-400 dark, etc.)
- **Phase 3 — Subscriptions badge fix:** Remove broken dual-badge stacking from Sprint 003. Single gold badge per plan.
- **Phase 4 — CoffeePicker light mode:** Search input white bg light/dark bg dark, progress dots light variant, all inputs dual-theme
- **Phase 5 — Audit sweep:** Breadcrumbs, ProductDetail, About bare color fixes. 30+ classes audited.
- **Phase 6 — Quiz responsive:** Grid cols-1 (mobile) → cols-2 (tablet) → cols-3 (desktop). Product names readable all sizes.
- **Execution:** 6 caveman:cavecrew-builder subagents in parallel, 1 commit (37fc044), 60 insertions/71 deletions across 9 files
- **Key fix:** Every color class now has `dark:` variant or is unconditional. Light mode contrast ratio ≥ WCAG AA.

### Roadmap Status
All 4 master initiatives already shipped:
- ✅ Gallery/showcase
- ✅ Stripe payments
- ✅ Recipes feature
- ✅ PWA support
- ✅ Gamification (Barista Levels)

**Note:** Do not trust unchecked plan checkboxes — features may already be implemented.

## Project Structure
```
12porciento-cafe/
├── client/               # React app
├── server/               # Express API
├── docs/                 # Documentation
├── docker-compose.yml    # Local dev setup
└── .claude/              # Claude Code config
```

## Development Notes

### Git Conventions
- Conventional Commits: `feat(area):`, `fix(area):`, `docs:`, etc.
- Squash commits into feature branches before PR
- Main branch is production-ready

### Code Style
- TypeScript strict mode
- Tailwind + Shadcn/ui for UI
- Reusable admin hooks (check existing patterns before creating new state)

### Common Gotchas
1. **Two ConfirmDialog bug:** Only one ConfirmDialog can be rendered at a time in modals
2. **Admin infrastructure:** Use `useModuleList` + `usePagination` + `ModuleContext` for new CRUD modules
3. **Recipe gating:** Verify promo conditions before accepting PR (prior bug fix on type validation)
4. **Two auth middlewares:** `requireUserAuth`/`UserAuthRequest` for user routes vs `requireAuth`/`AuthRequest` for admin routes — do not mix
5. **AnimatePresence mode="wait":** Breaks jsdom tests — new content never mounts. Use default sync mode
6. **Prisma migration in CI:** Use `prisma db push` not `migrate dev` (non-interactive shell)
7. **Dark mode colors:** Every color class must have a `dark:` variant — e.g., `text-coffee-900 dark:text-cream`, `bg-coffee-50 dark:bg-coffee-950`. Exception: components that intentionally use a dark background (admin modals, dark overlays, recipe live mode) may use `text-cream` without `dark:` since their bg is always dark.
8. **Safe-area inset (Navbar):** `Navbar` `<header>` uses `style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}` to clear transparent system status bar on iOS/Android. Requires `viewport-fit=cover` in `index.html` meta viewport. Any new fixed header must do the same. Bottom-fixed elements use `padding-bottom: env(safe-area-inset-bottom, 0px)`.
9. **PWA update flow:** `vite.config.ts` uses `registerType: 'prompt'` (NOT `autoUpdate`). `useUpdateNotification` hook handles SW updates; `UpdateNotificationModal` shown when update available. After update, `localStorage('pwa_just_updated')` triggers toast on reload. Do not re-add `skipWaiting: true` to workbox config — it bypasses the prompt flow.

## Key Contacts
- Email: gael.grxson@gmail.com

## Testing Before Push
- Start dev server: `pnpm dev` (runs both client & server)
- Test UI changes in browser (golden path + edge cases)
- Run type checking & tests if available

---
Last updated: 2026-06-23 (Sprint 003 + 004 — Design Refinement + Light Mode Audit & Fix)

<!-- SPECKIT START -->
## Current Feature Plan

**Active feature**: PWA Push Notifications — **PLANNED**
**Spec**: [specs/003-pwa-push-notifications/spec.md](specs/003-pwa-push-notifications/spec.md)
**Plan**: [specs/003-pwa-push-notifications/plan.md](specs/003-pwa-push-notifications/plan.md)
**Tasks**: [specs/003-pwa-push-notifications/tasks.md](specs/003-pwa-push-notifications/tasks.md)
**Data Model**: [specs/003-pwa-push-notifications/data-model.md](specs/003-pwa-push-notifications/data-model.md)
**Research**: [specs/003-pwa-push-notifications/research.md](specs/003-pwa-push-notifications/research.md)
**UI Contracts**: [specs/003-pwa-push-notifications/contracts/ui-contracts.md](specs/003-pwa-push-notifications/contracts/ui-contracts.md)
**Quickstart**: [specs/003-pwa-push-notifications/quickstart.md](specs/003-pwa-push-notifications/quickstart.md)

Real native PWA push notifications. VAPID keys, Prisma PushSubscription, custom SW `push`/`notificationclick`, contextual permission prompt, admin toggles. 53 tasks across 8 phases. No Firebase dependency.

### Previous Features
- **Dark Mode Audit & PWA Update Notifications**: [specs/002-dark-mode-audit-and-pwa-updates/](specs/002-dark-mode-audit-and-pwa-updates/) — SHIPPED ✅
- **PWA Responsive Mobile Fixes**: [specs/001-pwa-responsive-mobile/](specs/001-pwa-responsive-mobile/) — SHIPPED ✅
<!-- SPECKIT END -->
