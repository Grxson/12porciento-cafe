# Spec: Split Admin Dashboard into Independent App

## Problem

Admin dashboard lives inside same React app as public site. Results in:

- Client bundle includes admin code (~27 pages) that 99% of users never load
- Auth interceptor uses fragile `window.location.pathname` hack to decide token type
- Admin has its own parallel UI ecosystem (modals, toast, theme) duplicating public components
- Cannot deploy admin fixes independently from public site
- Shared code extraction impossible without restructuring

## Solution

Three-package pnpm workspace that both web and admin apps consume:

```
packages/         → shared code (types, API, UI components, Tailwind config)
apps/web/         → public-facing app (React SPA)
apps/admin/       → admin dashboard (React SPA)
server/           → Express API (unchanged)
```

## Design Decisions

### 1. API Client: `createApi()` factory

Current code uses `window.location.pathname.startsWith('/admin')` to pick token. New design uses a factory that accepts a token getter:

```typescript
// packages/shared/src/api/index.ts
export function createApi(getToken: () => string | null) {
  const api = axios.create({ baseURL: '/api' });
  api.interceptors.request.use((config) => {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return api;
}
```

Web passes `() => localStorage.getItem('user_token')`.
Admin passes `() => localStorage.getItem('admin_token')`.

### 2. Tailwind as preset

Extract custom palette (coffee, gold, cream) into `packages/config-tailwind/`. Web, admin, and `packages/ui` all reference it as a preset. Single source of truth for theme.

### 3. UI package scans `content`

Tailwind needs to scan `packages/ui/src/` for class names. Each app's tailwind config includes the UI package path in `content`:

```js
content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'];
```

### 4. Consolidated ConfirmDialog

Currently admin and public have separate ConfirmDialog components with slightly different APIs. Extract a single version that handles both use cases.

### 5. Context split (already mostly done)

Admin already uses `ModuleContext` (not ToastContext) and `useAdminTheme` (not useClientTheme). Kept as-is after split — each app has its own context setup.

### 6. Server unchanged

Express API already has both user routes (`requireUserAuth`) and admin routes (`requireAuth`). No changes needed — both new apps call same endpoints.

## Non-goals

- Split server into microservices
- Change any API response format
- Add new features
- Rename `client/` to `apps/web/` (done in separate refactor or kept as rename step)
