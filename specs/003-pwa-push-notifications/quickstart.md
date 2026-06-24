# Quickstart: PWA Push Notifications

## Validation Scenarios

Run these manually after each phase to catch regressions early.

### Phase 1 — Server Setup (Prisma + API)
```bash
# Verify migration
npx prisma migrate dev --name add_push_subscription
npx prisma db push

# Manual curl test
curl -X POST http://localhost:3001/api/push/subscribe \
  -H "Content-Type: application/json" \
  -d '{"endpoint":"https://example.com","keys":{"p256dh":"test","auth":"test"}}'
# Expected: 201 { ok: true, id: "..." }
```

### Phase 2 — Client Subscription (Hook + SW)
- [ ] Open app, check browser console for "Push API supported: true/false"
- [ ] Grant notification permission via browser (lock icon)
- [ ] Verify `POST /api/push/subscribe` called in network tab
- [ ] Verify subscription stored in database
- [ ] Revoke permission, verify `DELETE /api/push/subscribe` called

### Phase 3 — Push Delivery
- [ ] Trigger event from server console: `emitEvent({ event: 'new_order', ... })`
- [ ] Verify push notification appears as OS notification
- [ ] Tap notification → verify app opens to correct URL
- [ ] Verify in-app toast is NOT shown when app is open AND push is received

### Phase 4 — Admin + Settings
- [ ] Admin: toggle event types off, trigger event, verify NO push
- [ ] Admin: click "Enviar prueba", verify push arrives
- [ ] User profile: see subscription status
- [ ] Unsubscribe from settings, verify database record deleted

### Edge Cases
- [ ] Suscripción expirada (410): verify auto-cleanup in server logs
- [ ] Two devices same user: both receive push
- [ ] Delete user account: verify subscriptions cascade-deleted
- [ ] Multiple tabs: only one push notification (tag grouping)
