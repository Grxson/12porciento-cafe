# Implementation Plan: PWA Push Notifications

**Branch**: `003-pwa-push-notifications` | **Date**: 2026-06-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-pwa-push-notifications/spec.md`

## Summary

Implement real native PWA push notifications on mobile devices. Current notification system only works in-app via Socket.IO. This plan adds: VAPID key infrastructure, Prisma PushSubscription model, server push dispatch in `emitEvent()`, client push subscription hook, custom service worker with push/notificationclick listeners, contextual permission prompt UI, and admin notification preferences.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Node/Express, Prisma ORM

**Primary Dependencies**: `web-push` (server), `vite-plugin-pwa` `injectManifest` strategy (client)

**Storage**: Prisma PostgreSQL (subscriptions), localStorage (prompt dismissal count)

**Service Worker**: Custom SW via `injectManifest` strategy extending current workbox caching

**Target Platform**: Android Chrome PWA (primary), iOS Safari 16.4+ PWA (secondary), Desktop (fallback)

**Performance Goals**: Push subscription check < 200ms (client), push send < 500ms per subscriber (server), zero impact on page load

**Constraints**: No Firebase/third-party push services; no new infrastructure; no breaking changes to existing Socket.IO notification flow

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Server (Express)                      │
│                                                         │
│  emitEvent() ─→ Socket.IO (existing) ─→ in-app toasts   │
│             ─→ web-push ─→ Push Service (FCM/APNs) ─→ SW │
│                                                         │
│  POST /push/subscribe (guarda PushSubscription en DB)    │
│  DELETE /push/subscribe (elimina suscripción)            │
│  POST /push/test (admin-only test)                       │
│  GET /push/subscriptions (admin-only list)               │
│  PUT /push/preferences (admin event toggles)             │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│              Service Worker (Custom SW)                  │
│                                                         │
│  push event → showNotification(title, options)           │
│  notificationclick → clients.openWindow(url)             │
│  check clients → skip push if app is open               │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│              Client (React)                              │
│                                                         │
│  usePushNotifications hook:                              │
│    1. Detect support + permission state                  │
│    2. requestPermission() → subscribe()                  │
│    3. unsubscribe()                                       │
│  PushPermissionBanner: contextual prompt                 │
│  NotificationSettings: profile + admin toggles           │
└─────────────────────────────────────────────────────────┘
```

## Phase Breakdown

### Phase 0 — Foundation (Dependencies: none)

| Task | Description | Files | Effort |
|------|------------|-------|--------|
| T001 | Generate VAPID keys, add to `.env` | `.env`, `.env.example` | 5min |
| T002 | Add Prisma PushSubscription model + migrate | `schema.prisma` | 15min |
| T003 | Install `web-push` + `@types/web-push` | `package.json` | 5min |
| T004 | Configure web-push VAPID in server bootstrap | `server/src/index.ts` | 10min |
| T005 | Create PushSubscription repository helpers | `server/src/lib/push.ts` | 20min |

**Checkpoint**: VAPID keys ready, push subscription table exists, DB migrated.

---

### Phase 1 — Server Push API (Depends: Phase 0)

| Task | Description | Files | Effort |
|------|------------|-------|--------|
| T101 | `POST /api/push/subscribe` endpoint | `server/src/routes/push.ts` | 30min |
| T102 | `DELETE /api/push/subscribe` endpoint | `server/src/routes/push.ts` | 15min |
| T103 | `GET /api/push/subscriptions` endpoint (admin) | `server/src/routes/push.ts` | 15min |
| T104 | `POST /api/push/test` endpoint (admin) | `server/src/routes/push.ts` | 15min |
| T105 | Register push routes in Express app | `server/src/index.ts` | 5min |
| T106 | Validation: validate push subscription object structure | `server/src/routes/push.ts` | 15min |
| T107 | Error handling: 400/404/409 responses for all endpoints | `server/src/routes/push.ts` | 10min |

**Checkpoint**: All push API endpoints working, tested with curl.

---

### Phase 2 — Push Dispatch in emitEvent() (Depends: Phase 1)

