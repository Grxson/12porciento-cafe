# 12% Brew — Análisis de refactor integral + eliminación de Recetas legacy

> Entregable Fase 1 del plan (`plan.md`, secc. 2 — auditoría obligatoria). Documenta el estado del código ANTES de tocar nada. Fecha: 2026-08-28. Cambios de implementación (conclusiones) no aplicados aún — este documento es la base.

## 1. Estado del sistema (qué existe ya)

### Backend — un solo modelo, dos caras

`server/prisma/schema.prisma` — **no hay duplicación de tablas de recetas**. Un único `Recipe` (línea 282) sirve a los dos módulos:

- **Legacy**: `method: String`, `RecipeStep` (title/description/duration/image/video), `RecipeIngredient`, `RecipeEquipment`, `RecipeRating` (682), `RecipeFavorite` (342), `BrewLog[]` (gamificación barista).
- **12% Brew** (extensiones aditivas de la migración `12_percent_brew`): `brewMethodId`→`BrewMethod`, `coffeeDoseGrams`, `waterGrams`, `waterTemperatureCelsius`, `grindTargetMicrons`, `profile` (`BrewRecipeProfile`), `recipeType` (`BrewRecipeType`, default `OFFICIAL_12_PERCENT`), `featured`, `official`, `parentRecipeId`/`variants` (variantes). `RecipeStep` extendido: `type`, `startTimeSeconds`, `waterAmountGrams`, `targetTotalWaterGrams`, `action`, `pourPattern`, `flowRateGramsPerSecond`, `temperatureCelsius`, `instruction`, `optional`.

Índices brew ya en `Recipe`: `brewMethodId`, `profile`, `recipeType`, `official`, `featured`, `parentRecipeId`.

Modelos brew propios: `BrewMethod`, `BrewSession` (snapshot con `recipeSnapshot`, `equipmentSnapshot`, rating/result/brewTimeSeconds), `BrewSessionFavorite`, `WaterProfile` (API lista, UI pospuesta).

### Backend — rutas

| Mount | Archivo | Contenido |
|---|---|---|
| `/api/recipes` | `server/src/routes/recipes.ts` | Legacy: list/detail/`by-slug`/`related`, CRUD admin (incluye whitelist de campos estructurados brew), steps/ingredients/equipment CRUD + reorder. |
| `/api/recipe-ratings` | `routes/recipe-ratings.ts` | Ratings legacy. |
| `/api/recipe-favorites` | `routes/recipe-favorites.ts` | Favoritos legacy. |
| `/api/brew` | `routes/brew.ts` | `GET /methods`, `/methods/:slug`, `/recipes` (paginado, filtros method/profile/difficulty/search/featured, `_count.steps`), `/recipes/:slug`, `/coffees/:slug/recipes` (QR-ready), `POST /recipes/:id/scale` (RecipeEngine), `POST /recipes/:id/dial-in` (DialInEngine); user: `POST/GET/PUT/DELETE /sessions`, `/sessions/:id/complete`, `/sessions/:id/favorite`, equipment (`GET/POST/PUT/DELETE /equipment`, envuelve `BaristaEquipment`), water-profiles. |
| `/api/brew/admin` | `routes/admin/brew.ts` | **Solo `BrewMethod` CRUD** (requireAuth + adminLimiter + AdminLog). Recetas brew se editan por whitelist en `/api/recipes/admin` — sin UI. |

Motores: `server/src/lib/recipe-engine.ts` (scaling determinista, `recipeToBrewRecipe`, `validateRecipeConsistency`) y `dial-in-engine.ts` (recomendación una-variable), ambos puros con tests.

Seeds idempotentes: `server/prisma/seed-12-brew.ts` — 8 métodos + 6 recetas oficiales (12% Sweet/Balance/Bright, Moka, V60 Iced, AeroPress). Ya aplicado a prod.

### Frontend — páginas 12% Brew

Layout `/brew` (`App.tsx` 398–487) con 13 rutas hijas y **7 tabs** en `BrewLayout.tsx` (`SUB_ITEMS`): Inicio, Preparar, Recetas, Mis preparaciones, Dial-in, Cafés, Mi equipo.

