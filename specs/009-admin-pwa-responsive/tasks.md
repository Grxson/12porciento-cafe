---
description: 'Task list for Admin PWA + Full Responsive'
---

# Tasks: Admin Dashboard — PWA + Full Responsive

**Input**: Design documents from `specs/009-admin-pwa-responsive/`

**Prerequisites**: plan.md ✅ spec.md ✅

**Tests**: Manual device testing per quickstart.md scenarios. Lighthouse PWA audit.

**Organization**: Tasks grouped by phase for sequential implementation.

## Format: `[ID] [P?] [Group] Description`

- **[P]**: Can run in parallel (different files, no dependencies)

---

## Phase 1: PWA Core Setup

**Purpose**: Dependencies, VitePWA plugin, service worker, icons, manifest, SW registration. Blocks all PWA features.

⚠️ **Complete Phase 1 before anything else** — PWA components and offline behavior depend on SW being registered.

- [ ] T001 Read `specs/009-admin-pwa-responsive/plan.md` before touching any file

- [ ] T002 Install PWA dependencies: add `vite-plugin-pwa` ^1.3.0 and `workbox-window` ^7.4.1 to `apps/admin/package.json` dependencies; add `workbox-precaching`, `workbox-routing`, `workbox-strategies`, `workbox-cacheable-response`, `workbox-expiration` (all ^7.4.1) to devDependencies. Run `pnpm install` from workspace root.

- [ ] T003 Replace `apps/admin/vite.config.ts` with VitePWA config: add `VitePWA` plugin with `registerType: 'prompt'`, `strategies: 'injectManifest'`, `srcDir: 'src'`, `filename: 'sw.ts'`. Inline manifest with name="12% Café — Admin", short_name="12% Admin", display=standalone, orientation=portrait-primary, scope="/", start_url="/", categories=["business"], theme_color=#0d0806, icons array (64/192/256/384/512/1024 + maskable), shortcuts for Pedidos and Inventario. Keep existing server.proxy and optimizeDeps.

- [ ] T004 Create `apps/admin/public/icons/` directory. Copy all icon files from `client/public/icons/` to `apps/admin/public/icons/`. Verify files exist: pwa-64x64.png, pwa-192x192.png, pwa-256x256.png, pwa-384x384.png, pwa-512x512.png, icon-1024x1024.png, maskable-icon-512x512.png, apple-touch-icon-180x180.png, badge-72x72.png.

- [ ] T005 Create `apps/admin/src/sw.ts` — service worker with workbox injectManifest strategy. Sections: (1) imports from workbox-precaching/routing/strategies/cacheable-response/expiration, (2) `cleanupOutdatedCaches()` + `precacheAndRoute(self.__WB_MANIFEST)`, (3) NetworkFirst route for `/api/*` with 5s timeout (NO caching), (4) CacheFirst route for Google Fonts with ExpirationPlugin (30 entries, 30d TTL), (5) SPA navigate fallback via fetch event listener (non-API navigation → cached index.html), (6) activate event → `clients.claim()`, (7) push event → showNotification when no clients open (icon: /icons/pwa-192x192.png, badge: /icons/badge-72x72.png, actions: Ver/Cerrar), (8) notificationclick → focus existing window or openWindow, (9) message handler → skipWaiting on SKIP_WAITING type.

- [ ] T006 Update `apps/admin/index.html` — add Apple PWA meta tags: `<meta name="apple-mobile-web-app-capable" content="yes" />`, `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />`, `<meta name="apple-mobile-web-app-title" content="12% Admin" />`, `<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180x180.png" />`.

- [ ] T007 Update `apps/admin/src/main.tsx` — add SW update guard: `controllerchange` event listener that checks `localStorage.getItem('pwa_just_updated') === 'true'`, if so removes key and calls `window.location.reload()`. Add before ReactDOM.createRoot.

- [ ] T008 Verify: run `pnpm --filter=@12porciento/admin build` — must exit 0. Check `apps/admin/dist/` contains `sw.js` and `manifest.webmanifest`. Run `pnpm --filter=@12porciento/admin preview` and open in browser — check DevTools → Application → Manifest shows correct data, Service Worker registered.

**Checkpoint**: PWA shell functional — manifest valid, SW registered, icons present. Install prompt may already appear on Android.

---

## Phase 2: CSS Utilities + Safe-Area Foundation

**Purpose**: Global CSS utilities that underpin all responsive fixes.

- [ ] T009 Add safe-area and touch-target utility classes to `apps/admin/src/index.css` `@layer utilities` block: `.safe-area-top { padding-top: env(safe-area-inset-top, 0px); }`, `.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }`, `.safe-area-both { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }`, `.touch-target { min-height: 44px; min-width: 44px; }`.

