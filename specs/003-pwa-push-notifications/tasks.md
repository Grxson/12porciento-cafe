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

- [x] T001 Install `web-push` + `@types/web-push` in server/package.json
- [x] T002 Generate VAPID keys via `npx web-push generate-vapid-keys`, add to `.env` and `.env.example` as `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- [x] T003 [P] Add `PushSubscription` model to Prisma schema (fields: id, userId?, endpoint unique, p256dh, auth, userAgent?, createdAt, updatedAt) with relation to User (cascade delete) + `@@map("push_subscriptions")`
- [x] T004 Run `npx prisma migrate dev --name add_push_subscription` to create migration
- [x] T005 [P] Initialize web-push VAPID config in `server/src/index.ts` (read from env, call `webpush.setVapidDetails()`)
- [x] T006 Create `server/src/lib/push.ts` with: `type PushSubscriptionData`, `saveSubscription(data, userId?)`, `removeSubscription(endpoint)`, `getUserSubscriptions(userId)`, `getAdminSubscriptions()`, `cleanupSubscription(id)`

**Checkpoint**: `npx prisma db push` succeeds. VAPID config loads at server start. DB helpers return correct data.

---

## Phase 1: Server Push API

**Purpose**: REST endpoints for client to register/unregister push subscriptions.

**Depends**: T001, T002, T003, T004, T005, T006

- [x] T101 Create `server/src/routes/push.ts` with routes:
  - `POST /api/push/subscribe` — validate body (endpoint, keys.p256dh, keys.auth), call `saveSubscription`, return 201
  - `DELETE /api/push/subscribe` — read endpoint from body, call `removeSubscription`, return 200
  - `GET /api/push/subscriptions` — return list of user's subscriptions (user auth) or all (admin auth)
  - `POST /api/push/test` — admin-only, send test push to specified user or all admins, return `{ sent, failed }`
- [x] T102 Add input validation to push endpoints: endpoint URL format, p256dh/base64 length check, auth length check
- [x] T103 Handle duplicate subscription (same endpoint): return 409 instead of creating duplicate
- [x] T104 Register push routes in `server/src/index.ts`: `app.use('/api/push', pushRouter)`
- [x] T105 Add auth middleware to push routes: user token for subscribe/unsubscribe, admin token for list/test

**Checkpoint**: `curl -X POST /api/push/subscribe` returns 201. `curl /api/push/subscriptions` returns list. All error codes handled.

---

## Phase 2: Push Dispatch in emitEvent()

**Purpose**: When socket events fire, also send push notifications to relevant subscribers.

**Depends**: T101, T102, T103, T104, T105

- [x] T201 Import `push.ts` into `socket.ts`. In `emitEvent()`, after socket emit, dispatch push asynchronously:
  - Build notification payload `{ title, message, event, data }`
  - Query subscriptions: `targetUserId ? getUserSubscriptions(targetUserId) : getAdminSubscriptions()`
  - Call `webpush.sendNotification()` for each subscription
- [x] T202 Handle push send errors:
  - 410/404 → call `cleanupSubscription(id)`, log "Push subscription expired: {endpoint}"
  - Other errors → log warning, do not rethrow (non-blocking)
- [x] T203 Add rate limiting: track last push per userID per eventType in a Map, skip if < 5 seconds since last (prevents duplicate pushes from rapid event firing)
- [x] T204 Add push delivery logging: increment counters for `push_sent`, `push_failed`, `push_expired` (can use simple in-memory counters or console.log with prefix `[PUSH]`)
- [x] T205 Ensure push dispatch is fire-and-forget (no await in emitEvent, use `.catch()`)

**Checkpoint**: Trigger `emitEvent({ event: 'new_order', title: 'Test' })` from server console. Verify `[PUSH] sent: X` log lines.

---

## Phase 3: Service Worker Migration

**Purpose**: Custom service worker that handles push events and notification clicks while preserving existing caching + update flow.

**Depends**: None (runs in parallel with Phase 0-2)

- [x] T301 Create `client/src/sw.ts` with:
  - Import workbox routing/precaching libraries
  - `self.addEventListener('install', ...)` — skipWaiting
  - `self.addEventListener('activate', ...)` — claim clients
  - `self.addEventListener('push', ...)` — parse event data, check for open clients, show notification
  - `self.addEventListener('notificationclick', ...)` — close notification, open/focus window with URL from data
- [x] T302 Import workbox and configure caching in sw.ts to match existing generateSW behavior:
  - Precache manifest (use `self.__WB_MANIFEST` placeholder for workbox inject)
  - Runtime caching for `/api/recipes`, `/api/`, `fonts.googleapis.com`, `unsplash.com`
  - Navigate fallback to `/index.html`
- [x] T303 Update `client/vite.config.ts`: change VitePWA config:
  - `strategies: 'injectManifest'`
  - `srcDir: 'src'`
  - `filename: 'sw.ts'`
  - Keep `registerType: 'prompt'` (update prompt flow preserved)
  - Remove `workbox` config (moved to sw.ts)
- [x] T304 Implement `push` event handler in sw.ts
- [x] T305 Implement `notificationclick` event handler in sw.ts
- [x] T306 Create badge icon `client/public/icons/badge-72x72.png` (white/monochrome, 72x72, transparent bg) for notification badge display
- [x] T307 Test: Build app, verify SW register succeeds, verify existing caching still works, verify update prompt still appears on new deploy

**Checkpoint**: `pnpm build` succeeds. Service worker file is generated with push listeners. PWA still cache-first for static assets. Update notification modal still works.

---

## Phase 4: Client Push Subscription Hook

**Purpose**: React hook that manages push subscription lifecycle.

**Depends**: T101-T105 (API exists), T301-T307 (SW exists)

- [x] T401 Create `client/src/hooks/usePushNotifications.ts`
- [x] T402 Add `urlBase64ToUint8Array` utility function in `client/src/utils/base64.ts`
- [x] T403 Implement `requestPermission()`: call `Notification.requestPermission()`, if granted → call `subscribe()`, update state
- [x] T404 Implement `subscribe()`: get SW registration, call `pushManager.subscribe()`, POST subscription to API, update state
- [x] T405 Implement `unsubscribe()`: get existing subscription, call `.unsubscribe()`, DELETE from API, update state
- [x] T406 Implement `checkExistingSubscription()`: on mount, check `registration.pushManager.getSubscription()`, sync state
- [x] T407 Auto-subscribe on login if permission already granted (user effect in hook when auth state changes)
- [x] T408 Auto-unsubscribe on logout (cleanup subscriptions when user logs out)
- [x] T409 Add toast feedback: on subscribe → "Notificaciones activadas", on unsubscribe → "Notificaciones desactivadas"

**Checkpoint**: Hook returns correct state in console. Grant permission → subscription created. Revoke → subscription removed.

---

## Phase 5: Permission UI Components

**Purpose**: Contextual banner asking for notification permission + settings page for managing subscription.

**Depends**: T401-T409 (hook exists)

- [x] T501 Create `client/src/components/PushPermissionBanner.tsx`
- [x] T502 Integrate `PushPermissionBanner` in order success (Checkout.tsx success state below confirmation)
- [x] T503 Integrate `PushPermissionBanner` in `BaristaProfile.tsx` (own profile only)
- [x] T504 Create `client/src/components/NotificationSettings.tsx`
- [x] T505 Integrate `NotificationSettings` into profile page (Settings.tsx)
- [x] T506 Create `AdminNotificationSettings.tsx` with event type toggles
- [x] T507 Wire AdminNotificationSettings to API: load on mount, save on toggle with debounce

**Checkpoint**: Permission banner shows after first order. User can subscribe/unsubscribe from profile. Admin can toggle events and send test.

---

## Phase 6: Admin Notification Preferences

**Purpose**: Admin-only per-event-type toggle to control which events generate push notifications.

**Depends**: T201-T205 (emitEvent dispatch exists), T506-T507 (admin settings UI exists)

- [x] T601 Add `AdminNotificationPreference` model to Prisma schema
- [x] T602 Run migration: `npx prisma migrate dev --name add_admin_notification_prefs`
- [x] T603 Create API endpoints in `server/src/routes/push.ts`:
  - `GET /api/push/preferences` — return current admin preferences
  - `PUT /api/push/preferences` — update preferences
- [x] T604 Modify `emitEvent()` in socket.ts: check AdminNotificationPreference per admin before sending push
- [x] T605 Seed default preferences on admin first login: all event types enabled

**Checkpoint**: Admin toggles "new_order" off. A new order fires but admin gets no push. Toggle on → push arrives.

---

## Phase 7: Edge Cases & Polish

**Purpose**: Handle all edge cases, accessibility, animations, and error states.

**Depends**: All previous phases

- [x] T701 Verify cascade delete: Prisma schema has `onDelete: Cascade`
- [x] T702 Notification tag grouping: sw.ts uses event type + timestamp, `renotify: true`
- [x] T703 iOS PWA limitations: `isIOS()` check in PushPermissionBanner with guidance message
- [x] T704 Framer Motion animations: AnimatePresence with slide-down/fade
- [x] T705 Toast feedback: subscribe → "🔔 Notificaciones activadas", unsubscribe → "Notificaciones desactivadas"
- [x] T706 Accessibility: `aria-live="polite"` region in NotificationSettings
- [x] T707 Error boundary: try/catch in all push calls, never throw
- [ ] T708 Test on Android Chrome PWA: install app, grant permission, trigger event, verify notification + tap
- [ ] T709 Test on iOS Safari (16.4+): verify push subscription works, document limitations

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
