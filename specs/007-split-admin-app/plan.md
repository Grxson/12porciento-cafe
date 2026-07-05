# Plan: Split Admin into Separate App (Nivel 3)

## Goal

Extract admin dashboard from monolith `client/` into independent app with shared packages via pnpm workspace. End state: 3 deploys (server + web + admin), shared code in `packages/`.

## Current State

```
client/                          server/
├── src/                         ├── src/routes/
│   ├── admin/   (27 pages)      │   ├── admin/   (4 files, 373 lines)
│   ├── pages/   (25 pages)      │   └── *.ts     (9 files, 7764 lines)
│   ├── components/  (50 comps)  ├── prisma/schema.prisma
│   ├── hooks/       (14 hooks)  └── package.json
│   ├── api/         (2 files)
│   ├── types/       (2 files)
│   ├── lib/         (4 files)
│   ├── constants/   (1 file)
│   └── context/     (8 contexts)
└── package.json
```

Admin & public share: types, API client, components, hooks, utils, Tailwind config, lib.

## Target State

```
12porciento-cafe/
├── packages/
│   ├── config-tailwind/   # Tailwind preset
│   ├── shared/            # Types + API client + utils + hooks
│   └── ui/                # Shared components
├── apps/
│   ├── web/               # Public app (renamed from client/)
│   └── admin/             # Admin dashboard (extracted)
├── server/                # Unchanged
└── pnpm-workspace.yaml    # packages: ['packages/*', 'apps/*', 'server']
```

## Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   apps/web   │    │  apps/admin  │    │    server    │
│  (React SPA) │    │  (React SPA) │    │  (Express)   │
└──┬───────────┘    └──┬───────────┘    └──────────────┘
   │ packages/shared    │ packages/shared       │
   │ packages/ui        │ packages/ui           │
   │ packages/config-tw │ packages/config-tw    │
   └────────────────────┘                       │
   ├──────────  /api/*  ────────────────────────┘
                 2 Railway services             1 Railway service
```

- Web and admin are independent SPAs, each built separately
- Both consume shared packages via pnpm workspace symlinks
- Both call same Express API (`/api/*`)
- Auth: web sends `user_token`, admin sends `admin_token`
- Server unchanged (already has both user + admin routes)

## Packages

### 1. `packages/config-tailwind`

**Zero deps.** Exports Tailwind preset with custom palette, fonts, animations.

```
packages/config-tailwind/
├── package.json      # name: @12porciento/tailwind-config
├── index.js          # module.exports = { theme: { extend: { ... } } }
└── README.md
```

Contains: coffee/gold/cream palette, Playfair Display SC + Karla fonts, custom animations (float, shimmer, fade-up), darkMode: 'class'.

### 2. `packages/shared`

**Deps: axios, zustand, idb-keyval, @tanstack/react-query.** Domain types + API client + utilities + framework-agnostic hooks.

```
packages/shared/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts           # barrel export
    ├── types/
    │   ├── index.ts       # all domain types (from client/src/types/)
    │   └── recipeDraft.ts
    ├── api/
    │   ├── index.ts       # axios instance + token provider pattern
    │   └── barista.ts     # barista endpoints
    ├── utils/
    │   ├── api-error.ts
    │   ├── base64.ts
    │   ├── imageUrl.ts
    │   └── idb-storage.ts
    ├── lib/
    │   └── queryClient.ts
    ├── hooks/
    │   ├── useBrewQueue.ts
    │   ├── useRecipeDraft.ts
    │   ├── useRecipeForm.ts
    │   └── useInstallPrompt.ts
    └── constants/
        └── mexico.ts
```

**Key change:** API client becomes configurable via `createApi(tokenProvider)` factory, replacing `window.location.pathname` hack.

### 3. `packages/ui`

**Deps: react, react-dom, framer-motion, lucide-react, @12porciento/shared (types).** Shared presentation components.

```
packages/ui/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts
    ├── FocusTrap.tsx
    ├── ErrorBoundary.tsx
    ├── SearchableProductSelect.tsx
    ├── SearchableCaficultorSelect.tsx
    ├── SearchableUbicacionSelect.tsx
    ├── recipe-editor/
    │   ├── RecipeList.tsx
    │   ├── RecipeEditor.tsx
    │   └── StepEditor.tsx
    └── ConfirmDialog.tsx     # unified (admin + public versions merged)
```

## Apps

### `apps/web` (from `client/`)

- All public pages + profile pages
- Stripe, recharts, html2canvas, jspdf deps stay here
- Uses 6 public-only contexts: Cart, User, Wishlist, OrderHistory, Theme, Toast
- Imports from packages: shared (types, API, hooks), ui (components), config-tailwind

### `apps/admin` (extracted from `client/src/admin/`)

- 27 admin pages + admin layout + admin login
- `recharts` dep lives here (Dashboard)
- Uses admin-only contexts: ModuleContext, useAdminTheme, NotificationsContext
- Admin-specific components stay: AdminModal, AdminSkeleton, AdminErrorState, etc.
- Imports from packages: shared (types, API), ui (FocusTrap, SearchableSelects), config-tailwind

## Phases

### Phase 0 — Scaffold (estimated: 1 session)

- Create `packages/` directory structure
- Initialize `pnpm-workspace.yaml` with `packages/*`, `apps/*`, `server`
- Create minimal `package.json` for each package
- Set up TypeScript configs for packages (composite projects)
- Verify `pnpm install` works with new workspace

### Phase 1 — Extract `config-tailwind` (estimated: 1 session)

- Move Tailwind config into `packages/config-tailwind/index.js`
- Register as `@12porciento/tailwind-config`
- Update `client/tailwind.config.js` to use preset
- Verify no visual changes

### Phase 2 — Extract `shared` package (estimated: 2-3 sessions)

- Move types to `packages/shared/src/types/`
- Move API client to `packages/shared/src/api/`
  - Refactor auth interceptor to use `createApi(tokenProvider)` factory
  - Update all API module exports to accept the api instance
- Move utils, lib, hooks, constants
- Update `client/` imports to use `@12porciento/shared`
- Verify app works

### Phase 3 — Extract `ui` package (estimated: 2 sessions)

- Move FocusTrap, ErrorBoundary, SearchableSelects
- Move recipe editor components
- Merge public + admin ConfirmDialog into one component
- Update `client/` imports to use `@12porciento/ui`
- Verify app works

### Phase 4 — Create `apps/admin` (estimated: 2-3 sessions)

- Create new Vite + React app in `apps/admin/`
- Copy admin pages from `client/src/admin/`
- Copy admin-specific components (AdminModal, Skeleton, etc.)
- Set up admin Router (only admin routes)
- Set up admin auth flow (login page, token management)
- Set up Tailwind with `@12porciento/tailwind-config`
- Set up admin vite.config.ts (port 5174, proxy /api to server)
- Add admin Dockerfile
- Verify admin app runs independently: `pnpm --filter @12porciento/admin dev`
- Verify auth works (admin_token flow)

### Phase 5 — Remove admin from web app (estimated: 1 session)

- Delete `client/src/admin/` directory
- Remove admin route imports from `client/src/App.tsx`
- Remove admin-only deps from `client/package.json` (recharts stays if public uses it)
- Clean up shared contexts that are admin-only
- Verify web app has zero admin code

### Phase 6 — Railway deploy (estimated: 1 session)

- Add admin service to `.railway/railway.ts`
- Configure admin Dockerfile build args
- Set up env vars for admin app (API URL)
- Deploy all 3 services
- Update nginx configs if needed
- Verify both apps work in production

## Key Risks & Mitigations

| Risk                                                  | Impact | Mitigation                                                      |
| ----------------------------------------------------- | ------ | --------------------------------------------------------------- |
| Auth interceptor refactor breaks token flow           | High   | Create `createApi()` factory, test both apps with tokens        |
| Build order: packages must build before apps          | Medium | pnpm workspace handles this with `prepublish` scripts           |
| Tailwind classes not tree-shaken in shared components | Medium | Use `content` paths in Tailwind config to scan packages         |
| Recipe editor shared between web + admin differs      | Low    | Keep recipe components in `ui/`, accept both use cases          |
| Context splitting: admin uses different toast/theme   | Low    | Already split (ModuleContext, useAdminTheme) — no change needed |
| Railway migration: zero-downtime?                     | Low    | Can deploy new alongside old, then switch DNS                   |
| Server API unchanged = no risk                        | None   | Server untouched by this refactor                               |

## Dependencies

```
packages/config-tailwind (no deps)
packages/shared (axios, zustand, idb-keyval, @tanstack/react-query)
packages/ui (react, framer-motion, lucide-react, @12porciento/shared)

apps/web (react, react-router, @stripe/*, recharts, etc.)
  └── depends on: @12porciento/shared, @12porciento/ui, @12porciento/tailwind-config

apps/admin (react, react-router, recharts)
  └── depends on: @12porciento/shared, @12porciento/ui, @12porciento/tailwind-config

server (unchanged)
```

## Files Changed/Added

**New files:**

- `packages/config-tailwind/package.json`
- `packages/config-tailwind/index.js`
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/index.ts`
- `packages/shared/src/types/index.ts`
- `packages/shared/src/api/index.ts`
- `packages/shared/src/api/barista.ts`
- `packages/shared/src/utils/*.ts`
- `packages/shared/src/lib/*.ts`
- `packages/shared/src/hooks/*.ts`
- `packages/shared/src/constants/*.ts`
- `packages/ui/package.json`
- `packages/ui/tsconfig.json`
- `packages/ui/src/index.ts`
- `packages/ui/src/*.tsx`
- `apps/admin/package.json`
- `apps/admin/tsconfig.json`
- `apps/admin/vite.config.ts`
- `apps/admin/index.html`
- `apps/admin/src/main.tsx`
- `apps/admin/src/App.tsx`
- `apps/admin/src/*.tsx`
- `apps/admin/Dockerfile`
- `apps/admin/nginx.conf`

**Modified files:**

- `pnpm-workspace.yaml` — add packages + apps
- `client/package.json` — remove admin deps, add package deps
- `client/tailwind.config.js` — use preset
- `client/src/**/*.ts` — update import paths to `@12porciento/shared` etc.
- `.railway/railway.ts` — add admin service
- `.gitignore` — add build artifacts

**Deleted:**

- `client/src/admin/` — moved to `apps/admin/`
- `client/src/types/` — moved to `packages/shared/`
- `client/src/api/` — moved to `packages/shared/`
- Some `client/src/hooks/` — moved to `packages/shared/`
- Some `client/src/components/` — moved to `packages/ui/`

## Success Criteria

1. `pnpm --filter @12porciento/web dev` starts public app (localhost:5173)
2. `pnpm --filter @12porciento/admin dev` starts admin app (localhost:5174)
3. Both apps can log in, make API calls, function identically to current app
4. `pnpm --filter @12porciento/web build` produces dist/ without admin code
5. `pnpm --filter @12porciento/admin build` produces dist/ without public code
6. Railway deploys all 3 services (server + web + admin) and they work
7. TypeScript passes for all packages + apps
8. Zero visual regressions in both apps
