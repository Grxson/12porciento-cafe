# Requirements Checklist: PWA Push Notifications

## Must Have (P0) — Release blocking
- [ ] VAPID keys generated and configured
- [ ] PushSubscription Prisma model + migration
- [ ] `POST /api/push/subscribe` — register push subscription
- [ ] `DELETE /api/push/subscribe` — remove subscription
- [ ] Service worker `push` event — show native notification
- [ ] Service worker `notificationclick` event — open relevant page
- [ ] `emitEvent()` dispatches push notifications to subscribers
- [ ] Expired subscriptions (410/404) auto-cleaned up
- [ ] Existing Socket.IO notification flow unchanged
- [ ] Existing PWA caching unchanged
- [ ] Works on Android Chrome PWA

## Should Have (P1) — High priority
- [ ] Skip push notification if app is already open (avoid duplicate with toast)
- [ ] Contextual permission prompt (after order, NOT on page load)
- [ ] Max 2 lifetime prompt shows
- [ ] User can subscribe/unsubscribe from profile settings
- [ ] Admin can send test notification
- [ ] `usePushNotifications` hook with all states handled
- [ ] Toast feedback on subscribe/unsubscribe
- [ ] Rate limiting: max 1 push per user per event per 5s

## Nice to Have (P2) — Post-MVP
- [ ] Admin event type toggles (choose which events push)
- [ ] AdminNotificationPreference model + API
- [ ] Multiple device support (one user, many subscriptions)
- [ ] Push subscription list in admin panel
- [ ] Notification grouping (tag field)
- [ ] Accessible permission banner (aria-live, focus management)
- [ ] Framer Motion animations on banner

## Deferred (P3) — Future
- [ ] Analytics dashboard: push delivery rate, opt-in rate
- [ ] Email fallback for browsers without Push API
- [ ] Custom notification sound
- [ ] Rich notifications with images
- [ ] Notification scheduling (e.g., "en 1 hora")
- [ ] Batch push sending with backpressure
- [ ] iOS <16.4 graceful message with instructions to use Safari browser
