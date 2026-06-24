# Feature Specification: PWA Push Notifications

**Feature Branch**: `003-pwa-push-notifications`

**Created**: 2026-06-24

**Status**: Draft

**Input**: User report that notification system doesn't produce real push notifications on mobile PWA; only in-app toasts work when app is open.

## User Scenarios & Testing

### User Story 1 — Real PWA Push Notifications on Mobile (Priority: P1)

When a user has the PWA installed on their phone and an event occurs (new order status, low stock, barista achievement), they receive a native OS push notification even when the app is closed or in background. Tapping the notification opens the relevant page.

**Why this priority**: Core expectation of a PWA. Without push, the notification system is invisible when the app isn't open. Admin users also miss critical alerts (low stock, new orders) when away from desktop.

**Independent Test**: Install PWA on Android Chrome. Close app. Trigger event (e.g. place order from another device). Verify push notification appears in system tray. Tap it → verify app opens to correct page.

**Acceptance Scenarios**:

1. **Given** PWA installed on Android, **When** app is closed and new order is placed, **Then** user receives native push notification with order details
2. **Given** admin has PWA installed, **When** stock drops below threshold, **Then** admin receives push notification with product name and current stock
3. **Given** user receives push notification, **When** they tap it, **Then** app opens to the relevant page (order detail, product, etc.)
4. **Given** user receives multiple notifications, **When** they tap one, **Then** only that notification's action is triggered
5. **Given** user is actively using the app, **When** an event occurs, **Then** they see the in-app toast (NOT a duplicate native notification)

---

### User Story 2 — Notification Permission Flow (Priority: P1)

User is asked for notification permission at an appropriate contextual moment (not on first visit). They can grant, deny, or later change preference. If denied, the app provides guidance on how to re-enable.

**Why this priority**: `Notification.requestPermission()` on page load is intrusive and rejected 90%+ of the time. Contextual prompts increase opt-in rate. Clear guidance prevents support tickets.

**Independent Test**: Clear site data. Browse as a new user. Complete an order. See the permission prompt after order confirmation. Click "Allow" → verify notification appears. Deny → verify no more prompts shown.

**Acceptance Scenarios**:

1. **Given** user completes first purchase, **When** order confirmation screen appears, **Then** a subtle banner asks for notification permission (NOT a blocking modal)
2. **Given** user clicks "Allow", **When** browser asks for permission, **Then** user confirms and subscription is created server-side
3. **Given** user clicks "Ahora no", **When** they visit again after 7+ days, **Then** the prompt reappears once more (max 2 prompts)
4. **Given** user has denied permission, **When** they view notification settings, **Then** they see instructions to re-enable via browser settings
5. **Given** user revisits notification settings, **When** permission is already granted, **Then** they see "Activado" status with option to unsubscribe

---

### User Story 3 — Admin Notification Settings (Priority: P2)

Admin users can configure which events trigger push notifications, and can send a test notification to verify setup is working.

**Why this priority**: Admins need control over notification volume. Low stock is critical; new review might be nice-to-have. Test button builds confidence the system works.

**Independent Test**: Log in as admin. Go to admin settings. Toggle off "new_review" events. Trigger a new review. Verify no push notification received. Toggle back on. Click "Enviar prueba" → verify notification appears.

**Acceptance Scenarios**:

1. **Given** admin is on settings page, **When** they toggle individual event types, **Then** only enabled events generate push notifications
2. **Given** admin clicks "Enviar notificación de prueba", **When** the server sends a test push, **Then** the admin's device shows a notification within 5 seconds
3. **Given** admin disables all notifications, **When** any event fires, **Then** no push notifications are sent to that admin
4. **Given** admin has multiple devices, **When** they disable notifications, **Then** all their devices are unsubscribed

---

### User Story 4 — Cross-Device Unsubscribe & Cleanup (Priority: P2)

When a user logs out, deletes their account, or manually unsubscribes, all their push subscriptions are cleaned up server-side. Expired subscriptions are detected and removed automatically on push send failure.

**Why this priority**: Orphan subscriptions waste server resources and cause console errors. Users who delete accounts should not receive notifications.

**Independent Test**: Suscribe two devices to same user. Delete account. Verify both devices receive no further notifications when events fire.

**Acceptance Scenarios**:

1. **Given** user with 2 subscribed devices, **When** they delete their account, **Then** both subscriptions are deleted (cascade)
2. **Given** user subscribed on a device, **When** they log out, **Then** subscription remains (user may log back in)
3. **Given** expired push subscription (410 error on send), **When** server attempts push, **Then** subscription is removed automatically and logged
4. **Given** user visits settings and clicks "Desuscribir este dispositivo", **When** confirmed, **Then** subscription is deleted server-side

---

### User Story 5 — Barista Achievement Push (Priority: P3)

When a user unlocks a barista achievement while the app is closed, they receive a push notification congratulating them and showing the achievement details.

**Why this priority**: Gamification engagement. Users who brewed coffee and closed the app will see the achievement notification later and feel rewarded, driving re-engagement.

**Independent Test**: Close app. Brew coffee via API directly (simulate). Verify push notification appears with achievement name and icon.

**Acceptance Scenarios**:

1. **Given** user has barista profile, **When** they unlock an achievement while app is backgrounded, **Then** push notification shows achievement name and icon
2. **Given** user taps achievement notification, **When** app opens, **Then** it navigates to `/perfil/barista/:userId` achievements section

---

## Technical Constraints

- **No new infrastructure**: Use existing Node/Express server. No Firebase Cloud Messaging or third-party push service.
- **Web Push Protocol**: Standard W3C Push API using VAPID keys
- **Database**: PostgreSQL (existing Prisma schema)
- **Service Worker**: Migrate from `generateSW` to `injectManifest` strategy in `vite-plugin-pwa` to support custom `push` event listeners
- **iOS PWA**: Document limitations. iOS Safari supports Web Push from iOS 16.4+ for PWAs added to Home Screen, but not all features are available.
- **Socket.IO remains**: Primary channel for in-app notifications. Push notifications are the secondary/background channel.
- **No performance regressions**: Push subscription verification must not block page load.
