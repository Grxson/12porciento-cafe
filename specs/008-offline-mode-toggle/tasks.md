# 008 Offline Mode Toggle — Tasks

## Task 1 — `useOfflineMode` hook

- [ ] Crear `client/src/hooks/useOfflineMode.ts`
- [ ] Zustand store con `enabled: boolean` (default true)
- [ ] Persist via `createJSONStorage(() => idbStorage)`
- [ ] `toggle()` + `setEnabled(v)`
- [ ] `postMessage({ type: 'OFFLINE_MODE_CHANGED', enabled })` al SW on change
- [ ] Export `useOfflineMode` hook + raw `offlineModeStore`

## Task 2 — SW offline mode listener

- [ ] En `client/src/sw.ts`, añadir `message` event handler
- [ ] Cachear `let offlineEnabled = true` en scope SW
- [ ] En runtime routes (`/api/`, recipes, images): check flag
- [ ] Cuando `false`: solo `NetworkFirst`, sin fallback a cache
- [ ] Cuando `true`: comportamiento actual

## Task 3 — Settings toggle UI

- [ ] En `client/src/pages/profile/Settings.tsx`
- [ ] Importar `useOfflineMode`
- [ ] Nueva sección `<section>` tras NotificationSettings
- [ ] Toggle switch (lucide: `Wifi`/`WifiOff`)
- [ ] Texto: "Navegación sin conexión"
- [ ] Descripción toggle ON/OFF
- [ ] Separador visual (border-t)

## Task 4 — OfflineIndicator upgrade

- [ ] En `client/src/components/OfflineIndicator.tsx`
- [ ] Leer `offlineEnabled` de `useOfflineMode`
- [ ] Si `enabled=false`: no mostrar (usuario desactivó)
- [ ] Tooltip con texto extendido
- [ ] Link a `/perfil/configuracion`
- [ ] Animación de entrada suave

## Task 5 — OfflineBanner upgrade

- [ ] En `client/src/components/OfflineBanner.tsx`
- [ ] Importar `useLocation`
- [ ] Map ruta → mensaje contextual
- [ ] Leer `offlineEnabled`
- [ ] Si `false`: no mostrar banner brew sync
- [ ] Mensajes por ruta:
  - `/tienda` → catálogo offline
  - `/checkout` → Stripe requiere conexión
  - `/recetas/:slug` → receta guardada
  - otros → genérico
- [ ] Ocultar cuando online + sin pendientes

## Task 6 — StaleDataBadge component

- [ ] Crear `client/src/components/StaleDataBadge.tsx`
- [ ] Props: `cachedAt?: string`, `className?: string`
- [ ] Mostrar `WifiOff` icon + "Datos guardados"
- [ ] Si `cachedAt`: fecha relativa ("hace 2h")
- [ ] Solo visible offline + offlineEnabled
- [ ] Color: amber/gold tenue

## Task 7 — Timestamps in stores

- [ ] En `WishlistContext`: añadir `lastSyncAt: string | null`
- [ ] En `OrderHistoryContext`: añadir `lastSyncAt: string | null`
- [ ] Actualizar `lastSyncAt = new Date().toISOString()` en fetch exitoso
- [ ] Persistir en el partialize

## Task 8 — StaleDataBadge in views

- [ ] En `Wishlist.tsx`: importar y mostrar en header si offline
- [ ] En `Orders.tsx`: importar y mostrar en header si offline
- [ ] Pasar `lastSyncAt` desde store
