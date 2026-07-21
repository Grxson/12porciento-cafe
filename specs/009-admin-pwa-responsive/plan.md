# Implementation Plan: Admin Dashboard — PWA + Full Responsive

**Branch**: `009-admin-pwa-responsive` | **Date**: 2026-07-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/009-admin-pwa-responsive/spec.md`

## Summary

Convert admin dashboard (`apps/admin/`) into a full installable PWA with offline shell caching, push notifications, and update prompts. Simultaneously fix 26 responsive/mobile issues: safe-area insets, touch targets, form stacking, flex-wrap, padding, modal sizing, and popover positioning. Reuses proven PWA patterns from `client/` app. ~20 files modified, 3 new files created.

## Technical Context

**Language/Version**: TypeScript 5.x, React 18

**Primary Dependencies**: Vite 5, Tailwind CSS 3, Framer Motion, Zustand, React Router v6

**New Dependencies**: `vite-plugin-pwa` ^1.3.0, `workbox-window` ^7.4.1, `workbox-precaching` ^7.4.1, `workbox-routing` ^7.4.1, `workbox-strategies` ^7.4.1, `workbox-cacheable-response` ^7.4.1, `workbox-expiration` ^7.4.1

**Storage**: `idb-keyval` already in deps (unused, available for future offline stores)

**Testing**: Manual device testing (iOS Safari, Android Chrome) + Lighthouse audit

**Target Platform**: iOS 16.4+ Safari PWA, Android 8+ Chrome PWA, minimum viewport 320px

**Project Type**: React SPA — Vite build with injectManifest SW strategy

**Constraints**: No backend changes. No new API endpoints. Docker build process unchanged. Desktop layout (lg+) must not regress.

## Constitution Check

No project constitution defined. No gate violations.

## Project Structure

### Documentation (this feature)

```text
specs/009-admin-pwa-responsive/
├── spec.md              # Feature specification
├── plan.md              # This file — implementation plan
├── tasks.md             # Task list with phases
└── quickstart.md        # Validation scenarios
```

### Source Code — New Files

```text
apps/admin/
├── public/
│   └── icons/               # PWA icons (copy from client, admin-specific later)
│       ├── pwa-64x64.png
│       ├── pwa-192x192.png
│       ├── pwa-256x256.png
│       ├── pwa-384x384.png
│       ├── pwa-512x512.png
│       ├── icon-1024x1024.png
│       ├── maskable-icon-512x512.png
│       ├── apple-touch-icon-180x180.png
│       └── badge-72x72.png
├── src/
│   ├── sw.ts                # Service worker (workbox injectManifest)
│   └── components/
│       ├── InstallPrompt.tsx           # Install banner (Android + iOS instructions)
│       ├── UpdateNotificationModal.tsx  # Update prompt modal
│       └── OfflineIndicator.tsx         # "Sin conexión" pill badge
```

### Source Code — Modified Files

```text
apps/admin/
├── package.json                          # +vite-plugin-pwa, +workbox deps
├── vite.config.ts                        # VitePWA plugin config + manifest
├── index.html                            # Apple meta tags, apple-touch-icon
├── src/
│   ├── main.tsx                          # SW registration + controllerchange guard
│   ├── index.css                         # safe-area utilities, touch-target base
│   ├── App.tsx                           # Wire InstallPrompt + UpdateModal + OfflineIndicator
│   └── admin/
│       ├── AdminLayout.tsx               # safe-area, touch targets, responsive padding
│       ├── AdminLogin.tsx                # safe-area on centered content
│       ├── AdminModal.tsx                # close button touch target
│       ├── Products.tsx                  # form grid, filter wrap, action buttons
│       ├── Orders.tsx                    # bulk action wrap, status buttons
│       ├── Customers.tsx                 # search form stacking
│       ├── Recipes.tsx                   # filter wrap
│       ├── Dashboard.tsx                 # (minor — already mostly responsive)
│       ├── Inventory.tsx                 # tabs scroll, adjust form grid, modal table
│       └── components/
│           ├── Pagination.tsx            # mobile-friendly layout
│           ├── QuickAdjustPopover.tsx     # mobile positioning, touch targets
│           └── recipes/
│               └── RecipeList.tsx        # action button touch targets
```

## Architecture Decisions

### A1: Offline Strategy — Shell-Only (NOT Data Cache)

**Decision**: Cache app shell (HTML/CSS/JS/icons/fonts) only. API responses are NEVER cached.

**Rationale**: Admin data (orders, inventory, stock) is live-critical. Stale data = bad decisions. The SW implements:

- SPA navigate fallback (serves cached `index.html` for any non-API navigation)
- CacheFirst for Google Fonts
- NetworkFirst for `/api/*` with no cache (errors surface immediately)
- No IndexedDB offline store for admin data

**Trade-off**: App works offline but shows error states for data. This is correct for admin.

### A2: SW Strategy — injectManifest (Not generateSW)

**Decision**: Use `injectManifest` with custom `sw.ts`, same as client app.

**Rationale**: Full control over caching rules. Can skip recipe/brew caching from client. Simpler SW (~80 lines vs client's 189). Easier to reason about.

### A3: PWA Icons — Reuse Client Icons Initially

**Decision**: Copy `client/public/icons/` to `apps/admin/public/icons/`. Admin-specific branding is a separate task.

**Rationale**: Icons work for installability. Admin branding (different icon) is cosmetic, not blocking. Can be updated later.

### A4: Push Notifications — Reuse Backend Infrastructure

**Decision**: Admin subscribes to same VAPID push endpoint. Server sends to admin-specific topic.

**Rationale**: `PushSubscription` model already exists. Server already has `web-push` + VAPID. Admin just needs subscription registration on login + event filtering.

### A5: Update Strategy — Prompt-Based (Same as Client)

**Decision**: `registerType: 'prompt'` — user-triggered update, not auto-skipWaiting.

**Rationale**: Admin may have unsaved form state. Auto-update would lose data. Modal gives user control.

## Implementation Tasks

### Group A — PWA Core Setup (Blocking)

**A1. Install Dependencies**

File: `apps/admin/package.json`

Add to `dependencies`:

```json
"vite-plugin-pwa": "^1.3.0",
"workbox-window": "^7.4.1"
```

Add to `devDependencies`:

```json
"workbox-precaching": "^7.4.1",
"workbox-routing": "^7.4.1",
"workbox-strategies": "^7.4.1",
"workbox-cacheable-response": "^7.4.1",
"workbox-expiration": "^7.4.1"
```

Run `pnpm install` from root.

---

**A2. VitePWA Plugin Config**

File: `apps/admin/vite.config.ts`

Replace contents with:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: '12% Café — Admin',
        short_name: '12% Admin',
        description: 'Panel de administración 12% Café de Especialidad',
        theme_color: '#0d0806',
        background_color: '#0d0806',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        categories: ['business'],
        icons: [
          { src: 'icons/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-256x256.png', sizes: '256x256', type: 'image/png' },
          { src: 'icons/pwa-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-1024x1024.png', sizes: '1024x1024', type: 'image/png' },
          {
            src: 'icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any',
          },
        ],
        shortcuts: [
          {
            name: 'Pedidos',
            short_name: 'Pedidos',
            description: 'Gestionar pedidos',
            url: '/pedidos',
            icons: [{ src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Inventario',
            short_name: 'Inventario',
            description: 'Gestionar inventario',
            url: '/inventario',
            icons: [{ src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
    }),
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['@12porciento/shared', '@12porciento/ui'],
  },
});
```

---

**A3. Service Worker**

File: `apps/admin/src/sw.ts` (NEW)

```typescript
/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

// Precache all assets generated by Vite build
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// API routes — NetworkFirst, NO caching (admin data must be fresh)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-runtime',
    networkTimeoutSeconds: 5,
  }),
);

// Google Fonts — CacheFirst (static assets)
registerRoute(
  ({ url }) => /fonts\.googleapis\.com|fonts\.gstatic\.com/.test(url.origin),
  new CacheFirst({
    cacheName: 'google-fonts',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  }),
);

// SPA navigate fallback
const navigateFallback = '/index.html';
self.addEventListener('fetch', (event) => {
  if (
    event.request.mode === 'navigate' &&
    !event.request.url.startsWith(self.location.origin + '/api/')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(navigateFallback) as Promise<Response>),
    );
  }
});

// Activate — claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push event — admin notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        if (clients.length > 0) return; // App open → in-app toast handles it

        return self.registration.showNotification(data.title, {
          body: data.message,
          icon: '/icons/pwa-192x192.png',
          badge: '/icons/badge-72x72.png',
          vibrate: [200, 100, 200],
          data: {
            url: data.data?.url || '/',
            event: data.event,
          },
          tag: `${data.event}:${Date.now()}`,
          renotify: true,
          actions: [
            { action: 'open', title: 'Ver' },
            { action: 'close', title: 'Cerrar' },
          ],
        } as NotificationOptions);
      }),
    );
  } catch (err) {
    console.error('[SW] push error:', err);
  }
});

// Notification click — open/focus admin page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find((c) => c.url === urlToOpen);
      if (existing) return existing.focus();
      if (windowClients.length > 0) {
        return windowClients[0].navigate(urlToOpen).then((c) => c?.focus());
      }
      return self.clients.openWindow(urlToOpen);
    }),
  );
});

// Message handler — SKIP_WAITING for updates
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
```

---

**A4. PWA Icons**

Copy from client:

```bash
cp -r client/public/icons/ apps/admin/public/icons/
```

If admin-specific branding desired, generate new icons from `icon-1024x1024.png` source using `@vite-pwa/assets-generator` or manual tool.

---

**A5. index.html — Apple Meta Tags**

File: `apps/admin/index.html`

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />

    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0d0806" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="12% Admin" />
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon-180x180.png" />
    <title>12% — Admin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

**A6. main.tsx — SW Registration + Update Guard**

File: `apps/admin/src/main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.js';

// SW update guard — reload only if user triggered update
let pwaUpdatePending = false;
if ('serviceWorker' in navigator) {
  window.addEventListener('controllerchange', () => {
    if (localStorage.getItem('pwa_just_updated') === 'true') {
      localStorage.removeItem('pwa_just_updated');
      window.location.reload();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
```

---

### Group B — PWA Components

**B1. InstallPrompt Component**

File: `apps/admin/src/components/InstallPrompt.tsx` (NEW)

Adapted from `client/src/components/InstallPrompt.tsx`. Shows:

- Android: `beforeinstallprompt` event → install button
- iOS: Manual "Compartir → Agregar a pantalla de inicio" instructions
- 14-day dismiss cooldown via localStorage
- Fixed bottom banner with safe-area-inset-bottom
- Uses `useInstallPrompt` from `@12porciento/shared` (already available)

---

**B2. UpdateNotificationModal Component**

File: `apps/admin/src/components/UpdateNotificationModal.tsx` (NEW)

Copy from `client/src/components/UpdateNotificationModal.tsx`. Change text:

- "Hemos mejorado el diseño de la app" → "Hemos actualizado el panel de administración"
- Same safe-area, same framer-motion animation

---

**B3. OfflineIndicator Component**

File: `apps/admin/src/components/OfflineIndicator.tsx` (NEW)

Simple connectivity detector:

```typescript
const [isOnline, setIsOnline] = useState(navigator.onLine);
useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
```

Shows pill badge "Sin conexión" when offline. Uses `WifiOff` icon from lucide-react.

---

**B4. App.tsx — Wire PWA Components**

File: `apps/admin/src/App.tsx`

Add inside `<HelmetProvider>`:

```tsx
<InstallPrompt />
<UpdateNotificationModal />
<OfflineIndicator />
```

Add `useUpdateNotification` hook (inline or new file) to drive the update modal.

---

### Group C — Safe-Area + Responsive Layout (AdminLayout)

**C1. AdminLayout.tsx — Header safe-area**

File: `apps/admin/src/admin/AdminLayout.tsx`

Current sticky header (line ~281):

```tsx
<header className="sticky top-0 z-20 ...">
```

Fix:

```tsx
<header
  className="sticky top-0 z-20 ..."
  style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
>
```

---

**C2. AdminLayout.tsx — Content padding responsive**

File: `apps/admin/src/admin/AdminLayout.tsx`

Current (line ~318):

```tsx
<div className="flex-1 p-8">
```

Fix:

```tsx
<div className="flex-1 p-4 sm:p-6 lg:p-8">
```

---

**C3. AdminLayout.tsx — Hamburger touch target**

Current (line ~282):

```tsx
<button onClick={() => setSidebarOpen(true)} className="lg:hidden ...">
  <Menu className="w-5 h-5" />
</button>
```

Fix — wrap icon in sized container:

```tsx
<button
  onClick={() => setSidebarOpen(true)}
  className="lg:hidden p-2.5 -ml-1 rounded-lg hover:bg-coffee-100 dark:hover:bg-coffee-800"
>
  <Menu className="w-5 h-5" />
</button>
```

---

**C4. AdminLayout.tsx — Sidebar close button touch target**

Current (line ~176):

```tsx
<button onClick={() => setSidebarOpen(false)} className="lg:hidden ...">
  <X className="w-4 h-4" />
</button>
```

Fix:

```tsx
<button
  onClick={() => setSidebarOpen(false)}
  className="lg:hidden p-2 -mr-1 rounded-lg hover:bg-coffee-100 dark:hover:bg-coffee-800"
>
  <X className="w-5 h-5" />
</button>
```

---

**C5. AdminLayout.tsx — Theme toggle touch target**

Current (line ~305):

```tsx
<button onClick={toggleTheme} className="p-1.5 ...">
  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
</button>
```

Fix:

```tsx
<button
  onClick={toggleTheme}
  className="p-2 rounded-lg hover:bg-coffee-100 dark:hover:bg-coffee-800 ..."
>
  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
</button>
```

---

**C6. AdminLayout.tsx — Nav link touch targets**

Current (line ~234):

```tsx
<NavLink className="px-3 py-2.5 text-sm ...">
```

Fix:

```tsx
<NavLink className="px-3 py-3 min-h-[44px] text-sm flex items-center ...">
```

---

**C7. AdminLayout.tsx — Group toggle touch target**

Current (line ~209):

```tsx
<button className="px-3 pb-1 text-[11px] ...">
```

Fix:

```tsx
<button className="px-3 py-2 min-h-[36px] text-[11px] flex items-center ...">
```

---

### Group D — Page-Level Responsive Fixes

**D1. Products.tsx — Form grid responsive**

File: `apps/admin/src/admin/Products.tsx`

Line ~559:

```tsx
<div className="grid grid-cols-2 gap-4">
```

Fix: `grid grid-cols-1 sm:grid-cols-2 gap-4`

Lines ~742, 775, 833: Same fix for coffee profile grids.

---

**D2. Products.tsx — Filter pills wrap**

File: `apps/admin/src/admin/Products.tsx`

Line ~297:

```tsx
<div className="flex gap-2 mb-6">
```

Fix: `flex flex-wrap gap-2 mb-6`

---

**D3. Products.tsx — Bulk action bar wrap**

Line ~330:

```tsx
<div className="flex items-center gap-3">
```

Fix: `flex flex-wrap items-center gap-3`

---

**D4. Products.tsx — Action button touch targets**

Lines ~469-480: Edit/Delete icons in table rows.

Wrap each icon button:

```tsx
<button className="p-2 rounded hover:bg-coffee-100 dark:hover:bg-coffee-800">
  <Edit2 className="w-4 h-4" />
</button>
```

---

**D5. Orders.tsx — Bulk action bar wrap**

Line ~305:

```tsx
<div className="flex items-center gap-3">
```

Fix: `flex flex-wrap items-center gap-3`

---

**D6. Orders.tsx — Status button touch targets**

Lines ~466-478: Status change buttons.

Fix: `text-xs px-3 py-2.5 min-h-[40px]`

---

**D7. Customers.tsx — Search form stacking**

Line ~171:

```tsx
<div className="flex gap-3">
```

Fix: `flex flex-col sm:flex-row gap-3`

---

**D8. Recipes.tsx — Filter pills wrap**

Line ~206:

```tsx
<div className="flex gap-2">
```

Fix: `flex flex-wrap gap-2`

---

**D9. Inventory.tsx — Tabs scroll**

Lines ~320-341:

```tsx
<div className="flex gap-1">
```

Fix: `flex gap-1 overflow-x-auto` + add `whitespace-nowrap` to tab buttons

---

**D10. Inventory.tsx — Adjust form grid**

Line ~790:

```tsx
<div className="grid grid-cols-2 gap-4">
```

Fix: `grid grid-cols-1 sm:grid-cols-2 gap-4`

---

**D11. Inventory.tsx — Modal table overflow**

Line ~1026:

```tsx
<table className="w-full text-sm">
```

Fix: Wrap in `<div className="overflow-x-auto">`

---

**D12. AdminModal.tsx — Close button touch target**

File: `apps/admin/src/admin/components/AdminModal.tsx`

Line ~45:

```tsx
<button onClick={onClose}>
  <X size={20} />
</button>
```

Fix: `className="p-2 rounded-lg hover:bg-coffee-100 dark:hover:bg-coffee-800"`

---

**D13. QuickAdjustPopover.tsx — Mobile positioning + touch targets**

File: `apps/admin/src/admin/components/QuickAdjustPopover.tsx`

Line ~49: `absolute right-0 top-full mt-1 z-30 w-64`

Fix: `absolute right-0 top-full mt-1 z-30 w-64 sm:right-0` (already fine on desktop, on mobile the table scroll handles overflow)

Lines ~68-81: +/- buttons `p-1.5` → `p-2.5`

---

**D14. RecipeList.tsx — Action button touch targets**

File: `apps/admin/src/admin/components/recipes/RecipeList.tsx`

Lines ~87-100: Edit/Delete buttons `p-1.5` → `p-2.5`

---

**D15. Pagination.tsx — Mobile layout**

File: `apps/admin/src/admin/components/Pagination.tsx`

Lines ~17-33: Add `flex-wrap` to container, shrink button text on mobile:

```tsx
<button className="px-3 py-2 text-xs sm:text-sm ...">Anterior</button>
```

---

**D16. AdminLogin.tsx — Safe area**

File: `apps/admin/src/admin/AdminLogin.tsx`

Line ~41: Centered container — add safe-area padding:

```tsx
style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
```

---

### Group E — Global CSS Utilities

**E1. index.css — Safe-area utility classes**

File: `apps/admin/src/index.css`

Add to `@layer utilities`:

```css
.safe-area-top {
  padding-top: env(safe-area-inset-top, 0px);
}

.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.safe-area-both {
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.touch-target {
  min-height: 44px;
  min-width: 44px;
}
```

---

### Group F — Push Notifications

**F1. Push Subscription on Admin Login**

File: `apps/admin/src/admin/AdminLayout.tsx` (or new hook)

On mount (after auth confirmed), register for push:

```typescript
useEffect(() => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  navigator.serviceWorker.ready.then((reg) => {
    reg.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VITE_VAPID_PUBLIC_KEY),
      })
      .then((subscription) => {
        // POST /api/push/subscribe with subscription JSON
      });
  });
}, []);
```

Reuse `urlBase64ToUint8Array` from `@12porciento/shared` (already available).

---

### Group G — nginx Config (No Changes Needed)

The existing nginx config already has:

- `try_files $uri $uri/ /index.html` — SPA fallback ✅
- gzip enabled for JS/CSS/JSON ✅
- No special SW headers needed (same-origin, default caching OK for build output)

**Optional improvement**: Add `Cache-Control: no-cache` for `sw.js` to ensure browser always checks for updates:

```nginx
location = /sw.js {
    add_header Cache-Control "no-cache";
}
```

This is a nice-to-have, not blocking.

---

## Complexity Tracking

No constitution violations. No complexity to justify.

## Execution Order

1. **Group A** (PWA core) — must complete first, everything depends on it
2. **Group E** (CSS utilities) — foundational for safe-area fixes
3. **Group C** (AdminLayout) — highest user-visible impact
4. **Group D** (page fixes) — can run in parallel across files
5. **Group B** (PWA components) — can run in parallel with C/D
6. **Group F** (push notifications) — after A complete, independent
7. **Group G** (nginx) — optional, last

Test after each group.

## Definition of Done

- [ ] `pnpm install` succeeds with new dependencies
- [ ] `pnpm --filter=@12porciento/admin build` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] Lighthouse PWA audit ≥ 90
- [ ] Installable on iPhone Safari (Add to Home Screen)
- [ ] Installable on Android Chrome (auto-prompt)
- [ ] Zero horizontal overflow at 320px viewport on all 26 pages
- [ ] All interactive elements ≥44×44px touch target
- [ ] Safe areas respected on iPhone 14 Pro (Dynamic Island)
- [ ] App shell loads from cache when offline
- [ ] Push notifications delivered for new_order event
- [ ] No desktop layout regression (1920×1080)