- `BrewHome.tsx` (418 líneas): hero + CTA "Preparar café" + "Explorar recetas", continuar última sesión, grid de 12 métodos, 6 recetas destacadas, últimas 3 preparaciones (solo autenticado). Estados loading/error/empty propios.
- `BrewRecipes.tsx`: búsqueda + filtros chips (método/perfil/dificultad) + 24 items + contador total.
- `BrewPrepare.tsx`: 3 modos — picker (métodos + 12 recetas), `?recipe=` (detalle + RatioCalculator + "Iniciar preparación"), `?session=` (carga sesión y renderiza `GuidedBrew`). Requiere login para iniciar (redirect `/login?redirect=...`).
- `BrewRecipeDetail.tsx`: header, hero, 3 ParamCards, quick stats, **`RatioCalculator` inline (scaling client-side, NO pasa por el RecipeEngine del server)**, lista de pasos, CTA preparar (resto del archivo no auditado línea a línea, ver pendientes).
- `BrewSessions.tsx` / `BrewSessionDetail.tsx` (historial + variantes dial-in, favorito sesión), `BrewComparison.tsx` (deep-link `/brew/comparar?ids=`), `BrewDialIn.tsx`, `BrewCoffees.tsx`/`BrewCoffee.tsx` (catálogo cafés + recetas por café, QR-ready), `BrewEquipment.tsx`.
- `GuidedBrew.tsx` (636 líneas, `components/brew/`): full-screen, timer por **timestamps** (250 ms tick, sin drift), draft en `sessionStorage` con TTL 7 días, progreso por pasos con Atrás/Siguiente, agua escalada por paso + barra acumulada, parámetros editables inline (café/agua/ratio/molienda), fin con rating 1–5 + `BrewSessionResult` + notas. **Sin Wake Lock, sin auto-avance al terminar duración, sin guía visual de vertido**.
- `RatioCalculator.tsx` (`components/brew/`): escalado client-side.

### Frontend — capa legacy Recetas (a eliminar/redirigir)

- Rutas: `/recetas` → `Recipes.tsx` (lazy `RecipeLiveMode`, filtros por método, badge premium), `/recetas/:slug` → `RecipeDetail.tsx` (usa `recipesApi`, caché IndexedDB `getCachedResponse`, `RecipeLiveMode`, `AttemptsList`, `StepVideoPlayer`, `MethodIcon`).
- Componentes `client/src/components/recipes/*`: `RecipeLiveMode.tsx` (~880 líneas, Guided Brew legacy), `StepVideoPlayer`, `MethodIcon`, `AttemptsList`.
- `BrewingGuideModal.tsx` (usado en `ProductDetail` tab "Recetas") importa `recipes/StepVideoPlayer` y `recipesApi`.
- Hooks/contexto: `useRecipes.ts` + `RecipesContext.tsx` (estado global legacy, CRUD), tests `__tests__/useRecipes.test.ts`.
- API client `recipesApi` en `client/src/api`.
- `ProductDetail.tsx`: tab "Recetas" (líneas 109, 224, 826, 1051) lista recetas del producto vía `recipesApi` + abre `BrewingGuideModal`.

### Navegación (coexistencia → conflicto)

- `Navbar.tsx`: `primaryLinks` = Tienda · **12% Brew** · **Recetas** · Suscripciones · Nosotros (duplicación visible). `allLinks` (drawer móvil) = Tienda · Paquetes · **Recetas** · Galería · Ranking/Feed/Logros (gated) · Suscripciones · Nosotros · Quiz — **`/brew` NO está en el drawer móvil**.
- `BottomNav.tsx:18`: 5 tabs — Tienda · 12% Brew · Carrito · **Recetas** · Perfil (`/recetas` roba slot a contenido brew).
- `Footer.tsx:57`: enlace "Recetas de preparación" → `/recetas`.
- `App.tsx:139-150` `FOOTER_ROUTES` incluye `/recetas`.

### PWA / caché

- `client/src/sw.ts`: SWR lista `/api/recipes*` + CacheFirst detalle (`recipes-cache`, 50 entries / 7 días según docs). `useCacheStats.ts` lista `'recipes-cache'`. **Brew API sin caché offline** — tras el refactor la caché debe apuntar a `/api/brew/*`.

## 2. Problemas identificados

