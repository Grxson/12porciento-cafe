# PWA + User Auth + Recipes Offline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PWA installability + customer accounts (register/login/profile/order history) + offline recipe caching + recipe PDF download to the Café 12% monorepo.

**Architecture:** Separate `User` Prisma model from existing `AdminUser`; new `/api/users` Express router with `requireUserAuth` middleware using role-tagged JWTs (`role: 'USER'`); Zustand `UserContext` persisted to localStorage; `vite-plugin-pwa` (Workbox `generateSW` mode) for SW + manifest; `jspdf` for client-side recipe PDFs. Docker CMD already runs `prisma db push` on server startup — schema changes apply automatically.

**Tech Stack:** Prisma 5 (SQLite), Express, bcryptjs, jsonwebtoken (all already installed server-side); vite-plugin-pwa, jspdf (new client deps); React, Zustand, Tailwind, TypeScript.

---

## File Map

**New server files:**
- `server/src/middleware/userAuth.ts` — `requireUserAuth` middleware
- `server/src/routes/users.ts` — all `/api/users/*` endpoints

**Modified server files:**
- `server/prisma/schema.prisma` — add `User` model, add optional `userId` FK to `Order`, `Review`, `Subscription`
- `server/src/middleware/auth.ts` — reject `role:'USER'` tokens from admin routes
- `server/src/routes/orders.ts` — accept optional `userId` in POST body
- `server/src/index.ts` — register `/api/users` router

**New client files:**
- `client/public/icons/logo.svg` — SVG source for icon generation
- `client/public/icons/pwa-192x192.png` — generated PWA icon
- `client/public/icons/pwa-512x512.png` — generated PWA icon
- `client/public/icons/maskable-icon-512x512.png` — generated maskable icon
- `client/src/context/UserContext.tsx` — Zustand user store
- `client/src/pages/Login.tsx`
- `client/src/pages/Register.tsx`
- `client/src/pages/Profile.tsx` — shell with tab nav
- `client/src/pages/profile/Settings.tsx`
- `client/src/pages/profile/Orders.tsx`
- `client/src/pages/profile/Reviews.tsx`
- `client/src/pages/profile/Subscription.tsx`
- `client/src/components/UserMenu.tsx`

**Modified client files:**
- `client/vite.config.ts` — add VitePWA plugin
- `client/index.html` — add apple-touch-icon meta
- `client/package.json` — new deps
- `client/src/types/index.ts` — add `UserProfile`
- `client/src/api/index.ts` — add `usersApi`, fix interceptor
- `client/src/context/CartContext.tsx` — no change (already works)
- `client/src/App.tsx` — add new routes + `UserRoute` guard
- `client/src/components/Navbar.tsx` — add `UserMenu`
- `client/src/pages/Checkout.tsx` — pre-fill address, send userId, post-CTA
- `client/src/pages/Recipes.tsx` — add PDF download button

---

## Task 1: Install Client Dependencies

**Files:** `client/package.json`

- [ ] Install `vite-plugin-pwa` and `jspdf`:

```bash
pnpm add vite-plugin-pwa jspdf --filter cafe-12-client
pnpm add -D @vite-pwa/assets-generator --filter cafe-12-client
```

- [ ] Verify additions in `client/package.json` — should show `vite-plugin-pwa`, `jspdf` in dependencies and `@vite-pwa/assets-generator` in devDependencies.

- [ ] Commit:

```bash
git add client/package.json pnpm-lock.yaml
git commit -m "chore: add vite-plugin-pwa, jspdf, assets-generator"
```

---

## Task 2: Generate PWA Icons + Configure vite-plugin-pwa

**Files:** `client/public/icons/logo.svg`, `client/public/icons/*.png`, `client/vite.config.ts`, `client/index.html`

- [ ] Create `client/public/icons/logo.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#0d0806"/>
  <text x="256" y="300" font-family="Georgia,serif" font-weight="900"
        font-size="210" fill="#c9a96e" text-anchor="middle">12%</text>
</svg>
```

- [ ] Generate PNG icons from the SVG:

```bash
cd /home/grxson/Documents/github/cafeteria/client
npx pwa-assets-generator --preset minimal public/icons/logo.svg
```

Expected output: `public/icons/pwa-64x64.png`, `public/icons/pwa-192x192.png`, `public/icons/pwa-512x512.png`, `public/icons/maskable-icon-512x512.png`, `public/icons/apple-touch-icon-180x180.png`

> **If generator fails** (sharp not available): manually create 192×192 and 512×512 solid-color PNGs using any image editor or https://favicon.io — color `#0d0806`, text `12%` in gold. Place them at the paths above.

- [ ] Replace `client/vite.config.ts` entirely:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: '12% Café de Especialidad',
        short_name: '12%',
        description: 'Café de especialidad mexicano. Origen único, trazabilidad total.',
        theme_color: '#0d0806',
        background_color: '#0d0806',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-runtime',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 60, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname.includes('images.unsplash.com'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'unsplash-images',
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
```

- [ ] Add apple-touch-icon to `client/index.html` `<head>`:

```html
<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180x180.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="12%" />
```

- [ ] Verify build emits SW and manifest:

```bash
cd /home/grxson/Documents/github/cafeteria/client && npx vite build 2>&1 | grep -E "sw\.js|manifest\.webmanifest|error"
```

Expected: lines mentioning `sw.js` and `manifest.webmanifest` with no errors.

- [ ] Commit:

```bash
git add client/public/icons/ client/vite.config.ts client/index.html client/package.json pnpm-lock.yaml
git commit -m "feat: add PWA manifest, service worker, icons"
```

---

## Task 3: Prisma Schema — User Model + FKs

**Files:** `server/prisma/schema.prisma`

- [ ] Add `User` model and optional `userId` FKs to `server/prisma/schema.prisma`. Add immediately after the `AdminUser` model:

```prisma
model User {
  id            String         @id @default(cuid())
  name          String
  email         String         @unique
  password      String
  phone         String?
  address       String?
  city          String?
  state         String?
  zipCode       String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  orders        Order[]
  reviews       Review[]
  subscriptions Subscription[]
}
```

- [ ] Add `userId` field to `Order` model (inside the existing model, after `notes`):

```prisma
  userId       String?
  user         User?       @relation(fields: [userId], references: [id])
