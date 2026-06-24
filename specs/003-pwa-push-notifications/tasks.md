# Tasks: PWA Push Notifications

**Input**: Design documents from `/specs/003-pwa-push-notifications/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ui-contracts.md ✅

**Tests**: Manual validation per quickstart.md. No automated tests generated.

**Format**: `[ID] [Dependency] Description`

- **[Dependency]**: `>` means depends on (must be completed first)
- **[P]**: Can run in parallel with other tasks at same level

---

## Phase 0: Foundation

**Purpose**: VAPID keys + database model + server library setup.

- [ ] T001 Install `web-push` + `@types/web-push` in server/package.json
- [ ] T002 Generate VAPID keys via `npx web-push generate-vapid-keys`, add to `.env` and `.env.example` as `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- [ ] T003 [P] Add `PushSubscription` model to Prisma schema (fields: id, userId?, endpoint unique, p256dh, auth, userAgent?, createdAt, updatedAt) with relation to User (cascade delete) + `@@map("push_subscriptions")`
- [ ] T004 Run `npx prisma migrate dev --name add_push_subscription` to create migration
- [ ] T005 [P] Initialize web-push VAPID config in `server/src/index.ts` (read from env, call `webpush.setVapidDetails()`)
- [ ] T006 Create `server/src/lib/push.ts` with: `type PushSubscriptionData`, `saveSubscription(data, userId?)`, `removeSubscription(endpoint)`, `getUserSubscriptions(userId)`, `getAdminSubscriptions()`, `cleanupSubscription(id)`

**Checkpoint**: `npx prisma db push` succeeds. VAPID config loads at server start. DB helpers return correct data.

---

## Phase 1: Server Push API

**Purpose**: REST endpoints for client to register/unregister push subscriptions.

**Depends**: T001, T002, T003, T004, T005, T006

- [ ] T101 Create `server/src/routes/push.ts` with routes:
  - `POST /api/push/subscribe` — validate body (endpoint, keys.p256dh, keys.auth), call `saveSubscription`, return 201
  - `DELETE /api/push/subscribe` — read endpoint from body, call `removeSubscription`, return 200
  - `GET /api/push/subscriptions` — return list of user's subscriptions (user auth) or all (admin auth)
  - `POST /api/push/test` — admin-only, send test push to specified user or all admins, return `{ sent, failed }`
- [ ] T102 Add input validation to push endpoints: endpoint URL format, p256dh/base64 length check, auth length check
- [ ] T103 Handle duplicate subscription (same endpoint): return 409 instead of creating duplicate
- [ ] T104 Register push routes in `server/src/index.ts`: `app.use('/api/push', pushRouter)`
- [ ] T105 Add auth middleware to push routes: user token for subscribe/unsubscribe, admin token for list/test

**Checkpoint**: `curl -X POST /api/push/subscribe` returns 201. `curl /api/push/subscriptions` returns list. All error codes handled.

---

## Phase 2: Push Dispatch in emitEvent()

**Purpose**: When socket events fire, also send push notifications to relevant subscribers.

**Depends**: T101, T102, T103, T104, T105

- [ ] T201 Import `push.ts` into `socket.ts`. In `emitEvent()`, after socket emit, dispatch push asynchronously:
  - Build notification payload `{ title, message, event, data }`
  - Query subscriptions: `targetUserId ? getUserSubscriptions(targetUserId) : getAdminSubscriptions()`
  - Call `webpush.sendNotification()` for each subscription
- [ ] T202 Handle push send errors:
  - 410/404 → call `cleanupSubscription(id)`, log "Push subscription expired: {endpoint}"
  - Other errors → log warning, do not rethrow (non-blocking)
- [ ] T203 Add rate limiting: track last push per userID per eventType in a Map, skip if < 5 seconds since last (prevents duplicate pushes from rapid event firing)
- [ ] T204 Add push delivery logging: increment counters for `push_sent`, `push_failed`, `push_expired` (can use simple in-memory counters or console.log with prefix `[PUSH]`)
- [ ] T205 Ensure push dispatch is fire-and-forget (no await in emitEvent, use `.catch()`)

**Checkpoint**: Trigger `emitEvent({ event: 'new_order', title: 'Test' })` from server console. Verify `[PUSH] sent: X` log lines.

---

## Phase 3: Service Worker Migration

**Purpose**: Custom service worker that handles push events and notification clicks while preserving existing caching + update flow.

**Depends**: None (runs in parallel with Phase 0-2)

- [ ] T301 Create `client/src/sw.ts` with:
  - Import workbox routing/precaching libraries
  - `self.addEventListener('install', ...)` — skipWaiting
  - `self.addEventListener('activate', ...)` — claim clients
  - `self.addEventListener('push', ...)` — parse event data, check for open clients, show notification
  - `self.addEventListener('notificationclick', ...)` — close notification, open/focus window with URL from data
