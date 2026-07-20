# 12% Café - Project Context

## Overview

Full-stack specialty coffee web app. User-facing features: recipes (V60, AeroPress, Espresso), Stripe payments, cart system, PWA. Admin dashboard for content management (promos, users, recipes).

**Tech Stack:**

- Client: React 19, TypeScript, Tailwind CSS, Shadcn/ui
- Server: Node/Express, TypeScript, Stripe API
- Database: PostgreSQL (production) / SQLite (local dev) via Prisma ORM (`server/prisma/schema.prisma`)
- Monorepo: pnpm workspaces (client/, server/)

## Roadmap Status

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