```

- [ ] Add `userId` field to `Review` model (after `isApproved`):

```prisma
  userId       String?
  user         User?       @relation(fields: [userId], references: [id])
```

- [ ] Add `userId` field to `Subscription` model (after `bundleId`/`bundle` lines):

```prisma
  userId       String?
  user         User?       @relation(fields: [userId], references: [id])
```

- [ ] Push schema to DB (dev environment):

```bash
cd /home/grxson/Documents/github/cafeteria/server && npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] Regenerate Prisma client:

```bash
cd /home/grxson/Documents/github/cafeteria/server && npx prisma generate
```

- [ ] Commit:

```bash
git add server/prisma/schema.prisma
git commit -m "feat(db): add User model and optional userId FKs to Order, Review, Subscription"
```

---

## Task 4: Server — requireUserAuth Middleware + Update requireAuth

**Files:** `server/src/middleware/userAuth.ts`, `server/src/middleware/auth.ts`

- [ ] Create `server/src/middleware/userAuth.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface UserAuthRequest extends Request {
  user?: { id: string; email: string; name: string; role: string };
}

export const requireUserAuth = (
  req: UserAuthRequest,
  res: Response,
  next: NextFunction,
): void => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      name: string;
      role: string;
    };
    if (payload.role !== 'USER') {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
```

- [ ] Update `server/src/middleware/auth.ts` to reject user tokens on admin routes. Replace the `try` block body inside `requireAuth`:

```typescript
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      name: string;
      role?: string;
    };
    if (payload.role === 'USER') {
      res.status(403).json({ error: 'Acceso denegado' });
      return;
    }
    req.admin = payload;
    next();
```

- [ ] Verify TypeScript compiles:

```bash
cd /home/grxson/Documents/github/cafeteria/server && npx tsc --noEmit 2>&1
```

Expected: no output (zero errors).

- [ ] Commit:

```bash
git add server/src/middleware/userAuth.ts server/src/middleware/auth.ts
git commit -m "feat(server): add requireUserAuth middleware, harden admin requireAuth"
```

---

## Task 5: Server — Users Router (register, login, me, update)

**Files:** `server/src/routes/users.ts` (create)

- [ ] Create `server/src/routes/users.ts` with the first four endpoints:

```typescript
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { requireUserAuth, UserAuthRequest } from '../middleware/userAuth';

const router = Router();
const prisma = new PrismaClient();

// POST /api/users/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nombre, email y contraseña requeridos' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Ya existe una cuenta con este email' });
      return;
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
      select: { id: true, name: true, email: true, phone: true, address: true, city: true, state: true, zipCode: true, createdAt: true },
    });
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: 'USER' },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' },
    );
    res.status(201).json({ token, user });
  } catch {
    res.status(500).json({ error: 'Error al crear cuenta' });
  }
});

// POST /api/users/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email y contraseña requeridos' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: 'USER' },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' },
    );
    const { password: _pw, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

// GET /api/users/me
router.get('/me', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, phone: true, address: true, city: true, state: true, zipCode: true, createdAt: true },
    });
    if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// PUT /api/users/me
router.put('/me', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const { name, phone, address, city, state, zipCode } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, phone, address, city, state, zipCode },
      select: { id: true, name: true, email: true, phone: true, address: true, city: true, state: true, zipCode: true, createdAt: true },
    });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

export default router;
```

- [ ] Verify TypeScript:

```bash
cd /home/grxson/Documents/github/cafeteria/server && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] Commit:

```bash
git add server/src/routes/users.ts
git commit -m "feat(server): users router — register, login, me, update"
```

---

## Task 6: Server — Users Router (me/orders, me/reviews, me/subscription, cancel)

**Files:** `server/src/routes/users.ts` (append before `export default router`)

- [ ] Append these four endpoints to `server/src/routes/users.ts` before the `export default router` line:

```typescript
// GET /api/users/me/orders
router.get('/me/orders', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// GET /api/users/me/reviews
router.get('/me/reviews', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { userId: req.user!.id },
      include: { product: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(reviews);
  } catch {
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

// GET /api/users/me/subscription
router.get('/me/subscription', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user!.id, status: 'ACTIVE' },
      include: { bundle: true },
    });
    res.json(subscription ?? null);
  } catch {
    res.status(500).json({ error: 'Error al obtener suscripción' });
  }
});

// PUT /api/users/me/subscription/:id/status
router.put('/me/subscription/:id/status', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!['CANCELLED', 'PAUSED'].includes(status)) {
      res.status(400).json({ error: 'Estado inválido' });
      return;
    }
    const sub = await prisma.subscription.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!sub) { res.status(404).json({ error: 'Suscripción no encontrada' }); return; }
    const updated = await prisma.subscription.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error al actualizar suscripción' });
  }
});
```

- [ ] Verify TypeScript:

```bash
cd /home/grxson/Documents/github/cafeteria/server && npx tsc --noEmit 2>&1
```

- [ ] Commit:

```bash
git add server/src/routes/users.ts
git commit -m "feat(server): users router — orders, reviews, subscription endpoints"
```

---

## Task 7: Server — Register Router + Update Orders Route

**Files:** `server/src/index.ts`, `server/src/routes/orders.ts`

- [ ] In `server/src/index.ts`, add import and route registration. After the last `import` line, add:

```typescript
import usersRouter from './routes/users';
```

After `app.use('/api/reviews', reviewsRouter);`, add:

```typescript
app.use('/api/users', usersRouter);
```

- [ ] In `server/src/routes/orders.ts`, update the `POST /` handler to extract and persist optional `userId`. Replace the destructuring line:

```typescript
    const { items, ...orderData } = req.body;
