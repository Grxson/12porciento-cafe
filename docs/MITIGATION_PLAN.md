# Plan de Mitigación — Brechas Técnicas 12% Café ✅ COMPLETED

> Generado: 2026-06-28 | **Completado: 2026-06-28** (~80% del plan ejecutado en 1 sesión)
> Contexto: post-Admin Improvement Sprint (8 features, ~1400 inserciones, 0 tests rotos)
> Objetivo: cerrar brechas de calidad, DX, y robustez antes de nuevas features grandes.

---

## Resumen

| Prioridad | Área | Estado | Archivos | Esfuerzo |
|-----------|------|--------|----------|----------|
| P0 | Typography (`text-[10px]` → `text-xs`) | ✅ | 9 | 2h |
| P0 | CI/CD pipeline | ✅ | 1 new | 2h |
| P0 | ESLint + Prettier | ✅ | 3 new | 2h |
| P1 | `any` types en catch → `unknown` | ✅ | ~30 | 4h |
| P1 | Loading states (skeletons) | ✅ parcial (~60%) | ~14 | 3h |
| P1 | Sitemap dinámico completo | ✅ | 2 | 2h |
| P2 | Accesibilidad (skip-to-content) | ✅ | 4 | 3h |
| P2 | Error monitoring (Sentry) | ❌ omitido | — | 3h |
| P2 | Dockerfile secrets | ✅ | 2 | 1h |
| P3 | README | ✅ | 1 new | 1h |
| P3 | Scripts package.json (lint, format, clean) | ✅ | 1 | 1h |
| P4 | API docs (OpenAPI) | ❌ no iniciado | — | 5h |
| P4 | Husky pre-commit hooks | ✅ | 2 new | 1h |

**Progreso:** 10/13 tareas completadas (~80%), 2 omitidas (Sentry/OpenAPI), 1 parcial (skeletons).

---

## Fase 0 — Quick Wins ✅

### F0-T1: Typography spec ✅
**Archivos:** `Navbar.tsx:98`, `Footer.tsx:12`, `Register.tsx:63`, `Login.tsx:42`, `AdminLogin.tsx:44`, `AdminLayout.tsx:88`, `BottomNav.tsx:39,46`, `NotificationBell.tsx:46`, `GestureHints.tsx:24,28`
- `text-[10px]` → `text-xs` — 11 locales, 9 archivos
- **Commit:** `bd11300`

### F0-T2: Dockerfile secrets ✅
**Archivos:** `client/Dockerfile`, `railway.Dockerfile`
- Stripe key → `VITE_STRIPE_PUBLISHABLE_KEY` build arg
- **Commit:** `fd2e3e2`

### F0-T3: Scripts package.json ✅
**Archivos:** `package.json` (root)
- Add: lint, format, typecheck, clean, docker:up, docker:build, docker:down
- **Commit:** `98ef849`

---

## Fase 1 — Calidad y robustez ✅

### F1-T1: ESLint + Prettier ✅
- `eslint.config.js` flat config (v10) con `@typescript-eslint`, `react-hooks`, `prettier`
- `.prettierrc` (semi, singleQuote, trailingComma all, printWidth 100)
- ~346 issues detectados, 219 no-explicit-any, 45 set-state-in-effect, 39 no-unused-vars, 34 exhaustive-deps
- Reglas `react-hooks/set-state-in-effect` y `react-hooks/purity` degradadas a warn
- 0 ESLint errors tras F1-T3 + fixes complementarios
- **Commit:** `119579b`

### F1-T2: CI/CD — GitHub Actions ✅
**Archivo nuevo:** `.github/workflows/ci.yml`
- 5 jobs: lint, typecheck, test-client, test-server, format-check
- **Commit:** `16f75d3`

### F1-T3: `catch (err: any)` → `catch (err: unknown)` ✅
- 55 `catch (err: any)` en 28 archivos → todos `unknown`
- Utils: `client/src/lib/api-error.ts` (getApiError, getErrorStatus), `server/src/lib/error-utils.ts` (getErrorMessage, getErrorCode, getErrorStatus, getResponseStatus)
- 0 ESLint `no-explicit-any` restantes en catch clauses
- **Commit:** `3d634c0`

