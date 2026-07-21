# Quickstart: Admin PWA + Responsive Validation

**Feature**: `009-admin-pwa-responsive`
**Date**: 2026-07-20

## Prerequisites

1. `pnpm install` completed
2. `pnpm --filter=@12porciento/admin build` exits 0
3. `pnpm --filter=@12porciento/admin preview` running (or deployed to staging)

---

## Scenario 1: PWA Install — Android Chrome

**Device**: Any Android phone with Chrome 100+

1. Open Chrome → navigate to admin URL
2. Browse 2-3 pages (trigger installability criteria)
3. **Verify**: Install banner/prompt appears (or Chrome menu shows "Instalar app")
4. Tap "Instalar" / "Agregar a pantalla de inicio"
5. **Verify**: App icon appears on home screen with correct name "12% Admin"
6. Open from home screen
7. **Verify**: Opens in standalone mode (no URL bar, no browser bottom UI)
8. **Verify**: Splash screen visible during load (theme_color #0d0806 background)

**Pass criteria**: App installs, opens standalone, icon correct.

---

## Scenario 2: PWA Install — iPhone Safari

**Device**: iPhone with iOS 16.4+ and Safari

1. Open Safari → navigate to admin URL
2. Tap Share button (square with arrow)
3. **Verify**: "Agregar a pantalla de inicio" option visible
4. Tap it → confirm
5. **Verify**: Icon on home screen, name "12% Admin"
6. Open from home screen
7. **Verify**: Standalone mode, no Safari chrome
8. **Verify**: Status bar matches theme_color (dark)

**Pass criteria**: iOS Add to Home Screen works, standalone mode active.

---

## Scenario 3: Responsive — iPhone SE (375px)

**Device**: iPhone SE or Chrome DevTools → iPhone SE (375×667)

1. Open admin → login page
2. **Verify**: Login form centered, inputs full-width, button tappable
3. Login → Dashboard loads
4. **Verify**: Stat cards stack properly, charts readable, no horizontal scroll
5. Tap hamburger menu → sidebar opens
6. **Verify**: Sidebar full-height, backdrop visible, close button tappable
7. Navigate to Productos
8. **Verify**: Filter pills wrap, table scrolls horizontally, action buttons accessible
9. Open product form modal
10. **Verify**: Form fields stack to single column, modal fits viewport, close button tappable
11. Navigate to Pedidos
12. **Verify**: Order list cards readable, status buttons tappable
13. Navigate to Inventario
14. **Verify**: Tabs scrollable, table scrolls, adjust form stacks

**Pass criteria**: All pages navigable, no horizontal overflow, all interactions work.

---

## Scenario 4: Responsive — iPhone 14 Pro (393×852)

**Device**: iPhone 14 Pro or Chrome DevTools → iPhone 14 Pro

1. Open admin → login
2. **Verify**: Content clears Dynamic Island (safe-area-inset-top respected)
3. Navigate to Dashboard
4. **Verify**: Header not clipped by Dynamic Island
5. Scroll to bottom of any long page
6. **Verify**: Content clears home indicator (safe-area-inset-bottom)
7. Open sidebar → navigate
8. **Verify**: Sidebar overlays correctly, close button accessible

**Pass criteria**: Safe areas respected, no content behind Dynamic Island or home indicator.

---

## Scenario 5: Touch Targets — All Interactive Elements

**Device**: Any phone or Chrome DevTools with device toolbar

1. Navigate to any CRUD page (Productos, Pedidos, etc.)
2. Inspect all buttons, icons, links with DevTools
3. **Verify**: Every interactive element has min 44×44px touch area
4. Tap each type of button:
   - Hamburger menu icon
   - Sidebar close (X) icon
   - Theme toggle (sun/moon)
   - Nav links
   - Table action buttons (edit, delete)
   - Modal close button
   - Pagination buttons
   - Filter pills
   - Form submit buttons

**Pass criteria**: Every tap succeeds on first try, no mis-taps.

---

## Scenario 6: Offline Shell

**Device**: Any phone with admin PWA installed

1. Open admin PWA → navigate to 2-3 pages (ensure SW caches shell)
2. Enable Airplane mode
3. **Verify**: "Sin conexión" indicator appears
4. Navigate to a previously visited page
5. **Verify**: Page shell loads from cache (HTML/CSS/JS), layout renders
6. **Verify**: API-dependent data shows error state (not blank/crashed)
7. Navigate to a NEW page not visited before
8. **Verify**: SPA fallback serves cached index.html, app renders with error states
9. Disable Airplane mode
10. **Verify**: Indicator disappears, data loads normally

**Pass criteria**: Shell loads offline, graceful error states, no white screen.

---

## Scenario 7: Update Flow

**Device**: Any phone with admin PWA installed

1. Note current SW version in DevTools → Application → Service Workers
2. Deploy new version (or modify `sw.ts` content in dev)
3. Wait up to 60 minutes (or trigger manual SW check)
4. **Verify**: Update notification modal appears: "Actualización disponible"
5. Tap "Ahora no"
6. **Verify**: Modal dismisses, won't show again for this version
7. Trigger another update (new version)
8. Tap "Actualizar"
9. **Verify**: App reloads, new SW active, new version running

**Pass criteria**: Update modal appears, dismiss works, update applies correctly.

---

## Scenario 8: Push Notifications

**Device**: Phone with admin PWA installed + notifications granted

1. Install admin PWA → grant notification permission when prompted
2. On another device/session, create a new order via storefront
3. **Verify**: Push notification received on admin phone within 5 seconds
4. **Verify**: Notification shows order summary (title + message)
5. Tap notification
6. **Verify**: App opens/focuses on relevant page (orders)
7. Open admin PWA (foreground)
8. Trigger another notification
9. **Verify**: In-app toast shown instead of native notification

**Pass criteria**: Push delivered, notification opens correct page, foreground uses toast.

---

## Scenario 9: Desktop Regression

**Device**: Desktop browser at 1920×1080

1. Open admin → login
2. **Verify**: Sidebar always visible (no hamburger)
3. **Verify**: Content has lg:p-8 padding
4. Navigate to Dashboard
5. **Verify**: All charts, KPIs, tables render correctly at full width
6. Open product form
7. **Verify**: Form grid shows 2 columns (sm:grid-cols-2 active)
8. **Verify**: No layout shift, no broken styling

**Pass criteria**: Desktop layout unchanged from pre-PWA version.

---

## Scenario 10: Lighthouse Audit

**Device**: Chrome DevTools → Lighthouse → PWA category

1. Open admin URL in Chrome
2. Open DevTools → Lighthouse → select "Mobile" emulation
3. Run PWA audit
4. **Verify**: Score ≥ 90
5. **Verify**: All PWA checks pass:
   - ✅ installable (manifest valid, icons present)
   - ✅ PWA optimized (no plugin content, viewport configured)
   - ✅ SW registered and controls page
   - ✅ Current page responds with 200 when offline
   - ✅ start_url responds with 200 when offline
   - ✅ Configured for custom splash screen
   - ✅ Has valid apple-touch-icon
   - ✅ Maskable icon meets minimum size

**Pass criteria**: Lighthouse PWA score ≥ 90, all checks green.

---

## Sign-off

| Scenario                    | Result | Device | Date |
| --------------------------- | ------ | ------ | ---- |
| 1. Install Android          |        |        |      |
| 2. Install iPhone           |        |        |      |
| 3. Responsive 375px         |        |        |      |
| 4. Safe Areas iPhone 14 Pro |        |        |      |
| 5. Touch Targets            |        |        |      |
| 6. Offline Shell            |        |        |      |
| 7. Update Flow              |        |        |      |
| 8. Push Notifications       |        |        |      |
| 9. Desktop Regression       |        |        |      |
| 10. Lighthouse ≥ 90         |        |        |      |