```

With:

```typescript
    const { items, userId, ...orderData } = req.body;
```

And in `prisma.order.create({ data: { ... } })`, add `userId` to the data object:

```typescript
    const order = await prisma.order.create({
      data: {
        ...orderData,
        total,
        ...(userId ? { userId } : {}),
        items: {
          create: items.map((item: { productId: string; quantity: number; price: number }) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });
```

- [ ] Verify TypeScript:

```bash
cd /home/grxson/Documents/github/cafeteria/server && npx tsc --noEmit 2>&1
```

- [ ] Commit:

```bash
git add server/src/index.ts server/src/routes/orders.ts
git commit -m "feat(server): register users router, link userId on order creation"
```

---

## Task 8: Client Types — UserProfile

**Files:** `client/src/types/index.ts`

- [ ] Append `UserProfile` type to `client/src/types/index.ts`:

```typescript
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  createdAt: string;
}
```

- [ ] Also add optional `userId` to the existing `Order` interface (after `notes?:`):

```typescript
  userId?: string;
```

- [ ] Verify TypeScript:

```bash
cd /home/grxson/Documents/github/cafeteria/client && npx tsc --noEmit 2>&1
```

- [ ] Commit:

```bash
git add client/src/types/index.ts
git commit -m "feat(client): add UserProfile type, userId to Order"
```

---

## Task 9: Client — UserContext (Zustand)

**Files:** `client/src/context/UserContext.tsx` (create)

- [ ] Create `client/src/context/UserContext.tsx`:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { usersApi } from '../api';
import type { UserProfile } from '../types';

interface UserStore {
  user: UserProfile | null;
  token: string | null;
  hasSubscription: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  updateProfile: (data: Partial<Omit<UserProfile, 'id' | 'email' | 'createdAt'>>) => Promise<void>;
  setHasSubscription: (v: boolean) => void;
}

export const useUser = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      hasSubscription: false,

      login: async (email, password) => {
        const res = await usersApi.login(email, password);
        const { token, user } = res.data;
        localStorage.setItem('user_token', token);
        set({ user, token });
        // Warm SW runtime cache for recipes
        fetch('/api/products?category=CAFÉ&limit=100').catch(() => {});
        // Check subscription
        try {
          const sub = await usersApi.mySubscription();
          set({ hasSubscription: sub.data !== null });
        } catch {
          set({ hasSubscription: false });
        }
      },

      register: async (name, email, password) => {
        const res = await usersApi.register({ name, email, password });
        const { token, user } = res.data;
        localStorage.setItem('user_token', token);
        set({ user, token });
        fetch('/api/products?category=CAFÉ&limit=100').catch(() => {});
      },

      logout: () => {
        localStorage.removeItem('user_token');
        set({ user: null, token: null, hasSubscription: false });
      },

      refresh: async () => {
        try {
          const res = await usersApi.me();
          set({ user: res.data });
          const sub = await usersApi.mySubscription();
          set({ hasSubscription: sub.data !== null });
        } catch {
          get().logout();
        }
      },

      updateProfile: async (data) => {
        const res = await usersApi.update(data);
        set({ user: res.data });
      },

      setHasSubscription: (v) => set({ hasSubscription: v }),
    }),
    {
      name: 'cafe-12-user',
      partialize: (s) => ({ user: s.user, token: s.token, hasSubscription: s.hasSubscription }),
    },
  ),
);
```

- [ ] Verify TypeScript:

```bash
cd /home/grxson/Documents/github/cafeteria/client && npx tsc --noEmit 2>&1
```

(Will fail until `usersApi` is added in Task 10 — that's expected. Fix in next task.)

- [ ] Commit:

```bash
git add client/src/context/UserContext.tsx
git commit -m "feat(client): add UserContext Zustand store"
```

---

## Task 10: Client — Update API Client

**Files:** `client/src/api/index.ts`

- [ ] Replace the entire contents of `client/src/api/index.ts`:

```typescript
import axios from 'axios';
import type { UserProfile, Order, Review, Subscription } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const isAdminContext = window.location.pathname.startsWith('/admin');
  const token = isAdminContext
    ? localStorage.getItem('admin_token')
    : (localStorage.getItem('user_token') ?? localStorage.getItem('admin_token'));
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (window.location.pathname.startsWith('/admin')) {
        localStorage.removeItem('admin_token');
        if (window.location.pathname !== '/admin/login') {
          window.location.href = '/admin/login';
        }
      } else {
        localStorage.removeItem('user_token');
      }
    }
    return Promise.reject(err);
  },
);

export const productsApi = {
  list: (params?: Record<string, string>) => api.get('/products', { params }),
  adminList: () => api.get('/products/admin/all'),
  getBySlug: (slug: string) => api.get(`/products/${slug}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

export const ordersApi = {
  create: (data: any) => api.post('/orders', data),
  list: (params?: Record<string, string>) => api.get('/orders', { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
  updateStatus: (id: string, status: string) => api.put(`/orders/${id}/status`, { status }),
};

export const subscriptionsApi = {
  create: (data: any) => api.post('/subscriptions', data),
  list: (params?: Record<string, string>) => api.get('/subscriptions', { params }),
  updateStatus: (id: string, status: string) => api.put(`/subscriptions/${id}/status`, { status }),
};

export const bundlesApi = {
  list: () => api.get('/bundles'),
  getById: (id: string) => api.get(`/bundles/${id}`),
  create: (data: any) => api.post('/bundles', data),
  update: (id: string, data: any) => api.put(`/bundles/${id}`, data),
  delete: (id: string) => api.delete(`/bundles/${id}`),
};

export const reviewsApi = {
  listByProduct: (productId: string) => api.get(`/reviews/product/${productId}`),
  create: (productId: string, data: any) => api.post(`/reviews/product/${productId}`, data),
  adminList: () => api.get('/reviews/admin/all'),
  approve: (id: string) => api.put(`/reviews/${id}/approve`),
  delete: (id: string) => api.delete(`/reviews/${id}`),
};

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

export const usersApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<{ token: string; user: UserProfile }>('/users/register', data),
  login: (email: string, password: string) =>
    api.post<{ token: string; user: UserProfile }>('/users/login', { email, password }),
  me: () => api.get<UserProfile>('/users/me'),
  update: (data: Partial<Omit<UserProfile, 'id' | 'email' | 'createdAt'>>) =>
    api.put<UserProfile>('/users/me', data),
  myOrders: () => api.get<Order[]>('/users/me/orders'),
  myReviews: () => api.get<Review[]>('/users/me/reviews'),
  mySubscription: () => api.get<Subscription | null>('/users/me/subscription'),
  cancelSubscription: (id: string) =>
    api.put(`/users/me/subscription/${id}/status`, { status: 'CANCELLED' }),
  pauseSubscription: (id: string) =>
    api.put(`/users/me/subscription/${id}/status`, { status: 'PAUSED' }),
};

export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
};

export default api;
```

- [ ] Verify TypeScript (now UserContext should also resolve):

```bash
cd /home/grxson/Documents/github/cafeteria/client && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] Commit:

```bash
git add client/src/api/index.ts
git commit -m "feat(client): add usersApi, fix interceptor for user/admin token routing"
```

---

## Task 11: Client — Login Page

**Files:** `client/src/pages/Login.tsx` (create)

- [ ] Create `client/src/pages/Login.tsx`:

```typescript
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useUser((s) => s.login);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate(params.get('redirect') ?? '/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center px-4 bg-coffee-950">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div className="font-serif text-5xl font-black text-cream">12%</div>
          <div className="text-[9px] tracking-[0.3em] text-gold-500 uppercase mt-1">mi cuenta</div>
        </div>

        <div className="bg-coffee-900 border border-coffee-800 p-8">
          <h1 className="font-serif text-2xl text-cream mb-6">Iniciar sesión</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full bg-coffee-800 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">
                Contraseña
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-coffee-800 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-coffee-500 text-sm text-center mt-6">
          ¿Sin cuenta?{' '}
          <Link to="/registro" className="text-gold-500 hover:text-gold-400 transition-colors">
            Crear cuenta
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
```

- [ ] Commit:

```bash
git add client/src/pages/Login.tsx
git commit -m "feat(client): add Login page"
```

---

## Task 12: Client — Register Page

**Files:** `client/src/pages/Register.tsx` (create)

- [ ] Create `client/src/pages/Register.tsx`:

```typescript
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const register = useUser((s) => s.register);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(form.name, form.email, form.password);
      navigate(params.get('redirect') ?? '/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Error al crear cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center px-4 bg-coffee-950">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div className="font-serif text-5xl font-black text-cream">12%</div>
          <div className="text-[9px] tracking-[0.3em] text-gold-500 uppercase mt-1">nueva cuenta</div>
        </div>

        <div className="bg-coffee-900 border border-coffee-800 p-8">
          <h1 className="font-serif text-2xl text-cream mb-6">Crear cuenta</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: 'name', label: 'Nombre completo', type: 'text', placeholder: 'Tu nombre', autoComplete: 'name' },
              { name: 'email', label: 'Email', type: 'email', placeholder: 'tu@email.com', autoComplete: 'email' },
              { name: 'password', label: 'Contraseña', type: 'password', placeholder: 'Mínimo 6 caracteres', autoComplete: 'new-password' },
            ].map(({ name, label, type, placeholder, autoComplete }) => (
              <div key={name}>
                <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">
                  {label}
                </label>
                <input
                  name={name}
                  type={type}
                  required
                  value={(form as any)[name]}
                  onChange={handleChange}
                  autoComplete={autoComplete}
                  className="w-full bg-coffee-800 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
                  placeholder={placeholder}
                />
              </div>
            ))}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-coffee-500 text-sm text-center mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-gold-500 hover:text-gold-400 transition-colors">
            Iniciar sesión
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
```

- [ ] Commit:

```bash
git add client/src/pages/Register.tsx
git commit -m "feat(client): add Register page"
```

---

## Task 13: Client — UserMenu Component

**Files:** `client/src/components/UserMenu.tsx` (create)

- [ ] Create `client/src/components/UserMenu.tsx`:

```typescript
import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, Package, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../context/UserContext';

export default function UserMenu() {
  const user = useUser((s) => s.user);
  const logout = useUser((s) => s.logout);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) {
    return (
      <Link
        to="/login"
        aria-label="Iniciar sesión"
        className="text-coffee-200 hover:text-cream transition-colors"
      >
        <User className="w-5 h-5" />
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Mi cuenta"
        className="flex items-center justify-center w-8 h-8 bg-gold-500/20 border border-gold-500/40 hover:border-gold-500 text-gold-500 transition-colors"
      >
        <span className="text-xs font-bold">{user.name[0].toUpperCase()}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-52 bg-coffee-900 border border-coffee-800 shadow-xl z-50"
          >
            <div className="px-4 py-3 border-b border-coffee-800">
              <p className="text-cream text-sm font-medium truncate">{user.name}</p>
              <p className="text-coffee-400 text-xs truncate">{user.email}</p>
            </div>
            <nav className="py-1">
              {[
                { to: '/perfil/pedidos', label: 'Mis pedidos', icon: Package },
                { to: '/perfil/configuracion', label: 'Mi perfil', icon: Settings },
              ].map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-coffee-300 hover:text-cream hover:bg-coffee-800/50 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-coffee-800 py-1">
              <button
                onClick={() => { logout(); setOpen(false); navigate('/'); }}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-coffee-400 hover:text-red-400 w-full transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] Commit:

```bash
git add client/src/components/UserMenu.tsx
git commit -m "feat(client): add UserMenu dropdown component"
```

---

## Task 14: Client — Update Navbar

**Files:** `client/src/components/Navbar.tsx`

- [ ] Add import at the top of `client/src/components/Navbar.tsx` (after existing imports):

```typescript
import UserMenu from './UserMenu';
```

- [ ] Replace the `<div className="flex items-center gap-4">` block (the right side of the navbar) with:

```tsx
        <div className="flex items-center gap-4">
          <UserMenu />
          <button
            onClick={() => navigate('/carrito')}
            className="relative text-coffee-200 hover:text-cream transition-colors"
            aria-label="Carrito"
          >
            <ShoppingBag className="w-5 h-5" />
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-gold-500 text-coffee-950 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center"
              >
                {count}
              </motion.span>
            )}
          </button>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-coffee-200 hover:text-cream transition-colors"
            aria-label="Menú"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