### UX / IA (secc. 5–6 del plan)
1. **Recetas legacy compite** con 12% Brew en Navbar, BottomNav, Footer y rutas — dos "recetas" distintas en el mismo menú.
2. **7 tabs en BrewLayout**: Inicio, Preparar, Recetas, Mis preparaciones, Dial-in, Cafés, Mi equipo compiten entre sí; sin jerarquía clara. El plan pide 4 primarios (Preparar / Explorar / Historial / Mi equipo).
3. **Home no prioriza preparar**: hero empuja a `/brew/preparar` pero sin estado "tu próximo café", sin atajo "¿qué tengo?", sin últimos brews con rating al frente. Ya tiene continue/métodos/destacadas/recientes.
4. **`/recetas` móvil**: BottomNav muestra Recetas legacy y 12% Brew como tabs separados; el drawer móvil omite `/brew` por completo.
5. Escalado: `RatioCalculator` recalcula en cliente con su propia fórmula; `RecipeEngine` server (con `validateRecipeConsistency`) queda sin usar en el flujo principal — **dos fuentes de verdad** (secc. 9 del plan).
6. Guided Brew sin Wake Lock (pantalla puede dormirse en vertido), sin auto-avance de pasos con duración, sin guía de vertido visual.
7. Sin Repeat Brew desde historial (repetir con parámetros usados) ni favoritos de receta en Explorar.
8. Dial-in existe como ruta propia + variantes en SessionDetail, pero no está "en contexto" tras un resultado de sesión en el flujo de Guided Brew.
9. Deep link cafés: `BrewCoffee` existe (`/brew/cafes/:slug`) pero la ficha de producto (`ProductDetail`) sigue usando `BrewingGuideModal` legacy.

### Frontend
- Duplicación de páginas/componentes: legacy (Recipes/RecipeDetail/RecipeLiveMode/RecipesContext/useRecipes/recipesApi) vs brew (BrewRecipes/BrewRecipeDetail/GuidedBrew/brewApi).
- `sw.ts` cachea la API legacy; `useCacheStats` muestra caché como si fuera la única recetas.
- Favoritos de receta (`RecipeFavorite`, `/api/recipe-favorites`) no expuestos en UI brew.

### Backend
- `/api/recipes` legacy y `/api/brew/recipes` leen el mismo modelo con proyecciones distintas — el legacy expone recetas brew (recipeType OFFICIAL) con forma legacy; riesgo de inconsistencia hasta eliminar el legacy.
- `/api/recipe-ratings` y `/api/recipe-favorites` legacy viven solo para la UI a eliminar.
- Admin: `BrewMethods.tsx` (nuevo, CRUD métodos) y `Recipes.tsx` (legacy, CRUD recetas **sin campos brew en UI**) — no hay editor UI para profile/featured/brewMethod/pasos estructurados (secc. admin del plan).

