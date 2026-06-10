# 12% Café - Project Context

## Overview
Full-stack specialty coffee web app. User-facing features: recipes (V60, AeroPress, Espresso), Stripe payments, cart system, PWA. Admin dashboard for content management (promos, users, recipes).

**Tech Stack:**
- Client: React 19, TypeScript, Tailwind CSS, Shadcn/ui
- Server: Node/Express, TypeScript, Stripe API
- Database: Not yet specified (check server config)
- Monorepo: pnpm workspaces (client/, server/)

## Recent Work (2026-05-30 to 2026-06-09)

### Feature Sprint (May 2026) - SHIPPED
- Stripe integration with saved cards
- Cart drawer UI
- Recipe gating (unlock via purchase)
- PWA setup
- Docker configuration fixes

### Admin Overhaul (June 2026) - SHIPPED
- Reusable admin infrastructure:
  - `useModuleList` hook (CRUD operations)
  - `usePagination` hook (pagination logic)
  - `ModuleContext` (state management)
  - CSV export utilities
- Fixed two-ConfirmDialog gotcha in modals
- Fixed promo type bug

### Roadmap Status
All 4 master initiatives already shipped:
- ✅ Gallery/showcase
- ✅ Stripe payments
- ✅ Recipes feature
- ✅ PWA support

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

## Key Contacts
- Email: gael.grxson@gmail.com

## Testing Before Push
- Start dev server: `pnpm dev` (runs both client & server)
- Test UI changes in browser (golden path + edge cases)
- Run type checking & tests if available

---
Last updated: 2026-06-09