```

- [ ] Verify TypeScript:

```bash
cd /home/grxson/Documents/github/cafeteria/client && npx tsc --noEmit 2>&1
```

- [ ] Commit:

```bash
git add client/src/components/Navbar.tsx
git commit -m "feat(client): add UserMenu to Navbar"
```

---

## Task 15: Client — UserRoute Guard + App.tsx Routes

**Files:** `client/src/App.tsx`

- [ ] Replace the entire `client/src/App.tsx`:

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { useUser } from './context/UserContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Subscriptions from './pages/Subscriptions';
import About from './pages/About';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Recipes from './pages/Recipes';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import AdminLogin from './admin/AdminLogin';
import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/Dashboard';
import AdminProducts from './admin/Products';
import AdminOrders from './admin/Orders';
import AdminSubscribers from './admin/Subscribers';
import AdminReviews from './admin/Reviews';
import AdminBundles from './admin/Bundles';

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('admin_token');
  return token ? <>{children}</> : <Navigate to="/admin/login" replace />;
};

const UserRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useUser((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);

export default function App() {
  return (
    <CartProvider>
      <Routes>
        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/tienda" element={<PublicLayout><Shop /></PublicLayout>} />
        <Route path="/tienda/:slug" element={<PublicLayout><ProductDetail /></PublicLayout>} />
        <Route path="/suscripciones" element={<PublicLayout><Subscriptions /></PublicLayout>} />
        <Route path="/nosotros" element={<PublicLayout><About /></PublicLayout>} />
        <Route path="/carrito" element={<PublicLayout><Cart /></PublicLayout>} />
        <Route path="/checkout" element={<PublicLayout><Checkout /></PublicLayout>} />
        <Route path="/recetas" element={<PublicLayout><Recipes /></PublicLayout>} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />
        <Route
          path="/perfil/*"
          element={
            <UserRoute>
              <PublicLayout><Profile /></PublicLayout>
            </UserRoute>
          }
        />

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="productos" element={<AdminProducts />} />
          <Route path="pedidos" element={<AdminOrders />} />
          <Route path="suscriptores" element={<AdminSubscribers />} />
          <Route path="bundles" element={<AdminBundles />} />
          <Route path="resenas" element={<AdminReviews />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </CartProvider>
  );
}
```

