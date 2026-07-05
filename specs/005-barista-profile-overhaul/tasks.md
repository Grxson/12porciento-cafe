# Tasks: Barista Profile Overhaul

## Leyenda

```
[F1-T1] = Fase 1 - Task 1
Subagente: cavecrew-builder | investigator | reviewer
Context7: yes / no
Archivos: lista de paths
Deps: tareas previas necesarias
```

---

## FASE 1 — Identidad Barista

### [F1-T1] Schema: BaristaProfile campos extendidos

**Subagente**: `cavecrew-builder`
**Context7**: no
**Archivos**: `server/prisma/schema.prisma`
**Deps**: ninguna
**Acción**: Añadir campos `bio`, `bannerUrl`, `activeTitleId`, `flavorProfile`, `equipmentIds` a BaristaProfile. Añadir modelos `BaristaTitle` y `BaristaEquipment`.
**Verificar**: `npx prisma generate` sin error

### [F1-T2] Migración DB — barista identity

**Subagente**: `cavecrew-builder`
**Context7**: no
**Acción**: `npx prisma migrate dev --name add_barista_identity`
**Verificar**: `npx prisma db push` OK, migration carpeta creada

### [F1-T3] API: Equipment CRUD

**Subagent**: `cavecrew-builder` (2 rounds)
**Context7**: no
**Files**: `server/src/routes/barista.ts`
**Endpoints**:

- `GET /api/barista/me/equipment`
- `POST /api/barista/me/equipment`
- `PUT /api/barista/me/equipment/:id`
- `DELETE /api/barista/me/equipment/:id`
  **Verify**: curl test each

### [F1-T4] API: Profile customization update

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `server/src/routes/barista.ts`
**Endpoint**: `PUT /api/barista/me/profile` — body: { bio?, bannerUrl?, activeTitleId?, flavorProfile? }
**Verify**: curl test

### [F1-T5] API: Titles list with unlock status

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `server/src/routes/barista.ts`
**Endpoint**: `GET /api/barista/titles` — returns titles + `isUnlocked` basado en achievements
**Verify**: curl test

### [F1-T6] Client: Install TanStack Query

**Subagent**: `cavecrew-builder`
**Context7**: yes — `/tanstack/query` — "React Query v5 setup React 19"
**Files**: `client/src/main.tsx`, `client/package.json`
**Acción**: `pnpm add @tanstack/react-query` + crear `client/src/lib/queryClient.ts` + proveer en app
**Verify**: App no rompe

### [F1-T7] Client: Bio + Banner upload in Settings

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `client/src/pages/profile/Settings.tsx`
**Acción**: Añadir textarea bio (280 chars) + banner upload (1200×400 preview) debajo de avatar
**Verify**: Bio guarda, banner preview funciona

### [F1-T8] Client: Display bio + banner in BaristaProfile

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `client/src/pages/BaristaProfile.tsx`
**Acción**: Mostrar banner (background image), bio debajo del nombre
**Verify**: Banner visible en propia y otras personas

### [F1-T9] Client: Avatar frame by level

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `client/src/components/RankBadge.tsx`
**Acción**: Añadir variantes de borde según nivel range con CSS + glow animado
**Verify**: Visual check cada rango de nivel

### [F1-T10] Client: Equipment page + components

**Subagent**: `cavecrew-builder` (2 rounds)
**Context7**: no
**Files**: `client/src/pages/profile/Equipment.tsx` (new), `client/src/pages/Profile.tsx` (tab), `client/src/components/EquipmentCard.tsx` (new), `client/src/api/barista.ts`
**Acción**: Página CRUD equipo, grid 2/4 cols, modal form, favorito toggle
**Verify**: Añadir/editar/eliminar equipo flow

### [F1-T11] Client: Flavor profile setup

**Subagent**: `cavecrew-builder` (2 rounds)
**Context7**: yes — Recharts RadarChart
**Files**: `client/src/pages/profile/FlavorProfile.tsx` (new), `client/src/components/FlavorSelector.tsx` (new), `client/src/components/FlavorRadarChart.tsx` (new)
**Acción**: Chip selector flavors (max 5), origen preferido, roast level, radar chart preview
**Verify**: Radar chart renderiza live

