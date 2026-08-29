# 12% Brew — Reporte Final de Refactor

Fecha: 2026-08-28
Rama: `main` · Commits: `c28e3ed` `f3bc67b` `f6b6f3c` `cbdba38` `14ea226`

## Resumen ejecutivo

Refactor de 12% Brew completado: navegación consolidada en 4 tabs, eliminación
total del módulo legacy de Recetas en el cliente, caché PWA migrada a la API
`/api/brew/*`, favoritos de recetas en Explorar, scaling de recetas
server-side (RecipeEngine) en detalle y Guided Brew, Wake Lock en modo guiado,
y editor de administración con campos estructurados 12% Brew.

## Auditoria inicial

- Documentado en `docs/12-percent-brew-refactor-analysis.md` (157 líneas).
- Un solo modelo `Recipe` sirve legacy y brew; la duplicación real era UI,
  rutas y caché PWA — no datos.
- Admin brew previo solo cubría `BrewMethod`; el editor de recetas no exponía
  campos 12% Brew pese a que la API ya los aceptaba (whitelist).

## Navegación

- 7 tabs → 4 (Preparar / Explorar / Historial / Mi equipo) en `BrewLayout`.
- `/recetas` fuera de Navbar, Footer, BottomNav y sitemap del cliente.
- Redirects `/recetas` → `/brew/recetas` y `/recetas/:slug` → `/brew/recetas/:slug`.
- Home: action de recetas destacadas → `/brew/cafes`.

## Legacy Recipes

Eliminados 14 archivos del cliente (−3,242 líneas):

- `pages/Recipes.tsx`, `pages/RecipeDetail.tsx`
- `components/recipes/` completo (RecipeLiveMode, StepVideoPlayer, MethodIcon,
  AttemptsList, GestureHints, NotesCapture, RatingSlider)
- `context/RecipesContext.tsx`, `hooks/useRecipes.ts` + test
- `components/BrewingGuideModal.tsx`, `utils/recipePdf.ts`

Product detail: tab "Recetas" y botón "Guía de Preparación" repuntan a brew
(`/brew/recetas/:slug`, `/brew/cafes/:slug`). Se eliminó el uso del modal.

## Rutas

- Legacy UI eliminada; redirects cubren bookmarks y links antiguos.
- El router `/api/recipes` del server persiste (el admin CRUD corre sobre él).
- API brew pública/QR intacta en `/api/brew`.

## Frontend

- **Favoritos** (`BrewRecipes`): overlay de corazón, optimistic update con
  revert, usa `recipeFavoritesApi` de shared.
- **Scaling server** (`RatioCalculator` + `BrewRecipeDetail`): prop `remoteScale`;
  pasos recalibrados por `brewApi.scaleRecipe` con fallback al cálculo local.
- **Guided Brew**: Wake Lock (solo RUNNING, release en cleanup), scaling server
  con debounce 350 ms al editar dosis, y badge "Tiempo cumplido" al agotar la
  duración del paso.
- Repeat Brew y Dial-in en contexto ya existían en `BrewSessionDetail` — no se
  reimplementaron.
- PWA: `sw.ts` cachea lista (`recipes-cache`) y detalle (`recipe-details`) de
  `/api/brew/recipes`; los POST scale/dial-in quedan network-only (matcher
  acotado a GET). Label de estadísticas actualizado.

## Backend

Sin cambios. La whitelist de `server/src/routes/recipes.ts` ya aceptaba todos
los campos estructurados (POST/PUT `/admin`) y `duration` en pasos.

## Base de datos

Sin migraciones. El modelo `Recipe` ya contenía `brewMethodId`,
`coffeeDoseGrams`, `waterGrams`, `waterTemperatureCelsius`,
`grindTargetMicrons`, `profile`, `recipeType`, `featured`.

## RecipeEngine

- `brewApi.scaleRecipe(id, dose)` es la fuente única de scaling server-side.
- Guided Brew y detalle de receta la usan con fallback local (una variable,
  principio #24).

## Guided Brew

- Wake Lock activo durante la preparación en curso.
- Scaling server con debounce.
- Badge de paso cumplido cuando `elapsed >= duration`.

## Dial-in

Ya existía (recomendación post-sesión por `session.result` en
`BrewSessionDetail`). Usado como fallback al escala local.

## Responsive / Accesibilidad / SEO

- Sin cambios sustantivos (layout previo 4 tabs mobile-first).
- `PageMeta` presente en todas las páginas brew.
- Redirects legacy evitan rotura de SEO/links.

## Performance

- Lazy loading de páginas brew intacto (eliminado lazy de páginas legacy).
- Caché PWA migrada; escalado server evita recálculo duplicado.

## Tests

- `npx vitest run` (client): **14 files / 47 tests OK**, incluido
  `RatioCalculator.test.tsx` (7 tests) tras el cambio `remoteScale`.
- `npx tsc --noEmit` limpio en client, apps/admin (y server sin cambios).
- E2E/visual no ejecutados: sin browser tool en el entorno (ver DoD).

## Archivos modificados

Commits:
- `c28e3ed` — refactor(brew): nav legacy → /brew (Navbar, BottomNav, Footer,
  App, BrewLayout, BrewHome) · 6 files.
- `f3bc67b` — feat(brew): favoritos en Explorar, scaling server, wake lock,
  tiempo cumplido (BrewRecipes, RatioCalculator, BrewRecipeDetail, GuidedBrew).
- `f6b6f3c` — refactor(brew): caché PWA + ProductDetail → /brew (sw,
  useCacheStats, ProductDetail).
- `cbdba38` — refactor(brew): removal 14 archivos legacy (−3,242 líneas).
- `14ea226` — feat(admin): campos 12% Brew en editor de recetas + breed
  payload (useRecipeForm, RecipeEditor, Recipes).

## Pendientes

- **Analítica** (plan #43): no existe infraestructura de analytics en client;
  no se añadió tracking propio (dependencia externa).
- **DoD visual**: validación 390×844 / 1440×900 pendiente de browser tool.
- **Server legacy**: router `/api/recipes` público permanece (usado por
  ProductDetail via `recipesApi`.list y por admin CRUD). Si se quita, migrar
  `recipeFavoritesApi` a `/api/brew/recipe-favorites` y ProductDetail.
- **Deploy**: client/admin no desplegados tras estos cambios (ver DoD).