**Checkpoint**: Utilities available for all subsequent tasks.

---

## Phase 3: AdminLayout Responsive + Safe-Area

**Purpose**: Fix the main layout shell — header, sidebar, content padding, touch targets. Highest user-visible impact.

- [ ] T010 [P] `AdminLayout.tsx` — Header safe-area: add `style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}` to the sticky `<header>` element (line ~281). This prevents content from hiding behind Dynamic Island/notch on iPhone.

- [ ] T011 [P] `AdminLayout.tsx` — Content responsive padding: change `<div className="flex-1 p-8">` to `<div className="flex-1 p-4 sm:p-6 lg:p-8">` (line ~318). On 375px phone this saves 32px of wasted space.

- [ ] T012 [P] `AdminLayout.tsx` — Hamburger touch target: add `p-2.5 -ml-1 rounded-lg hover:bg-coffee-100 dark:hover:bg-coffee-800` to the hamburger `<button>` className (line ~282). Brings touch area from ~20px to ~44px.

- [ ] T013 [P] `AdminLayout.tsx` — Sidebar close button: change `<X className="w-4 h-4" />` to `<X className="w-5 h-5" />` and add `p-2 -mr-1 rounded-lg hover:bg-coffee-100 dark:hover:bg-coffee-800` to the close `<button>` className (line ~176). Brings from ~16px to ~44px.

- [ ] T014 [P] `AdminLayout.tsx` — Theme toggle touch target: change `p-1.5` to `p-2 rounded-lg hover:bg-coffee-100 dark:hover:bg-coffee-800` on the theme toggle `<button>` (line ~305). Change icon size from `w-4 h-4` to `w-5 h-5`.

- [ ] T015 [P] `AdminLayout.tsx` — Nav link touch targets: change `py-2.5` to `py-3 min-h-[44px]` on `<NavLink>` elements (line ~234). Add `flex items-center` if not present to ensure vertical centering.

- [ ] T016 [P] `AdminLayout.tsx` — Group toggle touch target: change `px-3 pb-1 text-[11px]` to `px-3 py-2 min-h-[36px] text-[11px] flex items-center` on the group collapse `<button>` (line ~209).

**Checkpoint**: Admin layout header clears notch, content has proper mobile padding, all sidebar interactive elements meet 44px minimum.

---

## Phase 4: PWA Components (Install + Update + Offline)

**Purpose**: User-facing PWA UI — install prompt, update modal, offline indicator.

- [ ] T017 Create `apps/admin/src/components/InstallPrompt.tsx`. Adapt from `client/src/components/InstallPrompt.tsx`: fixed bottom banner with safe-area-inset-bottom padding, Android `beforeinstallprompt` install button OR iOS manual instructions ("Compartir → Agregar a pantalla de inicio"), 14-day dismiss cooldown via localStorage key `pwa-install-dismissed`, framer-motion slide-up animation, z-index 60. Use `useInstallPrompt` from `@12porciento/shared` (already available).

- [ ] T018 Create `apps/admin/src/components/UpdateNotificationModal.tsx`. Copy from `client/src/components/UpdateNotificationModal.tsx`. Change text: "Hemos mejorado el diseño de la app" → "Hemos actualizado el panel de administración". Keep safe-area padding, framer-motion spring animation, "Actualizar" / "Ahora no" buttons with min-h-[44px].

- [ ] T019 Create `apps/admin/src/components/OfflineIndicator.tsx`. Simple online/offline detector using `navigator.onLine` + `window.addEventListener('online'/'offline')`. Shows fixed pill badge top-right (z-index 200) with `WifiOff` icon + "Sin conexión" text when offline. Only visible when offline.

- [ ] T020 Create `apps/admin/src/hooks/useUpdateNotification.ts`. Adapt from `client/src/hooks/useUpdateNotification.ts`: uses `useRegisterSW` from `virtual:pwa-register/react`, hourly SW update check, localStorage dismiss/version tracking, returns `{ updateAvailable, userDismissed, showNotification, handleDismiss, handleUpdate }`. Handle update: set `pwa_just_updated` in localStorage then call `updateServiceWorker(true)`.

- [ ] T021 Wire PWA components into `apps/admin/src/App.tsx`: import and render `<InstallPrompt />`, `<UpdateNotificationModal />`, `<OfflineIndicator />` inside the `<HelmetProvider>` wrapper (alongside existing QueryClientProvider, ErrorBoundary). Use `useUpdateNotification` hook to drive the update modal props.

