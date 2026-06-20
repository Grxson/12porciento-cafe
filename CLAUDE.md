# 12% Café - Project Context

## Overview
Full-stack specialty coffee web app. User-facing features: recipes (V60, AeroPress, Espresso), Stripe payments, cart system, PWA. Admin dashboard for content management (promos, users, recipes).

**Tech Stack:**
- Client: React 19, TypeScript, Tailwind CSS, Shadcn/ui
- Server: Node/Express, TypeScript, Stripe API
- Database: SQLite via Prisma ORM (`server/prisma/schema.prisma`)
- Monorepo: pnpm workspaces (client/, server/)

## Recent Work (2026-05-30 to 2026-06-10)

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

## Key Contacts
- Email: gael.grxson@gmail.com

## Testing Before Push
- Start dev server: `pnpm dev` (runs both client & server)
- Test UI changes in browser (golden path + edge cases)
- Run type checking & tests if available

---
Last updated: 2026-06-09 (gamification sprint)

<!-- SPECKIT START -->
## Current Feature Plan

**Active feature**: PWA Responsive Mobile Fixes
**Plan**: [specs/001-pwa-responsive-mobile/plan.md](specs/001-pwa-responsive-mobile/plan.md)
**Spec**: [specs/001-pwa-responsive-mobile/spec.md](specs/001-pwa-responsive-mobile/spec.md)
**Tasks**: [specs/001-pwa-responsive-mobile/tasks.md](specs/001-pwa-responsive-mobile/tasks.md)

For technical context, research findings, and implementation tasks, read the plan and tasks above before touching any mobile layout files.
<!-- SPECKIT END -->