- [ ] Verify TypeScript:

```bash
cd /home/grxson/Documents/github/cafeteria/client && npx tsc --noEmit 2>&1
```

(Will partially fail until Profile.tsx exists — create it next task.)

- [ ] Commit:

```bash
git add client/src/App.tsx
git commit -m "feat(client): add UserRoute guard, login/registro/perfil routes"
```

---

## Task 16: Client — Profile Shell

**Files:** `client/src/pages/Profile.tsx` (create)

- [ ] Create `client/src/pages/Profile.tsx`:

```typescript
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { Package, Star, CreditCard, Settings } from 'lucide-react';
import { useUser } from '../context/UserContext';
import Orders from './profile/Orders';
import Reviews from './profile/Reviews';
import Subscription from './profile/Subscription';
import ProfileSettings from './profile/Settings';

const tabs = [
  { to: '/perfil/pedidos',       label: 'Pedidos',      icon: Package },
  { to: '/perfil/resenas',       label: 'Reseñas',      icon: Star },
  { to: '/perfil/suscripcion',   label: 'Suscripción',  icon: CreditCard },
  { to: '/perfil/configuracion', label: 'Mi perfil',    icon: Settings },
];

export default function Profile() {
  const user = useUser((s) => s.user);

  return (
    <div className="pt-20 min-h-screen bg-coffee-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <p className="text-gold-500 text-xs tracking-[0.3em] uppercase mb-1">Bienvenido</p>
          <h1 className="font-serif text-3xl text-cream">{user?.name}</h1>
          <p className="text-coffee-400 text-sm mt-1">{user?.email}</p>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 border-b border-coffee-800 mb-8 overflow-x-auto">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-gold-500 text-gold-500'
                    : 'border-transparent text-coffee-400 hover:text-cream'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>

        {/* Tab content */}
        <Routes>
          <Route index element={<Navigate to="pedidos" replace />} />
          <Route path="pedidos" element={<Orders />} />
          <Route path="resenas" element={<Reviews />} />
          <Route path="suscripcion" element={<Subscription />} />
          <Route path="configuracion" element={<ProfileSettings />} />
        </Routes>
      </div>
    </div>
  );
}
```

- [ ] Create the `client/src/pages/profile/` directory:

```bash
mkdir -p /home/grxson/Documents/github/cafeteria/client/src/pages/profile
```

- [ ] Commit:

```bash
git add client/src/pages/Profile.tsx client/src/pages/profile/
git commit -m "feat(client): add Profile shell with tab navigation"
```

---

## Task 17: Client — Profile/Settings Tab

**Files:** `client/src/pages/profile/Settings.tsx` (create)