- [ ] T302 Import workbox and configure caching in sw.ts to match existing generateSW behavior:
  - Precache manifest (use `self.__WB_MANIFEST` placeholder for workbox inject)
  - Runtime caching for `/api/recipes`, `/api/`, `fonts.googleapis.com`, `unsplash.com`
  - Navigate fallback to `/index.html`
- [ ] T303 Update `client/vite.config.ts`: change VitePWA config:
  - `strategies: 'injectManifest'`
  - `srcDir: 'src'`
  - `filename: 'sw.ts'`
  - Keep `registerType: 'prompt'` (update prompt flow preserved)
  - Remove `workbox` config (moved to sw.ts)
- [ ] T304 Implement `push` event handler in sw.ts:
  ```typescript
  self.addEventListener('push', (event) => {
    if (!event.data) return;
    const data = event.data.json();
    // Don't show if app is open (Socket.IO handles it)
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length > 0) return; // App is open
        return self.registration.showNotification(data.title, {
          body: data.message,
          icon: '/icons/pwa-192x192.png',
          badge: '/icons/badge-72x72.png',
          vibrate: [200, 100, 200],
          data: { url: data.data?.url || '/', event: data.event },
          tag: `${data.event}:${Date.now()}`,
          renotify: true,
          actions: [{ action: 'open', title: 'Abrir' }, { action: 'close', title: 'Cerrar' }],
        });
      }),
    );
  });
  ```
- [ ] T305 Implement `notificationclick` event handler in sw.ts:
  ```typescript
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'close') return;
    const url = event.notification.data?.url || '/';
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clients => {
          const existing = clients.find(c => c.url === url);
          if (existing) return existing.focus();
          return self.clients.openWindow(url);
        }),
    );
  });
  ```
- [ ] T306 Create badge icon `client/public/icons/badge-72x72.png` (white/monochrome, 72x72, transparent bg) for notification badge display
- [ ] T307 Test: Build app, verify SW register succeeds, verify existing caching still works, verify update prompt still appears on new deploy

**Checkpoint**: `pnpm build` succeeds. Service worker file is generated with push listeners. PWA still cache-first for static assets. Update notification modal still works.

---

## Phase 4: Client Push Subscription Hook

**Purpose**: React hook that manages push subscription lifecycle.

**Depends**: T101-T105 (API exists), T301-T307 (SW exists)

- [ ] T401 Create `client/src/hooks/usePushNotifications.ts`:
  ```typescript
  export function usePushNotifications() {
    const [state, setState] = useState({
      supported: false,
      permission: 'default' as NotificationPermission,
      subscribed: false,
      loading: true,
    });

    // Check browser support + permission on mount
    useEffect(() => {
      setState(s => ({ ...s, supported: 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window }));
      if ('Notification' in window) {
        setState(s => ({ ...s, permission: Notification.permission }));
      }
      checkExistingSubscription();
    }, []);

    // ... requestPermission, subscribe, unsubscribe
  }
  ```
