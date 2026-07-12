# 12% Café - Project Context

## Overview

Full-stack specialty coffee web app. User-facing features: recipes (V60, AeroPress, Espresso), Stripe payments, cart system, PWA. Admin dashboard for content management (promos, users, recipes).

**Tech Stack:**

- Client: React 19, TypeScript, Tailwind CSS, Shadcn/ui
- Server: Node/Express, TypeScript, Stripe API
- Database: PostgreSQL (production) / SQLite (local dev) via Prisma ORM (`server/prisma/schema.prisma`)
- Monorepo: pnpm workspaces (client/, server/)

## Recent Work (2026-05-30 to 2026-06-28, Sprints 003-004)

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

### Admin Improvement Sprint (June 2026) - SHIPPED

- **8 core features:** Wishlist, Recipe Ratings, Subscription Pause/Skip, Price History, Gift Cards, Abandoned Cart, Enhanced Analytics, Logistics Panel
- **AdminLog audit trail:** Prisma model, server utility, API endpoints, client viewer, nav integration
- **Order tracking fields:** trackingNumber, carrier, estimatedDelivery schema + API + email notification
- **Fase 0 admin polish:** PageMeta in all pages, AdminSkeleton/AdminErrorState everywhere, AbandonedCarts filters (search, date range, recovered), Logistics overhaul (tracking modal, carrier selector, Pagination, light mode), Inventory error states, SubscriptionPayments insensitive search, AdminUsers submit fix
- **Financial dashboard:** `/api/dashboard/financial` endpoint (profit, margin, MRR, category breakdown), client integration in Dashboard.tsx
- **Bulk push preferences:** `PUT /api/push/preferences/bulk` for admin notification settings
- **Execution:** 6 commits, 35 files, 1400+ insertions

### PWA + Offline Sprint (June 2026) - SHIPPED

- **Recipe detail offline:** CacheFirst SW route `/api/recipes/:id` (50 entries, 7-day TTL)
- **iOS splash screens:** 6 PNG sizes in `public/splashes/`, generated via `scripts/generate-splashes.mjs`
- **WishlistContext:** Zustand + IndexedDB persist (survives restarts/cache clear)
- **OrderHistoryContext:** Zustand + IndexedDB persist, NetworkFirst → cache fallback
- **Offline banners:** Both Wishlist and Orders show `WifiOff` banner when offline
- **Cart IndexedDB:** Migrated from localStorage to `idb-keyval` via `lib/idb-storage.ts`
- **PWA icons:** All regenerated as RGBA (32-bit) from `logo.svg` — `scripts/regenerate-icons.mjs`
- **Execution:** 4 commits (6afd1c7, e32f62e, 2d67b14, 518affe), 1200+ insertions

### DB Fix Sprint (June 2026) - SHIPPED

- **Schema drift fix:** Applied `add_order_tracking_fields` migration to prod (trackingNumber, carrier, estimatedDelivery)
- **Unsplash URL repair:** 28 Product.imageUrl rows + 46 Product.images rows fixed with working photo IDs
- **Server error logging:** Added `console.error` to `/me/orders` and `/me/payment-methods`
- **Script:** `scripts/fix-broken-images.ts` for future broken URL repair

### Admin Refactor Sprint (July 2026) - SHIPPED

- **Collapsible sidebar:** 4 nav groups (Catálogo, Ventas, Clientes, Config) now accordion-style with framer-motion animation + localStorage persistence (`collapsedGroups` key)
- **Dead code removal:** Deleted unused `lib/api.ts` (duplicate axios instance, 0 imports), empty `lib/` dir, stale `utils/imageUrl.ts` re-export chain
- **Shared package consolidation:**
  - `getApiError`/`getErrorStatus` → 6 files import from `@12porciento/shared` instead of local `lib/api-error`
  - `resolveImageUrl` → 4 files import from `@12porciento/shared` instead of local `utils/imageUrl`
  - `FocusTrap` → 2 files import from `@12porciento/ui` instead of local `components/FocusTrap`
- **Net:** ~160 lines removed, 80 added. Build clean. Commit `98d379f`

### Roadmap Status

All initiatives shipped:

- ✅ Gallery/showcase
- ✅ Stripe payments
- ✅ Recipes feature
- ✅ PWA support (full offline)
- ✅ Gamification (Barista Levels)
- ✅ PWA Push Notifications
- ✅ Typography Standardization
- ✅ Admin enhancements (8 features + Fase 0-2)
- ✅ Offline Wishlist + Order History

## Project Structure

```
12porciento-cafe/
├── client/               # React app (storefront + PWA)
├── server/               # Express API
├── apps/admin/           # Admin dashboard (React + Vite)
├── packages/
│   ├── shared/           # Shared types, API client, utils, hooks
│   ├── ui/               # Shared UI components (FocusTrap, ConfirmDialog, ErrorBoundary)
│   └── config-tailwind/  # Shared Tailwind theme
├── specs/                # Feature specs & plans
├── docker-compose.yml    # Local dev PostgreSQL
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
10. **Admin sidebar collapsible state:** Persisted in `localStorage key 'admin_sidebar_collapsed'` as `Record<string, boolean>` map of group labels. Clear key to reset.

## Key Contacts

- Email: gael.grxson@gmail.com

## Testing Before Push

- Start dev server: `pnpm dev` (runs both client & server)
- Test UI changes in browser (golden path + edge cases)
- Run type checking & tests if available

---

Last updated: 2026-07-09 (Admin Refactor Sprint — collapsible sidebar, shared consolidation)

<!-- SPECKIT START -->

For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/005-barista-profile-overhaul/plan.md

## Current Sprint: Barista Profile Overhaul

Active plan: specs/005-barista-profile-overhaul/

- spec.md — feature specification (4 phases)
- plan.md — implementation plan with subagents, Context7 research, timelines
- tasks.md — 38 actionable tasks mapped to subagent calls
- quickstart.md — validation guide per phase

<!-- SPECKIT END -->