- [ ] T022 Verify: run `pnpm --filter=@12porciento/admin build`. Open in Chrome DevTools → Application → check SW active. Check install prompt appears after dismissing/reloading. Check update modal logic works (simulate by modifying SW file).

**Checkpoint**: Install prompt shows on Android, iOS instructions shown, offline indicator works, update modal appears when SW updates.

---

## Phase 5: Page-Level Responsive Fixes

**Purpose**: Fix all remaining responsive issues across admin pages. Tasks grouped by file, parallelizable across files.

### Products.tsx

- [ ] T023 [P] `Products.tsx` — Form grid responsive: change all `grid grid-cols-2 gap-4` to `grid grid-cols-1 sm:grid-cols-2 gap-4` at lines ~559, ~742, ~775, ~833. Four instances total.

- [ ] T024 [P] `Products.tsx` — Filter pills wrap: change `<div className="flex gap-2 mb-6">` to `<div className="flex flex-wrap gap-2 mb-6">` (line ~297).

- [ ] T025 [P] `Products.tsx` — Bulk action bar wrap: change `<div className="flex items-center gap-3">` to `<div className="flex flex-wrap items-center gap-3">` (line ~330).

- [ ] T026 [P] `Products.tsx` — Action button touch targets: wrap Edit2 and Trash2 icon buttons in `<button className="p-2 rounded hover:bg-coffee-100 dark:hover:bg-coffee-800">` (lines ~469-480). Ensure each button has min-h-[44px] min-w-[44px].

### Orders.tsx

- [ ] T027 [P] `Orders.tsx` — Bulk action bar wrap: change `<div className="flex items-center gap-3">` to `<div className="flex flex-wrap items-center gap-3">` (line ~305).

- [ ] T028 [P] `Orders.tsx` — Status button touch targets: change `text-xs px-3 py-1.5` to `text-xs px-3 py-2.5 min-h-[40px]` on status change buttons (lines ~466-478).

### Customers.tsx

- [ ] T029 [P] `Customers.tsx` — Search form stacking: change `<div className="flex gap-3">` to `<div className="flex flex-col sm:flex-row gap-3">` (line ~171). Search input, Buscar button, Exportar CSV button will stack on mobile.

### Recipes.tsx

- [ ] T030 [P] `Recipes.tsx` — Filter pills wrap: change `<div className="flex gap-2">` to `<div className="flex flex-wrap gap-2">` (line ~206).

### Inventory.tsx

- [ ] T031 [P] `Inventory.tsx` — Tabs scroll: change `<div className="flex gap-1">` to `<div className="flex gap-1 overflow-x-auto">` (line ~320). Add `whitespace-nowrap` to each tab button className.

- [ ] T032 [P] `Inventory.tsx` — Adjust form grid: change `<div className="grid grid-cols-2 gap-4">` to `<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">` (line ~790).

- [ ] T033 [P] `Inventory.tsx` — Modal table overflow: wrap the `<table className="w-full text-sm">` (line ~1026) in `<div className="overflow-x-auto">`.

### AdminModal.tsx

- [ ] T034 [P] `AdminModal.tsx` — Close button touch target: add `className="p-2 rounded-lg hover:bg-coffee-100 dark:hover:bg-coffee-800"` to the close `<button>` wrapping `<X size={20} />` (line ~45). Change icon size to `size={22}`.

### QuickAdjustPopover.tsx

- [ ] T035 [P] `QuickAdjustPopover.tsx` — Touch targets: change `p-1.5` to `p-2.5` on +/- buttons (lines ~68-81). Brings from ~24px to ~44px.

### RecipeList.tsx

- [ ] T036 [P] `RecipeList.tsx` — Action button touch targets: change `p-1.5` to `p-2.5` on Edit2 and Trash2 buttons (lines ~87-100).

### Pagination.tsx

- [ ] T037 [P] `Pagination.tsx` — Mobile layout: add `flex-wrap` to the container `<div>`. Change button text classes to `text-xs sm:text-sm`. Add `min-h-[40px]` to buttons.

### AdminLogin.tsx

- [ ] T038 [P] `AdminLogin.tsx` — Safe area: add `style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}` to the centered flex container (line ~35).

- [ ] T039 Verify: run `pnpm --filter=@12porciento/admin build` — must exit 0. Run `pnpm typecheck` — must exit 0.

**Checkpoint**: All 26 admin pages responsive at 320px viewport. No horizontal overflow. All touch targets ≥44px.

---

## Phase 6: Push Notifications

**Purpose**: Admin receives push notifications for critical business events.

