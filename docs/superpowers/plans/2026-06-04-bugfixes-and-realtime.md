# Bugfixes + Real-Time Notifications Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix two data bugs (re-subscription blocked by cancelled email, profile reviews empty) and add Socket.io real-time notifications for admin and client.

**Architecture:** Two surgical backend/frontend fixes requiring 1-2 line changes each. Socket.io added as a singleton on the HTTP server; all existing route handlers emit events via a shared `emitEvent()` helper; frontend connects once via a singleton socket client and dispatches toast/badge notifications.

**Tech Stack:** socket.io (server), socket.io-client (client), React context for notification state, lucide-react for bell icon, existing toast system.

---

## Key Codebase Facts

- Server entry: `server/src/index.ts` — uses `app.listen()` (must swap to `http.createServer()` for Socket.io)
- Prisma singleton: `import { prisma } from '../db'`
- Frontend token: `localStorage.getItem('user_token')` (users) / `localStorage.getItem('admin_token')` (admin)
- Toast: already exists in project — check `client/src/components/Toast.tsx` or similar for import path
- Admin layout: `client/src/admin/AdminLayout.tsx` — has nav sidebar
- Client layout: uses `client/src/components/Navbar.tsx`
- Subscription create route: `server/src/routes/subscriptions.ts:31` — `findUnique({ where: { email } })` blocks cancelled re-subscribe
- Review userId bug: `client/src/pages/ProductDetail.tsx:63` — `reviewsApi.create(product.id, reviewForm)` — reviewForm has no `userId`

---

## File Map

### New Files
- `server/src/socket.ts` — Socket.io server singleton + `emitEvent()` helper
- `client/src/lib/socket.ts` — Socket.io client singleton
- `client/src/context/NotificationsContext.tsx` — React context for unread notification count + list
- `client/src/components/NotificationBell.tsx` — Bell icon with badge + dropdown for admin and client

### Modified Files
- `server/src/index.ts` — swap `app.listen` → `http.createServer`, attach Socket.io
- `server/src/routes/subscriptions.ts:31` — fix email unique check to exclude cancelled subs
- `server/src/routes/orders.ts` — emit `new_order` after order created
- `server/src/routes/reviews.ts` — emit `new_review` after review created, `review_approved` after approval
- `client/src/pages/ProductDetail.tsx:63` — send `userId: loggedUser?.id` in review create
- `client/src/admin/AdminLayout.tsx` — integrate NotificationBell
- `client/src/components/Navbar.tsx` — integrate NotificationBell for logged-in users
- `client/src/App.tsx` — wrap with NotificationsProvider

---

## Task 1: Fix re-subscription bug

**Files:**
- Modify: `server/src/routes/subscriptions.ts`

- [ ] **Step 1: Read the current file**

```bash
cat /home/grxson/github/12porciento-cafe/server/src/routes/subscriptions.ts | head -55
```

Confirm line 31 is: `const existing = await prisma.subscription.findUnique({ where: { email } });`

- [ ] **Step 2: Replace the duplicate-check query**

The `Subscription` schema has `email @unique`, meaning `findUnique({ where: { email } })` finds ANY subscription — even cancelled ones. A user who cancelled and wants to re-subscribe is blocked with "Ya existe una suscripción con este email".

**Before:**
```typescript
const existing = await prisma.subscription.findUnique({ where: { email } });
if (existing) {
  res.status(409).json({ error: 'Ya existe una suscripción con este email' });
  return;
}
```

**After:**
```typescript
const existing = await prisma.subscription.findFirst({
  where: { email, status: { in: ['ACTIVE', 'PAUSED'] } },
});
if (existing) {
  res.status(409).json({ error: 'Ya tienes una suscripción activa o pausada con este email' });
  return;
}
```

Note: Switch from `findUnique` to `findFirst` because the `where` clause is no longer on a `@unique` field alone.

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/grxson/github/12porciento-cafe/server
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/subscriptions.ts
git commit -m "fix: allow re-subscription after cancellation by checking only active/paused subs"
```

---

## Task 2: Fix profile reviews showing empty

**Files:**
- Modify: `client/src/pages/ProductDetail.tsx`

- [ ] **Step 1: Read the submit handler**

```bash
sed -n '53,70p' /home/grxson/github/12porciento-cafe/client/src/pages/ProductDetail.tsx
```

Confirm `reviewsApi.create(product.id, reviewForm)` does NOT include `userId`.

- [ ] **Step 2: Add userId to review create call**

The `handleReviewSubmit` function at line ~63 sends `reviewForm` which is `{ name, email, rating, comment }` — no `userId`. The backend stores `userId` if provided, and `GET /me/reviews` filters by `userId`. Users who never had `userId` stored will always see empty profile reviews.

Find the line:
```typescript
await reviewsApi.create(product.id, reviewForm);
```

Replace with:
```typescript
await reviewsApi.create(product.id, { ...reviewForm, userId: loggedUser?.id });
```

The variable `loggedUser` is already available in the component (it's the logged-in user from `useUser`). If the user is not logged in, `loggedUser?.id` is `undefined`, which is fine — backend skips `userId` when undefined.

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/grxson/github/12porciento-cafe/client
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/ProductDetail.tsx
git commit -m "fix: send userId when creating review so profile reviews page shows user's reviews"
```