- [ ] T402 Add `urlBase64ToUint8Array` utility function in `client/src/utils/base64.ts` (converts VAPID public key from base64 to Uint8Array for PushManager.subscribe)
- [ ] T403 Implement `requestPermission()`: call `Notification.requestPermission()`, if granted → call `subscribe()`, update state
- [ ] T404 Implement `subscribe()`: get SW registration, call `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, POST subscription to API, update state to `subscribed: true`
- [ ] T405 Implement `unsubscribe()`: get existing subscription, call `.unsubscribe()`, DELETE from API, update state
- [ ] T406 Implement `checkExistingSubscription()`: on mount, check `registration.pushManager.getSubscription()`, if exists verify with server (GET /push/subscriptions), sync state
- [ ] T407 Auto-subscribe on login if permission already granted (user effect in hook when auth state changes)
- [ ] T408 Auto-unsubscribe on logout (cleanup subscriptions when user logs out)
- [ ] T409 Add toast feedback: on subscribe → "Notificaciones activadas", on unsubscribe → "Notificaciones desactivadas"

**Checkpoint**: Hook returns correct state in console. Grant permission → subscription created. Revoke → subscription removed.

---

## Phase 5: Permission UI Components

**Purpose**: Contextual banner asking for notification permission + settings page for managing subscription.

**Depends**: T401-T409 (hook exists)

- [ ] T501 Create `client/src/components/PushPermissionBanner.tsx`:
  - Props: `onGranted?`, `onDismissed?`
  - Uses `usePushNotifications()` hook
  - States: hidden (default/granted/denied/maxShows), visible (permission === 'default' && showCount < 2)
  - localStorage key `push_prompt_count` for tracking number of times shown
  - Visual: inline banner (NOT modal/overlay), campana icon, title, description, two buttons
  - Animations: Framer Motion `AnimatePresence` for enter/exit
  - Text: "¿Recibir notificaciones?" / "Te avisaremos sobre tus pedidos y nuevos cafés."
  - Buttons: "Permitir" (bg-gold-500) and "Ahora no" (outline)
  - Dismiss increments localStorage counter
- [ ] T502 Integrate `PushPermissionBanner` in `OrderConfirmation.tsx` — show after successful order (below "¡Gracias por tu compra!" section)
- [ ] T503 Integrate `PushPermissionBanner` in `BaristaProfile.tsx` — show after first brew log (below XP section if user has brew logs)
- [ ] T504 Create `client/src/components/NotificationSettings.tsx`:
  - Shows in user profile page
  - Displays current subscription status (activated/deactivated/unsupported)
  - "Activar" button if not subscribed
  - "Desuscribir este dispositivo" link if subscribed (with ConfirmDialog)
  - Shows list of subscribed devices (if multiple)
  - Graceful message if browser unsupported
- [ ] T505 Integrate `NotificationSettings` into profile page (below account details, before order history)
- [ ] T506 Create `AdminNotificationSettings.tsx`:
  - Extends NotificationSettings with event type toggles
  - Checkboxes for each event type (new_order, low_stock, new_review, etc.)
  - "Enviar notificación de prueba" button → calls POST /api/push/test
  - Integration: admin settings page
- [ ] T507 Wire AdminNotificationSettings to API: load preferences on mount (GET /api/push/preferences), save on toggle (PUT /api/push/preferences) with debounce 500ms

**Checkpoint**: Permission banner shows after first order. User can subscribe/unsubscribe from profile. Admin can toggle events and send test.

---

## Phase 6: Admin Notification Preferences

**Purpose**: Admin-only per-event-type toggle to control which events generate push notifications.

**Depends**: T201-T205 (emitEvent dispatch exists), T506-T507 (admin settings UI exists)

- [ ] T601 Add `AdminNotificationPreference` model to Prisma schema (id, adminId, eventType, enabled) with unique constraint on [adminId, eventType] + `@@map("admin_notification_preferences")`
- [ ] T602 Run migration: `npx prisma migrate dev --name add_admin_notification_prefs`
- [ ] T603 Create API endpoints in `server/src/routes/push.ts`:
  - `GET /api/push/preferences` — return current admin preferences (admin auth)
  - `PUT /api/push/preferences` — update preferences (admin auth)
- [ ] T604 Modify `emitEvent()` in socket.ts: before sending push to admin subscribers, check AdminNotificationPreference table for each admin's preference for the event type. Skip if admin has disabled that event type.
- [ ] T605 Seed default preferences on admin first login: all event types enabled

**Checkpoint**: Admin toggles "new_order" off. A new order fires but admin gets no push. Toggle on → push arrives.

---

## Phase 7: Edge Cases & Polish

**Purpose**: Handle all edge cases, accessibility, animations, and error states.

**Depends**: All previous phases

- [ ] T701 Verify cascade delete: delete user in Prisma Studio, confirm PushSubscription records deleted (Schema already has `onDelete: Cascade`)
- [ ] T702 Add notification tag grouping in sw.ts: use event type + timestamp for `tag` field to allow multiple notifications but group by event type. Use `renotify: true` to trigger vibrate even for same-tag notifications.
- [ ] T703 Handle iOS PWA limitations: add `isIOS()` check in PushPermissionBanner → show "Las notificaciones requieren iOS 16.4+ y agregar esta app a la pantalla de inicio" message instead of prompt
- [ ] T704 Add Framer Motion entrance/exit animations to PushPermissionBanner (slide down, fade)
- [ ] T705 Add toast confirmation after subscribe ("🔔 Notificaciones activadas") and unsubscribe ("Notificaciones desactivadas") in usePushNotifications hook
- [ ] T706 Accessibility: add `aria-live="polite"` region in NotificationSettings for status changes; ensure focus trap in permission prompt
- [ ] T707 Error boundary: wrap push subscription calls in try/catch, log errors but never throw/reject promise that could crash app
- [ ] T708 Test on Android Chrome PWA: install app, grant permission, trigger event from server, verify notification appears and tap opens app
- [ ] T709 Test on iOS Safari (16.4+): verify push subscription works, document any limitations

**Checkpoint**: Full end-to-end flow works on Android. iOS limitations documented. Graceful degradation on unsupported browsers. Zero console errors.

---

## Summary

| Phase | Tasks | Depends | Est. Effort |
|-------|-------|---------|-------------|
| 0 — Foundation | 6 | — | 1h |
| 1 — Server API | 5 | Phase 0 | 1.5h |
| 2 — Push Dispatch | 5 | Phase 1 | 1.5h |
| 3 — Service Worker | 7 | — (parallel) | 2h |
| 4 — Client Hook | 9 | Phase 1, 3 | 2h |
| 5 — Permission UI | 7 | Phase 4 | 2.5h |
| 6 — Admin Prefs | 5 | Phase 2, 5 | 1.5h |
| 7 — Edge Cases | 9 | All | 2h |
| **Total** | **53** | | **14h** |

**Total files**: 7 new (server) + 5 new (client) + ~10 modified
