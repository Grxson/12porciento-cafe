# Research: PWA Push Notifications

## Current State

### Socket.IO (real-time when app is open)
- Server: `server/src/socket.ts` — autenticación JWT, salas `user:{id}` y `admin`
- Client: `client/src/lib/socket.ts` — conexión Socket.IO-client, reconexión automática
- Eventos: `new_order`, `order_status_changed`, `new_review`, `review_approved`, `new_reply`, `subscription_created`, `subscription_cancelled`, `low_stock`
- Alcance: Solo funciona con app abierta. En background/mobile sleep → conexión muere.

### Toast in-app
- `client/src/context/ToastContext.tsx` — Zustand store, toasts con auto-dismiss 3.5s
- `client/src/components/Toast.tsx` — Framer Motion, fixed bottom-right
- Alcance: Solo visible si la app está en primer plano.

### NotificationBell
- `client/src/components/NotificationBell.tsx` — Dropdown de notificaciones
- `client/src/context/NotificationsContext.tsx` — Reducer, almacena últimas 50 notificaciones
- Alcance: Solo visible dentro de la app.

### PWA Config
- `client/vite.config.ts` — `VitePWA` con `registerType: 'prompt'`
- Sin configuración de push notifications
- Sin custom service worker
- Sin `injectManifest` strategy

## What Needs to Be Built

### 1. VAPID Keys (Web Push Protocol)
- Protocolo estandarizado W3C para push notifications en browsers
- Par de llaves: `publicKey` (para el cliente) y `privateKey` (para el servidor)
- Generar con: `npx web-push generate-vapid-keys`
- Almacenar en `.env`: `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`
- Configurar `VAPID_SUBJECT` (mailto o URL del proyecto)

### 2. Prisma Schema — PushSubscription
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
}
```
- `userId` nullable para suscripciones anónimas (visitantes que quieren notificaciones de promos)
- `endpoint` unique porque cada dispositivo/suscripción es única
- `userAgent` para depuración

### 3. Server Endpoints

#### `POST /api/push/subscribe`
- Body: `{ endpoint, p256dh, auth, userId? }`
- Guarda o actualiza suscripción
- Valida estructura del push subscription object

#### `DELETE /api/push/subscribe`
- Body: `{ endpoint }`
- Elimina suscripción (útil cuando expira o el usuario revoca permisos)

#### `POST /api/push/test`
- Admin-only: enviar notificación push de prueba a un usuario o a todos

### 4. Server Push Integration

Modificar `emitEvent()` en `server/src/socket.ts`:
```typescript
import webpush from 'web-push';

// Configurar VAPID al inicio
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