---

## Task 3: Socket.io server setup

**Files:**
- Create: `server/src/socket.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Install socket.io**

```bash
cd /home/grxson/github/12porciento-cafe/server
npm install socket.io
```

- [ ] **Step 2: Create `server/src/socket.ts`**

```typescript
import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

let io: SocketServer | null = null;

export type EventName =
  | 'new_order'
  | 'order_status_changed'
  | 'new_review'
  | 'review_approved'
  | 'new_reply'
  | 'subscription_created'
  | 'subscription_cancelled';

export interface SocketEvent {
  event: EventName;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  targetUserId?: string; // if set, only emit to this user's room
}

export function initSocket(server: HttpServer): SocketServer {
  io = new SocketServer(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    path: '/socket.io',
  });

  io.on('connection', (socket: Socket) => {
    // Client sends token on connect for room assignment
    const token = socket.handshake.auth?.token as string | undefined;

    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: string };
        if (payload.role === 'ADMIN') {
          socket.join('admin');
        } else {
          socket.join(`user:${payload.id}`);
        }
      } catch {
        // Invalid token — socket stays in no room (can still get public events)
      }
    }

    socket.on('disconnect', () => {});
  });

  return io;
}

export function emitEvent(event: SocketEvent): void {
  if (!io) return;

  if (event.targetUserId) {
    // Send to specific user's room only
    io.to(`user:${event.targetUserId}`).emit(event.event, event);
    // Also send to admin room so admins see everything
    io.to('admin').emit(event.event, event);
  } else {
    // Broadcast to admin room
    io.to('admin').emit(event.event, event);
  }
}
```

- [ ] **Step 3: Update `server/src/index.ts`**

Read the file, then make these changes:

**Add imports at top:**
```typescript
import http from 'http';
import { initSocket } from './socket';
```

**Replace `app.listen(...)` with:**
```typescript
const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Café 12% server running on port ${PORT}`);
});
```

Remove or replace the old `app.listen(PORT, ...)` call.

- [ ] **Step 4: Verify TypeScript**

```bash
cd /home/grxson/github/12porciento-cafe/server
npx tsc --noEmit
```

Fix any errors.

- [ ] **Step 5: Commit**

```bash
git add server/src/socket.ts server/src/index.ts
git commit -m "feat: add Socket.io server with room-based auth (admin room + user rooms)"
```

---

## Task 4: Emit events from backend routes

**Files:**
- Modify: `server/src/routes/orders.ts`
- Modify: `server/src/routes/reviews.ts`
- Modify: `server/src/routes/subscriptions.ts`
- Modify: `server/src/routes/users.ts`

- [ ] **Step 1: Read orders.ts to find order creation point**

```bash
cat /home/grxson/github/12porciento-cafe/server/src/routes/orders.ts | head -80
```

Find where `prisma.order.create(...)` returns successfully.

- [ ] **Step 2: Emit `new_order` in orders.ts**

After a successful order creation (after `res.status(201).json(order)`), add the emit. Because `res` sends before we emit (fire-and-forget), place the emit BEFORE `res.json`:

Add import at top of file:
```typescript
import { emitEvent } from '../socket';
```

After `const order = await prisma.order.create(...)` and before `res.status(201).json(order)`:
```typescript
emitEvent({
  event: 'new_order',
  title: 'Nuevo pedido',
  message: `Pedido de ${order.customerName} — $${order.total.toFixed(2)} MXN`,
  data: { orderId: order.id, total: order.total, customerName: order.customerName },
});
```

- [ ] **Step 3: Emit `new_review` in reviews.ts**

Add import at top:
```typescript
import { emitEvent } from '../socket';
```

In `POST /product/:productId`, after `const review = await prisma.review.create(...)` and before `res.status(201).json(...)`:
```typescript
emitEvent({
  event: 'new_review',
  title: 'Nueva reseña',
  message: `${review.name} dejó una reseña — ${review.rating}★`,
  data: { reviewId: review.id, productId: review.productId, rating: review.rating },
});
```

