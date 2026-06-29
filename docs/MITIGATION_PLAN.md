# Plan de Mitigación — Brechas Técnicas 12% Café

> Generado: 2026-06-28
> Contexto: post-Admin Improvement Sprint (8 features, ~1400 inserciones, 0 tests rotos)
> Objetivo: cerrar brechas de calidad, DX, y robustez antes de nuevas features grandes.

---

## Resumen

| Prioridad | Área | Impacto | Archivos | Esfuerzo |
|-----------|------|---------|----------|----------|
| P0 | Typography (`text-[10px]` → `text-xs`) | Visual, plan existente | 9 | 2h |
| P0 | CI/CD pipeline | Bloqueante para equipo | 1 new | 2h |
| P0 | ESLint + Prettier | Calidad código | 3 new | 2h |
| P1 | `any` types en catch → `unknown` | Type safety | ~40 | 4h |
| P1 | Loading states (skeletons) | UX consistente | ~12 | 3h |
| P1 | Sitemap dinámico completo | SEO | 2 | 2h |
| P2 | Accesibilidad (skip-to-content, focus trapping, htmlFor) | Inclusión | ~8 | 3h |
| P2 | Error monitoring (Sentry) | Observabilidad | 4 | 3h |
| P2 | Dockerfile secrets | Security | 2 | 1h |
| P3 | README | Onboarding | 1 new | 1h |
| P3 | Scripts package.json (lint, format, clean) | DX | 1 | 1h |
| P4 | API docs (OpenAPI) | DX externo | — | 5h |
| P4 | Husky pre-commit hooks | DX | 2 new | 1h |

**Carga total estimada:** ~29h (repartible en 5-8 sprints pequeños)

---

## Fase 0 — Quick Wins (< 2h c/u)

### F0-T1: Typography spec
**Archivos:** `Navbar.tsx:98`, `Footer.tsx:12`, `Register.tsx:63`, `Login.tsx:42`, `AdminLogin.tsx:44`, `AdminLayout.tsx:88`, `BottomNav.tsx:39,46`, `NotificationBell.tsx:46`, `GestureHints.tsx:24,28`
- `text-[10px]` → `text-xs` (aligned text size, no functional change)
- `tracking-[0.3em]` → `tracking-widest` (todas menos GestureHints)
- Referencia: `specs/004-typography-standardization/plan.md` — 11 locales, 9 archivos
- **Esfuerzo:** ~2h (8 edits mecánicos)

### F0-T2: Dockerfile secrets
**Archivos:** `client/Dockerfile`, `railway.Dockerfile`
- Stripe publishable key hardcodeada → `VITE_STRIPE_PUBLISHABLE_KEY` build arg
- **Esfuerzo:** ~1h

### F0-T3: Scripts package.json
**Archivos:** `package.json` (root)
- Add: `"lint"`, `"format"`, `"typecheck"`, `"clean"`, `"docker:up"`, `"docker:build"`
- **Esfuerzo:** ~1h

---

## Fase 1 — Calidad y robustez (4-6h c/u)

### F1-T1: ESLint + Prettier
- `eslint.config.js` flat config (v9+) con `@typescript-eslint`, `react`, `react-hooks`
- `.prettierrc` (semi, singleQuote, trailingComma all, printWidth 100)
- `"lint"` script en package.json root + client + server
- **Archivos:** 3 nuevos
- **Esfuerzo:** ~2h

### F1-T2: CI/CD — GitHub Actions
**Archivo nuevo:** `.github/workflows/ci.yml`
- Trigger: push/PR a main
- Jobs: lint → typecheck → test (client + server)
- Estrategia: matrix node 22.14+, pnpm cache
- Docker compose up para tests de integración
- **Esfuerzo:** ~2h

### F1-T3: `catch (err: any)` → `catch (err: unknown)`
- 72 `catch (err: any)` — todos pasan a `unknown` con narrowing (`instanceof Error`)
- Patrón:
  ```ts
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
  ```
- Archivos: 30+ en client + server
- **Esfuerzo:** ~4h (tedioso pero mecánico)

### F1-T4: Sitemap dinámico completo
- Endpoint `GET /api/sitemap.xml` actual incluye solo productos
- Add: recipes, bundles, barista profiles, gallery, achievements, gift cards
- **Archivos:** `server/src/routes/sitemap.ts`
- **Esfuerzo:** ~2h

---

