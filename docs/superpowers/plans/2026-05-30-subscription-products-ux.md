# Subscription Redesign + New Products + ProductDetail UX

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign subscriptions as a 3-step café-picker wizard, add new products (cápsulas + more coffees), and upgrade ProductDetail UI/UX with premium ficha técnica and timeline.

**Architecture:** Schema adds `SubscriptionItem` table + `grindPreference` + `fulfillmentStatus` on `Subscription`. Client gets a reusable `CoffeePicker` component used in both the Subscriptions wizard and the Profile edit flow. ProductDetail gets a full visual overhaul.

**Tech Stack:** Prisma + SQLite (server), React + TypeScript + Tailwind + framer-motion (client), pnpm workspaces

---

## File Map

**Create:**
- `server/src/routes/subscriptions.ts` — extended (items endpoint + fulfillment admin)
- `client/src/components/CoffeePicker.tsx` — reusable coffee selection grid with plan rules
- `client/src/pages/Subscriptions.tsx` — full rewrite (3-step wizard)
- `client/src/pages/profile/Subscription.tsx` — add edit-coffees UI

**Modify:**
- `server/prisma/schema.prisma` — SubscriptionItem model, new Subscription fields
- `server/prisma/seed.js` — new products (cápsulas + 3 more coffees)
- `server/src/routes/users.ts` — include items in subscription response
- `client/src/types/index.ts` — SubscriptionItem, updated Subscription, plan slot config
- `client/src/api/index.ts` — new subscription endpoints
- `client/src/pages/ProductDetail.tsx` — UI/UX overhaul
- `client/src/components/CoffeeTimeline.tsx` — visual upgrade
- `client/admin/Subscribers.tsx` — fulfillmentStatus management

---

## Task 1: Prisma Schema — SubscriptionItem + new Subscription fields

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Edit schema.prisma**

Replace the `Subscription` model and add `SubscriptionItem`:

```prisma
model Subscription {
  id                String             @id @default(cuid())
  name              String
  email             String             @unique
  phone             String?
  plan              String
  grindPreference   String             @default("GRANO")
  fulfillmentStatus String             @default("PENDIENTE")
  userId            String?
  user              User?              @relation(fields: [userId], references: [id])
  frequency         String             @default("monthly")
  status            String             @default("ACTIVE")
  nextBilling       DateTime
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  items             SubscriptionItem[]
}

model SubscriptionItem {
  id             String       @id @default(cuid())
  subscriptionId String
  productId      String
  subscription   Subscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  product        Product      @relation(fields: [productId], references: [id])
}
```

Also add `subscriptionItems SubscriptionItem[]` to the `Product` model relation block.

- [ ] **Step 2: Apply schema (inside Docker build handled automatically; for local dev run):**

```bash
cd server && npx prisma db push --accept-data-loss
```

Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Commit**

```bash
git add server/prisma/schema.prisma
git commit -m "feat(db): add SubscriptionItem, grindPreference, fulfillmentStatus to Subscription"
```

---

## Task 2: Seed — New Products (Cápsulas + More Coffees)

**Files:**
- Modify: `server/prisma/seed.js`

- [ ] **Step 1: Add 5 new products to the `products` array in seed.js**

Add after the existing coffee products, before accessories:

```js
{
  name: 'Soconusco Washed', slug: 'soconusco-washed', category: 'CAFÉ',
  origin: 'México', region: 'Soconusco, Chiapas', altitude: 1500,
  variety: 'Typica, Maragogype', process: 'Lavado', scaScore: 85.5, roastLevel: 'Medio-Ligero',
  flavors: JSON.stringify(['Naranja', 'Almendra tostada', 'Caramelo', 'Avellana']),
  recipes: JSON.stringify([
    { title: 'V60', method: 'Filtro', temp: '92°C', grind: 'Medio-fino', ratio: '1:15',
      steps: ['Moler 15g', 'Pre-infusión 30s con 50ml', 'Verter 200ml en 2 pulsos', 'Extraer en 3:00-3:30 min'],
      videoUrl: 'https://www.youtube.com/embed/AI4ynXzkSQo' },
    { title: 'Chemex', method: 'Filtro', temp: '93°C', grind: 'Medio', ratio: '1:15',
      steps: ['Moler 30g', 'Pre-infusión 45s', 'Verter 450ml en círculos', 'Extraer en 4:00 min'],
      videoUrl: 'https://www.youtube.com/embed/ikt-X5x7yoc' }
  ]),
  price: 290, weight: 250, stock: 40,
  imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80',
  description: 'Lote de la variedad Maragogype, conocida por su grano gigante y perfil suave. Proceso lavado que revela notas cítricas y una acidez delicada.',
  isLimited: false, isActive: true,
},
{
  name: 'Veracruz Oscuro', slug: 'veracruz-oscuro', category: 'CAFÉ',
  origin: 'México', region: 'Xico, Veracruz', altitude: 1100,
  variety: 'Mundo Novo, Typica', process: 'Natural', scaScore: 84.0, roastLevel: 'Oscuro',
  flavors: JSON.stringify(['Chocolate negro', 'Nuez', 'Tabaco dulce', 'Dátil']),
  recipes: JSON.stringify([
    { title: 'Prensa Francesa', method: 'Inmersión', temp: '94°C', grind: 'Grueso', ratio: '1:12',
      steps: ['Moler 20g', 'Agregar 240ml agua', 'Revolver y esperar 4 min', 'Presionar y servir'],
      videoUrl: 'https://www.youtube.com/embed/st571DYYTR8' },
    { title: 'Espresso', method: 'Presión', temp: '93°C', grind: 'Muy fino', ratio: '1:2',
      steps: ['Moler 18g', 'Tampar con 30kg de presión', 'Extraer en 25-30s', 'Rendimiento: 36ml'],
      videoUrl: 'https://www.youtube.com/embed/bG9bBFT0wl8' }
  ]),
  price: 250, weight: 250, stock: 60,
  imageUrl: 'https://images.unsplash.com/photo-1559056169-641e0ac8618e?auto=format&fit=crop&w=800&q=80',
  description: 'Tueste oscuro de origen Veracruz. Perfecto para espresso con leche. Cuerpo potente con chocolate amargo y notas de nuez en el finish.',
  isLimited: false, isActive: true,
},
{
  name: 'San Cristóbal Honey', slug: 'san-cristobal-honey', category: 'CAFÉ',
  origin: 'México', region: 'San Cristóbal de las Casas, Chiapas', altitude: 1650,
  variety: 'Catuaí Amarillo', process: 'Honey', scaScore: 86.5, roastLevel: 'Ligero',
  flavors: JSON.stringify(['Durazno', 'Guayaba', 'Miel de flores', 'Jazmín']),
  recipes: JSON.stringify([
    { title: 'Chemex', method: 'Filtro', temp: '91°C', grind: 'Medio', ratio: '1:16',
      steps: ['Moler 30g', 'Pre-infusión 40s con 60ml', 'Verter 480ml lentamente', 'Extraer en 4:30 min'],
      videoUrl: 'https://www.youtube.com/embed/ikt-X5x7yoc' },
    { title: 'Cold Brew', method: 'Inmersión fría', temp: '4°C (refrigerador)', grind: 'Extra grueso', ratio: '1:8',
      steps: ['Moler 60g', 'Mezclar con 500ml agua fría', 'Refrigerar 16-24 horas', 'Filtrar y servir con hielo'],
      videoUrl: 'https://www.youtube.com/embed/544prMSTFls' }
  ]),
  price: 310, weight: 250, stock: 30,
  imageUrl: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=800&q=80',
  description: 'Proceso honey de Catuaí Amarillo cultivado en los Altos de Chiapas. La mucilago retenida aporta una dulzura frutal característica.',
  isLimited: false, isActive: true,
},
{
  name: 'Cápsulas Nespresso — Blend 12%', slug: 'capsulas-nespresso-blend', category: 'CAFÉ',
  origin: 'México', region: 'Veracruz / Chiapas', altitude: 1300,
  variety: 'Typica, Caturra, Bourbon', process: 'Lavado / Natural', scaScore: 84.0, roastLevel: 'Medio',
  flavors: JSON.stringify(['Chocolate con leche', 'Almendra', 'Panela']),
  recipes: JSON.stringify([
    { title: 'Espresso', method: 'Cápsula Nespresso', temp: '93°C', grind: 'Cápsula', ratio: '1:2',
      steps: ['Insertar cápsula en tu máquina Nespresso', 'Seleccionar modo espresso (40ml)', 'Disfrutar directamente o agregar leche'],
      videoUrl: 'https://www.youtube.com/embed/bG9bBFT0wl8' }
  ]),
  price: 195, weight: 56, stock: 100,
  imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
  description: 'Nuestro Blend 12% en formato cápsula compatible con Nespresso Original Line. Caja de 10 cápsulas de aluminio reciclable. Sin comprometer el sabor del café de especialidad.',
  isLimited: false, isActive: true,
},
{
  name: 'Cápsulas Nespresso — Jaltenango Honey', slug: 'capsulas-nespresso-jaltenango', category: 'CAFÉ',
  origin: 'México', region: 'Jaltenango, Chiapas', altitude: 1600,
  variety: 'Bourbon Amarillo', process: 'Honey', scaScore: 87.0, roastLevel: 'Ligero',
  flavors: JSON.stringify(['Mango', 'Miel', 'Flor de azahar']),
  recipes: JSON.stringify([
    { title: 'Espresso', method: 'Cápsula Nespresso', temp: '93°C', grind: 'Cápsula', ratio: '1:2',
      steps: ['Insertar cápsula en tu máquina Nespresso', 'Seleccionar modo espresso (40ml)', 'Agregar leche vaporizada para un latte tropical'],
      videoUrl: 'https://www.youtube.com/embed/bG9bBFT0wl8' }
  ]),
  price: 220, weight: 56, stock: 80,
  imageUrl: 'https://images.unsplash.com/photo-1562547256-2c5ee93b60b7?auto=format&fit=crop&w=800&q=80',
  description: 'El perfil honey del Jaltenango capturado en cápsula. Dulzura tropical en 30 segundos. Compatible con Nespresso Original Line. Caja de 10 cápsulas.',
  isLimited: false, isActive: true,
},
```