// En emitEvent():
async function sendPushNotification(event: SocketEvent) {
  const where = event.targetUserId
    ? { userId: event.targetUserId }
    : {}; // o para admins específicos

  const subs = await prisma.pushSubscription.findMany({ where });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({
          title: event.title,
          message: event.message,
          event: event.event,
          data: event.data,
          timestamp: new Date().toISOString(),
        }),
      );
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Suscripción expirada o inválida — limpiar
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
      }
    }
  }
}
```

Consideraciones:
- `webpush.sendNotification()` puede fallar con 410 (expired) o 404 (invalid endpoint)
- No bloquear el evento principal por fallos de push
- Rate limiting: no más de 1 push por evento por usuario
- Batching para múltiples suscripciones

### 5. Client — Service Worker Push Event

`vite-plugin-pwa` con `injectManifest` strategy permite tener control total del SW.

```javascript
// public/sw.js — Custom service worker
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.message,
    icon: '/icons/pwa-192x192.png',
    badge: '/icons/badge-icon.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.data?.url || '/',
      event: data.event,
    },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Cerrar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        const existing = windowClients.find(c => c.url === urlToOpen);
        if (existing) {
          existing.focus();
        } else {
          clients.openWindow(urlToOpen);
        }
      })
  );
});
```

**Alternativa**: Usar `injectManifest` en vez de `generateSW` (strategy actual).
Seedería cambiar en `vite.config.ts`:
```typescript
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.ts',
  // ...rest
})
```

Ventaja: control total del SW, tipado TypeScript.
Desventaja: hay que manejar caching manualmente (workbox todavía disponible).

**Recomendación**: Usar `injectManifest` con un SW mínimo que:
1. Extienda el caching de workbox (importando `workbox-*`)
2. Agregue listener `push`
3. Agregue listener `notificationclick`

### 6. Client — Push Subscription Hook

```typescript
// client/src/hooks/usePushNotifications.ts
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported('Notification' in window && 'serviceWorker' in navigator);
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      await subscribe();
    }
  };

  const subscribe = async () => {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    // Enviar sub al server
    await api.post('/push/subscribe', sub.toJSON());
    setSubscribed(true);
  };

  const unsubscribe = async () => {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await api.delete('/push/subscribe', { data: { endpoint: sub.endpoint } });
      setSubscribed(false);
    }
  };

  return { supported, permission, subscribed, requestPermission, unsubscribe };
}
```

### 7. Notification Permission Prompt UI

Mostrar prompt contextual (NO en carga inicial):
- Después de completar primera orden
- Al activar recordatorios en barista
- En página de configuración de notificaciones

Diseño: Banner suave (no modal bloqueante) con:
- Icono de campana
- "Recibe notificaciones sobre tus pedidos y cafés"
- Botones: "Permitir" / "Ahora no"

### 8. Notification Settings Page/Section

Agregar sección en el perfil de usuario:
- Toggle "Notificaciones push"
- Estado actual (activado/desactivado)
- Botón para probar notificación
- Lista de dispositivos suscritos

## Edge Cases & Risks

### Push Subscription Expiration
- Browser endpoints pueden expirar (Chrome 90d sin visitar)
- Enviar push falla con 410 → eliminar suscripción automáticamente
- En cada carga de app, verificar si la suscripción actual sigue siendo válida

### Permission Denied
- Si usuario bloquea, no se puede pedir de nuevo (hay que ir a settings del browser)
- Mostrar mensaje instructivo: "Para activar notificaciones, ve a Configuración > Notificaciones"

### Multiple Tabs/Devices
- Un usuario puede tener múltiples suscripciones (varios dispositivos)
- Server debe enviar push a TODAS las suscripciones del usuario
- Al hacer unsubscribe desde un dispositivo, solo eliminar esa suscripción

### iOS Safari PWA Limitations
- iOS Safari no soporta Push API en PWA (limitación WebKit)
- Las notificaciones push solo funcionan en Safari (browser), no en PWA standalone
- A partir de iOS 16.4, Safari soporta push notifications vía Web Push
- REALIDAD 2026: iOS 17+ ya soporta Web Push para PWAs agregadas al Home Screen
- Pero: requiere que el usuario agregue la PWA al Home Screen y conceda permiso explícitamente
- Estrategia: implementar para todos los browsers, documentar limitación iOS legacy

### Notification Not Delivered
- Muchos factores: battery saver, modo no molestar, conexión
- No garantizar entrega 100%
- Socket.IO sigue siendo el canal principal para app abierta

### VAPID Key Rotation
- Si se rotan las keys, todas las suscripciones existentes se invalidan
- Plan: documentar procedimiento, reinvitación masiva a suscribirse

## Dependencies

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `web-push` | ^3.6 | Server-side push notification sending |
| `@types/web-push` | ^3.6 | TypeScript types |

Nota: `web-push` es la librería estándar/única para enviar push notifications via Web Push Protocol desde Node.js.

## Security Considerations

- VAPID private key NUNCA debe exponerse al cliente
- `endpoint`, `p256dh`, `auth` son datos sensibles (identifican dispositivo)
- Migración: agregar columna cifrada si hay requisitos de privacidad
- Las suscripciones deben eliminarse al eliminar cuenta de usuario (cascade)
- Rate limiting en endpoint de suscripción para evitar spam