- [ ] Create `client/src/pages/profile/Settings.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useUser } from '../../context/UserContext';

const mexicanStates = [
  'Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua',
  'Ciudad de México','Coahuila','Colima','Durango','Estado de México','Guanajuato','Guerrero',
  'Hidalgo','Jalisco','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro',
  'Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala','Veracruz',
  'Yucatán','Zacatecas',
];

export default function ProfileSettings() {
  const user = useUser((s) => s.user);
  const updateProfile = useUser((s) => s.updateProfile);
  const [form, setForm] = useState({
    name: '', phone: '', address: '', city: '', state: '', zipCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name ?? '',
        phone: user.phone ?? '',
        address: user.address ?? '',
        city: user.city ?? '',
        state: user.state ?? '',
        zipCode: user.zipCode ?? '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await updateProfile(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Error al guardar cambios');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <h2 className="font-serif text-2xl text-cream mb-6">Datos personales</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        <div>
          <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Nombre *</label>
          <input
            name="name" required value={form.name} onChange={handleChange}
            className="w-full bg-coffee-900 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Teléfono</label>
          <input
            name="phone" value={form.phone} onChange={handleChange} type="tel"
            className="w-full bg-coffee-900 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
            placeholder="55 1234 5678"
          />
        </div>

        <h3 className="font-serif text-lg text-cream pt-4 border-t border-coffee-800">Dirección de envío</h3>

        <div>
          <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Calle y número</label>
          <input
            name="address" value={form.address} onChange={handleChange}
            className="w-full bg-coffee-900 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
            placeholder="Calle, número, colonia"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Ciudad</label>
            <input
              name="city" value={form.city} onChange={handleChange}
              className="w-full bg-coffee-900 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">CP</label>
            <input
              name="zipCode" value={form.zipCode} onChange={handleChange}
              className="w-full bg-coffee-900 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
              placeholder="12345"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Estado</label>
          <select
            name="state" value={form.state} onChange={handleChange}
            className="w-full bg-coffee-900 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
          >
            <option value="">Seleccionar</option>
            {mexicanStates.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {saved ? <><Check className="w-4 h-4" /> Guardado</> : loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </motion.div>
  );
}
```

- [ ] Commit:

```bash
git add client/src/pages/profile/Settings.tsx
git commit -m "feat(client): add Profile/Settings tab"
```

---

## Task 18: Client — Profile/Orders Tab

**Files:** `client/src/pages/profile/Orders.tsx` (create)

- [ ] Create `client/src/pages/profile/Orders.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { usersApi } from '../../api';
import type { Order } from '../../types';

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Pendiente',   color: 'text-yellow-400' },
  PROCESSING: { label: 'Procesando',  color: 'text-blue-400' },
  SHIPPED:    { label: 'Enviado',     color: 'text-purple-400' },
  DELIVERED:  { label: 'Entregado',   color: 'text-green-400' },
  CANCELLED:  { label: 'Cancelado',   color: 'text-red-400' },
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi.myOrders().then((r) => { setOrders(r.data); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <Package className="w-12 h-12 text-coffee-600 mx-auto mb-4" />
        <p className="text-coffee-400">Aún no tienes pedidos.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {orders.map((order, i) => (
        <motion.div
          key={order.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-coffee-900 border border-coffee-800 p-5"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-cream text-sm font-medium">
                Pedido #{order.id.slice(-8).toUpperCase()}
              </p>
              <p className="text-coffee-400 text-xs mt-0.5">
                {new Date(order.createdAt).toLocaleDateString('es-MX', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gold-500 font-semibold">${order.total.toLocaleString('es-MX')}</p>
              <p className={`text-xs mt-0.5 ${statusLabels[order.status]?.color ?? 'text-coffee-400'}`}>
                {statusLabels[order.status]?.label ?? order.status}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            {order.items.map((item) => (
              <p key={item.id} className="text-coffee-300 text-xs">
                {item.product.name} × {item.quantity}
              </p>
            ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
```

- [ ] Commit:

```bash
git add client/src/pages/profile/Orders.tsx
git commit -m "feat(client): add Profile/Orders tab"
```

---

## Task 19: Client — Profile/Reviews Tab

**Files:** `client/src/pages/profile/Reviews.tsx` (create)

- [ ] Create `client/src/pages/profile/Reviews.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { usersApi } from '../../api';
import type { Review } from '../../types';

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi.myReviews().then((r) => { setReviews(r.data); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-16">
        <Star className="w-12 h-12 text-coffee-600 mx-auto mb-4" />
        <p className="text-coffee-400 mb-4">Aún no has escrito reseñas.</p>
        <Link to="/tienda" className="btn-primary">Explorar cafés</Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {reviews.map((review, i) => (
        <motion.div
          key={review.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-coffee-900 border border-coffee-800 p-5"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              {review.product && (
                <Link
                  to={`/tienda/${review.product.slug}`}
                  className="text-gold-500 hover:text-gold-400 text-sm font-medium transition-colors"
                >
                  {review.product.name}
                </Link>
              )}
              <div className="flex gap-0.5 mt-1">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className={`w-3.5 h-3.5 ${j < review.rating ? 'fill-gold-500 text-gold-500' : 'text-coffee-700'}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 ${review.isApproved ? 'bg-green-900/30 text-green-400' : 'bg-coffee-800 text-coffee-500'}`}>
                {review.isApproved ? 'Publicada' : 'En revisión'}
              </span>
            </div>
          </div>
          <p className="text-coffee-300 text-sm leading-relaxed">"{review.comment}"</p>
          <p className="text-coffee-500 text-xs mt-3">
            {new Date(review.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}
```

- [ ] Commit:

```bash
git add client/src/pages/profile/Reviews.tsx
git commit -m "feat(client): add Profile/Reviews tab"
```

---

## Task 20: Client — Profile/Subscription Tab

**Files:** `client/src/pages/profile/Subscription.tsx` (create)