- [ ] **Step 2: Commit**

```bash
git add server/prisma/seed.js
git commit -m "feat(seed): add 3 new coffee origins + 2 Nespresso capsule products"
```

---

## Task 3: Server — Update Subscriptions Route

**Files:**
- Modify: `server/src/routes/subscriptions.ts`

- [ ] **Step 1: Rewrite subscriptions route with items support**

Replace the full file content:

```ts
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireUserAuth, UserAuthRequest } from '../middleware/userAuth';

const router = Router();
const prisma = new PrismaClient();

const PLAN_SLOTS: Record<string, { min: number; max: number }> = {
  FUNDADOR:    { min: 2, max: 2 },
  EXPLORADOR:  { min: 2, max: 3 },
  CONNOISSEUR: { min: 3, max: 3 },
  EMPRESARIAL: { min: 10, max: 99 },
};

// POST / — create subscription with selected coffees
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, plan, frequency = 'monthly', grindPreference = 'GRANO', items = [] } = req.body;

    const slots = PLAN_SLOTS[plan];
    if (!slots) {
      res.status(400).json({ error: 'Plan inválido' });
      return;
    }

    if (items.length < slots.min || items.length > slots.max) {
      res.status(400).json({ error: `El plan ${plan} requiere entre ${slots.min} y ${slots.max} cafés seleccionados` });
      return;
    }

    const existing = await prisma.subscription.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Ya existe una suscripción con este email' });
      return;
    }

    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + (frequency === 'bimonthly' ? 2 : 1));

    const subscription = await prisma.subscription.create({
      data: {
        name, email, phone, plan, frequency, grindPreference, nextBilling,
        items: { create: items.map((productId: string) => ({ productId })) },
      },
      include: { items: { include: { product: true } } },
    });

    res.status(201).json(subscription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear suscripción' });
  }
});

// PUT /:id/items — replace coffee selection (only if PENDIENTE)
router.put('/:id/items', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const { items, grindPreference } = req.body as { items: string[]; grindPreference?: string };

    const sub = await prisma.subscription.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!sub) {
      res.status(404).json({ error: 'Suscripción no encontrada' });
      return;
    }

    if (sub.fulfillmentStatus !== 'PENDIENTE') {
      res.status(400).json({ error: 'No puedes editar tu selección mientras el pedido está en preparación o tránsito' });
      return;
    }

    const slots = PLAN_SLOTS[sub.plan];
    if (!slots || items.length < slots.min || items.length > slots.max) {
      res.status(400).json({ error: `El plan ${sub.plan} requiere entre ${slots?.min ?? 2} y ${slots?.max ?? 99} cafés` });
      return;
    }

    // Replace items atomically
    await prisma.$transaction([
      prisma.subscriptionItem.deleteMany({ where: { subscriptionId: sub.id } }),
      prisma.subscriptionItem.createMany({
        data: items.map((productId: string) => ({ subscriptionId: sub.id, productId })),
      }),
    ]);

    const updateData: any = {};
    if (grindPreference) updateData.grindPreference = grindPreference;

    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: updateData,
      include: { items: { include: { product: true } } },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar selección' });
  }
});

// GET / — admin list
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = status;

    const subscriptions = await prisma.subscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { product: { select: { name: true, slug: true, imageUrl: true } } } } },
    });
    res.json(subscriptions);
  } catch {
    res.status(500).json({ error: 'Error al obtener suscripciones' });
  }
});

// PUT /:id/status — admin: ACTIVE/PAUSED/CANCELLED
router.put('/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'PAUSED', 'CANCELLED'].includes(status)) {
      res.status(400).json({ error: 'Estado inválido' });
      return;
    }
    const sub = await prisma.subscription.update({ where: { id: req.params.id }, data: { status } });
    res.json(sub);
  } catch {
    res.status(500).json({ error: 'Error al actualizar suscripción' });
  }
});

// PUT /:id/fulfillment — admin: PENDIENTE/PREPARANDO/ENVIADO/ENTREGADO
router.put('/:id/fulfillment', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { fulfillmentStatus } = req.body;
    const valid = ['PENDIENTE', 'PREPARANDO', 'ENVIADO', 'ENTREGADO'];
    if (!valid.includes(fulfillmentStatus)) {
      res.status(400).json({ error: 'Estado de envío inválido' });
      return;
    }

    const updateData: any = { fulfillmentStatus };
    // Reset to PENDIENTE after delivery for next cycle
    if (fulfillmentStatus === 'ENTREGADO') {
      const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });
      if (sub) {
        const next = new Date();
        next.setMonth(next.getMonth() + (sub.frequency === 'bimonthly' ? 2 : 1));
        updateData.nextBilling = next;
        updateData.fulfillmentStatus = 'ENTREGADO';
      }
    }

    const updated = await prisma.subscription.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error al actualizar estado de envío' });
  }
});

export default router;
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/subscriptions.ts
git commit -m "feat(api): subscription items CRUD + fulfillmentStatus admin endpoint"
```