### [F1-T12] Client: Title selector in achievement gallery

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `client/src/pages/AchievementGallery.tsx`, `client/src/components/TitleSelector.tsx` (new)
**Acción**: Sección títulos en gallery, modal preview, botón "Usar título"
**Verify**: Título cambia en perfil

---

## FASE 2 — Social

### [F2-T1] Schema: Follow + BrewLogLike

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `server/prisma/schema.prisma`
**Acción**: Añadir modelos Follow y BrewLogLike
**Verify**: `npx prisma generate` OK

### [F2-T2] Migration — social

**Subagent**: `cavecrew-builder`
**Acción**: `npx prisma migrate dev --name add_barista_social`
**Verify**: migration creada

### [F2-T3] API: Follow/Unfollow + Followers/Following

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `server/src/routes/barista.ts`
**Endpoints**: POST/DELETE follow, GET followers/following
**Verify**: curl test

### [F2-T4] API: Feed endpoint

**Subagent**: `cavecrew-builder`
**Context7**: yes — cursor pagination patterns
**Files**: `server/src/routes/barista.ts`
**Endpoint**: `GET /api/barista/feed?cursor=&limit=20`
**Verify**: Feed con brews de seguidos

### [F2-T5] API: Brew likes

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `server/src/routes/barista.ts`
**Endpoints**: POST/DELETE /barista/brews/:brewId/like
**Verify**: curl test

### [F2-T6] Client: FollowButton component

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `client/src/components/FollowButton.tsx` (new), `client/src/pages/BaristaProfile.tsx`
**Acción**: Botón seguir/siguiendo con animación + contadores
**Verify**: Follow/unfollow flow

### [F2-T7] Client: Social Feed page

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `client/src/pages/Feed.tsx` (new), `client/src/App.tsx` (route)
**Acción**: Feed con infinite scroll, brew cards, skeletons, empty state
**Verify**: Feed poblado, scroll infinito

### [F2-T8] Client: Like button on brew logs

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `client/src/components/BrewLikeButton.tsx` (new)
**Acción**: Heart toggle con animación + optimistic update + contador
**Verify**: Like persistente

### [F2-T9] Client: Share profile

**Subagent**: `cavecrew-builder`
**Context7**: yes — Web Share API + react-share
**Files**: `client/src/hooks/useShare.ts` (new), `client/src/pages/BaristaProfile.tsx`
**Acción**: Web Share API con fallback clipboard + OG tags dinámicos
**Verify**: Share funciona mobile/desktop

---

## FASE 3 — Analytics

### [F3-T1] Schema: Brew log extended fields

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `server/prisma/schema.prisma`
**Acción**: Añadir grindSize, waterTemp, brewTime, coffeeWeight, waterVolume, beanId, equipmentIds, tags a BrewLog
**Verify**: generate OK

### [F3-T2] Migration — brew fields

**Subagent**: `cavecrew-builder`
**Acción**: `npx prisma migrate dev --name add_brew_log_fields`
**Verify**: migration OK

### [F3-T3] API: Submit brew log extended

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `server/src/routes/barista.ts`
**Acción**: POST /brew-logs acepta nuevos campos
**Verify**: curl con todos los campos

### [F3-T4] API: Stats mejorado

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `server/src/routes/barista.ts`
**Acción**: Mejorar GET /:userId/stats con flavor word cloud, equipment usage, monthly trends
**Verify**: Response completa

### [F3-T5] Client: Extended BrewLogForm

**Subagent**: `cavecrew-builder` (2 rounds)
**Context7**: no
**Files**: `client/src/components/BrewLogForm.tsx`
**Acción**: Sección colapsable "Parámetros técnicos" con inputs extendidos + selector café + equipo
**Verify**: Brew log guarda parámetros

### [F3-T6] Client: Flavor radar chart con datos reales

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `client/src/components/FlavorRadarChart.tsx`
**Acción**: Computar 6 dimensiones de brews reales, línea "tú" vs "comunidad"
**Verify**: Chart refleja datos reales

### [F3-T7] Client: Personal records

**Subagent**: `cavecrew-builder` (2 rounds)
**Context7**: no
**Files**: `client/src/components/BaristaRecords.tsx` (new)
**Acción**: Grid de records personales, new record highlight + confetti
**Verify**: Records correctos

