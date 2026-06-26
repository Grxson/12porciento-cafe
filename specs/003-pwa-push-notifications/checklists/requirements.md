# Requirements Checklist: PWA Push Notifications

## Must Have (P0) — Release blocking
- [x] VAPID keys generated and configured
- [x] PushSubscription Prisma model + migration
- [x] `POST /api/push/subscribe` — register push subscription
- [x] `DELETE /api/push/subscribe` — remove subscription
- [x] Service worker `push` event — show native notification
- [x] Service worker `notificationclick` event — open relevant page
- [x] `emitEvent()` dispatches push notifications to subscribers
- [x] Expired subscriptions (410/404) auto-cleaned up
- [x] Existing Socket.IO notification flow unchanged
- [x] Existing PWA caching unchanged
- [x] Works on Android Chrome PWA (manual test needed)

## Should Have (P1) — High priority
- [x] Skip push notification if app is already open (avoid duplicate with toast)
- [x] Contextual permission prompt (after order, NOT on page load)
- [x] Max 2 lifetime prompt shows
- [x] User can subscribe/unsubscribe from profile settings
- [x] Admin can send test notification
- [x] `usePushNotifications` hook with all states handled
- [x] Toast feedback on subscribe/unsubscribe
- [x] Rate limiting: max 1 push per user per event per 5s

## Nice to Have (P2) — Post-MVP
- [x] Admin event type toggles (choose which events push)
- [x] AdminNotificationPreference model + API
- [x] Multiple device support (one user, many subscriptions)
- [x] Push subscription list in admin panel
- [x] Notification grouping (tag field)
- [x] Accessible permission banner (aria-live, focus management)
- [x] Framer Motion animations on banner
- [x] Auto-subscribe on login if permission granted
- [x] Auto-unsubscribe on logout
- [x] Badge icon (`client/public/icons/badge-72x72.png`)

## Deferred (P3) — Future
- [ ] Analytics dashboard: push delivery rate, opt-in rate
- [ ] Email fallback for browsers without Push API
- [ ] Custom notification sound
- [ ] Rich notifications with images
- [ ] Notification scheduling (e.g., "en 1 hora")
- [ ] Batch push sending with backpressure
- [ ] iOS <16.4 graceful message with instructions to use Safari browser
