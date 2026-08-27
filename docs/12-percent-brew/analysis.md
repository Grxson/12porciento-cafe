# 12% Brew — análisis del repositorio (FASE 0)

> Documento original de la fase de descubrimiento. La arquitectura final, decisiones y migración a Fase 2 viven en `architecture.md` y `implementation-report.md`.

## TL;DR

12% Café es un monorepo pnpm con tres frontends, un backend Express + Prisma y tres paquetes compartidos. Ya existía una capa considerable de barismo y recetas (`Recipe`, `RecipeStep`, `BrewLog`, `BaristaEquipment`, `RecipeLiveMode.tsx` con 880 líneas — un Guided Brew ya funcional). Faltaba construir alrededor: métodos administrables, sesiones persistentes snapshot-preserving, motor determinista de escalado, motor determinista de dial-in, integración con catálogo de cafés, comparación de sesiones, y un módulo frontend dedicado (`/brew/*`).

## Tablas existentes relacionadas

- `Product` (con campos SCA, origen, tueste, ratio, molienda) → reusada como `Coffee` filtrando `category = 'CAFÉ'`.
- `Recipe` con `RecipeStep`, `RecipeIngredient`, `RecipeEquipment` → **extendida aditivamente** sin romper UI existente.
- `BrewLog` (gamificación) → preservada tal cual; `BrewSession` es nueva entidad paralela.
- `BaristaEquipment` (categorías GRINDER/KETTLE/DRIPPER/SCALE/OTHER) → reusada como base para `UserEquipment` del módulo Brew.

## Decisiones de arquitectura

1. **No romper**: extensiones aditivas en `Recipe` y `RecipeStep` con campos nullable / defaults seguros.
2. **RecipeEngine + DialInEngine server-side** como funciones puras testeables — sin lógica de UI.
3. **`BrewSession` snapshot inmutable** para preservar historia aunque la receta original cambie.
4. **Reutilizar `RecipeLiveMode.tsx`** envolviendo, NO reescribir — patrón timer/draft ya era bueno.
5. **Prefijo `/api/brew/*`** consistente con `/api/barista/*`.
6. **Mobile-first**: guided brew con botones grandes, timer central, editor inline de parámetros.
7. **Tema, copy y layout existentes** preservados — 12% Brew se siente parte de 12% Café.

## Componentes reutilizados

`PublicLayout`, `MediaFrame`, `EmptyState`, `PageHeader`, `baristaApi`, `useRecipeDraft`, `useBrewQueue`, `useRecipes`, `useUser`, `useToast`, `axios` con interceptor admin/user, componentes admin (`AdminModal`, `ConfirmDialog`, `FormField`, `AdminSkeleton`, `AdminErrorState`, `Pagination`, `ToastContainer`), paquete `@12porciento/ui`, tokens Tailwind (`coffee-*`, `gold-*`, `cream`, `ember-*`).

## Fases de implementación (resumen)

0. Análisis (este documento).
1. Schema + migración (`BrewMethod`, `BrewSession`, `BrewSessionFavorite`, `WaterProfile`; extiende `Recipe`/`RecipeStep`; +8 enums).
2. `RecipeEngine` + `DialInEngine` + `units` + tests deterministas.
3. `/api/brew/*` (público + user) + `/api/brew/admin/*` (admin BrewMethods) + mount en `index.ts` + whitelist de campos estructurados en `/api/recipes/admin`.
4. Frontend scaffold: tipos, `brewApi`, layout con subnav, home, páginas (Prepare, Recipes, RecipeDetail, Sessions, SessionDetail, DialIn, Coffees, Coffee, Equipment), entradas de nav.
5. `GuidedBrew` con timer de timestamps + draft `sessionStorage` + `BrewPrepare` mode-aware.
6. `BrewComparison` (deep-link `/brew/comparar?ids=`).
7. `WaterProfile` UI (pospuesto a Fase 2 — sólo API + tipos quedan listos).
8. `BrewDialIn` UI (incluye generador de variantes en `BrewSessionDetail`).
9. Admin: `BrewMethods` CRUD + nav entry.
10. Seeds idempotentes (`seed-12-brew.ts`) — 8 métodos + 6 recetas oficiales.
11. Tests API (supertest) + unit tests RecipeEngine/DialInEngine.
12. Documentación (`architecture.md` + `api.md` + `implementation-report.md`).

Ver `implementation-report.md` para el detalle de archivos modificados, criterios de aceptación y comandos.