### [F3-T8] Client: Monthly wrap

**Subagent**: `cavecrew-builder` (2 rounds)
**Context7**: yes — html2canvas
**Files**: `client/src/components/MonthlyWrap.tsx` (new), `client/src/hooks/useMonthlyWrap.ts` (new)
**Acción**: Modal slides animados, stats del mes, compartir imagen
**Verify**: Wrap completo, imagen generada

### [F3-T9] Client: Coffee/Bean tracker

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `client/src/pages/profile/CoffeeTracker.tsx` (new), `client/src/pages/Profile.tsx` (tab)
**Acción**: Grid de cafés linkeados a brews, count de brews por café
**Verify**: Grid poblado

---

## FASE 4 — Commerce

### [F4-T1] Schema: Reward + RewardClaim

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `server/prisma/schema.prisma`
**Acción**: Añadir modelos Reward y RewardClaim
**Verify**: generate OK

### [F4-T2] Migration — rewards

**Subagent**: `cavecrew-builder`
**Acción**: `npx prisma migrate dev --name add_rewards`
**Verify**: migration OK

### [F4-T3] API: Admin rewards CRUD

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `server/src/routes/admin/barista.ts` (new)
**Endpoints**: GET/POST/PUT/DELETE /api/admin/rewards
**Verify**: curl test

### [F4-T4] API: User rewards + claim

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `server/src/routes/barista.ts`
**Endpoints**: GET /rewards, POST /rewards/:id/claim, GET /rewards/claims
**Verify**: Claim deducts XP, generates code

### [F4-T5] Client: Reward shop page

**Subagent**: `cavecrew-builder` (2 rounds)
**Context7**: no
**Files**: `client/src/pages/RewardShop.tsx` (new), `client/src/components/RewardCard.tsx` (new), `client/src/App.tsx` (route)
**Acción**: Grid rewards con XP cost, claim flow, confetti on success, admin CRUD
**Verify**: Claim flow completo

### [F4-T6] Client: Brew → Purchase button

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `client/src/components/BrewPurchaseButton.tsx` (new), `client/src/pages/BaristaProfile.tsx`
**Acción**: Botón "Comprar este café" en brew logs con beanId
**Verify**: Link correcto a tienda

### [F4-T7] Client: Equipment recommendations

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `client/src/components/EquipmentRecs.tsx` (new)
**Acción**: Recomendaciones basadas en métodos más usados, links a tienda
**Verify**: Recomendaciones relevantes

### [F4-T8] Client: Subscription match banner

**Subagent**: `cavecrew-builder`
**Context7**: no
**Files**: `client/src/components/SubscriptionMatchBanner.tsx` (new)
**Acción**: Banner en perfil con plan recomendado según datos de brew
**Verify**: Banner match correcto

---

## Total Summary

| Fase      | Tasks  | Builder | Rounds | Files new | Files mod |
| --------- | ------ | ------- | ------ | --------- | --------- |
| F1        | 12     | 12      | 16     | 7         | 7         |
| F2        | 9      | 9       | 9      | 5         | 4         |
| F3        | 9      | 9       | 12     | 4         | 5         |
| F4        | 8      | 8       | 9      | 7         | 4         |
| **Total** | **38** | **38**  | **46** | **23**    | **20**    |

## Dependencias clave

```
F1 compleciones → F2 puede empezar (pero F1-T6, F1-T8 necesarios para perfil atractivo)
F1-T12 (titles) usa achievement gallery existente → no blocker
F2-T7 (feed) requiere F2-T4 (API feed) → secuencial
F3-T5 (brew form) requiere F3-T3 (API) → secuencial
F4-T3 (admin rewards) puede ir en paralelo con F4-T1
```

## Tiempos estimados

- Fase 1: ~3 sprints (9-12 días hábiles)
- Fase 2: ~3 sprints (9-12 días)
- Fase 3: ~4 sprints (12-16 días)
- Fase 4: ~3 sprints (9-12 días)

**Total estimado: ~13 sprints / 5-6 semanas con 1 developer**
**Optimizable a ~3-4 semanas usando 2-3 subagentes en paralelo por fase**
