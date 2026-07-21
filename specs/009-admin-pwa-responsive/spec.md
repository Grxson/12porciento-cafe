# Feature Specification: Admin Dashboard — PWA + Full Responsive

**Feature Branch**: `009-admin-pwa-responsive`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "convertir el admin dashboard en una PWA completa, descargable en cualquier dispositivo. Que sea 100% responsiva, funcional en iPhones y Android, con soporte offline para assets, push notifications, y que se pueda instalar desde el navegador."

## User Scenarios & Testing

### User Story 1 — Install Admin as PWA (Priority: P1)

Admin user visits the dashboard on mobile browser. Sees install prompt (Android) or manual instructions (iOS). Taps install. App appears on home screen with branded icon. Opens in standalone mode (no browser chrome). Splash screen shows while loading.

**Why this priority**: Core feature — without installability there is no PWA.

**Independent Test**: Visit admin URL on iPhone Safari → tap Share → Add to Home Screen. Visit on Android Chrome → tap install banner. Open from home screen → verify standalone mode.

**Acceptance Scenarios**:

1. **Given** admin URL loaded on Android Chrome, **When** page loads, **Then** install banner/prompt appears within 3 visits
2. **Given** admin URL loaded on iPhone Safari, **When** user taps Share, **Then** "Add to Home Screen" option available with correct icon/title
3. **Given** app installed on home screen, **When** user opens it, **Then** opens in standalone mode (no URL bar, no bottom browser UI), splash screen visible during load
4. **Given** app installed, **When** inspecting manifest, **Then** name="12% Admin", display=standalone, correct icons, theme_color=#0d0806

---

### User Story 2 — Responsive on All Mobile Devices (Priority: P1)

Admin user opens dashboard on any phone (iPhone SE to Pro Max, Android 5" to 6.7"). All content visible without horizontal scroll. Touch targets ≥44px. Sidebar collapses to hamburger. Forms stack to single column. Tables scroll horizontally. Modals fit within viewport.

**Why this priority**: Currently many elements are too small for touch, forms don't stack, safe areas ignored on iOS.

**Independent Test**: Open admin on iPhone SE (375px), iPhone 14 Pro (393px), Galaxy S21 (360px), Pixel 7 (412px). Navigate all 26 pages. No horizontal overflow, all buttons tappable, forms usable.

**Acceptance Scenarios**:

1. **Given** admin on 375px viewport, **When** viewing any page, **Then** no horizontal scroll, all content visible
2. **Given** admin on iPhone with notch, **When** viewing header/content, **Then** safe areas respected, nothing behind Dynamic Island
3. **Given** admin on mobile, **When** tapping any button/icon, **Then** touch target ≥44×44px, first-try success
4. **Given** admin on mobile, **When** opening sidebar, **Then** hamburger tap opens it, backdrop tap closes it, nav links close it
5. **Given** admin on mobile, **When** viewing forms (Products, Inventory), **Then** fields stack to single column, inputs full-width, keyboard doesn't hide submit
6. **Given** admin on mobile, **When** viewing tables, **Then** horizontal scroll available, action buttons accessible
7. **Given** admin on mobile, **When** opening modals, **Then** modal fits viewport, close button accessible, content scrollable

---

### User Story 3 — Offline Shell + Asset Caching (Priority: P2)

Admin PWA caches app shell (HTML, CSS, JS, icons) for instant load. Navigating between pages works offline (SPA fallback). API data always live (no stale admin data). Static assets (fonts, images) cached with expiration.

**Why this priority**: Offline shell makes the app feel native. Cached admin data would be dangerous (stale orders/inventory).

**Independent Test**: Load admin → go offline (Airplane mode) → navigate between pages → shell loads from cache. API calls fail gracefully (error states, not blank screens).

**Acceptance Scenarios**:

1. **Given** admin PWA installed, **When** device goes offline, **Then** previously visited pages load from cache instantly
2. **Given** offline, **When** navigating to a new page not yet visited, **Then** SPA fallback serves cached index.html, app renders with error state for API data
3. **Given** offline, **When** API call fails, **Then** existing UI shows error message, no white screen/crash
4. **Given** admin PWA, **When** inspecting cache storage, **Then** app-shell assets cached, API responses NOT cached (except fonts/images)

---

### User Story 4 — Push Notifications for Admin Events (Priority: P2)

Admin receives push notifications for critical events: new orders, low stock alerts, new reviews. Notifications work when app is closed or in background. Tapping notification opens the relevant admin page.

**Why this priority**: Admin needs to react to business events in real-time, even when not actively using the dashboard.

**Independent Test**: Install admin PWA → grant notification permission → trigger new order via storefront → admin phone receives push notification → tap opens orders page.

**Acceptance Scenarios**:

1. **Given** admin PWA installed + notifications granted, **When** new order arrives, **Then** push notification shows with order summary
2. **Given** notification received, **When** user taps it, **Then** app opens/focuses on the relevant page (e.g., `/pedidos`)
3. **Given** admin PWA, **When** app is in foreground, **Then** in-app toast shown instead of native notification
4. **Given** admin PWA, **When** user denies notifications, **Then** app works normally, no repeated prompts