- [ ] T040 Add push subscription logic to `apps/admin/src/admin/AdminLayout.tsx` (or create `apps/admin/src/hooks/useAdminPushSubscription.ts`). On mount (after auth confirmed): check `PushManager` support, get `serviceWorker.ready`, call `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VITE_VAPID_PUBLIC_KEY) })`, POST subscription to `/api/push/subscribe`. On unmount: unsubscribe. Reuse `urlBase64ToUint8Array` from `@12porciento/shared/utils/base64`.

- [ ] T041 Verify: install admin PWA on phone, grant notification permission. Trigger new order from storefront. Verify push notification received on admin phone. Tap notification → app opens/focuses on orders page.

**Checkpoint**: Push notifications working end-to-end.

---

## Phase 7: nginx Optimization (Optional)

**Purpose**: Ensure SW updates aren't stale-cached by nginx.

- [ ] T042 Add to `apps/admin/nginx.conf` inside the `server` block, before the `location /` block:
  ```nginx
  location = /sw.js {
      add_header Cache-Control "no-cache, no-store, must-revalidate";
      add_header Pragma "no-cache";
      add_header Expires "0";
  }
  ```
  This ensures browsers always fetch the latest SW file after deploys.

---

## Phase 8: Polish & Validation

**Purpose**: Final validation across all devices and scenarios.

- [ ] T043 Run Lighthouse PWA audit on admin URL — target score ≥ 90. Fix any failing audits.

- [ ] T044 Test on iPhone SE (375px) — navigate all 26 pages, verify no horizontal scroll, all buttons tappable, modals fit, forms stack.

- [ ] T045 Test on iPhone 14 Pro (393px) — verify safe areas respected (Dynamic Island), header not clipped, content clear of notch.

- [ ] T046 Test on Android (Pixel 7 or Samsung Galaxy) — verify install prompt auto-appears, standalone mode works, push notifications received.

- [ ] T047 Test offline — load admin → enable Airplane mode → navigate between pages → shell loads from cache, API calls show error states (not white screen).

- [ ] T048 Test update flow — deploy new version → wait for SW check → verify update modal appears → tap "Actualizar" → app reloads with new version.

- [ ] T049 Verify desktop regression — open admin at 1920×1080 → layout unchanged, sidebar always visible, all features work as before.

- [ ] T050 Run `pnpm --filter=@12porciento/admin build` — final clean build, exit 0.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (PWA Core)**: Start immediately. Blocks everything.
- **Phase 2 (CSS Utilities)**: Depends on Phase 1. Quick, foundational.
- **Phase 3 (AdminLayout)**: Depends on Phase 2. Highest impact.
- **Phase 4 (PWA Components)**: Depends on Phase 1. **Can run parallel with Phase 3** (different files).
- **Phase 5 (Page Fixes)**: Depends on Phase 2. **Can run parallel with Phases 3 + 4** (different files).
- **Phase 6 (Push)**: Depends on Phase 1. **Can run parallel with Phases 3-5**.
- **Phase 7 (nginx)**: Depends on Phase 1. Independent, optional.
- **Phase 8 (Validation)**: All phases complete.

### Within Each Phase

- Tasks marked [P] have no dependencies — run in parallel
- Tasks in same file without [P] must be sequential

### Parallel Opportunities

```bash
# After Phase 1 + 2 complete, these start simultaneously:
Phase 3: T010-T016     # AdminLayout (1 file)
Phase 4: T017-T022     # PWA components (4 new files + App.tsx)
Phase 5: T023-T038     # Page fixes (10+ files, all independent)
Phase 6: T040-T041     # Push (1 hook + AdminLayout)
```

---

## Implementation Strategy

### MVP (Installable PWA + Safe Layout)

1. T001 — read plan
2. T002-T008 — PWA core setup
3. T009 — CSS utilities
4. T010-T016 — AdminLayout fixes
5. T017-T021 — PWA components
6. **VALIDATE**: Install on iPhone + Android, check Lighthouse ≥ 90

### Full Delivery

Complete all phases 1-7, then run Phase 8 validation.

---

## Notes

- All PWA patterns copied from `client/` which is battle-tested in production
- `useInstallPrompt` already in `@12porciento/shared` — zero duplication needed
- `idb-keyval` already in admin deps — available if future offline stores needed
- Docker build unchanged — VitePWA generates SW at build time, nginx serves it
- No backend changes — push subscription uses existing `/api/push/subscribe` endpoint
- Admin push subscriptions may need a new `admin` field on PushSubscription model OR use existing admin push mechanism — check server implementation
- `env(safe-area-inset-*)` fallback `0px` ensures non-notch devices unaffected
- `100dvh` supported iOS 15.4+ — use for modal heights if needed
- Commit after each phase checkpoint for easy rollback
