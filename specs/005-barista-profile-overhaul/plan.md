# Plan: Barista Profile Overhaul

## Technical Context

### Stack

- Client: React 19, TypeScript, Tailwind, Shadcn/ui, Framer Motion, Recharts, Zustand
- Server: Express, Prisma (PostgreSQL + SQLite dev), Stripe
- PWA: Vite PWA plugin, Workbox, IndexedDB via idb-keyval
- New deps: `@tanstack/react-query`, `canvas-confetti`, `react-share`, `html2canvas`

### Architecture decisions

- **State**: TanStack Query reemplaza `useBarista` hook para caching automático
- **Animations**: Framer Motion para UI, canvas-confetti para celebraciones
- **Charts**: Recharts (ya instalado, usado en admin dashboard)
- **Real-time**: Socket.io (ya existe) para feed updates opcional
- **Offline**: Workbox cache first para profiles, IndexedDB para brew queue (existente)

### Prisma models to add

See `data-model.md` per phase — 4 migration files, one per phase.

---

## Fase 1 — Identidad Barista (Estimado: 3-4 sprints)

### Dependencias

- Perfil barista existente ✅
- Sistema de logros existente ✅

### Tasks

#### 1.1 Schema: barista customization fields

**Subagent**: `cavecrew-builder`
**Files**: `server/prisma/schema.prisma`
**Changes**:

```prisma
model BaristaProfile {
  // existing fields...
  bio            String?
  bannerUrl      String?
  activeTitleId  String?
  flavorProfile  Json?      // { favorites: string[], preferredOrigin: string, preferredRoast: string }
  equipmentIds   String[]   // IDs of equipment items
}

model BaristaTitle {
  id            String   @id @default(cuid())
  slug          String   @unique
  name          String
  description   String
  icon          String
  requirement   String   // achievement slug required to unlock
  createdAt     DateTime @default(now())
}

model BaristaEquipment {
  id            String   @id @default(cuid())
  userId        String
  name          String
  brand         String?
  category      String   // GRINDER, KETTLE, DRIPPER, SCALE, OTHER
  photoUrl      String?
  isFavorite    Boolean  @default(false)
  createdAt     DateTime @default(now())
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Verify**: `npx prisma db push` passes

#### 1.2 API: equipment CRUD + profile customization

**Files**: `server/src/routes/barista.ts` (+660 líneas)
**Subagent**: `cavecrew-builder` (2 rounds: primero profile update, luego equipment routes)
**Endpoints**:

```
PUT  /api/barista/me/profile    → update bio, bannerUrl, activeTitleId, flavorProfile
GET  /api/barista/me/equipment  → list equipment
POST /api/barista/me/equipment  → create equipment
PUT  /api/barista/me/equipment/:id → update
DEL  /api/barista/me/equipment/:id → delete
GET  /api/barista/titles        → list all titles with unlock status for current user
```

**Context7 research**: Express route patterns for nested user resources
**Verify**: `curl` test each endpoint

#### 1.3 Client: Bio + Banner + Avatar frame

**Files**:

- `client/src/pages/profile/Settings.tsx` — añadir bio + banner upload
- `client/src/pages/BaristaProfile.tsx` — mostrar bio, banner, avatar frame
- `client/src/components/RankBadge.tsx` — avatar frame variants by level

**Subagent**: `cavecrew-builder` (3 rounds)
**Design**:

- Banner upload: file input con preview, crop area 1200×400
- Bio: textarea con contador 0/280 en settings
- Avatar frame: CSS classes por nivel range, glow animado con framer-motion
- Banner fallback: gradiente CSS (coffee-900 a gold-500/20)

**Verify**: Visual check en browser, light/dark mode

#### 1.4 Client: Equipment showcase

**Files**:

- `client/src/pages/profile/Equipment.tsx` — nueva page (nested en /perfil/equipo)
- `client/src/pages/Profile.tsx` — añadir tab "Equipo"
- `client/src/components/EquipmentCard.tsx` — card component
- `client/src/components/EquipmentForm.tsx` — modal form

**Subagent**: `cavecrew-builder` (2 rounds: page + components)
**Design**:

- Grid 2 cols mobile, 4 cols desktop
- Card: icono de categoría + nombre + marca + foto
- Modal form: nombre, marca, categoría (select), foto upload, toggle favorito
- Equipment favorito con estrella gold

**Verify**: CRUD completo, favorito destaca

#### 1.5 Client: Flavor profile setup

**Files**:

- `client/src/pages/profile/FlavorProfile.tsx` — nueva page o sección en settings
- `client/src/components/FlavorSelector.tsx` — chip selector de flavors
- `client/src/components/FlavorRadarChart.tsx` — radar chart Recharts

**Subagent**: `cavecrew-builder` (2 rounds)
**Research**: Recharts RadarChart patterns (Context7 docs ya consultados)
**Flavors list**: chocolate, caramelo, frutos rojos, cítricos, florales, nueces, especias, tropical, vinoso, herbal
**Design**:

- Chips toggle para seleccionar flavors favoritos (máx 5)
- Select para origen preferido
- Toggle group para roast level
- Preview: radar chart live-update

**Verify**: Radar chart renderiza, datos persisten

#### 1.6 Client: Title system UI

**Files**:

- `client/src/pages/AchievementGallery.tsx` — añadir sección "Títulos"
- `client/src/components/TitleSelector.tsx` — modal de selección

**Subagent**: `cavecrew-builder`
**Design**:

- En achievement gallery, tab o sección "Títulos"
- Grid de titles: icono + nombre, badge "Desbloqueado" / "Bloqueado"
- Click en desbloqueado → modal preview con foto + nombre + título
- Botón "Usar título" → update API

**Verify**: Título se refleja en perfil + leaderboard

---

## Fase 2 — Social (Estimado: 3-4 sprints)

### Dependencias

- Fase 1 completa

### Tasks

#### 2.1 Schema: Follow + Like models

**Subagent**: `cavecrew-builder`
**File**: `server/prisma/schema.prisma`

```prisma
model Follow {
  id          String   @id @default(cuid())
  followerId  String
  followingId String
  createdAt   DateTime @default(now())
  follower    User     @relation("follower", fields: [followerId], references: [id], onDelete: Cascade)
  following   User     @relation("following", fields: [followingId], references: [id], onDelete: Cascade)
  @@unique([followerId, followingId])
  @@index([followerId])
  @@index([followingId])
}