---

## Task 4: Server — Update Users Route (include items in subscription)

**Files:**
- Modify: `server/src/routes/users.ts`

- [ ] **Step 1: Update the GET /me/subscription handler to include items**

Find this block:
```ts
const subscription = await prisma.subscription.findFirst({
  where: { userId: req.user!.id, status: 'ACTIVE' },
  include: { bundle: true },
});
```

Replace with:
```ts
const subscription = await prisma.subscription.findFirst({
  where: { userId: req.user!.id, status: 'ACTIVE' },
  include: {
    items: {
      include: { product: { select: { id: true, name: true, slug: true, imageUrl: true, price: true, scaScore: true } } },
    },
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/users.ts
git commit -m "feat(api): include subscription items in /me/subscription response"
```

---

## Task 5: Client Types + API

**Files:**
- Modify: `client/src/types/index.ts`
- Modify: `client/src/api/index.ts`

- [ ] **Step 1: Update types/index.ts**

Add `SubscriptionItem` interface and update `Subscription`:

```ts
export interface SubscriptionItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string;
    price: number;
    scaScore?: number;
  };
}

// Update Subscription interface — add new fields, remove bundleId
export interface Subscription {
  id: string;
  name: string;
  email: string;
  phone?: string;
  plan: SubscriptionPlan;
  grindPreference: 'MOLIDO' | 'GRANO';
  fulfillmentStatus: 'PENDIENTE' | 'PREPARANDO' | 'ENVIADO' | 'ENTREGADO';
  frequency: string;
  status: SubscriptionStatus;
  nextBilling: string;
  createdAt: string;
  items: SubscriptionItem[];
}
```

Also add plan config constants:

```ts
export const PLAN_SLOTS: Record<SubscriptionPlan | 'EMPRESARIAL', { min: number; max: number; price: number; allowLimited: boolean }> = {
  FUNDADOR:    { min: 2, max: 2,  price: 350,  allowLimited: false },
  EXPLORADOR:  { min: 2, max: 3,  price: 650,  allowLimited: true },
  CONNOISSEUR: { min: 3, max: 3,  price: 890,  allowLimited: true },
  EMPRESARIAL: { min: 10, max: 99, price: 0,   allowLimited: true },
};

export type SubscriptionPlan = 'FUNDADOR' | 'EXPLORADOR' | 'CONNOISSEUR' | 'EMPRESARIAL';
```

- [ ] **Step 2: Update api/index.ts — add new subscription endpoints**

In `subscriptionsApi`, replace with:

```ts
export const subscriptionsApi = {
  create: (data: {
    name: string; email: string; phone?: string; plan: string;
    frequency: string; grindPreference: string; items: string[];
    userId?: string;
  }) => api.post('/subscriptions', data),
  list: (params?: Record<string, string>) => api.get('/subscriptions', { params }),
  updateStatus: (id: string, status: string) => api.put(`/subscriptions/${id}/status`, { status }),
  updateItems: (id: string, items: string[], grindPreference?: string) =>
    api.put(`/subscriptions/${id}/items`, { items, grindPreference }),
  updateFulfillment: (id: string, fulfillmentStatus: string) =>
    api.put(`/subscriptions/${id}/fulfillment`, { fulfillmentStatus }),
};
```

- [ ] **Step 3: Commit**

```bash
git add client/src/types/index.ts client/src/api/index.ts
git commit -m "feat(types): SubscriptionItem, PLAN_SLOTS config, updated api subscriptions"
```

---

## Task 6: New Component — CoffeePicker.tsx

**Files:**
- Create: `client/src/components/CoffeePicker.tsx`

- [ ] **Step 1: Create CoffeePicker component**

```tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Star, Lock, Coffee } from 'lucide-react';
import { productsApi } from '../api';
import type { Product, SubscriptionPlan } from '../types';
import { PLAN_SLOTS } from '../types';

interface Props {
  plan: SubscriptionPlan | 'EMPRESARIAL';
  selected: string[];
  onChange: (ids: string[]) => void;
  grindPreference: 'MOLIDO' | 'GRANO';
  onGrindChange: (g: 'MOLIDO' | 'GRANO') => void;
}

export default function CoffeePicker({ plan, selected, onChange, grindPreference, onGrindChange }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const slots = PLAN_SLOTS[plan];

  useEffect(() => {
    productsApi.list({ category: 'CAFÉ' }).then((r) => {
      setProducts(r.data.filter((p: Product) => p.isActive));
      setLoading(false);
    });
  }, []);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
      return;
    }
    if (!slots.allowLimited) {
      const product = products.find((p) => p.id === id);
      if (product?.isLimited) return;
    }
    if (selected.length >= slots.max) return;
    onChange([...selected, id]);
  };

  const isDisabled = (product: Product) => {
    if (!slots.allowLimited && product.isLimited) return true;
    if (!selected.includes(product.id) && selected.length >= slots.max) return true;
    return false;
  };

  const remaining = slots.max - selected.length;
  const isReady = selected.length >= slots.min;

  return (
    <div>
      {/* Grind preference toggle */}
      <div className="mb-8">
        <p className="text-xs text-coffee-500 uppercase tracking-widest mb-3">
          Preferencia de molido — aplica a todos tus cafés
        </p>
        <div className="inline-flex border border-coffee-700">
          {(['GRANO', 'MOLIDO'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onGrindChange(g)}
              className={`px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] transition-all ${
                grindPreference === g
                  ? 'bg-gold-500 text-coffee-950'
                  : 'text-coffee-400 hover:text-cream'
              }`}
            >
              {g === 'GRANO' ? 'Grano entero' : 'Molido'}
            </button>
          ))}
        </div>
      </div>

      {/* Slot counter */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-coffee-500 uppercase tracking-widest">
          Selecciona tus cafés
        </p>
        <div className={`text-xs font-semibold px-3 py-1 ${
          isReady ? 'bg-green-900/30 text-green-400' : 'bg-coffee-800 text-coffee-300'
        }`}>
          {selected.length}/{slots.max} seleccionados
          {slots.min !== slots.max && ` (mín. ${slots.min})`}
        </div>
      </div>

      {/* Slot dots */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: slots.max === 99 ? selected.length + 1 : slots.max }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 max-w-[60px] transition-all duration-300 ${
            i < selected.length ? 'bg-gold-500' : 'bg-coffee-800'
          }`} />
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] shimmer" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((product) => {
            const isSelected = selected.includes(product.id);
            const disabled = isDisabled(product);
            const locked = !slots.allowLimited && product.isLimited;

            return (
              <motion.button
                key={product.id}
                type="button"
                onClick={() => !disabled && toggle(product.id)}
                whileHover={disabled ? {} : { y: -2 }}
                className={`relative group text-left transition-all duration-200 ${
                  disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                {/* Image */}
                <div className={`relative aspect-[3/4] overflow-hidden border-2 transition-all ${
                  isSelected ? 'border-gold-500' : 'border-transparent'
                }`}>
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className={`w-full h-full object-cover transition-transform duration-500 ${
                      !disabled ? 'group-hover:scale-105' : ''
                    }`}
                  />
                  <div className={`absolute inset-0 transition-opacity duration-200 ${
                    isSelected
                      ? 'bg-coffee-950/30'
                      : 'bg-gradient-to-t from-coffee-950/70 via-transparent to-transparent'
                  }`} />

                  {/* Selected checkmark */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute top-3 right-3 w-8 h-8 bg-gold-500 flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-coffee-950 font-bold" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Lock for limited in restricted plan */}
                  {locked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-coffee-950/60">
                      <div className="text-center">
                        <Lock className="w-5 h-5 text-coffee-400 mx-auto mb-1" />
                        <p className="text-coffee-400 text-[10px]">Plan Connoisseur</p>
                      </div>
                    </div>
                  )}

                  {/* Limited badge */}
                  {product.isLimited && !locked && (
                    <span className="absolute top-3 left-3 text-[9px] bg-gold-500/20 border border-gold-500/40 text-gold-400 px-1.5 py-0.5 uppercase tracking-widest">
                      Limitado
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="pt-2.5 pb-1">
                  <p className="text-[10px] text-gold-600 uppercase tracking-widest mb-0.5 truncate">{product.region}</p>
                  <p className={`font-serif text-sm leading-tight transition-colors ${
                    isSelected ? 'text-gold-500' : 'text-coffee-900'
                  }`}>{product.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-coffee-500 text-xs">${product.price} MXN</p>
                    {product.scaScore && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-gold-500 text-gold-500" />
                        <span className="text-[10px] text-gold-600">{product.scaScore}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Footer hint */}
      {!isReady && selected.length > 0 && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-coffee-400 text-xs mt-6"
        >
          Selecciona {slots.min - selected.length} café{slots.min - selected.length !== 1 ? 's' : ''} más para continuar
        </motion.p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/CoffeePicker.tsx
git commit -m "feat(ui): CoffeePicker component with plan slot rules and grind preference"
```

---

## Task 7: Rewrite Subscriptions.tsx — 3-Step Wizard

**Files:**
- Modify: `client/src/pages/Subscriptions.tsx`

- [ ] **Step 1: Rewrite the full Subscriptions.tsx**

```tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Star, Truck, RefreshCw, ChevronRight, ChevronLeft, Coffee } from 'lucide-react';
import { subscriptionsApi } from '../api';
import { useUser } from '../context/UserContext';
import ScrollReveal from '../components/ScrollReveal';
import CoffeePicker from '../components/CoffeePicker';
import type { SubscriptionPlan } from '../types';
import { PLAN_SLOTS } from '../types';

const plans: Array<{
  id: SubscriptionPlan | 'EMPRESARIAL';
  name: string;
  price: number | null;
  subtitle: string;
  description: string;
  features: string[];
  excluded: string[];
  featured: boolean;
}> = [
  {
    id: 'FUNDADOR', name: 'Fundador', price: 350,
    subtitle: '2 lotes × 250g / mes',
    description: 'Para quien empieza su camino en el café de especialidad.',
    features: ['2 cafés de especialidad a elegir', 'Grano entero o molido', 'Notas de catación incluidas', 'Envío incluido', 'Cancela cuando quieras'],
    excluded: ['Ediciones limitadas', 'Microlotes exclusivos'],
    featured: false,
  },
  {
    id: 'EXPLORADOR', name: 'Explorador', price: 650,
    subtitle: '2-3 lotes × 250g / mes',
    description: 'Descubre diferentes orígenes y procesos cada mes.',
    features: ['2 a 3 cafés a elegir', 'Acceso a microlotes', 'Grano entero o molido', 'Notas de catación detalladas', 'Envío incluido', 'Cancela cuando quieras'],
    excluded: ['Experimentales anaeróbicos'],
    featured: true,
  },
  {
    id: 'CONNOISSEUR', name: 'Connoisseur', price: 890,
    subtitle: '3 lotes premium / mes',
    description: 'Los lotes más exclusivos y complejos del catálogo.',
    features: ['3 cafés premium a elegir', 'Acceso a ediciones limitadas', 'Cafés experimentales y anaeróbicos', 'Prioridad en microlotes', 'Notas de catación extendidas', 'Envío exprés incluido'],
    excluded: [],
    featured: false,
  },
  {
    id: 'EMPRESARIAL', name: 'Empresarial', price: null,
    subtitle: 'Mínimo 10 lotes / mes',
    description: 'Para oficinas y negocios que quieren ofrecer especialidad.',
    features: ['Mínimo 10 lotes a elegir', 'Todo el catálogo disponible', '15% descuento por volumen', 'Gestor de cuenta dedicado', 'Facturación mensual', 'Envío exprés'],
    excluded: [],
    featured: false,
  },
];

type Step = 1 | 2 | 3;

interface FormData { name: string; email: string; phone: string; frequency: string; }

export default function Subscriptions() {
  const user = useUser((s) => s.user);
  const [step, setStep] = useState<Step>(1);
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null);
  const [selectedCoffees, setSelectedCoffees] = useState<string[]>([]);
  const [grindPreference, setGrindPreference] = useState<'MOLIDO' | 'GRANO'>('GRANO');
  const [form, setForm] = useState<FormData>({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    frequency: 'monthly',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSelectPlan = (plan: typeof plans[0]) => {
    setSelectedPlan(plan);
    setSelectedCoffees([]);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCoffeeNext = () => {
    const slots = PLAN_SLOTS[selectedPlan!.id];
    if (selectedCoffees.length < slots.min) return;
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setLoading(true); setError('');
    try {
      const empresarialPrice = selectedPlan.id === 'EMPRESARIAL'
        ? undefined
        : undefined;
      await subscriptionsApi.create({
        ...form,
        plan: selectedPlan.id,
        grindPreference,
        items: selectedCoffees,
        ...(user ? { userId: user.id } : {}),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al procesar suscripción. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Elige tu plan', 'Tus cafés', 'Finalizar'];

  if (success) {
    return (
      <div className="min-h-screen bg-coffee-950 pt-20 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-coffee-900 border border-gold-500/30 p-12 text-center"
        >
          <div className="w-16 h-16 border-2 border-gold-500 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-gold-500" />
          </div>
          <h2 className="font-serif text-3xl text-cream mb-3">¡Suscripción confirmada!</h2>
          <p className="text-coffee-300 text-sm leading-relaxed mb-4">
            Bienvenido al plan <span className="text-gold-400 font-medium">{selectedPlan?.name}</span>.
            Tu primer envío incluirá {selectedCoffees.length} lote{selectedCoffees.length !== 1 ? 's' : ''} tostados a pedido.
          </p>
          <p className="text-coffee-500 text-xs">Nos pondremos en contacto para coordinar el pago del primer ciclo.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-coffee-950 pt-20 min-h-screen">
      {/* Hero */}
      <div className="bg-coffee-900 border-b border-coffee-800 py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="gold-line mx-auto mb-4" />
            <h1 className="font-serif text-5xl md:text-6xl text-cream mb-3">Suscripciones</h1>
            <p className="text-coffee-400 text-sm leading-relaxed max-w-lg mx-auto">
              Selecciona tus cafés favoritos. Tostamos a pedido, enviamos frescos cada mes.
            </p>
            <div className="flex items-center justify-center gap-8 mt-6 text-coffee-500 text-xs">
              <div className="flex items-center gap-2"><Truck className="w-3.5 h-3.5 text-gold-500" />Envío incluido</div>
              <div className="flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 text-gold-500" />Cancela cuando quieras</div>
              <div className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-gold-500" />SCA ≥ 84 pts</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="max-w-xl mx-auto px-4 pt-10 pb-4">
        <div className="flex items-center justify-between">
          {stepLabels.map((label, i) => {
            const n = (i + 1) as Step;
            return (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                  step > n ? 'bg-gold-500 text-coffee-950' :
                  step === n ? 'bg-gold-500/20 border border-gold-500 text-gold-400' :
                  'bg-coffee-800 text-coffee-600'
                }`}>
                  {step > n ? <Check className="w-3.5 h-3.5" /> : n}
                </div>
                <span className={`text-xs transition-colors ${step === n ? 'text-cream' : 'text-coffee-600'}`}>{label}</span>
                {i < stepLabels.length - 1 && <div className="flex-1 h-px bg-coffee-800 mx-2" />}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Plan selection */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {plans.map((plan, i) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    onClick={() => handleSelectPlan(plan)}
                    className={`relative flex flex-col border cursor-pointer transition-all duration-300 group
                      ${plan.featured
                        ? 'border-gold-500 bg-coffee-900 shadow-[0_0_40px_rgba(201,169,110,0.1)]'
                        : 'border-coffee-800 bg-coffee-900/60 hover:border-coffee-700'
                      }`}
                  >
                    {plan.featured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-gold-500 text-coffee-950 text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1">Más popular</span>
                      </div>
                    )}

                    <div className="p-6 flex-1">
                      <h3 className="font-serif text-xl text-cream mb-1">{plan.name}</h3>
                      <p className="text-coffee-500 text-[10px] tracking-widest uppercase mb-4">{plan.subtitle}</p>
                      {plan.price ? (
                        <div className="flex items-baseline gap-1 mb-4">
                          <span className="font-serif text-3xl text-cream">${plan.price}</span>
                          <span className="text-coffee-500 text-xs">/ mes</span>
                        </div>
                      ) : (
                        <p className="font-serif text-lg text-gold-500 mb-4">A precio de lote</p>
                      )}
                      <p className="text-coffee-400 text-xs leading-relaxed mb-5">{plan.description}</p>
                      <div className="border-t border-coffee-800 mb-5" />
                      <ul className="space-y-2">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-coffee-300">
                            <Check className="w-3.5 h-3.5 text-gold-500 shrink-0 mt-0.5" />{f}
                          </li>
                        ))}
                        {plan.excluded.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-coffee-600">
                            <X className="w-3.5 h-3.5 text-coffee-700 shrink-0 mt-0.5" />{f}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-6 pt-0">
                      <button
                        type="button"
                        className={`w-full py-3 text-xs font-semibold tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2
                          ${plan.featured
                            ? 'bg-gold-500 text-coffee-950 group-hover:bg-gold-400'
                            : 'bg-coffee-800 text-coffee-300 border border-coffee-700 group-hover:border-gold-500/40 group-hover:text-cream'
                          }`}
                      >
                        Elegir {plan.name} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Coffee picker */}
        {step === 2 && selectedPlan && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <button onClick={() => setStep(1)} className="flex items-center gap-1 text-coffee-500 hover:text-cream text-xs mb-8 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" /> Cambiar plan
              </button>

              <div className="flex items-center gap-3 mb-8">
                <div className="gold-line" />
                <h2 className="font-serif text-3xl text-cream">Plan {selectedPlan.name}</h2>
              </div>

              <CoffeePicker
                plan={selectedPlan.id}
                selected={selectedCoffees}
                onChange={setSelectedCoffees}
                grindPreference={grindPreference}
                onGrindChange={setGrindPreference}
              />

              <div className="mt-10 flex justify-end">
                <button
                  type="button"
                  disabled={selectedCoffees.length < PLAN_SLOTS[selectedPlan.id].min}
                  onClick={handleCoffeeNext}
                  className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continuar <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Contact form */}
        {step === 3 && selectedPlan && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
            <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
              <button onClick={() => setStep(2)} className="flex items-center gap-1 text-coffee-500 hover:text-cream text-xs mb-8 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" /> Cambiar cafés
              </button>

              {/* Summary */}
              <div className="bg-coffee-900 border border-coffee-800 p-5 mb-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-coffee-500 uppercase tracking-widest">Tu suscripción</span>
                  <span className="text-gold-400 text-sm font-medium">{selectedPlan.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-coffee-400 mb-3">
                  <Coffee className="w-3.5 h-3.5 text-gold-500" />
                  {selectedCoffees.length} café{selectedCoffees.length !== 1 ? 's' : ''} seleccionados · {grindPreference === 'GRANO' ? 'Grano entero' : 'Molido'}
                </div>
                {selectedPlan.price && (
                  <p className="font-serif text-2xl text-cream">${selectedPlan.price} <span className="text-coffee-500 text-sm font-sans">/ mes</span></p>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="gold-line mb-5" />
                <h3 className="font-serif text-2xl text-cream mb-6">Tus datos</h3>

                {[
                  { name: 'name',  label: 'Nombre completo *', type: 'text',  required: true,  placeholder: 'Tu nombre' },
                  { name: 'email', label: 'Email *',           type: 'email', required: true,  placeholder: 'tu@email.com' },
                  { name: 'phone', label: 'Teléfono',          type: 'tel',   required: false, placeholder: '55 1234 5678' },
                ].map(({ name, label, type, required, placeholder }) => (
                  <div key={name}>
                    <label className="block text-[10px] text-coffee-500 uppercase tracking-[0.2em] mb-2">{label}</label>
                    <input
                      name={name} type={type} required={required} placeholder={placeholder}
                      value={(form as any)[name]}
                      onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))}
                      className="input-dark"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-[10px] text-coffee-500 uppercase tracking-[0.2em] mb-3">Frecuencia de envío</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ value: 'monthly', label: 'Mensual' }, { value: 'bimonthly', label: 'Bimestral' }].map(({ value, label }) => (
                      <button key={value} type="button"
                        onClick={() => setForm((f) => ({ ...f, frequency: value }))}
                        className={`py-3 text-xs font-medium tracking-widest uppercase border transition-all ${
                          form.frequency === value
                            ? 'border-gold-500 text-gold-400 bg-gold-500/10'
                            : 'border-coffee-700 text-coffee-400 hover:border-coffee-600 hover:text-cream'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Procesando…' : 'Confirmar suscripción'}
                </button>
                <p className="text-coffee-600 text-xs text-center">
                  El pago se coordina por transferencia. Te enviamos los datos al correo proporcionado.
                </p>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/Subscriptions.tsx
git commit -m "feat(ui): rewrite Subscriptions as 3-step wizard with CoffeePicker"
```

---

## Task 8: Profile/Subscription.tsx — Edit Coffees UI

**Files:**
- Modify: `client/src/pages/profile/Subscription.tsx`

- [ ] **Step 1: Rewrite profile Subscription page**

```tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CreditCard, AlertTriangle, Edit3, Lock, Check, Truck, Clock } from 'lucide-react';
import { usersApi, subscriptionsApi } from '../../api';
import { useUser } from '../../context/UserContext';
import CoffeePicker from '../../components/CoffeePicker';
import type { Subscription as Sub, SubscriptionPlan } from '../../types';
import { PLAN_SLOTS } from '../../types';

const FULFILLMENT_LABELS: Record<string, { label: string; color: string }> = {
  PENDIENTE:   { label: 'Pendiente',   color: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30' },
  PREPARANDO:  { label: 'Preparando',  color: 'text-blue-400 bg-blue-900/20 border-blue-500/30' },
  ENVIADO:     { label: 'En camino',   color: 'text-green-400 bg-green-900/20 border-green-500/30' },
  ENTREGADO:   { label: 'Entregado',   color: 'text-coffee-300 bg-coffee-800/40 border-coffee-700' },
};

export default function Subscription() {
  const [sub, setSub] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editCoffees, setEditCoffees] = useState<string[]>([]);
  const [editGrind, setEditGrind] = useState<'MOLIDO' | 'GRANO'>('GRANO');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const setHasSubscription = useUser((s) => s.setHasSubscription);

  useEffect(() => {
    usersApi.mySubscription().then((r) => {
      setSub(r.data);
      if (r.data) {
        setEditCoffees(r.data.items?.map((i: any) => i.productId) ?? []);
        setEditGrind(r.data.grindPreference ?? 'GRANO');
      }
      setLoading(false);
    });
  }, []);

  const handleCancel = async () => {
    if (!sub) return;
    setCancelling(true);
    try {
      await usersApi.cancelSubscription(sub.id);
      setSub(null);
      setHasSubscription(false);
      setShowConfirm(false);
    } finally { setCancelling(false); }
  };

  const handleSaveEdit = async () => {
    if (!sub) return;
    const slots = PLAN_SLOTS[sub.plan as SubscriptionPlan | 'EMPRESARIAL'];
    if (editCoffees.length < slots.min) {
      setSaveError(`Selecciona al menos ${slots.min} cafés`);
      return;
    }
    setSaving(true); setSaveError('');
    try {
      const updated = await subscriptionsApi.updateItems(sub.id, editCoffees, editGrind);
      setSub(updated.data);
      setEditing(false);
    } catch (err: any) {
      setSaveError(err.response?.data?.error || 'Error al guardar cambios');
    } finally { setSaving(false); }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" /></div>;
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

  const fulfillment = FULFILLMENT_LABELS[sub.fulfillmentStatus] ?? FULFILLMENT_LABELS['PENDIENTE'];
  const canEdit = sub.fulfillmentStatus === 'PENDIENTE';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      {/* Subscription card */}
      <div className="bg-coffee-900 border border-coffee-800 p-6 mb-6 max-w-2xl">
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-serif text-xl text-cream">{sub.plan}</h3>
              <span className="text-[10px] px-2 py-1 bg-green-900/30 text-green-400 border border-green-500/20 uppercase tracking-wider">Activa</span>
            </div>
            <p className="text-coffee-400 text-sm">
              {sub.frequency === 'bimonthly' ? 'Cada 2 meses' : 'Mensual'} · {sub.grindPreference === 'GRANO' ? 'Grano entero' : 'Molido'}
            </p>
          </div>
          <span className={`text-xs px-3 py-1 border rounded-sm ${fulfillment.color}`}>
            {fulfillment.label}
          </span>
        </div>

        {/* Fulfillment hint */}
        {!canEdit && (
          <div className="flex items-start gap-2.5 bg-coffee-800/50 border border-coffee-700 p-3 mb-5 text-xs text-coffee-400">
            <Lock className="w-3.5 h-3.5 text-coffee-500 shrink-0 mt-0.5" />
            {sub.fulfillmentStatus === 'PREPARANDO'
              ? 'Tu envío está en preparación — podrás cambiar tus cafés cuando llegue.'
              : sub.fulfillmentStatus === 'ENVIADO'
              ? 'Tu pedido está en camino — podrás cambiar tus cafés cuando lo recibas.'
              : 'Cambios disponibles hasta el inicio del próximo ciclo.'}
          </div>
        )}

        {/* Selected coffees */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-coffee-500 uppercase tracking-widest">Tus cafés este mes</p>
            {canEdit && !editing && (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs text-gold-500 hover:text-gold-400 transition-colors">
                <Edit3 className="w-3 h-3" /> Cambiar selección
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {sub.items?.map(({ product }) => (
              <div key={product.id} className="flex gap-2 bg-coffee-800/50 p-2">
                <img src={product.imageUrl} alt={product.name} className="w-10 h-10 object-cover shrink-0" />
                <p className="text-coffee-200 text-xs leading-tight self-center">{product.name}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-coffee-800 pt-4 text-xs text-coffee-400">
          Próximo envío:{' '}
          <span className="text-cream">
            {new Date(sub.nextBilling).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Edit picker */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-coffee-900 border border-gold-500/20 p-6 max-w-2xl">
              <h4 className="font-serif text-lg text-cream mb-6">Cambia tu selección</h4>
              <CoffeePicker
                plan={sub.plan as SubscriptionPlan | 'EMPRESARIAL'}
                selected={editCoffees}
                onChange={setEditCoffees}
                grindPreference={editGrind}
                onGrindChange={setEditGrind}
              />
              {saveError && <p className="text-red-400 text-xs mt-4">{saveError}</p>}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button onClick={() => { setEditing(false); setSaveError(''); }} className="btn-outline text-sm py-2.5 px-5">
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel */}
      {!showConfirm ? (
        <button onClick={() => setShowConfirm(true)} className="text-xs text-coffee-500 hover:text-red-400 border border-coffee-800 hover:border-red-400/30 px-4 py-2 transition-colors">
          Cancelar suscripción
        </button>
      ) : (
        <div className="bg-coffee-900 border border-red-500/30 p-5 max-w-md">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-coffee-200 text-sm">¿Confirmas que quieres cancelar? Perderás el siguiente envío si cancelas antes de la fecha de facturación.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCancel} disabled={cancelling}
              className="text-xs text-red-400 border border-red-500/40 hover:border-red-400 px-4 py-2 transition-colors disabled:opacity-50">
              {cancelling ? 'Cancelando...' : 'Sí, cancelar'}
            </button>
            <button onClick={() => setShowConfirm(false)} className="text-xs text-coffee-400 hover:text-cream px-4 py-2 transition-colors">
              Mantener
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/profile/Subscription.tsx
git commit -m "feat(ui): profile subscription page with edit-coffees flow and fulfillmentStatus display"
```

---

## Task 9: Admin — Subscribers fulfillmentStatus Management

**Files:**
- Modify: `client/src/admin/Subscribers.tsx`

- [ ] **Step 1: Read current Subscribers.tsx to understand structure, then add fulfillmentStatus column and dropdown**

Add `fulfillmentStatus` badge display and a dropdown to change it per subscription row. Add after the existing status column:

```tsx
// Import additions
import { Truck, Package, CheckCircle, Clock } from 'lucide-react';

// Fulfillment badge component
function FulfillmentBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDIENTE:  'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
    PREPARANDO: 'text-blue-400 bg-blue-900/20 border-blue-500/30',
    ENVIADO:    'text-green-400 bg-green-900/20 border-green-500/30',
    ENTREGADO:  'text-coffee-300 bg-coffee-800/40 border-coffee-700',
  };
  const labels: Record<string, string> = {
    PENDIENTE: 'Pendiente', PREPARANDO: 'Preparando', ENVIADO: 'Enviado', ENTREGADO: 'Entregado',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 border rounded-sm ${styles[status] ?? styles.PENDIENTE}`}>
      {labels[status] ?? status}
    </span>
  );
}
```

In the subscriptions table row, add a fulfillmentStatus select:
```tsx
<select
  value={sub.fulfillmentStatus ?? 'PENDIENTE'}
  onChange={async (e) => {
    await subscriptionsApi.updateFulfillment(sub.id, e.target.value);
    // refresh list
    refetch();
  }}
  className="text-xs bg-coffee-800 border border-coffee-700 text-cream px-2 py-1 focus:outline-none focus:border-gold-500"
>
  {['PENDIENTE','PREPARANDO','ENVIADO','ENTREGADO'].map((s) => (
    <option key={s} value={s}>{s}</option>
  ))}
</select>
```

Show the selected coffee items for each subscription in an expandable row detail:
```tsx
{sub.items?.map((item: any) => (
  <div key={item.id} className="flex items-center gap-2 text-xs text-coffee-300">
    <img src={item.product.imageUrl} className="w-6 h-6 object-cover" />
    {item.product.name}
  </div>
))}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/admin/Subscribers.tsx
git commit -m "feat(admin): fulfillmentStatus dropdown + selected coffees in Subscribers panel"
```

---

## Task 10: ProductDetail — UI/UX Premium Overhaul

**Files:**
- Modify: `client/src/pages/ProductDetail.tsx`
- Modify: `client/src/components/CoffeeTimeline.tsx`

- [ ] **Step 1: Upgrade CoffeeTimeline.tsx with better visual design**

Replace the content of `client/src/components/CoffeeTimeline.tsx` with a visually richer version:

```tsx
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { MapPin, Mountain, Leaf, Calendar, Droplets, Flame, Award } from 'lucide-react';
import type { Product } from '../types';

interface TimelineNode {
  stage: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}

function buildTimeline(product: Product): TimelineNode[] {
  const nodes: TimelineNode[] = [];
  if (product.region) nodes.push({ stage: 'Origen', value: product.region, detail: 'México — café de especialidad de origen único', icon: MapPin });
  if (product.altitude) nodes.push({
    stage: 'Altitud', value: `${product.altitude.toLocaleString()} msnm`,
    detail: product.altitude >= 1600 ? 'Alta montaña — complejidad aromática superior' : product.altitude >= 1200 ? 'Altitud media-alta' : 'Altitud media',
    icon: Mountain,
  });
  if (product.variety) nodes.push({ stage: 'Variedad', value: product.variety, detail: 'Cultivar seleccionado', icon: Leaf });
  nodes.push({ stage: 'Cosecha', value: 'Nov – Feb', detail: 'Selección manual de cerezas', icon: Calendar });
  if (product.process) nodes.push({
    stage: 'Proceso', value: product.process,
    detail: product.process === 'Lavado' ? 'Fermentación húmeda — acidez brillante' : product.process === 'Natural' ? 'Secado con fruto — dulzura intensa' : product.process === 'Honey' ? 'Mucílago parcial — dulzura balanceada' : 'Fermentación experimental',
    icon: Droplets,
  });
  if (product.roastLevel) nodes.push({
    stage: 'Tueste', value: product.roastLevel,
    detail: product.roastLevel === 'Ligero' ? 'Preserva florales del terroir' : product.roastLevel === 'Medio-Ligero' ? 'Balance dulzura / complejidad' : product.roastLevel === 'Medio' ? 'Cuerpo redondo, acidez integrada' : 'Cuerpo potente',
    icon: Flame,
  });
  if (product.scaScore) nodes.push({
    stage: 'SCA', value: `${product.scaScore} pts`,
    detail: product.scaScore >= 88 ? 'Excelente — alta gama' : product.scaScore >= 86 ? 'Muy bueno — especialidad superior' : 'Top 12% mundial',
    icon: Award,
  });
  return nodes;
}

function TimelineNodeCard({ node, index, total }: { node: TimelineNode; index: number; total: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <div ref={ref} className="flex flex-col items-center relative flex-1 min-w-0 group">
      {/* Connector line left */}
      {index > 0 && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.6, delay: index * 0.1 }}
          className="absolute top-6 right-1/2 left-0 h-px bg-gradient-to-r from-coffee-700 to-gold-500/50 origin-left hidden md:block"
        />
      )}

      {/* Icon circle */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={isInView ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 0.4, delay: index * 0.12 }}
        className="relative z-10 w-12 h-12 rounded-full bg-coffee-900 border-2 border-coffee-700 group-hover:border-gold-500 flex items-center justify-center mb-3 transition-all duration-300 cursor-default"
      >
        <node.icon className="w-5 h-5 text-coffee-400 group-hover:text-gold-400 transition-colors duration-300" />
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, delay: index * 0.12 + 0.1 }}
        className="text-center px-1"
      >
        <p className="text-[9px] text-gold-600 uppercase tracking-[0.25em] mb-0.5">{node.stage}</p>
        <p className="font-serif text-coffee-900 text-sm leading-tight">{node.value}</p>
        <p className="text-coffee-400 text-[10px] mt-1 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-300">{node.detail}</p>
      </motion.div>
    </div>
  );
}