In `PUT /:id/approve`, after `prisma.review.update(...)` succeeds and before `res.json(...)`:
```typescript
emitEvent({
  event: 'review_approved',
  title: 'Reseña aprobada',
  message: `Tu reseña ha sido aprobada`,
  data: { reviewId: review.data.id, productId: review.data.productId },
  targetUserId: review.data.userId ?? undefined,
});
```

Note: `review` in that handler is `{ data: reviewObj }` — adjust field access to match actual variable name in the handler.

- [ ] **Step 4: Emit `subscription_created` in subscriptions.ts**

Add import at top:
```typescript
import { emitEvent } from '../socket';
```

In `POST /`, after `const subscription = await prisma.subscription.create(...)` and before `res.status(201).json(subscription)`:
```typescript
emitEvent({
  event: 'subscription_created',
  title: 'Nueva suscripción',
  message: `${subscription.name} se suscribió al plan ${subscription.plan}`,
  data: { subscriptionId: subscription.id, plan: subscription.plan },
});
```

- [ ] **Step 5: Emit `subscription_cancelled` in users.ts**

Add import at top of users.ts:
```typescript
import { emitEvent } from '../socket';
```

In `PUT /me/subscription/:id/status`, after `prisma.subscription.update(...)` when `status === 'CANCELLED'`:

Find the update call, then add after it when status is CANCELLED:
```typescript
if (status === 'CANCELLED') {
  emitEvent({
    event: 'subscription_cancelled',
    title: 'Suscripción cancelada',
    message: `Suscripción ${sub.plan} cancelada`,
    data: { subscriptionId: sub.id, plan: sub.plan },
    targetUserId: req.user!.id,
  });
}
```

- [ ] **Step 6: Verify TypeScript**

```bash
cd /home/grxson/github/12porciento-cafe/server
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/orders.ts server/src/routes/reviews.ts server/src/routes/subscriptions.ts server/src/routes/users.ts
git commit -m "feat: emit Socket.io events from order, review, and subscription routes"
```

---

## Task 5: Socket.io client singleton

**Files:**
- Create: `client/src/lib/socket.ts`

- [ ] **Step 1: Install socket.io-client**

```bash
cd /home/grxson/github/12porciento-cafe/client
npm install socket.io-client
```

- [ ] **Step 2: Create `client/src/lib/socket.ts`**

```typescript
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token =
      window.location.pathname.startsWith('/admin')
        ? localStorage.getItem('admin_token')
        : localStorage.getItem('user_token');

    socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || '', {
      path: '/socket.io',
      auth: { token: token ?? '' },
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export type { Socket };
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /home/grxson/github/12porciento-cafe/client
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add client/src/lib/socket.ts
git commit -m "feat: add Socket.io client singleton with token-based auth"
```

---

## Task 6: Notifications context

**Files:**
- Create: `client/src/context/NotificationsContext.tsx`

- [ ] **Step 1: Create NotificationsContext.tsx**

```typescript
import { createContext, useContext, useEffect, useReducer, useRef, ReactNode } from 'react';
import { getSocket, disconnectSocket } from '../lib/socket';

export interface Notification {
  id: string;
  event: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date;
  read: boolean;
}

interface State {
  notifications: Notification[];
  unreadCount: number;
}

type Action =
  | { type: 'ADD'; notification: Notification }
  | { type: 'MARK_ALL_READ' }
  | { type: 'CLEAR' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD':
      return {
        notifications: [action.notification, ...state.notifications].slice(0, 50),
        unreadCount: state.unreadCount + 1,
      };
    case 'MARK_ALL_READ':
      return {
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      };
    case 'CLEAR':
      return { notifications: [], unreadCount: 0 };
    default:
      return state;
  }
}

interface NotificationsContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => void;
  clear: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  clear: () => {},
});

const SOCKET_EVENTS = [
  'new_order',
  'order_status_changed',
  'new_review',
  'review_approved',
  'new_reply',
  'subscription_created',
  'subscription_cancelled',
] as const;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { notifications: [], unreadCount: 0 });
  const connectedRef = useRef(false);

  useEffect(() => {
    if (connectedRef.current) return;
    connectedRef.current = true;

    const socket = getSocket();

    const handleEvent = (payload: { event: string; title: string; message: string; data?: Record<string, unknown> }) => {
      dispatch({
        type: 'ADD',
        notification: {
          id: `${Date.now()}-${Math.random()}`,
          event: payload.event,
          title: payload.title,
          message: payload.message,
          data: payload.data,
          timestamp: new Date(),
          read: false,
        },
      });
    };

    SOCKET_EVENTS.forEach((ev) => socket.on(ev, handleEvent));

    return () => {
      SOCKET_EVENTS.forEach((ev) => socket.off(ev, handleEvent));
      disconnectSocket();
      connectedRef.current = false;
    };
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        markAllRead: () => dispatch({ type: 'MARK_ALL_READ' }),
        clear: () => dispatch({ type: 'CLEAR' }),
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/grxson/github/12porciento-cafe/client
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add client/src/context/NotificationsContext.tsx
git commit -m "feat: add NotificationsContext consuming Socket.io events"
```