- [ ] Create `client/src/pages/profile/Subscription.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CreditCard, AlertTriangle } from 'lucide-react';
import { usersApi } from '../../api';
import { useUser } from '../../context/UserContext';
import type { Subscription as Sub } from '../../types';

export default function Subscription() {
  const [sub, setSub] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const setHasSubscription = useUser((s) => s.setHasSubscription);

  useEffect(() => {
    usersApi.mySubscription().then((r) => { setSub(r.data); setLoading(false); });
  }, []);

  const handleCancel = async () => {
    if (!sub) return;
    setCancelling(true);
    try {
      await usersApi.cancelSubscription(sub.id);
      setSub(null);
      setHasSubscription(false);
      setShowConfirm(false);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="text-center py-16">
        <CreditCard className="w-12 h-12 text-coffee-600 mx-auto mb-4" />
        <p className="text-coffee-400 mb-4">Sin suscripción activa.</p>
        <Link to="/suscripciones" className="btn-primary">Ver planes</Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg">
      <div className="bg-coffee-900 border border-coffee-800 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-serif text-xl text-cream">{sub.plan}</h3>
            <p className="text-coffee-400 text-sm mt-0.5">
              Frecuencia: {sub.frequency === 'bimonthly' ? 'Cada 2 meses' : 'Mensual'}
            </p>
          </div>
          <span className="text-xs px-2 py-1 bg-green-900/30 text-green-400">ACTIVA</span>
        </div>
        <div className="border-t border-coffee-800 pt-4 text-sm text-coffee-300">
          <p>
            Próxima facturación:{' '}
            <span className="text-cream">
              {new Date(sub.nextBilling).toLocaleDateString('es-MX', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </span>
          </p>
        </div>
      </div>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="text-sm text-coffee-400 hover:text-red-400 transition-colors border border-coffee-700 hover:border-red-400/40 px-4 py-2"
        >
          Cancelar suscripción
        </button>
      ) : (
        <div className="bg-coffee-900 border border-red-500/30 p-5">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-coffee-200 text-sm">
              ¿Confirmas que quieres cancelar? Perderás acceso al siguiente envío si cancelas antes de la fecha de facturación.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="text-sm text-red-400 border border-red-500/40 hover:border-red-400 px-4 py-2 transition-colors disabled:opacity-50"
            >
              {cancelling ? 'Cancelando...' : 'Sí, cancelar'}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="text-sm text-coffee-300 hover:text-cream px-4 py-2 transition-colors"
            >
              Mantener suscripción
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
```

- [ ] Verify TypeScript (all profile tabs):

```bash
cd /home/grxson/Documents/github/cafeteria/client && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] Commit:

```bash
git add client/src/pages/profile/Subscription.tsx
git commit -m "feat(client): add Profile/Subscription tab with cancel flow"
```

---

## Task 21: Client — Checkout Enhancements

**Files:** `client/src/pages/Checkout.tsx`

- [ ] Add imports at the top of `client/src/pages/Checkout.tsx`. After the existing imports, add:

```typescript
import { useUser } from '../context/UserContext';
```

- [ ] Inside the `Checkout` component, after the existing `useState` declarations, add:

```typescript
  const user = useUser((s) => s.user);
```

- [ ] Replace the initial `useState<FormData>` call to pre-fill from user profile:

```typescript
  const [form, setForm] = useState<FormData>({
    customerName: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    address: user?.address ?? '',
    city: user?.city ?? '',
    state: user?.state ?? '',
    zipCode: user?.zipCode ?? '',
    notes: '',
  });
```

- [ ] In `handleSubmit`, update the `ordersApi.create` call to include `userId` if logged in. Replace:

```typescript
      await ordersApi.create({
        ...form,
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity, price: i.product.price })),
      });
```

With:

```typescript
      await ordersApi.create({
        ...form,
        ...(user ? { userId: user.id } : {}),
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity, price: i.product.price })),
      });
```

- [ ] Replace the success screen JSX (the `if (success)` return block) to add the "create account" CTA for non-logged-in users:

```typescript
  if (success) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-coffee-900 border border-gold-500/30 p-12 text-center"
        >
          <div className="w-16 h-16 border-2 border-gold-500 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-gold-500" />
          </div>
          <h2 className="font-serif text-3xl text-cream mb-3">¡Pedido confirmado!</h2>
          <p className="text-coffee-300 leading-relaxed mb-8">
            Hemos recibido tu pedido. Tostamos a pedido para garantizar frescura máxima — recibirás
            tu café dentro de los próximos 3-5 días hábiles.
          </p>

          {!user && (
            <div className="bg-coffee-800 border border-coffee-700 p-5 mb-6 text-left">
              <p className="text-cream text-sm font-medium mb-1">¿Quieres rastrear este pedido?</p>
              <p className="text-coffee-400 text-xs mb-3">
                Crea tu cuenta con el mismo email y podrás ver tu historial de pedidos.
              </p>
              <Link
                to={`/registro?email=${encodeURIComponent(form.email)}`}
                className="btn-primary text-sm inline-block"
              >
                Crear cuenta gratuita
              </Link>
            </div>
          )}

          <Link to="/tienda" className="btn-outline-dark block">Seguir comprando</Link>
        </motion.div>
      </div>
    );
  }