| Task | Description | Files | Effort |
|------|------------|-------|--------|
| T201 | Extend `emitEvent()` with push notification dispatch | `server/src/socket.ts` | 30min |
| T202 | Handle 410/404 expired subscription auto-cleanup | `server/src/socket.ts` | 20min |
| T203 | Rate limiting: not more than 1 push per user per event | `server/src/socket.ts` | 15min |
| T204 | Add non-blocking push (don't await, use fire-and-forget + error logging) | `server/src/socket.ts` | 10min |
| T205 | Log push delivery stats (sent, failed, cleaned up) | `server/src/socket.ts` | 10min |

**Checkpoint**: Events trigger push notifications. Expired subs auto-cleaned. Logs show delivery stats.

---

### Phase 3 — Service Worker Migration (Depends: none, parallel with Phase 0-2)

| Task | Description | Files | Effort |
|------|------------|-------|--------|
| T301 | Create custom SW file with push + notificationclick listeners | `client/src/sw.ts` | 45min |
| T302 | Update `vite.config.ts` to `injectManifest` strategy | `vite.config.ts` | 15min |
| T303 | Import workbox libraries in SW for caching (preserve existing behavior) | `client/src/sw.ts` | 30min |
| T304 | Handle `push` event: parse data, skip if app open, show notification | `client/src/sw.ts` | 20min |
| T305 | Handle `notificationclick` event: open/focus window with correct URL | `client/src/sw.ts` | 15min |
| T306 | Add badge icon for notification (72x72px white mono) | `client/public/icons/` | 10min |
| T307 | Handle SW lifecycle: install, activate, skipWaiting for prompt flow | `client/src/sw.ts` | 15min |

**Checkpoint**: Custom SW with push handling. PWA caching still works. Update prompt flow preserved.

---

### Phase 4 — Client Push Subscription Hook (Depends: Phase 1, Phase 3)

| Task | Description | Files | Effort |
|------|------------|-------|--------|
| T401 | Create `usePushNotifications` hook | `client/src/hooks/usePushNotifications.ts` | 45min |
| T402 | Implement `urlBase64ToUint8Array` utility | `client/src/hooks/usePushNotifications.ts` | 5min |
| T403 | Handle all permission states: default/granted/denied | `client/src/hooks/usePushNotifications.ts` | 15min |
| T404 | Auto-subscribe on login if permission already granted | `client/src/hooks/usePushNotifications.ts` | 10min |
| T405 | Unsubscribe on logout (cleanup subscriptions) | `client/src/hooks/usePushNotifications.ts` | 10min |
| T406 | Re-subscribe if endpoint changed (device change detection) | `client/src/hooks/usePushNotifications.ts` | 15min |

**Checkpoint**: Hook returns correct state for all permission scenarios. Subscription created on grant.

---

### Phase 5 — Permission UI Components (Depends: Phase 4)

| Task | Description | Files | Effort |
|------|------------|-------|--------|
| T501 | Create `PushPermissionBanner` component | `client/src/components/PushPermissionBanner.tsx` | 30min |
| T502 | Add tracking logic: max 2 lifetime shows, localStorage counters | `client/src/components/PushPermissionBanner.tsx` | 15min |
| T503 | Integrate banner in OrderConfirmation.tsx | `client/src/pages/OrderConfirmation.tsx` | 10min |
| T504 | Integrate banner in BaristaProfile.tsx (after first brew) | `client/src/pages/BaristaProfile.tsx` | 10min |
| T505 | Create `NotificationSettings` component for user profile | `client/src/components/NotificationSettings.tsx` | 30min |
| T506 | Create `AdminNotificationSettings` component with event toggles | `client/src/components/AdminNotificationSettings.tsx` | 30min |
| T507 | Add "Desuscribir dispositivo" with confirmation modal | `client/src/components/NotificationSettings.tsx` | 15min |

**Checkpoint**: Permission banner shows contextually. Settings work in profile and admin. Unsubscribe flow works.

---

### Phase 6 — Admin Notification Preferences (Depends: Phase 2, Phase 5)

| Task | Description | Files | Effort |
|------|------------|-------|--------|
| T601 | Create AdminNotificationPreference model + migrate | `schema.prisma` | 10min |
| T602 | `PUT /api/push/preferences` endpoint | `server/src/routes/push.ts` | 20min |
| T603 | `GET /api/push/preferences` endpoint | `server/src/routes/push.ts` | 10min |
| T604 | Filter push dispatch based on admin preferences | `server/src/socket.ts` | 20min |
| T605 | Wire up AdminNotificationSettings to API | `client/src/components/AdminNotificationSettings.tsx` | 15min |

**Checkpoint**: Admin can toggle event types. Only enabled events generate push notifications.

---

### Phase 7 — Edge Cases & Polish (Depends: all previous)

| Task | Description | Files | Effort |
|------|------------|-------|--------|
| T701 | Cascade delete subscriptions on user account deletion | Prisma schema (verify) | 5min |
| T702 | Add push notification tag/grouping to avoid duplicates | `client/src/sw.ts` | 10min |
| T703 | Handle iOS PWA limitations: graceful fallback message | `client/src/components/PushPermissionBanner.tsx` | 15min |
| T704 | Add animation to PushPermissionBanner (Framer Motion) | `client/src/components/PushPermissionBanner.tsx` | 15min |
| T705 | Add toast confirmation after subscribe/unsubscribe | `client/src/hooks/usePushNotifications.ts` | 10min |
| T706 | Accessibility: aria-live region for push status changes | All notification components | 15min |
| T707 | Error boundary for push subscription failures | `client/src/hooks/usePushNotifications.ts` | 10min |

**Checkpoint**: All edge cases handled. No console errors. Graceful degradation on unsupported browsers.

---

## Dependency Graph

```
Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ Phase 6
    │                      │            │
    │                      │            │
    └── Phase 3 ──→ Phase 4 ──→ Phase 5 ┘
                                    │
                                    │
                               Phase 7
```

Phases 0+3 can run in parallel. Phase 7 depends on everything else.

## File Change Summary

### New Files
```
server/src/routes/push.ts              — Push API endpoints
server/src/lib/push.ts                 — Push subscription DB helpers + web-push dispatch

client/src/sw.ts                       — Custom service worker
client/src/hooks/usePushNotifications.ts — Push subscription hook
client/src/components/PushPermissionBanner.tsx  — Contextual permission prompt
client/src/components/NotificationSettings.tsx  — User notification settings
client/src/components/AdminNotificationSettings.tsx — Admin event toggles
client/src/utils/base64.ts             — urlBase64ToUint8Array utility

specs/003-pwa-push-notifications/       — All design docs
```

### Modified Files
```
server/.env                              — Add VAPID_* keys
server/.env.example                      — Add VAPID_* keys placeholders
server/package.json                      — Add web-push dependency
server/prisma/schema.prisma              — Add PushSubscription model
server/src/index.ts                      — Register push routes, init web-push
server/src/socket.ts                     — Add push dispatch to emitEvent()

client/vite.config.ts                    — Switch to injectManifest strategy
client/src/pages/OrderConfirmation.tsx    — Add PushPermissionBanner
client/src/pages/BaristaProfile.tsx       — Add PushPermissionBanner
client/package.json                      — No new deps needed
```

### Files NOT Modified (architecture decision)
- `client/src/context/NotificationsContext.tsx` — Unchanged, Socket.IO flow remains
- `client/src/components/Toast.tsx` — Unchanged
- `client/src/lib/socket.ts` — Unchanged
- `client/src/context/ToastContext.tsx` — Unchanged

## Rollback Plan

If push notifications cause issues:
1. **Quick rollback**: Remove VAPID keys from `.env` → `web-push.sendNotification()` will throw, caught gracefully, no push sent. Socket.IO continues working.
2. **Full rollback**: Revert `vite.config.ts` to `registerType: 'prompt'` (generateSW), delete custom SW. This restores previous PWA behavior completely.
3. **Data rollback**: `npx prisma migrate down` to remove push_subscriptions table.
4. **API rollback**: Remove `/api/push/*` route registration from `server/src/index.ts`.

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Push delivery rate | >95% | Server logs: sent vs failed |
| Subscription opt-in rate | >30% | Users subscribed / total users |
| Permission prompt acceptance | >40% | Granted / shown |
| Push → app open rate | >20% | notificationclick → window open |
| Zero console errors | 100% | No push-related console errors |
| No regressions to existing notification flow | 100% | Socket.IO toasts still work identically |
