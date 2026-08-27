# 12% Brew — arquitectura

> Documento vivo. Última actualización: ver `docs/12-percent-brew/implementation-report.md`.

## Propósito

12% Brew es el módulo especializado de preparación de café de la plataforma 12% Café. Su objetivo:

> Ayudar al usuario a responder: **Tengo este café y este equipo. ¿Cómo puedo preparar una excelente taza?**

No es un recetario. Es una herramienta interactiva: descubre recetas, adapta cantidades, guía paso a paso, guarda preparaciones y aprende de cada resultado.

## Stack y capas

```
packages/shared/src/      Tipos + cliente axios + utilidades de unidades
  ├── types/brew.ts        BrewMethod, BrewRecipeStructured, BrewSession, ...
  ├── api/brew.ts          brewApi (métodos, recetas, sesiones, equipo, dial-in)
  └── utils/units.ts       formatGrams, formatSeconds, formatRatio, ...

server/src/
  ├── lib/recipe-engine.ts   scaleRecipe, calculateWater, validateRecipeConsistency
  ├── lib/dial-in-engine.ts  recommend() reglas deterministas
  ├── routes/brew.ts         Router /api/brew/* (público + user)
  └── routes/admin/brew.ts   Router /api/brew/admin/* (CRUD métodos)

client/src/
  ├── pages/Brew*.tsx        10 páginas (Home, Layout, Prepare, Recipes, ...)
  └── components/brew/
      ├── RatioCalculator.tsx
      └── GuidedBrew.tsx

prisma/schema.prisma     +BrewMethod, +BrewSession, +BrewSessionFavorite, +WaterProfile
                         +8 enums; extiende Recipe + RecipeStep con campos estructurados
prisma/migrations/...    20260826000000_add_12_percent_brew/migration.sql
prisma/seed-12-brew.ts   Seed idempotente (8 métodos + 6 recetas oficiales)

apps/admin/src/admin/BrewMethods.tsx  CRUD admin
```

## Entidades

### `BrewMethod`

Configuración administrable de un método de preparación. Slug único, categoría enum, dificultad, rangos por defecto (ratio, temperatura, molienda).

```prisma
model BrewMethod {
  id           String  @id @default(cuid())
  slug         String  @unique          // "v60", "aeropress", ...
  name         String                   // "V60", "AeroPress"
  category     BrewMethodCategory       // POUR_OVER | IMMERSION | ...
  difficulty   String  @default("MEDIA")
  defaultRatioMin      Float  @default(13)
  defaultRatioMax      Float  @default(18)
  defaultTemperatureMin Int   @default(88)
  defaultTemperatureMax Int   @default(96)
  active       Boolean @default(true)
  recipes      Recipe[]
  brewSessions BrewSession[]
}
```

### `BrewSession` (núcleo del módulo)

Una sesión = una preparación real del usuario. Es **inmutable** desde la perspectiva de la receta: cuando inicia una sesión se guarda `recipeSnapshot` (JSON) con todos los parámetros y pasos vigentes en ese momento. Cambios posteriores a la receta NO afectan sesiones antiguas.

```prisma
model BrewSession {
  id         String  @id @default(cuid())
  userId     String
  coffeeId   String?         // Product (CAFÉ)
  recipeId   String?         // Recipe
  brewMethodId String?

  // Snapshot inmutable
  recipeSnapshot    Json?     // copia congelada al iniciar

  // Parámetros reales usados
  coffeeDoseGrams   Float?
  waterGrams        Float?
  ratio             Float?    // water:coffee (15.0 = 1:15)
  temperatureCelsius Int?
  grindSetting      String?
  grindMicrons      Int?
  brewTimeSeconds   Int?
  equipmentSnapshot Json?

  // Feedback
  rating            Int?      // 1-5
  result            BrewSessionResult?
  sweetnessRating   Int?
  acidityRating     Int?
  bodyRating        Int?
  clarityRating     Int?
  notes             String?

  status      BrewSessionStatus  // IDLE | PREPARING | RUNNING | PAUSED | COMPLETED | CANCELLED
  startedAt   DateTime?
  completedAt DateTime?

  favorites BrewSessionFavorite[]
}
```