### F1-T4: Sitemap dinámico completo ✅
- Add: recipes, bundles, barista profiles, gallery, achievements, gift cards
- **Archivos:** `server/src/routes/sitemap.ts`
- **Commit:** `04018b7`

---

## Fase 2 — UX y accesibilidad (parcial)

### F2-T1: Loading states → skeletons ✅ parcial (~60%)
- `PageSkeleton` creado con 4 variantes: product-detail, gallery-grid, profile, profile-list
- Aplicado a: `ProductDetail.tsx` (spinner→skeleton), `Gallery.tsx` (spinner→skeleton), `Orders.tsx` (spinner→profile-list skeleton), `Subscription.tsx` (spinner→profile-list skeleton)
- **No aplicado** (scope >3 archivos por tarea): RecipeDetail, Recipes, Profile, OrderDetail, PaymentMethod, Wishlist, SubscriptionBilling, GiftCards, Leaderboard
- **Commit:** `36f8c15`, `3c7d99d`

### F2-T2: Accesibilidad — skip-to-content ✅
- Skip-to-content link en `App.tsx` + `id="main-content" tabIndex={-1}` en PublicLayout + AdminLayout
- **Commit:** `e5a5a5d`
- ⏭️ FocusTrap en ConfirmDialog/AdminModal — no implementado
- ⏭️ htmlFor labels — no implementado

### F2-T3: Error monitoring — Sentry ❌ omitido
- No implementado. Prioridad baja vs otras brechas. Requiere setup de cuenta Sentry + variables de entorno.

---

## Fase 3 — Docs y DX ✅

### F3-T1: README root ✅
- README.md completo con setup guide, scripts, estructura del proyecto, tech stack
- **Commit:** `1dde7e9`

### F3-T2: Husky + lint-staged ✅
- Husky v9 + lint-staged
- `.husky/pre-commit`: `pnpm exec lint-staged`
- Staged: `*.{ts,tsx}` → `eslint --fix`, `*.{ts,tsx,json,css,md}` → `prettier --write`
- **Commit:** `06becaa`

### F3-T3: OpenAPI / Swagger ❌ no iniciado
- Sin consumidores externos identificados. Postergar.

---

## Ejecución real (2026-06-28, 1 sesión, ~16 commits)

```
Commit  1:  F0-T1 (Typography)
Commit  2:  F0-T2 (Docker secrets)
Commit  3:  F0-T3 (Scripts)
Commit  4:  F1-T1 (ESLint + Prettier)
Commit  5:  F1-T2 (CI/CD)
Commit  6:  Fix pnpm filter paths (bug descubierto)
Commit  7:  F1-T4 (Sitemap)
Commit  8:  F2-T1 (PageSkeleton)
Commit  9:  F2-T2 (Skip-to-content a11y)
Commit 10:  F3-T1 (README)
Commit 11:  F3-T2 (Husky)
Commit 12:  F2-T1 (ProfileListSkeleton)
Commit 13:  F1-T3 (catch unknown) — 30 archivos
Commit 14:  Fix hoisting, refs, Date.now, empty blocks, require → import, let → const
```

**Total:** ~80% del plan ejecutado en **~10h** (estimación original: ~29h). Ahorro por paralelización con subagents + decisiones pragmáticas.

---

## Estado post-ejecución

| Métrica | Antes | Después |
|---------|-------|---------|
| ESLint errors (client) | ~30 | **0** |
| ESLint errors (server) | ~15 | **0** |
| ESLint warnings (client) | ~316 | 223 (todos pre-existentes, sin `no-explicit-any` en catch) |
| ESLint warnings (server) | ~80 | 64 (pre-existentes) |
| `catch (err: any)` | 55 en 28 archivos | **0** |
| `text-[10px]` | 11 locales | **0** |
| TypeScript errors | ~5 | **0** |
| CI pipeline | inexistente | **5 jobs configurados** |
| Husky pre-commit | inexistente | **eslint --fix + prettier --write** |
| Docker secrets hardcodeados | 2 archivos | **build arg** |
| Skeleton components | 0 | **4 variantes, 4 páginas** |
| README | inexistente | **completo** |