```

- [ ] Verify TypeScript:

```bash
cd /home/grxson/Documents/github/cafeteria/client && npx tsc --noEmit 2>&1
```

- [ ] Commit:

```bash
git add client/src/pages/Checkout.tsx
git commit -m "feat(client): checkout pre-fills from user profile, links order to userId, post-CTA for non-users"
```

---

## Task 22: Client — Recipes PDF Download

**Files:** `client/src/pages/Recipes.tsx`

- [ ] Add `jspdf` import at the top of `client/src/pages/Recipes.tsx`. After the existing imports:

```typescript
import jsPDF from 'jspdf';
```

- [ ] Add the `downloadRecipePDF` function inside the `Recipes` component (before the `return` statement):

```typescript
  const downloadRecipePDF = (method: string, recipe: Recipe) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a5' });
    const W = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Header bar
    doc.setFillColor(13, 8, 6);
    doc.rect(0, 0, W, 28, 'F');
    doc.setTextColor(201, 169, 110);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('12%', 10, 17);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('CAFÉ DE ESPECIALIDAD', 10, 24);

    // Title
    doc.setTextColor(13, 8, 6);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(method, 10, 42);

    // Gold divider
    doc.setDrawColor(201, 169, 110);
    doc.setLineWidth(0.5);
    doc.line(10, 47, W - 10, 47);

    // Parameters
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 46, 26);
    const paramW = (W - 20) / 3;
    [
      `Temp: ${recipe.temp}`,
      `Molido: ${recipe.grind}`,
      `Ratio: ${recipe.ratio}`,
    ].forEach((p, i) => doc.text(p, 10 + i * paramW, 54, { maxWidth: paramW - 2 }));

    doc.line(10, 59, W - 10, 59);

    // Steps
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(13, 8, 6);
    doc.text('Pasos', 10, 67);

    doc.setFont('helvetica', 'normal');
    let y = 75;
    for (let i = 0; i < recipe.steps.length; i++) {
      const lines = doc.splitTextToSize(`${i + 1}. ${recipe.steps[i]}`, W - 20);
      if (y + lines.length * 5 > pageH - 18) break;
      doc.text(lines, 10, y);
      y += lines.length * 5 + 3;
    }

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('12% Café de Especialidad — 12porciento.com', 10, pageH - 8);

    doc.save(`receta-${method.toLowerCase().replace(/[\s/]+/g, '-')}.pdf`);
  };
```

- [ ] Add the download button inside the recipe method header block. In the `<div className="ml-auto hidden sm:flex ...">` block (after the Coffee icon row), add as a sibling to that div:

```tsx
                    <button
                      onClick={() => downloadRecipePDF(method, firstRecipe)}
                      className="hidden sm:flex items-center gap-1.5 text-xs text-coffee-400 hover:text-gold-500 border border-coffee-700 hover:border-gold-500/40 px-3 py-1.5 transition-colors"
                      title="Descargar receta en PDF"
                    >
                      ↓ PDF
                    </button>
```

Place this button inside the `<div className="flex items-center gap-4 mb-8">` method header, right before the closing `</div>` tag.

- [ ] Verify TypeScript:

```bash
cd /home/grxson/Documents/github/cafeteria/client && npx tsc --noEmit 2>&1
```

- [ ] Commit:

```bash
git add client/src/pages/Recipes.tsx
git commit -m "feat(client): add jsPDF recipe download button"
```

---

## Task 23: Verify Full Build + Docker

**Files:** None (verification only)

- [ ] Full TypeScript check on both packages:

```bash
cd /home/grxson/Documents/github/cafeteria/server && npx tsc --noEmit 2>&1 && echo "Server OK"
cd /home/grxson/Documents/github/cafeteria/client && npx tsc --noEmit 2>&1 && echo "Client OK"
```

Expected: `Server OK` and `Client OK`.

- [ ] Client build (verifies Vite + VitePWA output):

```bash
cd /home/grxson/Documents/github/cafeteria/client && npx vite build 2>&1 | tail -10
```

Expected: build completes, output mentions `sw.js` and `manifest.webmanifest` with no errors.

- [ ] Docker build both services:

```bash
cd /home/grxson/Documents/github/cafeteria
docker-compose build 2>&1 | tail -20
```

Expected: both `server` and `client` services build successfully.

- [ ] Start all services:

```bash
cd /home/grxson/Documents/github/cafeteria
docker-compose up -d
```

- [ ] Health check server:

```bash
curl http://localhost:3001/api/health
```

Expected: `{"status":"ok","timestamp":"..."}`.

- [ ] Smoke test user registration:

```bash
curl -s -X POST http://localhost:3001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"123456"}' | jq .
```

Expected: `{"token":"...","user":{"id":"...","name":"Test User","email":"test@test.com",...}}`.

- [ ] Smoke test user login:

```bash
curl -s -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}' | jq .token
```

Expected: a JWT string.

- [ ] Check PWA manifest is served:

```bash
curl -s http://localhost/manifest.webmanifest | jq .name
```

Expected: `"12% Café de Especialidad"`.

- [ ] Stop containers:

```bash
docker-compose down
```

- [ ] Final commit:

```bash
git add -A
git commit -m "feat: complete PWA + user auth + profile + recipe PDF offline"
```

---

## Self-Review Checklist

| Spec Requirement | Task |
|---|---|
| PWA installable (manifest + SW + icons) | Task 2 |
| SW caches assets and API | Task 2 (workbox config) |
| User register | Task 5 |
| User login with JWT | Task 5 |
| requireUserAuth rejects admin tokens | Task 4 |
| requireAuth rejects user tokens | Task 4 |
| User profile GET/PUT | Task 5 |
| Order history endpoint | Task 6 |
| Reviews endpoint | Task 6 |
| Subscription endpoint + cancel | Task 6 |
| userId linked on order creation | Task 7 |
| UserProfile type | Task 8 |
| UserContext Zustand store | Task 9 |
| usersApi + fixed interceptor | Task 10 |
| Login page | Task 11 |
| Register page | Task 12 |
| UserMenu dropdown | Task 13 |
| Navbar shows UserMenu | Task 14 |
| UserRoute guard | Task 15 |
| Profile shell with tabs | Task 16 |
| Profile/Settings (edit name + address) | Task 17 |
| Profile/Orders (order history) | Task 18 |
| Profile/Reviews | Task 19 |
| Profile/Subscription + cancel | Task 20 |
| Checkout pre-fills from user | Task 21 |
| Checkout links userId to order | Task 21 |
| Post-checkout "create account" CTA | Task 21 |
| Recipes PDF download | Task 22 |
| SW warm-cache on login (recipes offline) | Task 9 (fetch in login) |
| Docker build works | Task 23 |