export default function CoffeeTimeline({ product }: { product: Product }) {
  const nodes = buildTimeline(product);

  return (
    <div className="mt-10 pt-8 border-t border-coffee-200">
      <div className="flex items-center gap-3 mb-8">
        <div className="gold-line" />
        <h3 className="font-serif text-xl text-coffee-900">Del origen a tu taza</h3>
        <span className="text-xs text-coffee-400 ml-auto hidden sm:block">Pasa el cursor sobre cada etapa</span>
      </div>

      {/* Mobile: vertical */}
      <div className="flex flex-col gap-6 md:hidden">
        {nodes.map((node, i) => (
          <motion.div
            key={node.stage}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="flex gap-4"
          >
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-coffee-900 border-2 border-gold-500/50 flex items-center justify-center shrink-0">
                <node.icon className="w-4 h-4 text-gold-400" />
              </div>
              {i < nodes.length - 1 && <div className="w-px flex-1 bg-coffee-200 my-1 min-h-[24px]" />}
            </div>
            <div className="pt-1.5">
              <p className="text-[9px] text-gold-600 uppercase tracking-widest">{node.stage}</p>
              <p className="font-serif text-coffee-900 text-sm">{node.value}</p>
              <p className="text-coffee-500 text-xs mt-0.5">{node.detail}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-start gap-0 relative">
        {nodes.map((node, i) => (
          <TimelineNodeCard key={node.stage} node={node} index={i} total={nodes.length} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update ProductDetail.tsx — image area and tab transitions**

In `client/src/pages/ProductDetail.tsx`:

a) Change the image container from `aspect-square` to `aspect-[3/4]` for a taller portrait look:
```tsx
// Find:
<div className="aspect-square overflow-hidden">
// Replace with:
<div className="aspect-[3/4] overflow-hidden">
```

b) Add `image-zoom` hover effect on the product image — wrap img in a motion div:
```tsx
// Find:
<img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
// Replace with:
<motion.img
  src={product.imageUrl}
  alt={product.name}
  className="w-full h-full object-cover"
  whileHover={{ scale: 1.04 }}
  transition={{ duration: 0.6, ease: 'easeOut' }}
/>
```

c) Add animated tab content transition — wrap each tab content panel in a motion.div:
Find the `<div className="py-10">` container of tab panels and wrap each `{tab === 'xxx' && (` block's inner content with:
```tsx
<motion.div
  key={tab}
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  {/* existing content */}
</motion.div>
```

d) In the Recipes tab, add video embed support (same gating as Recipes.tsx — only show video if logged in):
Find the recipes tab content (`{tab === 'recipes' && (`) and after each recipe card's steps `</ol>`, add:
```tsx
{recipe.videoUrl && token && (
  <div className="mt-5 pt-5 border-t border-coffee-200">
    <p className="text-[10px] text-coffee-400 uppercase tracking-widest mb-3">Video guía</p>
    <div className="aspect-video">
      <iframe src={recipe.videoUrl} title={recipe.title} className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
    </div>
  </div>
)}
```

Also add `const token = useUser((s) => s.token);` and `import { useUser } from '../context/UserContext';` at the top of ProductDetail.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/ProductDetail.tsx client/src/components/CoffeeTimeline.tsx
git commit -m "feat(ui): ProductDetail portrait image, animated tabs, hover timeline, recipe video embeds"
```

---

## Task 11: Rebuild Docker + Verify

- [ ] **Step 1: Rebuild and start containers**

```bash
docker-compose down && docker-compose up --build -d
```

Expected: Both services build and start. Server logs show `Seed complete`.

- [ ] **Step 2: Verify subscription flow**

Open `http://localhost` → `/suscripciones` → Select plan → Coffee picker shows cafés → Select required number → Step 3 form → Submit → Success screen.

- [ ] **Step 3: Verify profile edit**

Login → `/perfil/suscripcion` → Selected coffees shown → "Cambiar selección" button visible → Opens CoffeePicker → Save works.

- [ ] **Step 4: Verify admin fulfillment**

Go to `http://localhost/admin` → Suscriptores → Fulfillment dropdown visible per row → Change to PREPARANDO → Return to profile → Edit button hidden, lock banner shown.

- [ ] **Step 5: Verify new products**

`/tienda` → Filter CAFÉ → See 3 new coffee origins + 2 capsule products.

- [ ] **Step 6: Verify ProductDetail**

`/tienda/jaltenango-honey` → Image is portrait 3/4 → Ficha Técnica tab → Timeline nodes have hover details → Logged in → Recipes tab shows video.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: rebuild verified — subscription wizard, new products, ProductDetail UX"
```
