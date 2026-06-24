# UI Contracts: PWA Push Notifications

## Component: PushPermissionBanner

Contextual banner shown after meaningful user actions (not on page load).

**States**:
| State | Trigger | Visual |
|-------|---------|--------|
| Hidden | Permission granted or denied already, or prompt already shown twice | `display: none` |
| Visible | After order confirmation OR after 2nd visit (whichever comes first), max 2 lifetime shows | Banner with icon + text + two buttons |
| Loading | User clicked "Permitir", waiting for browser dialog | Disabled buttons, spinner |
| Granted | User granted permission via browser dialog | Slide-out animation, disappears |
| Dismissed | User clicked "Ahora no" | Slide-up animation, stores dismissal count in localStorage |

**Position**: Below page header / inside page content (NOT fixed/overlay)
**Max lifetime shows**: 2 (tracked in localStorage as `push_prompt_count`)

```tsx
// Contract
interface PushPermissionBannerProps {
  onGranted?: () => void;
  onDismissed?: () => void;
}

// Usage: In OrderConfirmation.tsx, BaristaProfile.tsx
<PushPermissionBanner />
```

---

## Component: NotificationSettings

Section inside user profile or admin settings.

**States**:
| State | Trigger | Visual |
|-------|---------|--------|
| Loading | Fetching subscription status | Skeleton pulse |
| Unsupported | Browser doesn't support Push API | Message with icon |
| Default | Permission not yet requested | "Activar notificaciones" button |
| Denied | Permission blocked | Instructions to enable in browser settings |
| Subscribed | Active subscription | Event toggles + "Desuscribir" link + test button (admin) |
| Unsubscribing | User clicked "Desuscribir" | Confirmation modal |

**Admin-specific**: Event type toggles (checkbox list of all socket event types).

---

## Component: PushTestButton

Admin-only button for testing push delivery.

**States**:
| State | Trigger | Visual |
|-------|---------|--------|
| Idle | Default | "Enviar notificación de prueba" |
| Sending | Clicked, waiting for response | Spinner + "Enviando..." |
| Success | Response received | Checkmark + "Enviada" (auto-reset 3s) |
| Error | Network/server error | Red outline + error message |

---

## Push Notification Display

**Notification options**:
```typescript
{
  title: string;          // e.g., "☕ ¡Nuevo pedido!"
  body: string;           // e.g., "Pedido #123 de Juan Pérez — $450"
  icon: '/icons/pwa-192x192.png',
  badge: '/icons/badge-72.png',
  vibrate: [200, 100, 200],
  data: {
    url: '/admin/orders/123',
    event: 'new_order',
  },
  actions: [
    { action: 'open', title: 'Abrir' },
    { action: 'close', title: 'Cerrar' },
  ],
  tag: 'order:123',       // grouped by tag to avoid duplicates
  renotify: true,          // notify even if same tag exists
}
```

**Icon requirements**: 
- Badge icon: 72x72px, white/transparent, PNG
- Main icon: 192x192px, any color, PNG
- Already exists in `client/public/icons/`

**Notification click behavior**:
| Context | Action | Result |
|---------|--------|--------|
| App closed | Tap notification body | Open PWA, navigate to URL from data.url |
| App closed | Tap "Abrir" action button | Same as body tap |
| App closed | Tap "Cerrar" action button | Dismiss only |
| App open | Any action | Ignored (app handles via socket) |

---

## Visual Design

### Permission Banner
```
┌──────────────────────────────────────┐
│ 🔔                                  │
│ Recibe notificaciones de tus pedidos │
│ y descubre nuevos cafés.             │
│                                      │
│ [Permitir]   [Ahora no]              │
└──────────────────────────────────────┘
```
- Background: `bg-coffee-50 dark:bg-coffee-900`
- Border: `border-coffee-200 dark:border-coffee-800`
- Text: `text-coffee-700 dark:text-coffee-300`
- Button primary: `bg-gold-500 text-coffee-950`
- Button secondary: `border border-coffee-300 dark:border-coffee-700`
- Compact, no shadow, inline with content

### Notification Settings (Profile)
```
┌──────────────────────────────────────┐
│ Notificaciones push                  │
│                                      │
│ Estado: ✅ Activado                  │
│ Dispositivos: 2                      │
│                                      │
│ Recibir sobre:                       │
│ ☑ Nuevos pedidos (admin)            │
│ ☑ Stock bajo (admin)                │
│ ☐ Nuevas reseñas (admin)            │
│ ☑ Logros barista                     │
│ ☐ Promociones                        │
│                                      │
│ [Desuscribir este dispositivo]       │
│ [Enviar prueba] (admin only)         │
└──────────────────────────────────────┘
```

---

## Toast Behavior on Push

When the app IS open and a push arrives:
- Push notification is NOT shown (prevent double notification)
- Socket.IO toast fires as normal
- Rationale: Native push while app is open is confusing UX

Implementation: In the service worker `push` event, check `clients` for open windows.
```javascript
const hasOpenClients = await clients.matchAll({ type: 'window' }).then(c => c.length > 0);
if (hasOpenClients) return; // Don't show native notification, app will handle via socket
```
