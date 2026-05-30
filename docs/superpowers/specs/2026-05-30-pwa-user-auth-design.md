# PWA + User Auth + Recipes Offline — Design Spec
**Date:** 2026-05-30  
**Project:** Café 12% — `cafeteria` monorepo  
**Stack:** React + Vite + Tailwind (client) / Express + Prisma + SQLite (server) / Docker

---

## Scope

Add three interconnected systems to the existing app:

1. **PWA Infrastructure** — installable, cacheable, offline-capable
2. **User Auth** — register/login for end customers (separate from existing admin auth)
3. **Recipes: download + offline** — PDF export per recipe; cached offline for logged-in users

Existing admin auth (`AdminUser` model, `/admin/*` routes, `admin_token`) is **unchanged**.

---

## 1. PWA Infrastructure

### Tool
`vite-plugin-pwa` (wraps Workbox). Added to `client/` devDependencies.

### Manifest (`manifest.webmanifest`)
```json
{
  "name": "12% Café de Especialidad",
  "short_name": "12%",
  "description": "Café de especialidad mexicano. Origen único, trazabilidad total.",
  "theme_color": "#0d0806",
  "background_color": "#0d0806",
  "display": "standalone",
  "start_url": "/",
  "icons": [
    { "src": "/icons/pwa-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/pwa-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/pwa-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

### Caching Strategies (Workbox)
| Pattern | Strategy | Purpose |
|---------|----------|---------|
| `/api/*` | NetworkFirst, 5s timeout | API data: always fresh when online |
| `*.js, *.css, *.woff2` | CacheFirst, 30d | Static assets |
| `*.png, *.jpg, *.webp` | CacheFirst, 7d | Product images |
| `/recetas` (HTML shell) | StaleWhileRevalidate | Recipes page shell always available |
| Unsplash images | CacheFirst, 7d | Recipe/hero images |

### Offline Fallback
- `client/public/offline.html` — minimal branded page shown when network fails and content isn't cached
- Shows "Sin conexión" with link back to cached home

### Precache on Login
- When user logs in, SW receives a `PRECACHE_RECIPES` message via `postMessage`
- SW fetches and caches `/recetas` + all product recipe images
- Implementation: `navigator.serviceWorker.controller.postMessage({ type: 'PRECACHE_RECIPES' })` called from `UserContext` after successful login

---

## 2. User Auth

### Approach
Separate `User` model from existing `AdminUser`. Two token namespaces in localStorage:
- `admin_token` — existing, unchanged
- `user_token` — new, for customer accounts

### Prisma Schema Additions

```prisma
model User {
  id           String         @id @default(cuid())
  name         String
  email        String         @unique
  password     String
  phone        String?
  address      String?
  city         String?
  state        String?
  zipCode      String?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  orders       Order[]
  reviews      Review[]
  subscriptions Subscription[]
}
```

Add optional FK to existing models:
```prisma
// Order — add:
userId    String?
user      User?   @relation(fields: [userId], references: [id])

// Review — add:
userId    String?
user      User?   @relation(fields: [userId], references: [id])

// Subscription — add:
userId    String?
user      User?   @relation(fields: [userId], references: [id])
```

### Backend Routes (`/api/users`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/users/register` | none | Create account (name, email, password) |
| POST | `/api/users/login` | none | Returns `user_token` JWT (24h expiry) |
| GET | `/api/users/me` | user | Get profile |
| PUT | `/api/users/me` | user | Update name, phone, address fields |
| GET | `/api/users/me/orders` | user | Order history (newest first) |
| GET | `/api/users/me/reviews` | user | Reviews submitted by this user |
| GET | `/api/users/me/subscription` | user | Active subscription, null if none |
| PUT | `/api/users/me/subscription/:id/status` | user | Cancel or pause own subscription |

### Middleware
New `requireUserAuth` middleware in `server/src/middleware/userAuth.ts`:
- Reads `Authorization: Bearer <token>` header
- Verifies against `process.env.JWT_SECRET` (same secret, different payload shape)
- JWT payload: `{ id, email, name, role: 'USER' }`
- Admin JWT payload: `{ id, email, name }` (no role field — distinguishable)
- Attaches `req.user` to request

### Axios Interceptor Update
`client/src/api/index.ts` — interceptor updated to:
1. If `admin_token` exists AND request is to `/admin/*` or method is admin-only → send `admin_token`
2. Else if `user_token` exists → send `user_token`
3. On 401 with `user_token` → clear `user_token`, redirect to `/login`

---

## 3. Frontend — User Auth

### New Files
```
client/src/context/UserContext.tsx     — Zustand store (user state, login, logout, register)
client/src/pages/Login.tsx             — Login form + link to register
client/src/pages/Register.tsx          — Registration form
client/src/pages/Profile.tsx           — Profile shell with tab navigation
client/src/pages/profile/Orders.tsx    — Order history tab
client/src/pages/profile/Reviews.tsx   — My reviews tab
client/src/pages/profile/Subscription.tsx — Subscription management tab
client/src/pages/profile/Settings.tsx  — Edit name, phone, default address
```

### UserContext (Zustand + persist)
```typescript
interface UserStore {
  user: { id, name, email, phone?, address?, city?, state?, zipCode? } | null;
  token: string | null;
  login: (email, password) => Promise<void>;
  register: (name, email, password) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;        // re-fetches /me
  hasSubscription: boolean;            // derived, set on refresh
}
```
Persisted to `localStorage` key `cafe-12-user`.

### Routes Added to App.tsx
```
/login          → <Login />
/registro       → <Register />
/perfil         → <UserRoute><Profile /></UserRoute>  (redirect to /login if not authed)
/perfil/pedidos → tab inside Profile
/perfil/resenas → tab inside Profile
/perfil/suscripcion → tab inside Profile
/perfil/configuracion → tab inside Profile
```

`UserRoute` guard: if no `user_token`, redirect to `/login?redirect=<current_path>`.

### Navbar Changes
- Add user avatar icon (right side, before cart icon)
- If logged in: avatar → dropdown with "Mi perfil", "Cerrar sesión"
- If not logged in: icon → `/login`

### Checkout Post-Confirmation Enhancement
After successful order:
- If user is logged in: link order to `userId` (sent in request body)
- If NOT logged in: show "¿Quieres rastrear este pedido? Crea tu cuenta con el mismo email" CTA
  - Button opens `/registro?email=<prefilled_email>` 
  - On register with matching email, backend links unmatched orders by email retroactively

---

## 4. Recipes — Download + Offline

### PDF Download
Library: `jspdf` (lightweight, no rendering engine needed).

Each recipe method card gets a "Descargar PDF" button (always visible, no auth required).

PDF content per recipe:
```
[Logo: 12%]
[Method Name]  [Product Name]
─────────────────────────────
Parámetros: Temperatura · Molido · Ratio · Tiempo
─────────────────────────────
Pasos:
  1. ...
  2. ...
  n. ...
─────────────────────────────
12% Café de Especialidad — 12porciento.com
```

Generated client-side, triggered by button click. No server call needed.

### Offline Caching for Logged-In Users
When a user logs in:
1. `UserContext.login()` calls `navigator.serviceWorker?.controller?.postMessage({ type: 'PRECACHE_RECIPES' })`
2. Service Worker handles `PRECACHE_RECIPES`:
   - Fetches `/api/products?category=CAFÉ` 
   - Caches the JSON response in a dedicated `recipes-cache` cache store
   - Caches all `imageUrl` values from products in `recipes-images` cache store
3. `/recetas` page shell is already cached via StaleWhileRevalidate strategy

Offline experience for logged-in user:
- Opens `/recetas` → shell loads from cache
- Product/recipe data loads from `recipes-cache`
- Images load from `recipes-images`
- Download PDF works offline (pure client-side)

Offline experience for anonymous user:
- `/recetas` shell may or may not be cached (StaleWhileRevalidate only caches after first visit)
- API call fails → shows "Conecta a internet para ver recetas" empty state

### No "Premium Recipes" Gate (deferred)
Keeping all recipes public for now. Premium tier can be added later by adding `isPremium: boolean` to the Recipe JSON type and a paywall UI. Deferred to avoid scope creep.

---

## 5. Data Migration

Single Prisma migration: `add_user_model_and_fks`
- Creates `User` table
- Adds nullable `userId` columns to `Order`, `Review`, `Subscription`
- No data loss — all existing anonymous records remain valid

Seed adds no default User (admin seed unchanged).

---

## 6. Docker

No changes to `docker-compose.yml`. The new `vite-plugin-pwa` generates SW and manifest at build time — the Nginx container in `client/` serves them as static files. No new services needed.

The `client/Dockerfile` already runs `tsc && vite build` — SW and manifest will be emitted automatically.

---

## 7. What This Does NOT Include

- Payment integration (still "pago por transferencia")
- Email verification (can be added later)
- Password reset flow (deferred)
- Push notifications (deferred)
- Social login (deferred)
- Premium recipe paywall (deferred)

---

## Acceptance Criteria

- [ ] App shows "Add to Home Screen" prompt on mobile Chrome/Safari
- [ ] Logged-in user can visit `/recetas` with airplane mode ON and see recipes
- [ ] Anonymous user sees offline fallback page on uncached routes with no internet
- [ ] User can register, log in, and see their order history at `/perfil/pedidos`
- [ ] Checkout pre-fills address if user is logged in with a saved address
- [ ] Post-checkout (anonymous) shows "Crea tu cuenta" CTA
- [ ] "Descargar PDF" button generates and downloads a recipe PDF without server call
- [ ] Existing admin flow (`/admin/login`, `/admin/dashboard`) works exactly as before
- [ ] TypeScript compiles with zero errors