### Arquitectura
- Un solo modelo = OK; la duplicación está en **UI + rutas API + caché PWA**, no en datos.
- `RecipeLiveMode` (~880 líneas) mantiene viva toda la cadena legacy; eliminarlo desactiva components/recipes/*, /recetas, RecipesContext, useRecipes, recipe-ratings/favorites API.

## 3. Código reutilizable (preservar, no reescribir)

- Motores puros server: `recipe-engine.ts`, `dial-in-engine.ts` + tests.
- `brewApi` (`packages/shared/src/api/brew.ts`): endpoints completos, listos.
- Tipos compartidos `types/brew.ts` (BrewMethod, BrewRecipeStructured, BrewSession, ScaledRecipe, DialInRecommendation, WaterProfile).
- `units.ts`: `calculateWater`, `calculateCoffee`, `formatRatio`, `formatGrams`, `formatSecondsPadded`.
- `GuidedBrew.tsx`: timer de timestamps + draft TTL 7 días + finish form con `BrewSessionResult` (extender, no reescribir).
- `BrewHome` (estructura de secciones), `BrewRecipes` (búsqueda + filtros), `BrewPrepare` (3 modos), `BrewCoffee` (recetas por café, QR), `BrewSessionDetail` (historial + variantes dial-in).
- Admin patrón `BrewMethods.tsx` (FormField/AdminModal/ConfirmDialog/Pagination/AdminErrorState) — plantilla para el editor de recetas brew.
- UI kit: `MediaFrame`, `EmptyState`, `ErrorState`, `PageSkeleton`, tokens Tailwind.

## 4. Legacy a eliminar/redirigir

| Elemento | Acción |
|---|---|
| Rutas `/recetas`, `/recetas/:slug` | Redirigir → `/brew/recetas`, `/brew/recetas/:slug` (tras fase navegación+IA) |
| `Recipes.tsx`, `RecipeDetail.tsx` | Eliminar (contenido cubierto por BrewRecipes/BrewRecipeDetail) |
| `components/recipes/*` (`RecipeLiveMode`, `StepVideoPlayer`, `MethodIcon`, `AttemptsList`) | Eliminar; GuidedBrew lo sustituye. `StepVideoPlayer` → evaluar mover a brew si ProductDetail lo requiere |
| `RecipesContext.tsx`, `useRecipes.ts` + test | Eliminar tras migrar dependencias |
| `BrewingGuideModal.tsx` | Sustituir por link al módulo brew (deep link `/brew/cafes/:slug` o modal brew) |
| `ProductDetail` tab "Recetas" | Repuntar a `/brew/recetas?method=…` o `BrewCoffee` |
| `sw.ts` caché `/api/recipes*` | Migrar a `/api/brew/*` (aplicar tras redirección) |
| `/api/recipe-ratings`, `/api/recipe-favorites` (server) | Mantener montadas hasta eliminar UI legacy; evaluar remoción final |
| `/api/recipes` admin steps/ingredients/equipment | Conservar mientras no exista editor brew; consolidar después |

**NO tocar**: `/api/barista/*`, `BrewLog`, Achievement, Reward (gamificación barista es otro dominio, el plan no lo migra).

## 5. Mapa plan → archivos (dónde cae cada cambio)

- **IA/nav (4 tabs) + eliminar Recetas**: `BrewLayout.tsx`, `Navbar.tsx` (+ movil `allLinks`), `BottomNav.tsx`, `Footer.tsx`, `App.tsx` (FOOTER_ROUTES + redirects).
- **Home prioriza preparar**: `BrewHome.tsx` (estado usuario: último café + métodos con recuento de recetas + continuar sesión).
- **Cards/Explorar**: `BrewRecipes.tsx` (+ favoritos de receta → `RecipeFavorite` vía `/api/recipe-favorites` o endpoint brew).
- **Single source scaling**: `BrewRecipeDetail.tsx` + `RatioCalculator.tsx` → usar `POST /api/brew/recipes/:id/scale` (RecipeEngine); `RatioCalculator` puede quedar como presentador del resultado escalado.
- **Guided Brew mejoras**: `GuidedBrew.tsx` (+ Wake Lock util, auto-avance, guía vertido).
- **Repeat Brew / feedback**: `BrewSessionDetail.tsx`, `BrewSessions.tsx` (botón repetir → `BrewPrepare?recipe=&session=`).
- **Dial-in en contexto**: `GuidedBrew` finish → sugerencia `DialInEngine` + `BrewDialIn.tsx`.
- **Deep link cafés**: `ProductDetail.tsx` (tab Recetas → `/brew/cafes/:slug`), `BrewCoffee.tsx`.
- **Estados/empty/responsive/a11y/SEO**: páginas brew + `Helmet` (BrewLayout o por página — hoy el título es global en `PublicLayout`).
- **Admin editor de recetas brew**: `apps/admin/src/admin/` (nuevo módulo o extensión de `Recipes.tsx` con profile/featured/brewMethod/steps estructurados; API whitelist ya lista en `recipes.ts` admin).
- **PWA**: `client/src/sw.ts`.

## 6. Pendientes de verificación durante la implementación (no bloquean el análisis)

- Líneas 161–243 de `BrewRecipeDetail.tsx` (CTA preparar + detalle de pasos) — leer al editar.
- `BrewSessions.tsx`/`BrewSessionDetail.tsx`/`BrewDialIn.tsx`/`BrewEquipment.tsx`/`BrewComparison.tsx` — lectura línea a línea al tocar cada tema.
- `client/src/api` (recipesApi, api index) — lista exacta de métodos legacy a retirar.
- `sw.ts` y `useCacheStats` — plan exacto de migración de caché.
- Alcance exacto de `/api/recipes` legacy list (si expone recetas brew con shape legacy) al consolidar.

## 7. Hoja de ruta sugerida (fases pequeñas, 1–2 archivos por paso)

1. Navegación: quitar Recetas de Navbar/BottomNav/Footer + redirects `/recetas*`→`/brew/recetas*` + `/brew` en drawer móvil.
2. IA BrewLayout: 4 tabs (Preparar / Explorar / Historial / Mi equipo), subrutas mapeadas.
3. Home: priorizar preparar + estado usuario.
4. Explorar: favoritos receta + polish cards.
5. Scaling único: RecipeEngine en detalle + RatioCalculator como presentador.
6. Guided Brew: Wake Lock + auto-avance + guía vertido.
7. Historial: Repeat Brew + feedback/dial-in en contexto.
8. Cafés/equipo: deep links + polish.
9. Estados/empty/loading/error consistentes + responsive 320–430 + a11y + SEO por página.
10. Admin editor de recetas brew.
11. Eliminar legacy UI + migrar caché PWA + limpiar hook/contexto/API client legacy.
12. Tests + Definition of Done (`plan.md` secc. 52) + reporte `docs/12-percent-brew-refactor-report.md` (secc. 54).

## 8. Fuera de alcance (no sobreingeniería)

Sin IA, sin búsqueda BT, sin comunidad/retos, sin event sourcing, sin migración de SSR, sin WaterProfile UI (queda API), sin cambios a gamificación barista (`/api/barista`, BrewLog).