### Extensiones a `Recipe` y `RecipeStep`

`Recipe` ahora tiene campos estructurados nullable (no rompe recetas existentes):

| Campo | Tipo | Notas |
| --- | --- | --- |
| `brewMethodId` | FK | Relación con `BrewMethod` |
| `coffeeDoseGrams` | Float | Requerido para RecipeEngine |
| `waterGrams` | Float | |
| `waterTemperatureCelsius` | Int | |
| `grindTargetMicrons` | Int | Conversión grinder en fase 2 |
| `profile` | enum | BALANCED / SWEET / BRIGHT / FRUITY / FLORAL / FULL_BODY / CLEAN / INTENSE / REFRESHING / EXPERIMENTAL |
| `recipeType` | enum | OFFICIAL_12_PERCENT / CREATOR / BARISTA / COMPETITION / COMMUNITY / PERSONAL |
| `featured` | Boolean | Mostrar en Home |
| `official` | Boolean | Marca editorial |
| `parentRecipeId` | FK (self) | Variantes |

`RecipeStep` gana `type`, `waterAmountGrams`, `targetTotalWaterGrams`, `action`, `pourPattern`, `flowRateGramsPerSecond`, `temperatureCelsius`, `instruction`, `optional`.

### `WaterProfile`

Tabla opcional. Fase 2 la expone al usuario.

## RecipeEngine

Funciones puras sin DB. Vive en `server/src/lib/recipe-engine.ts`.

```ts
calculateWater(coffeeDoseGrams, ratio): number  // 20g × 1:15 → 300g
calculateCoffee(waterGrams, ratio): number       // 300g ÷ 15 → 20g
ratioFromCoffeeAndWater(coffee, water): number   // 300/20 → 15
roundStepWater(amount, precision?): number      // default 0.5g
scaleRecipe(original, newCoffeeDoseGrams): ScaledRecipe
scaleSteps(steps, scale, totalWater): BrewStep[]  // last step absorbs rounding delta
validateRecipeConsistency(recipe): ConsistencyError[]
```

**Algoritmo de scaling** (preserva proporciones, suma exacta):
1. `scale = newCoffeeDose / originalCoffeeDose`
2. `targetWater = newCoffeeDose × ratio`
3. Para cada paso con `waterAmountGrams`: `proyectado = round(amount × scale)`
4. El último paso con agua absorbe `targetWater - sum(proyectados)`. Garantiza `sum(stepWater) === targetWater` exacto.
5. `targetTotalWaterGrams` se recalcula desde cero.

Tests: `server/src/lib/__tests__/recipe-engine.test.ts`. Cubre el caso canónico del spec (`20→17g`, ratios no enteros, último paso absorbe delta).

## DialInEngine

Reglas deterministas sin IA. Vive en `server/src/lib/dial-in-engine.ts`.

```ts
recommend({ result, current? }): DialInRecommendation
```

| Resultado | Código | Cambio principal |
| --- | --- | --- |
| SOUR / UNDEREXTRACTED | `GRIND_FINER` | Muele ligeramente más fino |
| BITTER / OVEREXTRACTED | `GRIND_COARSER` | Muele ligeramente más grueso |
| WATERY | `STRENGTHEN_RATIO` | Refuerza el ratio (1:14–1:15) |
| STRONG | `WEAKEN_RATIO` | Sube el ratio (1:16–1:17) |
| ASTRINGENT | `COARSER_LESS_AGITATION` | Moler más grueso + menos agitación |
| BALANCED / GOOD / EXCELLENT | `HOLD` | Mantén los parámetros |

**Principio**: una sola variable principal por intento. Sugerencias adicionales son opcionales.

Tests: `server/src/lib/__tests__/dial-in-engine.test.ts`.

## Guided Brew

