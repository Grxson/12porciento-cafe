# 12% Café - Project Context

## Overview
Full-stack specialty coffee web app. User-facing features: recipes (V60, AeroPress, Espresso), Stripe payments, cart system, PWA. Admin dashboard for content management (promos, users, recipes).

**Tech Stack:**
- Client: React 19, TypeScript, Tailwind CSS, Shadcn/ui
- Server: Node/Express, TypeScript, Stripe API
- Database: SQLite via Prisma ORM (`server/prisma/schema.prisma`)
- Monorepo: pnpm workspaces (client/, server/)

## Recent Work (2026-05-30 to 2026-06-09)

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