---

## Task 7: NotificationBell component + layout integration

**Files:**
- Create: `client/src/components/NotificationBell.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/admin/AdminLayout.tsx`
- Modify: `client/src/components/Navbar.tsx`

- [ ] **Step 1: Create `client/src/components/NotificationBell.tsx`**

```typescript
import { useRef, useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../context/NotificationsContext';

const EVENT_ICONS: Record<string, string> = {
  new_order: '🛒',
  order_status_changed: '📦',
  new_review: '⭐',
  review_approved: '✅',
  new_reply: '💬',
  subscription_created: '☕',
  subscription_cancelled: '❌',
};

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) markAllRead();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 text-coffee-400 hover:text-cream transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-coffee-900 border border-coffee-700 shadow-xl z-50 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-coffee-800 flex items-center justify-between">
            <p className="text-xs font-semibold text-cream uppercase tracking-wider">Notificaciones</p>
            {notifications.length > 0 && (
              <button
                onClick={() => setOpen(false)}
                className="text-xs text-coffee-500 hover:text-coffee-300 transition-colors"
              >
                Cerrar
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-coffee-500 text-sm text-center py-8">Sin notificaciones</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-coffee-800/60 ${!n.read ? 'bg-coffee-800/30' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-base leading-none mt-0.5">
                      {EVENT_ICONS[n.event] ?? '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-cream">{n.title}</p>
                      <p className="text-xs text-coffee-400 mt-0.5 break-words">{n.message}</p>
                      <p className="text-xs text-coffee-600 mt-1">
                        {n.timestamp.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wrap App with NotificationsProvider in `client/src/App.tsx`**

Read `client/src/App.tsx`. Add the import:
```typescript
import { NotificationsProvider } from './context/NotificationsContext';
```

Wrap the entire return JSX with `<NotificationsProvider>`:
```typescript
return (
  <NotificationsProvider>
    {/* existing JSX */}
  </NotificationsProvider>
);
```

- [ ] **Step 3: Add NotificationBell to AdminLayout**

Read `client/src/admin/AdminLayout.tsx`. Find the top header bar area (where it renders the page title and logout button). Add the bell next to the logout button:

```typescript
import NotificationBell from '../components/NotificationBell';
```

In the header JSX (look for `<button onClick={handleLogout}...>`), add BEFORE the logout button:
```typescript
<NotificationBell />
```

- [ ] **Step 4: Add NotificationBell to Navbar for logged-in users**

Read `client/src/components/Navbar.tsx`. Find where the user avatar/account area is rendered for logged-in users. Add the bell there:

```typescript
import NotificationBell from './NotificationBell';
```

Inside the logged-in user section (look for `user &&` or similar conditional), add:
```typescript
{user && <NotificationBell />}
```

- [ ] **Step 5: Verify TypeScript**

```bash
cd /home/grxson/github/12porciento-cafe/client
npx tsc --noEmit
```

Fix any errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/components/NotificationBell.tsx client/src/App.tsx client/src/admin/AdminLayout.tsx client/src/components/Navbar.tsx
git commit -m "feat: add NotificationBell component with real-time event notifications"
```

---

## Self-Review Checklist

**Spec coverage:**
1. ✅ Re-subscription bug — Task 1: `findFirst` with `status: { in: ['ACTIVE', 'PAUSED'] }`
2. ✅ Profile reviews empty — Task 2: send `userId` in `reviewsApi.create` call
3. ✅ Socket.io server — Task 3: singleton + `emitEvent()` helper + room auth
4. ✅ Events emitted from routes — Task 4: orders, reviews, subscriptions, users
5. ✅ Socket.io client — Task 5: singleton with token auth
6. ✅ Notifications state — Task 6: context with reducer, subscribe to all events
7. ✅ Notification UI — Task 7: bell + dropdown in admin and client navbar

**No placeholders:** All steps have concrete code.

**Type consistency:**
- `SocketEvent.event` is `EventName` type throughout Tasks 3, 4
- `Notification.event` is `string` in context (broader, receives from server)
- `emitEvent()` signature used consistently in Task 4
