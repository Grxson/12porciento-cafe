# Data Model: PWA Push Notifications

## Prisma Schema

### PushSubscription

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String?
  endpoint  String   @unique
  p256dh    String
  auth      String
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("push_subscriptions")
}
```

**Notes**:
- `userId` nullable: anonymous visitors can subscribe (e.g., promo notifications)
- `endpoint` unique: cada suscripción es única por dispositivo
- Cascade delete: cuando se elimina el usuario, se eliminan sus suscripciones
- `userAgent` para depuración y analytics

### AdminNotificationPreference (optional, P2)

```prisma
model AdminNotificationPreference {
  id          String   @id @default(cuid())
  adminId     String
  eventType   String   // new_order, low_stock, new_review, etc.
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([adminId, eventType])
  @@map("admin_notification_preferences")
}
```

---

## API Contracts

### `POST /api/push/subscribe`

Register a new push subscription.

**Request**:
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BIPUL12DLf...",
    "auth": "eTqHkC4i..."
  }
}
```

**Response** `201`:
```json
{
  "ok": true,
  "id": "clx...",
  "message": "Suscripción registrada exitosamente"
}
```

**Response** `400`:
```json
{
  "error": "Invalid subscription object"
}
```

**Response** `409`:
```json
{
  "error": "Ya estás suscrito desde este dispositivo",
  "id": "clx..."
}
```

**Auth**: User token (subscripción ligada a usuario autenticado) o anónimo.

### `DELETE /api/push/subscribe`

Remove a push subscription.

**Request**:
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

**Response** `200`:
```json
{
  "ok": true,
  "message": "Suscripción eliminada"
}
```

**Response** `404`:
```json
{
  "error": "Suscripción no encontrada"
}
```

**Auth**: User token or admin token.

### `GET /api/push/subscriptions`

List user's active subscriptions.

**Response** `200`:
```json
{
  "subscriptions": [
    {
      "id": "clx...",
      "endpoint": "https://...",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-06-24T..."
    }
  ]
}
```

**Auth**: User token (propio) or admin token (all). Admin only.

### `POST /api/push/test`

Send a test notification.

**Request**:
```json
{
  "userId": "clx... (optional, sends to all admin if omitted)"
}
```

**Response** `200`:
```json
{
  "ok": true,
  "sent": 3,
  "failed": 0
}
```

**Auth**: Admin token only.

### `PUT /api/push/preferences`

Admin notification preferences (P2).

**Request**:
```json
{
  "new_order": true,
  "low_stock": true,
  "new_review": false
}
```

**Response** `200`:
```json
{
  "ok": true
}
```

**Auth**: Admin token only.

---

## VAPID Configuration (.env)

```
VAPID_PUBLIC_KEY=BBdB4Q...
VAPID_PRIVATE_KEY=3f3k...
VAPID_SUBJECT=mailto:gael.grxs@gmail.com
```

Generated with: `npx web-push generate-vapid-keys`
