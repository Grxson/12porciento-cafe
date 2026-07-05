# Tasks: Split Admin into Independent App

Priority: P0 = blocker, P1 = high, P2 = medium

## Phase 0 — Scaffold workspace

- [ ] P0 Create `packages/config-tailwind/`, `packages/shared/`, `packages/ui/` dirs
- [ ] P0 Add `'packages/*'`, `'apps/*'` to `pnpm-workspace.yaml`
- [ ] P0 Create minimal `package.json` for each package with correct name
- [ ] P0 Set up TypeScript composite projects for each package
- [ ] P0 Verify `pnpm install` resolves workspace packages

## Phase 1 — Tailwind preset

- [ ] P1 Move custom theme (coffee, gold, cream palettes + fonts + animations) to `packages/config-tailwind/index.js`
- [ ] P1 Update `client/tailwind.config.js` to use preset
- [ ] P1 Verify no visual changes in browser

## Phase 2 — Shared package (types + API + utils + hooks)

- [ ] P0 Create `createApi()` factory in `packages/shared/src/api/index.ts`
- [ ] P0 Move all types from `client/src/types/` to `packages/shared/src/types/`
- [ ] P1 Move API modules to `packages/shared/src/api/` (index.ts, barista.ts)
- [ ] P1 Refactor API client: export modules as functions that accept an api instance
- [ ] P1 Move utils: api-error.ts, base64.ts, imageUrl.ts, idb-storage.ts
- [ ] P1 Move lib: queryClient.ts
- [ ] P1 Move framework-agnostic hooks: useBrewQueue, useRecipeDraft, useRecipeForm, useInstallPrompt
- [ ] P1 Move constants: mexico.ts
- [ ] P1 Update `client/` imports to use `@12porciento/shared`
- [ ] P2 Verify app works end-to-end (login, browse, cart, checkout)

## Phase 3 — UI package

- [ ] P1 Move FocusTrap, ErrorBoundary to `packages/ui/src/`
- [ ] P1 Move SearchableProductSelect, SearchableCaficultorSelect, SearchableUbicacionSelect to `packages/ui/src/`
- [ ] P1 Move RecipeList, RecipeEditor, StepEditor to `packages/ui/src/recipe-editor/`
- [ ] P1 Consolidate admin + public ConfirmDialog into `packages/ui/src/ConfirmDialog.tsx`
- [ ] P1 Setup Tailwind content paths in UI package
- [ ] P1 Update `client/` imports to use `@12porciento/ui`
- [ ] P2 Verify app works

## Phase 4 — Create admin app

- [ ] P0 Bootstrap `apps/admin/` with Vite + React + TypeScript + Tailwind
- [ ] P0 Create `apps/admin/package.json` with deps (react, router, recharts, @12porciento/*)
- [ ] P0 Copy admin files from `client/src/admin/` to `apps/admin/src/`
- [ ] P0 Copy admin-specific components (AdminModal, AdminSkeleton, AdminErrorState, etc.)
- [ ] P0 Set up admin Router (only admin routes)
- [ ] P0 Set up admin auth: login page, `admin_token` management, protected routes
- [ ] P1 Set up admin contexts: ModuleContext, useAdminTheme, NotificationsContext
- [ ] P1 Set up admin vite.config.ts (port 5174, proxy /api → localhost:3001)
- [ ] P1 Create admin Dockerfile (nginx, build from workspace)
- [ ] P1 Create admin nginx.conf
- [ ] P2 Verify `pnpm --filter @12porciento/admin dev` starts and works
- [ ] P2 Verify admin login, CRUD operations, API calls work

## Phase 5 — Strip admin from web app

- [ ] P1 Delete `client/src/admin/` directory
- [ ] P1 Remove admin route imports from `client/src/App.tsx`
- [ ] P1 Remove admin-only deps from `client/package.json`
- [ ] P1 Remove admin-only contexts from app root
- [ ] P1 Verify web app compiles and runs with zero admin code
- [ ] P2 Run full regression test (login, store, cart, checkout, orders, profile)

## Phase 6 — Railway deploy

- [ ] P0 Add admin service to `.railway/railway.ts`
- [ ] P0 Configure admin Dockerfile path in Railway
- [ ] P1 Set up env vars for admin app (API URL, Stripe key if needed)
- [ ] P1 Build and deploy all 3 services
- [ ] P2 Verify production URLs work for web + admin
- [ ] P3 Add custom domain for admin if separate subdomain needed

## Total

| Phase               | Tasks  | Priority |
| ------------------- | ------ | -------- |
| 0 — Scaffold        | 5      | P0       |
| 1 — Tailwind preset | 3      | P1       |
| 2 — Shared package  | 11     | P0-P2    |
| 3 — UI package      | 8      | P1-P2    |
| 4 — Admin app       | 12     | P0-P2    |
| 5 — Strip web       | 7      | P1-P2    |
| 6 — Deploy          | 6      | P0-P3    |
| **Total**           | **52** |          |