model BrewLogLike {
  id        String   @id @default(cuid())
  brewLogId String
  userId    String
  createdAt DateTime @default(now())
  brewLog   BrewLog  @relation(fields: [brewLogId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([brewLogId, userId])
}
```

#### 2.2 API: Follow + Feed + Likes

**Subagent**: `cavecrew-builder` (3 rounds: follow, feed, likes)
**File**: `server/src/routes/barista.ts`
**Endpoints**:

```
POST   /api/barista/follow/:userId
DELETE /api/barista/follow/:userId
GET    /api/barista/followers/:userId?page=&limit=
GET    /api/barista/following/:userId?page=&limit=
GET    /api/barista/feed?page=&limit=   → brews de seguidos, ordenado por fecha DESC
POST   /api/barista/brews/:brewId/like
DELETE /api/barista/brews/:brewId/like
```

**Research**: Pagination best practices for social feed (Context7)

#### 2.3 Client: Follow button + profile counters

**Files**:

- `client/src/pages/BaristaProfile.tsx` — añadir follow button, follower/following count
- `client/src/components/FollowButton.tsx` — reusable component
- `client/src/api/barista.ts` — añadir follow/feed API methods

**Subagent**: `cavecrew-builder` (2 rounds: button + integration)
**Design**:

- Botón "Seguir" / "Siguiendo" con hover "Dejar de seguir"
- Animation: framer-motion scale + color transition
- Contadores clickeables → modal con lista de followers/following (lazy load)

**Verify**: Follow/unfollow flow, contadores actualizan

#### 2.4 Client: Social feed page

**File**: `client/src/pages/Feed.tsx` — nueva página
**Route**: `/feed` (requiere auth)
**Subagent**: `cavecrew-builder`
**Design**:

- Card feed: avatar + nombre + fecha | foto brew (grande) | rating + XP | receta + método | notas | likes + comentar
- Infinite scroll con IntersectionObserver
- Empty state: "Sigue a otros baristas para ver su actividad aquí"
- Skeletons durante carga

**Verify**: Feed poblado con brews de seguidos, scroll infinito funciona

#### 2.5 Client: Brew reactions (likes)

**Files**:

- `client/src/components/BrewLikeButton.tsx` — heart button with count
- `client/src/pages/BaristaProfile.tsx` — integrate en brew log cards
- `client/src/pages/Feed.tsx` — integrate en feed cards

**Subagent**: `cavecrew-builder`
**Design**:

- Heart icon outline → filled on like
- Framer Motion: scale 1→1.3→1 on click
- Count with optimistic update (increment before API response)
- Color: gray → red-500

**Verify**: Like persistente, count correcto, optimistic update

#### 2.6 Client: Share profile

**Files**:

- `client/src/pages/BaristaProfile.tsx` — share button
- `client/src/hooks/useShare.ts` — hook que detecta Web Share API vs fallback

**Subagent**: `cavecrew-builder`
**Design**:

- Botón compartir en header del perfil
- Mobile: navigator.share({ title, text, url })
- Desktop: copy link con tooltip "Link copiado"
- OG tags: react-helmet-async con title dinámico "Perfil de [name] · 12% Café", descripción "Nivel [level] · [totalBrews] brews"

**Verify**: Share en mobile, copy link en desktop, OG tags en Discord/WhatsApp preview

---

## Fase 3 — Analytics & Data Richness (Estimado: 4-5 sprints)

### Dependencias

- Fase 1 + 2 completa

### Tasks

#### 3.1 Schema: Brew log extended fields

**Subagent**: `cavecrew-builder`
**File**: `server/prisma/schema.prisma`

```prisma
model BrewLog {
  // existing fields...
  grindSize      String?   // "medio", "fino", "grueso"
  waterTemp      Int?      // celsius
  brewTime       Int?      // seconds
  coffeeWeight   Float?    // grams
  waterVolume    Float?    // ml
  beanId         String?   // FK → Product
  equipmentIds   String[]  // IDs de equipo usados
  tags           String[]  // ["pour-over", "weekend"]
  brewLogLikes   BrewLogLike[]
}
```

#### 3.2 API: Extended brew log + stats endpoints

**Subagent**: `cavecrew-builder` (2 rounds: submit + stats)
**File**: `server/src/routes/barista.ts`
**Changes**:

- POST /barista/brew-logs acepta nuevos campos opcionales
- GET /barista/:userId/stats mejorado:
  - Promedio por método
  - Evolución de rating por mes
  - Top cafés usados
  - Flavor word cloud (de notes)
  - Equipment usage frequency

#### 3.3 Client: Advanced brew log form

**Files**:

- `client/src/components/BrewLogForm.tsx` — añadir sección expandible "Parámetros"

**Subagent**: `cavecrew-builder`
**Design**:

- Botón "Añadir parámetros técnicos" → panel expandido
- Inputs: grind size (select: fino/medio-fino/medio/grueso), temp (range 80-100), time (number), coffee/water (number)
- Selector de café: dropdown de productos comprados (de orders del user)
- Selector de equipo: multi-select de equipment guardado
- Tags: input de chips libre
- Todo opcional, por defecto colapsado

**Verify**: Brew log con parámetros, datos en DB

#### 3.4 Client: Taste profile / Radar chart

**File**: `client/src/components/FlavorRadarChart.tsx` (mejorar existente)
**Subagent**: `cavecrew-builder`
**Research**: Recharts RadarChart patterns (Context7 docs ya consultados)
**Design**:

- 6 dimensiones: Acidez, Cuerpo, Dulzor, Amargor, Sabor, Aroma
- Datos computados de brews del usuario
- Línea de "tú" vs "promedio comunidad"
- Tooltip custom con colores café

**Verify**: Radar chart funcional con datos reales

#### 3.5 Client: Personal records dashboard

**File**: `client/src/components/BaristaRecords.tsx` — nuevo componente
**Subagent**: `cavecrew-builder` (2 rounds: component + wire-up)
**Design**:

- Grid de records: cada uno con icono + valor + label + fecha
- "Mejor Rating: 9.5 · V60 · 15 Mar 2026"
- "Racha más larga: 12 días"
- New record highlight: glow animation + confetti burst (canvas-confetti)

**Verify**: Records computados correctamente

#### 3.6 Client: Monthly wrap

**Files**:

- `client/src/components/MonthlyWrap.tsx` — modal con stats del mes
- `client/src/hooks/useMonthlyWrap.ts` — fetch + generate image

**Subagent**: `cavecrew-builder` (+ agent para html2canvas)
**Research**: `html2canvas` + react patterns
**Design**:

- Modal fullscreen con slides animados (framer-motion AnimatePresence mode="wait")
- Slide 1: "Tu resumen de [Mes]" — nombre + nivel
- Slide 2: Stats numéricos (brews, XP, level ups, logros)
- Slide 3: Método top + café favorito
- Slide 4: Rating promedio trend
- Botón "Compartir" → html2canvas → save/share image
- Trigger: check al login si es nuevo mes, toast "Tu resumen de [mes] está listo"

**Verify**: Wrap completo, imagen generada, compartible

#### 3.7 Client: Bean tracker

**File**: `client/src/pages/profile/CoffeeTracker.tsx` — nueva página
**Subagent**: `cavecrew-builder`
**Design**:

- Grid de cafés que has linkeado en brew logs
- Card: foto producto + nombre + count brews + total XP
- Click → filtro de brews con ese café
- Empty state: "Linkea un café a tu brew para empezar a trackear"

**Verify**: Grid poblado, filtro funcional

---

## Fase 4 — Commerce & Gamification (Estimado: 3-4 sprints)

### Dependencias

- Fase 3 completa (bean tracking)
- Sistema de promocodes existente

### Tasks

#### 4.1 Schema: Reward + RewardClaim

**Subagent**: `cavecrew-builder`
**File**: `server/prisma/schema.prisma`

```prisma
model Reward {
  id            String   @id @default(cuid())
  name          String
  description   String
  icon          String
  xpCost        Int
  discountPct   Int?
  rewardType    String   // DISCOUNT, FREE_SHIPPING, FREE_PRODUCT, SUBSCRIPTION_DISCOUNT
  productId     String?  // FK → Product (for FREE_PRODUCT type)
  maxClaims     Int?
  claimCount    Int      @default(0)
  isActive      Boolean  @default(true)
  expiresAt     DateTime?
  createdAt     DateTime @default(now())
}

model RewardClaim {
  id          String   @id @default(cuid())
  userId      String
  rewardId    String
  code        String   @unique  // generated discount code
  claimedAt   DateTime @default(now())
  usedAt      DateTime?
  expiresAt   DateTime?
  reward      Reward   @relation(fields: [rewardId], references: [id])
  user        User     @relation(fields: [userId], references: [id])
  @@index([userId])
}
```

#### 4.2 API: Rewards CRUD + Claim flow

**Subagent**: `cavecrew-builder` (2 rounds: admin CRUD + user claims)
**File**: `server/src/routes/barista.ts`
**Endpoints** admin:

```
GET    /api/admin/rewards
POST   /api/admin/rewards
PUT    /api/admin/rewards/:id
DELETE /api/admin/rewards/:id
```

**Endpoints** user:

```
GET    /api/barista/rewards         → list available rewards + user claim status
POST   /api/barista/rewards/:id/claim → claim reward, generate code, deduct XP
GET    /api/barista/rewards/claims  → user's claim history
```

**Verify**: XP deduction, code generation, claim limits

#### 4.3 Client: Reward shop

**Files**:

- `client/src/pages/RewardShop.tsx` — nueva página `/canjear`
- `client/src/components/RewardCard.tsx` — card component
- `client/src/components/ClaimConfirmModal.tsx` — confirm dialog

**Subagent**: `cavecrew-builder` (2 rounds: page + components)
**Design**:

- Header: "Tienes X XP disponibles" con barra de progreso al siguiente reward
- Grid de rewards: icono + nombre + XP cost + descripción + botón "Canjear"
- Modal confirm: "¿Canjear 500 XP por envío gratis?" con balance actual
- Claim success: code generado + confetti + "Usar en checkout"
- Si no tiene suficiente XP: "Te faltan X XP" + CTA "Ver cómo ganar XP"
- Admin CRUD en /admin/rewards

**Verify**: Claim flow completo, XP deducted, code usable

#### 4.4 Client: Brew → Purchase link

**Files**:

- `client/src/pages/BaristaProfile.tsx` — en brew log, botón comprar si bean presente
- `client/src/components/BrewPurchaseButton.tsx` — smart button

**Subagent**: `cavecrew-builder`
**Design**:

- En cada brew log que tenga beanId: botón "Comprar este café"
- Si beanId tiene producto activo: link a /tienda/:slug
- Si receta tiene product asociado pero brew no: "Café recomendado: [nombre]"
- Size: text-sm, icono carrito, gold-500

**Verify**: Botón aparece solo cuando corresponde

#### 4.5 Client: Equipment recommendations

**File**: `client/src/components/EquipmentRecs.tsx` — nuevo componente
**Subagent**: `cavecrew-builder` (+ Context7 para recommendation logic)
**Design**:

- Basado en métodos más usados del perfil
- Lógica: V60 → gooseneck kettle + V60 dripper + filters, Espresso → machine + tamper
- Mapeo manual: method → equipment category
- Product lookup en BD
- Card: foto producto + nombre + precio + "Ver en tienda"
- Sección en perfil barista después de stats

**Verify**: Recomendaciones relevantes por método

#### 4.6 Client: Subscription matching banner

**File**: `client/src/components/SubscriptionMatchBanner.tsx`
**Subagent**: `cavecrew-builder`
**Design**:

- Lógica: brew frequency + flavor profile → plan recomendado
- Si brews >10/mes y flavors variados → CONNOISSEUR
- Si brews 4-10/mes → EXPLORADOR
- Si brews <4/mes → FUNDADOR
- Banner dismissible con fade animation
- CTA: "Ver plan [nombre]" → /suscripciones

**Verify**: Banner match correcto según datos

---

## Resumen de subagentes por fase

| Fase             | Subagente | Rounds | Files tocados                                               |
| ---------------- | --------- | ------ | ----------------------------------------------------------- |
| 1.1 Schema       | builder   | 1      | schema.prisma                                               |
| 1.2 API          | builder   | 2      | barista.ts                                                  |
| 1.3 Bio/Banner   | builder   | 3      | Settings.tsx, BaristaProfile.tsx, RankBadge.tsx             |
| 1.4 Equipment    | builder   | 2      | Equipment.tsx, Profile.tsx, EquipmentCard.tsx               |
| 1.5 Flavor       | builder   | 2      | FlavorProfile.tsx, FlavorSelector.tsx, FlavorRadarChart.tsx |
| 1.6 Titles       | builder   | 1      | AchievementGallery.tsx, TitleSelector.tsx                   |
| 2.1 Schema       | builder   | 1      | schema.prisma                                               |
| 2.2 API          | builder   | 3      | barista.ts                                                  |
| 2.3 Follow btn   | builder   | 2      | BaristaProfile.tsx, FollowButton.tsx                        |
| 2.4 Feed         | builder   | 1      | Feed.tsx                                                    |
| 2.5 Likes        | builder   | 1      | BrewLikeButton.tsx                                          |
| 2.6 Share        | builder   | 1      | BaristaProfile.tsx, useShare.ts                             |
| 3.1 Schema       | builder   | 1      | schema.prisma                                               |
| 3.2 API          | builder   | 2      | barista.ts                                                  |
| 3.3 Brew form    | builder   | 2      | BrewLogForm.tsx                                             |
| 3.4 Radar        | builder   | 1      | FlavorRadarChart.tsx                                        |
| 3.5 Records      | builder   | 2      | BaristaRecords.tsx                                          |
| 3.6 Wrap         | builder   | 2      | MonthlyWrap.tsx, useMonthlyWrap.ts                          |
| 3.7 Bean tracker | builder   | 1      | CoffeeTracker.tsx                                           |
| 4.1 Schema       | builder   | 1      | schema.prisma                                               |
| 4.2 API          | builder   | 2      | barista.ts                                                  |
| 4.3 Shop         | builder   | 2      | RewardShop.tsx, RewardCard.tsx                              |
| 4.4 Brew→Buy     | builder   | 1      | BrewPurchaseButton.tsx                                      |
| 4.5 Equip recs   | builder   | 1      | EquipmentRecs.tsx                                           |
| 4.6 Sub banner   | builder   | 1      | SubscriptionMatchBanner.tsx                                 |

**Total: ~23 builder subagentes, ~40 rounds**

---

## Instalación de nuevas dependencias

```bash
pnpm add @tanstack/react-query canvas-confetti react-share html2canvas
pnpm add -D @types/canvas-confetti
```

TanStack Query Provider añadir en `client/src/main.tsx` o `App.tsx`.

---

## Migrations

```bash
npx prisma migrate dev --name add_barista_identity   # Fase 1
npx prisma migrate dev --name add_barista_social      # Fase 2
npx prisma migrate dev --name add_brew_log_fields     # Fase 3
npx prisma migrate dev --name add_rewards             # Fase 4
```

---

## Research con Context7 necesaria

| Task                                  | Context7 query                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| TanStack Query setup con React 19     | `/tanstack/query` — "React Query v5 setup with React 19, queryClient provider, useQuery/useMutation patterns" |
| canvas-confetti React patterns        | `/catdad/canvas-confetti` — "React integration, confetti burst on condition, custom colors gold"              |
| html2canvas React                     | Search: "html2canvas React component, export div to image, shareable card generation"                         |
| Web Share API fallback                | Search: "Web Share API browser support 2026, fallback copy link, react-share vs native"                       |
| Social feed pagination best practices | Search: "cursor-based pagination API design social feed, infinite scroll pattern"                             |
| Recharts RadarChart customization     | `/recharts/recharts` — "RadarChart custom tooltip, multiple polygons, gradient fill"                          |
| Recharts LineChart                    | `/recharts/recharts` — "LineChart with multiple datasets, gradient area fill, responsive"                     |

---

## Frontend Design System — Extensiones

### Nuevos colores (ya definidos en tailwind.config existente)

- gold-400, gold-500 para highlights
- coffee-50..950 para fondos
- No añadir colores nuevos

### Nuevos componentes UI

- `FollowButton` — estados: seguir/siguiendo/hover dejar de seguir
- `RewardCard` — XP cost, icon, CTA
- `BrewCard` — feed card con foto, rating, acciones
- `FlavorSelector` — chip toggle multi-select
- `EquipmentCard` — equipo showcase grid
- `MonthlyWrapSlide` — fullscreen slide animado
- `LikeButton` — heart toggle con animación

### Patrones de animación

- Level up: confetti burst desde centro, toast especial, modal opcional
- Achievement unlock: confetti lateral + toast + badge highlight
- Like: heart scale bounce 1→1.3→1
- Follow: button morph + micro-animation
- Feed card: fade in on scroll (IntersectionObserver + framer-motion)

### Responsive

- Mobile first (siempre)
- Banner: 1200×400 en desktop, 100vw×200 en mobile
- Grids: 1 col mobile, 2 tablet, 3-4 desktop
- Feed: card full width mobile, max-w-md centered desktop

### Dark mode

- Todos los nuevos componentes con variante `dark:`
- Excepción: BrewLogForm modal se mantiene siempre-dark (cinema mode)
- Radar chart: colores adaptados al tema

---

## Riesgos y mitigaciones

| Riesgo                                                  | Mitigación                                                |
| ------------------------------------------------------- | --------------------------------------------------------- |
| TanStack Query reemplaza useBarista → migración costosa | Hacer wrapper adapter, migrar gradual                     |
| canvas-confetti + framer-motion conflicto animaciones   | canvas-confetti en capa z separada, no afecta layout      |
| html2canvas no captura WebGL/animaciones                | Fallback a screenshot manual, degradado graceful          |
| Follow system requiere rate limiting                    | Añadir rate-limit a POST follow (30/hr)                   |
| Reward shop puede romper economía                       | Límite de claims por reward, admin puede ajustar XP costs |
| Social feed performance con muchos brews                | Cursor-based pagination, limit 20 por request             |