---

### User Story 5 — Update Flow (Priority: P2)

When new version deploys, admin sees update prompt (not auto-updated). Tapping "Actualizar" applies update and reloads. Version checking happens hourly.

**Why this priority**: Auto-update can lose unsaved form state. Prompt-based is safer for admin workflows.

**Independent Test**: Deploy new version → wait for SW update check → see update modal → tap update → app reloads with new version.

**Acceptance Scenarios**:

1. **Given** new SW deployed, **When** update detected, **Then** modal appears: "Actualización disponible" with update/dismiss buttons
2. **Given** update modal shown, **When** user dismisses, **Then** modal hides, won't show again until next version
3. **Given** user taps "Actualizar", **Then** SW updates, page reloads, new version active

---

### Edge Cases

- iPhone Safari PWA: No `beforeinstallprompt` event — must show manual instructions
- iOS PWA: No push notifications below iOS 16.4 — graceful degradation
- Admin on iPad/tablet: Should work as desktop layout (lg breakpoint)
- Multiple admin tabs open: SW update should apply to all tabs
- Form data in progress when update arrives: Modal must not force-lose data
- Backend server down: API errors shown, shell still loads

## Requirements

### Functional Requirements

- **FR-001**: App MUST be installable as PWA on iOS 16.4+, Android 8+, Chrome 100+, Safari 16.4+
- **FR-002**: Manifest MUST include name, icons (192+512+maskable), display=standalone, theme_color
- **FR-003**: Service worker MUST implement injectManifest strategy with workbox
- **FR-004**: SW MUST precache app shell (HTML, CSS, JS, icons, fonts)
- **FR-005**: SW MUST implement SPA navigate fallback for client-side routing
- **FR-006**: SW MUST NOT cache API responses (admin data must always be fresh)
- **FR-007**: SW MUST cache Google Fonts with CacheFirst strategy
- **FR-008**: All interactive elements MUST have touch targets ≥44×44px on mobile
- **FR-009**: Header MUST respect safe-area-inset-top (notch/Dynamic Island)
- **FR-010**: Content area MUST have responsive padding (p-4 sm:p-6 lg:p-8)
- **FR-011**: Forms with grid-cols-2 MUST stack to grid-cols-1 on mobile (< 640px)
- **FR-012**: Filter pills and bulk action bars MUST use flex-wrap
- **FR-013**: Modals MUST fit within viewport, close button ≥44px, content scrollable
- **FR-014**: Tables MUST be wrapped in overflow-x-auto containers
- **FR-015**: Push notifications MUST work for new_order, low_stock, review_approved events
- **FR-016**: Update MUST be prompt-based (not auto-update), user-triggered
- **FR-017**: Apple meta tags MUST be present (apple-touch-icon, mobile-web-app-capable, status-bar-style)
- **FR-018**: iOS splash screens MUST be provided for all standard iPhone sizes

### Non-Functional Requirements

- **NFR-001**: App shell load time < 1s on 4G after first visit (cached)
- **NFR-002**: SW file size < 50KB
- **NFR-003**: Total cached assets < 5MB
- **NFR-004**: No visual regression on desktop (lg+ viewports unchanged)
- **NFR-005**: Lighthouse PWA score ≥ 90

### Key Entities

- **Service Worker**: Background script handling cache, push, navigation fallback
- **Web App Manifest**: JSON metadata for installability (name, icons, display, shortcuts)
- **Touch Target**: Minimum 44×44px interactive element area per Apple HIG
- **Safe Area**: Device-specific insets for notches, Dynamic Island, home indicators
- **Cache Strategy**: workbox routing rules (CacheFirst for fonts, NetworkFirst for API, SPA fallback for navigation)

## Success Criteria

### Measurable Outcomes

- **SC-001**: Lighthouse PWA audit score ≥ 90
- **SC-002**: Installable on iOS Safari (Add to Home Screen) — verified on iPhone 14/15
- **SC-003**: Installable on Android Chrome (auto-prompt) — verified on Pixel/Samsung
- **SC-004**: Zero horizontal overflow at 320px viewport across all 26 admin pages
- **SC-005**: All interactive elements ≥44×44px touch target (verified via DevTools inspector)
- **SC-006**: Safe areas respected on iPhone 14 Pro (Dynamic Island) — no content clipped
- **SC-007**: App shell loads from cache when offline — no white screen
- **SC-008**: Push notifications delivered within 5s of server event
- **SC-009**: No desktop layout regression (verified on 1920×1080)

## Assumptions

- **Platform**: iOS 16.4+ (for PWA push support), Android 8+ Chrome
- **Backend**: Same Express API, no new endpoints needed for PWA features
- **Shared code**: `useInstallPrompt` already in `@12porciento/shared` — reusable
- **Icons**: Can reuse existing client PWA icons initially, admin-specific branding optional
- **Push**: Backend already has PushSubscription model + VAPID keys — admin just needs to subscribe
- **Build**: Docker build process unchanged — VitePWA plugin generates SW at build time
- **nginx**: No config changes needed — SPA fallback already in place, SW served from same origin