`client/src/components/brew/GuidedBrew.tsx` implementa la pantalla completa de preparación guiada:

- Modo `PREPARING` → `RUNNING` → `PAUSED` → `COMPLETED` (modelo de estado explícito; sin booleanos como `isRunning` / `isPaused`)
- Timer basado en `Date.now()` timestamps, no `setInterval` puro, sin drift acumulado
- Draft persistente en `sessionStorage` keyed por session id — sobrevive refresh
- Editor inline de parámetros (cafe/agua/ratio/molienda) con `RecipeEngine.calculateWater` para coherencia
- Paso actual muestra: agua a verter, total acumulado, barra de progreso, timer del paso
- Botón finalizar abre formulario con rating + resultado chip + notas → `POST /brew/sessions/:id/complete`

`BrewPrepare.tsx` es mode-aware:
- Sin query → method picker + recetas sugeridas
- `?recipe=` → detalle + RatioCalculator + CTA "Iniciar preparación" que crea sesión
- `?session=` → renderiza `GuidedBrew` inline

## Comparación

`client/src/pages/BrewComparison.tsx` lee dos sesiones vía deep link `/brew/comparar?ids=id1,id2`. Resalta solo las filas cambiadas, muestra columna `Δ` con diferencias firmadas y panel "Cambios detectados".

## Permisos

| Endpoint | Auth | Notas |
| --- | --- | --- |
| `GET /brew/methods`, `/recipes`, `/coffees/:slug/recipes` | público | filtros + paginación |
| `GET /brew/recipes/:slug`, `POST /brew/recipes/:id/scale`, `POST /brew/recipes/:id/dial-in` | público | motores puros |
| `POST /brew/sessions`, `GET /brew/sessions`, `GET/PUT/DELETE /brew/sessions/:id` | `requireUserAuth` | ownership check por `userId` |
| `POST /brew/sessions/:id/complete`, `POST/DELETE /brew/sessions/:id/favorite` | `requireUserAuth` | ownership |
| `GET/POST/PUT/DELETE /brew/equipment` | `requireUserAuth` | ownership |
| `GET /brew/water-profiles` | público (officials) + user (own) | JWT parsing inline |
| `POST /brew/water-profiles`, `DELETE /brew/water-profiles/:id` | `requireUserAuth` | owner OR admin |
| `* /brew/admin/methods` | `requireAuth` + `adminLimiter` | AdminLog audit |

## QR-ready routes

- `/brew/cafes/:slug` — vista de un café con todas sus recetas. Adecuada para imprimir como QR en bolsas.
- `/brew/recetas/:slug` — detalle de receta con CTA "Preparar esta receta".

Ambas rutas son mobile-first y renderizan server-side-safe (lazy-loaded).

## Comandos

```bash
# Setup
pnpm setup                                        # install + prisma generate + migrate + seed

# Migración 12% Brew
pnpm --filter ./server exec prisma migrate deploy  # producción
pnpm --filter ./server exec prisma migrate dev --name add_12_percent_brew  # local

# Seeds
pnpm --filter ./server db:seed                    # seed completo (cafes + bundles + achievements)
npx tsx prisma/seed-12-brew.ts                    # solo 12% Brew (métodos + recetas oficiales)

# Tests
pnpm --filter ./server test                       # vitest (RecipeEngine + DialInEngine + brew routes)
pnpm test                                         # client + server
pnpm typecheck                                    # tsc ambos
pnpm lint                                         # eslint + prettier
pnpm build                                        # vite + tsc build
```

## Pendiente Fase 2

- Grinder Translator (clicks → µm por modelo)
- Water Profiles (UI completa + recomendaciones)
- Advanced Brew Comparison (gráficas de flow rate)
- QR physical printing + scan-from-bag
- Bluetooth scale integration (Web Bluetooth API)
- AI dial-in (`AIRecommendationProvider` interface ya está lista)
- Community recipes (creator profiles)
- Brew Assistant (chat con IA sobre el historial)
- Smart brew (gráfica tiempo × peso en tiempo real)