## Fase 2 — UX y accesibilidad (3-5h c/u)

### F2-T1: Loading states → skeletons
- Pages con spinner/nada: `ProductDetail`, `RecipeDetail`, `Recipes`, `Profile`, `profile/Orders`, `profile/OrderDetail`, `profile/Subscription`, `profile/PaymentMethod`, `profile/Wishlist`, `profile/SubscriptionBilling`, `profile/GiftCards`, `Leaderboard`, `Gallery`
- Crear `PageSkeleton` reusable (variants: card, list, detail)
- **Archivos:** 13+ en `client/src/pages/`
- **Esfuerzo:** ~3h

### F2-T2: Accesibilidad — skip-to-content + focus trapping
- Skip-to-content link en `App.tsx` (primer elemento focusable)
- `FocusTrap` en `ConfirmDialog.tsx` y `AdminModal.tsx` (reutilizar patrón de `CartDrawer.tsx`)
- `<label htmlFor>` en formularios (todos los inputs en login, register, checkout, admin forms)
- **Archivos:** `App.tsx`, `ConfirmDialog.tsx`, `AdminModal.tsx`, ~10 form pages
- **Esfuerzo:** ~3h

### F2-T3: Error monitoring — Sentry
- `npm install @sentry/react @sentry/node @sentry/profiling-node`
- `Sentry.init()` en `client/src/main.tsx` + `server/src/index.ts`
- Wrapper `withSentry` en rutas críticas (webhook, payments, orders)
- Source maps upload en build script
- **Archivos:** `main.tsx`, `index.ts`, `vite.config.ts`, `package.json`
- **Esfuerzo:** ~3h

---

## Fase 3 — Docs y DX (1-2h c/u)

### F3-T1: README root
```md
# 12% Café
Monorepo: React 19 + Node/Express + Prisma + Stripe

## Setup
pnpm install
pnpm setup    # copia .env, corre migraciones, seed
pnpm dev      # client:5173 + server:3001

## Test
pnpm --filter client test
pnpm --filter server test

## Build
pnpm build
```
- **Esfuerzo:** ~1h

### F3-T2: Husky + lint-staged
- `npx husky init`
- `.husky/pre-commit`: `npx lint-staged`
- `lint-staged.config.js`: `*.{ts,tsx}` → `eslint --fix`, `*.{ts,tsx,json,css,md}` → `prettier --write`
- **Esfuerzo:** ~1h

### F3-T3: OpenAPI / Swagger (opcional)
- Endpoint `GET /api/docs` con swagger-ui-express
- Anotaciones JSDoc en rutas o `openapi.ts` manual
- **Esfuerzo:** ~5h (baja prioridad, solo si hay consumidores externos)

---

## Recomendación de orden

```
Semana 1:  F0-T1 (Typography) + F1-T1 (ESLint/Prettier) + F0-T3 (scripts)
Semana 2:  F1-T2 (CI/CD) + F0-T2 (Docker secrets)
Semana 3:  F1-T3 (catch unknown) — pesado pero seguro
Semana 4:  F2-T1 (skeletons) + F3-T1 (README)
Semana 5:  F2-T2 (a11y) + F1-T4 (sitemap)
Semana 6:  F3-T2 (husky) + F2-T3 (Sentry)
Semana X:  F3-T3 (Swagger) — si necesario
```

**Nota:** F0-T1 (Typography) puede ejecutarse inmediatamente — está especificado en `specs/004-typography-standardization/plan.md`, son cambios mecánicos sin riesgo de regresión.

---

## Archivos a monitorear

| Ruta | Riesgo | Razón |
|------|--------|-------|
| `client/src/components/Navbar.tsx` | Bajo | Cambio de clase CSS |
| `client/src/components/Footer.tsx` | Bajo | Cambio de clase CSS |
| `client/src/admin/AdminLayout.tsx` | Bajo | Cambio de clase CSS |
| `client/Dockerfile` | Medio | Build arg cambia — verificar que docker build recibe el arg |
| `railway.Dockerfile` | Medio | Build arg cambia — Railway debe pasar variable |
| `.github/workflows/ci.yml` | Bajo | Sin merge block configurado — solo notifica |
| `client/src/pages/Checkout.tsx` | Alto | F2-T2 htmlFor — muchos inputs, no romper función |
| `server/src/routes/webhook.ts` | Alto | F2-T3 Sentry — no afectar manejo de eventos Stripe |
