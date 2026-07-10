# 008 Offline Mode Toggle — Implementation Plan

## Architecture

### Store: `useOfflineMode` (nuevo store Zustand)

```
packages/shared/src/hooks/useOfflineMode.ts  ← o en client/src/hooks/
└── offlineEnabled: boolean (default: true)
└── toggle(): void
└── Persist: 'cafe-12-offline' via idbStorage
└── on change → postMessage al SW { type: 'OFFLINE_MODE_CHANGED', enabled }
```

### SW changes

```
client/src/sw.ts
└── self.addEventListener('message', ...) escucha 'OFFLINE_MODE_CHANGED'
└── Cuando enabled=false: saltar cache en runtime routes (solo NetworkFirst puro)
└── Cuando enabled=true: comportamiento actual
```

### UI changes

```
client/src/pages/profile/Settings.tsx
└── Nueva sección "Modo sin conexión" debajo de Notificaciones
└── Toggle switch con descripción

client/src/components/OfflineIndicator.tsx
└── tooltip expandido con mensaje contextual
└── enlace rápido a configuración

client/src/components/OfflineBanner.tsx
└── mostrar también en /tienda, /checkout, /producto/:slug
└── texto dinámico según página actual

client/src/components/StaleDataBadge.tsx  ← nuevo
└── badge "Datos guardados · Última actualización: ..."
└── props: timestamp, className
└── solo visible cuando offlineEnabled=true y navigator.onLine=false
```

### Files affected (8)

```
client/src/hooks/useOfflineMode.ts          ← NUEVO
client/src/sw.ts                            ← MODIFICAR
client/src/pages/profile/Settings.tsx        ← MODIFICAR
client/src/components/OfflineIndicator.tsx   ← MODIFICAR
client/src/components/OfflineBanner.tsx      ← MODIFICAR
client/src/components/StaleDataBadge.tsx     ← NUEVO
client/src/context/WishlistContext.tsx        ← MODIFICAR (añadir timestamp)
client/src/context/OrderHistoryContext.tsx    ← MODIFICAR (añadir timestamp)
```

## Task Breakdown

### Task 1: Create `useOfflineMode` hook

**File:** `client/src/hooks/useOfflineMode.ts`
**Type:** `cavecrew-builder`
**Scope:** 1 file

```ts
interface OfflineModeStore {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (v: boolean) => void;
}
```

- Zustand + persist via `idbStorage`
- `toggle()` cambia valor y emite `postMessage` al SW
- Exportar como hook y como store raw para acceso fuera de componentes

### Task 2: Update Service Worker

**File:** `client/src/sw.ts`
**Type:** `cavecrew-builder`
**Scope:** 1 file

- Añadir listener `'OFFLINE_MODE_CHANGED'`
- Cuando `enabled=false`: runtime routes usan solo `NetworkFirst` sin fallback a cache
- Cuando `enabled=true`: comportamiento actual

### Task 3: Add toggle to Settings page

**File:** `client/src/pages/profile/Settings.tsx`
**Type:** `cavecrew-builder`
**Scope:** 1 file

- Nueva sección `<section>` después de `NotificationSettings`
- Toggle switch con `useOfflineMode().enabled`
- Texto descriptivo: "Permite navegar y ver contenido guardado sin conexión a internet"
- Cuando OFF: "Los datos siempre se cargarán desde el servidor"

### Task 4: Upgrade OfflineIndicator

**File:** `client/src/components/OfflineIndicator.tsx`
**Type:** `cavecrew-builder`
**Scope:** 1 file

- Tooltip al hover: "Sin conexión — mostrando datos guardados"
- Botón "Ir a configuración" en tooltip
- Solo visible si `offlineEnabled=true` (si OFF, no mostrar porque usuario desactivó)

### Task 5: Upgrade OfflineBanner

**File:** `client/src/components/OfflineBanner.tsx`
**Type:** `cavecrew-builder`
**Scope:** 1 file

- Escuchar cambios de ruta con `useLocation()`
- Texto contextual:
  - `/tienda` → "Catálogo en modo offline — los precios pueden no estar actualizados"
  - `/checkout` → "Modo offline — Stripe requiere conexión para pagar"
  - `/recetas/:slug` → "Receta guardada — disponible sin conexión"
  - default → "Sin conexión — tus datos se guardan localmente"
- Ocultar cuando `offlineEnabled=false`

### Task 6: Create StaleDataBadge

**File:** `client/src/components/StaleDataBadge.tsx`
**Type:** `cavecrew-builder`
**Scope:** 1 file

```tsx
interface StaleDataBadgeProps {
  cachedAt?: string; // ISO date
  className?: string;
}
```

- Relojito + texto "Datos guardados"
- Fecha relativa si `cachedAt` presente
- Solo visible offline

### Task 7: Add timestamps to stores

**Files:**

- `client/src/context/WishlistContext.tsx`
- `client/src/context/OrderHistoryContext.tsx`
  **Type:** `cavecrew-builder` × 2 (parallel)
  **Scope:** 1 file each
- Añadir `lastSyncAt: string | null` al store
- Actualizar en fetch exitoso
- Pasar a `StaleDataBadge` en las vistas

### Task 8: Integrate StaleDataBadge in views

**Files:**

- `client/src/pages/profile/Wishlist.tsx`
- `client/src/pages/profile/Orders.tsx`
  **Type:** `cavecrew-builder` × 2 (parallel)
  **Scope:** 1 file each
- Importar `StaleDataBadge`
- Mostrar en header cuando `isOffline` y `offlineEnabled`

## Execution Order

```
Task 1 (hook)
  └→ Task 2 (SW listener)
  └→ Task 3 (Settings toggle)
      └→ Task 4 (OfflineIndicator upgrade)
      └→ Task 5 (OfflineBanner upgrade)
          └→ Task 6 (StaleDataBadge)
              └→ Task 7 (stores timestamps) ─→ Task 8 (views)
```

**Parallel batches:**

- Batch 1: Task 1 + Task 2 + Task 6 (sin dependencias)
- Batch 2: Task 3 + Task 4 + Task 5 (dependen de Task 1)
- Batch 3: Task 7 (depende de Task 6)
- Batch 4: Task 8 (depende de Task 6 + Task 7)

## Estimated Effort

- Task 1: 15 min
- Task 2: 10 min
- Task 3: 10 min
- Task 4: 10 min
- Task 5: 20 min
- Task 6: 15 min (nuevo componente)
- Task 7: 5 min × 2 = 10 min
- Task 8: 5 min × 2 = 10 min
- **Total: ~1.5h**
