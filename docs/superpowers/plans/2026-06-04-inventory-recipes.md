# Inventory Control + Recipe Manager — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace fragile JSON-in-column recipe storage with a proper Recipe model, add full admin CRUD for recipes with step-by-step images/video, implement subscriber-gated access, add downloadable PDF per recipe, and extend inventory with cost tracking, supplier info, SKU, batch numbers, and expiry dates.

**Architecture:**
- **Recipes**: New `Recipe` + `RecipeStep` models — decoupled from Product (can link to one or be standalone). Admin CRUD with drag-ordered steps, image URL + optional video URL per step. Access control: `isPremium` flag gates subscriber-only content; free users see first 2 non-premium recipes. PDF export via jsPDF (already installed).
- **Inventory**: Extend `Product` schema with `sku`, `costPrice`, `supplier`, `minOrderQty`. Extend `StockMovement` with `unitCost`, `batchNumber`, `expiryDate`, `supplierId` for full traceability. New admin inventory dashboard tab: **Alerts** (auto low-stock list + export CSV). Products admin form gets new fields.

**Tech Stack:** Prisma (SQLite), Express, React, lucide-react, jsPDF (existing), Tailwind dark theme.

---

## Key Codebase Facts

- Prisma singleton: `import { prisma } from '../db'`
- Admin auth: `import { requireAuth, AuthRequest } from '../middleware/auth'`
- User auth: `import { requireUserAuth, UserAuthRequest } from '../middleware/userAuth'`
- JWT payload: `{ id, role }` — role `'USER'` for subscribers, `'ADMIN'` for admin
- Subscription check: `prisma.subscription.findFirst({ where: { userId, status: 'ACTIVE' } })`
- Server entry: `server/src/index.ts` — register new routers here
- Admin API base: axios instance at `client/src/api/index.ts` — auto-injects `admin_token`/`user_token`
- `recipes String?` field on `Product` model is currently JSON-encoded — will be migrated to new `Recipe` model
- `product.recipes` in frontend types is `Recipe[]` (old interface) — will be replaced
- jsPDF already installed in client
- Dark theme classes: `bg-coffee-900`, `border-coffee-700`, `text-cream`, `text-gold-400`, `text-coffee-400`
- Admin layout: `client/src/admin/AdminLayout.tsx` — add nav links here

---

## File Map

### New Files — Backend
- `server/src/routes/recipes.ts` — full CRUD for Recipe + RecipeStep, access-gated GET for users
- `server/prisma/migrations/XXXXXX_inventory_recipes/migration.sql` — via `prisma migrate dev`

### New Files — Frontend
- `client/src/admin/Recipes.tsx` — admin recipe manager (list, create, edit, steps reorder)
- `client/src/components/RecipeCard.tsx` — shared recipe display card (used in public page)
- `client/src/components/RecipePDFExport.ts` — jsPDF export logic extracted from Recipes.tsx

### Modified Files — Backend
- `server/prisma/schema.prisma` — add Recipe, RecipeStep models; extend Product and StockMovement
- `server/src/routes/inventory.ts` — add cost/supplier fields to adjust endpoint; add CSV export endpoint; add alerts endpoint
- `server/src/routes/products.ts` — remove recipes JSON field from create/update; add SKU, costPrice, supplier fields
- `server/src/index.ts` — register recipesRouter

### Modified Files — Frontend
- `client/src/types/index.ts` — replace Recipe interface with new shape; add RecipeStep type
- `client/src/api/index.ts` — add recipesApi
- `client/src/pages/Recipes.tsx` — rewrite to consume new Recipe API with access gating
- `client/src/admin/Inventory.tsx` — add Alerts tab, add cost/supplier columns, add CSV export button
- `client/src/admin/Products.tsx` — add SKU, costPrice, supplier fields to product form
- `client/src/admin/AdminLayout.tsx` — add Recipes nav link

---

## Task 1: Schema migration — Recipe, RecipeStep, extend Product + StockMovement

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add Recipe model** — insert after the `Review` model block:

```prisma
model Recipe {
  id          String   @id @default(cuid())
  title       String
  slug        String   @unique
  description String?
  method      String   // Espresso | V60 | Chemex | Kalita | French Press | Cold Brew | Moka | AeroPress | etc.
  difficulty  String   @default("MEDIA")  // FÁCIL | MEDIA | DIFÍCIL
  prepTime    Int?     // minutes
  yield       String?  // e.g. "1 taza 250ml"
  temp        String?  // e.g. "92°C"
  grind       String?  // e.g. "Medio-fino"
  ratio       String?  // e.g. "1:15"
  isPremium   Boolean  @default(false) // true = subscribers only
  isPublished Boolean  @default(false)

  // Optional product link (null = standalone technique recipe)
  productId   String?
  product     Product? @relation("productRecipes", fields: [productId], references: [id], onDelete: SetNull)

  steps       RecipeStep[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([productId])
  @@index([method])
  @@index([isPremium])
}
```

- [ ] **Step 2: Add RecipeStep model** — insert after Recipe:

```prisma
model RecipeStep {
  id          String  @id @default(cuid())
  recipeId    String
  recipe      Recipe  @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  order       Int     // 1-based display order
  title       String  // e.g. "Precalentar el V60"
  description String  // detailed instruction
  imageUrl    String? // optional step image
  videoUrl    String? // optional step video (YouTube embed or direct)
  duration    Int?    // seconds for this step

  @@index([recipeId])
  @@unique([recipeId, order])
}
```

- [ ] **Step 3: Add productRecipes relation to Product model** — add inside existing `model Product` block:

```prisma
  linkedRecipes Recipe[] @relation("productRecipes")
```

- [ ] **Step 4: Extend Product model** — add inside existing `model Product` block after `lowStockThreshold`:

```prisma
  sku           String?  @unique
  costPrice     Float?   // cost per unit (used for inventory valuation)
  supplier      String?  // supplier name or ID
  minOrderQty   Int?     @default(1)
```

- [ ] **Step 5: Extend StockMovement model** — add inside existing `model StockMovement` block:

```prisma
  unitCost    Float?   // cost at time of movement
  batchNumber String?  // lot/batch identifier
  expiryDate  DateTime?
  supplier    String?  // supplier for this specific lot
```

- [ ] **Step 6: Run migration**

```bash
cd /home/grxson/github/12porciento-cafe/server
npx prisma migrate dev --name add_recipe_model_and_inventory_fields
```

Expected: migration applied successfully, new tables created.

- [ ] **Step 7: Verify TypeScript**

```bash
cd /home/grxson/github/12porciento-cafe/server
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add server/prisma/schema.prisma server/prisma/migrations/
git commit -m "schema: add Recipe+RecipeStep models, extend Product and StockMovement with inventory fields"
```

---

## Task 2: Backend — Recipe CRUD routes

**Files:**
- Create: `server/src/routes/recipes.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create `server/src/routes/recipes.ts`**

```typescript
import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireUserAuth, UserAuthRequest } from '../middleware/userAuth';
import { prisma } from '../db';

const router = Router();

// ── Public / User routes ─────────────────────────────────────────────────

// GET / — list published recipes; premium ones gated behind subscription
router.get('/', async (req: Request, res: Response) => {
  try {
    const { method, productId, premium } = req.query;
    const where: any = { isPublished: true };
    if (method) where.method = method;
    if (productId) where.productId = productId as string;
    if (premium === 'true') where.isPremium = true;
    if (premium === 'false') where.isPremium = false;

    const recipes = await prisma.recipe.findMany({
      where,
      include: {
        steps: { orderBy: { order: 'asc' } },
        product: { select: { id: true, name: true, slug: true, imageUrl: true } },
      },
      orderBy: [{ isPremium: 'asc' }, { method: 'asc' }, { title: 'asc' }],
    });

    res.json({ data: recipes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener recetas' });
  }
});

// GET /:id — single recipe; full steps only if user has access
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: req.params.id },
      include: {
        steps: { orderBy: { order: 'asc' } },
        product: { select: { id: true, name: true, slug: true, imageUrl: true } },
      },
    });

    if (!recipe || !recipe.isPublished) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    // Premium recipes: strip step details unless user has active subscription
    if (recipe.isPremium) {
      const authHeader = req.headers.authorization;
      let hasAccess = false;

      if (authHeader?.startsWith('Bearer ')) {
        try {
          const jwt = require('jsonwebtoken');
          const payload = jwt.verify(
            authHeader.replace('Bearer ', ''),
            process.env.JWT_SECRET!
          ) as { id: string; role: string };

          if (payload.role === 'ADMIN') {
            hasAccess = true;
          } else {
            const sub = await prisma.subscription.findFirst({
              where: { userId: payload.id, status: 'ACTIVE' },
            });
            hasAccess = !!sub;
          }
        } catch {
          hasAccess = false;
        }
      }

      if (!hasAccess) {
        return res.json({
          data: {
            ...recipe,
            steps: recipe.steps.slice(0, 1).map((s) => ({
              ...s,
              description: s.description.substring(0, 80) + '…',
              imageUrl: null,
              videoUrl: null,
            })),
            locked: true,
          },
        });
      }
    }

    res.json({ data: { ...recipe, locked: false } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener receta' });
  }
});

// GET /by-slug/:slug — same as /:id but by slug
router.get('/by-slug/:slug', async (req: Request, res: Response) => {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { slug: req.params.slug },
      include: {
        steps: { orderBy: { order: 'asc' } },
        product: { select: { id: true, name: true, slug: true, imageUrl: true } },
      },
    });

    if (!recipe || !recipe.isPublished) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    // Reuse same premium check as /:id
    if (recipe.isPremium) {
      const authHeader = req.headers.authorization;
      let hasAccess = false;

      if (authHeader?.startsWith('Bearer ')) {
        try {
          const jwt = require('jsonwebtoken');
          const payload = jwt.verify(
            authHeader.replace('Bearer ', ''),
            process.env.JWT_SECRET!
          ) as { id: string; role: string };

          if (payload.role === 'ADMIN') {
            hasAccess = true;
          } else {
            const sub = await prisma.subscription.findFirst({
              where: { userId: payload.id, status: 'ACTIVE' },
            });
            hasAccess = !!sub;
          }
        } catch {
          hasAccess = false;
        }
      }

      if (!hasAccess) {
        return res.json({
          data: {
            ...recipe,
            steps: recipe.steps.slice(0, 1).map((s) => ({
              ...s,
              description: s.description.substring(0, 80) + '…',
              imageUrl: null,
              videoUrl: null,
            })),
            locked: true,
          },
        });
      }
    }

    res.json({ data: { ...recipe, locked: false } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener receta' });
  }
});

// ── Admin routes ──────────────────────────────────────────────────────────

// GET /admin/all — all recipes regardless of published status
router.get('/admin/all', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const recipes = await prisma.recipe.findMany({
      include: {
        steps: { orderBy: { order: 'asc' } },
        product: { select: { id: true, name: true, slug: true } },
        _count: { select: { steps: true } },
      },
      orderBy: [{ method: 'asc' }, { title: 'asc' }],
    });
    res.json({ data: recipes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener recetas' });
  }
});

// POST /admin — create recipe (without steps)
router.post('/admin', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, slug, description, method, difficulty = 'MEDIA',
      prepTime, yield: yieldAmount, temp, grind, ratio,
      isPremium = false, isPublished = false, productId,
    } = req.body;

    if (!title?.trim() || !slug?.trim() || !method?.trim()) {
      return res.status(400).json({ error: 'title, slug y method son requeridos' });
    }

    const recipe = await prisma.recipe.create({
      data: {
        title: title.trim(),
        slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
        description: description?.trim() ?? null,
        method: method.trim(),
        difficulty,
        prepTime: prepTime ? parseInt(prepTime) : null,
        yield: yieldAmount?.trim() ?? null,
        temp: temp?.trim() ?? null,
        grind: grind?.trim() ?? null,
        ratio: ratio?.trim() ?? null,
        isPremium,
        isPublished,
        productId: productId || null,
      },
      include: { steps: true, product: { select: { id: true, name: true, slug: true } } },
    });

    res.status(201).json({ data: recipe });
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe una receta con ese slug' });
    }
    res.status(500).json({ error: 'Error al crear receta' });
  }
});

// PUT /admin/:id — update recipe metadata
router.put('/admin/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      title, slug, description, method, difficulty,
      prepTime, yield: yieldAmount, temp, grind, ratio,
      isPremium, isPublished, productId,
    } = req.body;

    const data: any = {};
    if (title !== undefined) data.title = title.trim();
    if (slug !== undefined) data.slug = slug.trim().toLowerCase().replace(/\s+/g, '-');
    if (description !== undefined) data.description = description?.trim() ?? null;
    if (method !== undefined) data.method = method.trim();
    if (difficulty !== undefined) data.difficulty = difficulty;
    if (prepTime !== undefined) data.prepTime = prepTime ? parseInt(prepTime) : null;
    if (yieldAmount !== undefined) data.yield = yieldAmount?.trim() ?? null;
    if (temp !== undefined) data.temp = temp?.trim() ?? null;
    if (grind !== undefined) data.grind = grind?.trim() ?? null;
    if (ratio !== undefined) data.ratio = ratio?.trim() ?? null;
    if (isPremium !== undefined) data.isPremium = isPremium;
    if (isPublished !== undefined) data.isPublished = isPublished;
    if (productId !== undefined) data.productId = productId || null;

    const recipe = await prisma.recipe.update({
      where: { id: req.params.id },
      data,
      include: { steps: { orderBy: { order: 'asc' } }, product: { select: { id: true, name: true, slug: true } } },
    });

    res.json({ data: recipe });
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002') return res.status(409).json({ error: 'Slug ya existe' });
    res.status(500).json({ error: 'Error al actualizar receta' });
  }
});

// DELETE /admin/:id
router.delete('/admin/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.recipe.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar receta' });
  }
});

// POST /admin/:id/steps — add a step
router.post('/admin/:id/steps', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, imageUrl, videoUrl, duration } = req.body;

    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ error: 'title y description son requeridos' });
    }

    // Get current max order
    const last = await prisma.recipeStep.findFirst({
      where: { recipeId: req.params.id },
      orderBy: { order: 'desc' },
    });
    const order = (last?.order ?? 0) + 1;

    const step = await prisma.recipeStep.create({
      data: {
        recipeId: req.params.id,
        order,
        title: title.trim(),
        description: description.trim(),
        imageUrl: imageUrl?.trim() ?? null,
        videoUrl: videoUrl?.trim() ?? null,
        duration: duration ? parseInt(duration) : null,
      },
    });

    res.status(201).json({ data: step });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al agregar paso' });
  }
});

// PUT /admin/:id/steps/:stepId — update a step
router.put('/admin/:id/steps/:stepId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, imageUrl, videoUrl, duration, order } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description.trim();
    if (imageUrl !== undefined) data.imageUrl = imageUrl?.trim() ?? null;
    if (videoUrl !== undefined) data.videoUrl = videoUrl?.trim() ?? null;
    if (duration !== undefined) data.duration = duration ? parseInt(duration) : null;
    if (order !== undefined) data.order = parseInt(order);

    const step = await prisma.recipeStep.update({
      where: { id: req.params.stepId },
      data,
    });
    res.json({ data: step });
  } catch {
    res.status(500).json({ error: 'Error al actualizar paso' });
  }
});

// DELETE /admin/:id/steps/:stepId — delete a step
router.delete('/admin/:id/steps/:stepId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.recipeStep.delete({ where: { id: req.params.stepId } });

    // Re-number remaining steps
    const remaining = await prisma.recipeStep.findMany({
      where: { recipeId: req.params.id },
      orderBy: { order: 'asc' },
    });
    await prisma.$transaction(
      remaining.map((s, i) =>
        prisma.recipeStep.update({ where: { id: s.id }, data: { order: i + 1 } })
      )
    );

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar paso' });
  }
});

// PUT /admin/:id/steps/reorder — reorder all steps at once
router.put('/admin/:id/steps/reorder', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { stepIds } = req.body as { stepIds: string[] };
    if (!Array.isArray(stepIds)) {
      return res.status(400).json({ error: 'stepIds debe ser un arreglo' });
    }

    await prisma.$transaction(
      stepIds.map((id, i) =>
        prisma.recipeStep.update({ where: { id }, data: { order: i + 1 } })
      )
    );

    const steps = await prisma.recipeStep.findMany({
      where: { recipeId: req.params.id },
      orderBy: { order: 'asc' },
    });

    res.json({ data: steps });
  } catch {
    res.status(500).json({ error: 'Error al reordenar pasos' });
  }
});

export default router;
```

- [ ] **Step 2: Register in `server/src/index.ts`**

Read the file. Add import and registration after existing routes:

```typescript
import recipesRouter from './routes/recipes';

// After express.json() and before health check:
app.use('/api/recipes', recipesRouter);
```

- [ ] **Step 3: TypeScript check**

```bash
cd /home/grxson/github/12porciento-cafe/server
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/recipes.ts server/src/index.ts
git commit -m "feat: add Recipe CRUD API with premium access gating and step management"
```

---

## Task 3: Backend — Extend inventory routes with alerts + CSV export + cost tracking

**Files:**
- Modify: `server/src/routes/inventory.ts`

- [ ] **Step 1: Read current inventory.ts**

```bash
cat /home/grxson/github/12porciento-cafe/server/src/routes/inventory.ts
```

- [ ] **Step 2: Add cost/supplier/batch fields to POST /adjust**

In the `POST /adjust` handler, extend `req.body` destructuring to include new fields and pass them to `StockMovement.create`:

Replace the `req.body` destructure:
```typescript
const { productId, type, quantity, notes } = req.body as {
  productId: string;
  type: 'RESTOCK' | 'ADJUSTMENT' | 'LOSS' | 'RETURN';
  quantity: number;
  notes?: string;
};
```

With:
```typescript
const { productId, type, quantity, notes, unitCost, batchNumber, expiryDate, supplier } = req.body as {
  productId: string;
  type: 'RESTOCK' | 'ADJUSTMENT' | 'LOSS' | 'RETURN';
  quantity: number;
  notes?: string;
  unitCost?: number;
  batchNumber?: string;
  expiryDate?: string;
  supplier?: string;
};
```

In `prisma.stockMovement.create`, add the new fields:
```typescript
prisma.stockMovement.create({
  data: {
    productId,
    type,
    quantity: delta,
    previousStock: product.stock,
    newStock,
    notes: notes ?? null,
    unitCost: unitCost ?? null,
    batchNumber: batchNumber?.trim() ?? null,
    expiryDate: expiryDate ? new Date(expiryDate) : null,
    supplier: supplier?.trim() ?? null,
  },
}),
```

- [ ] **Step 3: Add GET /alerts endpoint** — insert before `export default router`:

```typescript
// GET /alerts — products that need attention
router.get('/alerts', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, slug: true, sku: true, category: true,
        stock: true, lowStockThreshold: true, price: true, costPrice: true,
        supplier: true, imageUrl: true,
      },
    });

    type P = typeof products[number];

    const outOfStock = products.filter((p: P) => p.stock === 0);
    const lowStock = products.filter((p: P) => p.stock > 0 && p.stock <= p.lowStockThreshold);
    const overstock = products.filter((p: P) => p.stock > p.lowStockThreshold * 10);

    // Products with expiring batches (next 30 days)
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    const expiringMovements = await prisma.stockMovement.findMany({
      where: {
        expiryDate: { lte: soon, gte: new Date() },
        type: 'RESTOCK',
      },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { expiryDate: 'asc' },
    });

    res.json({
      outOfStock,
      lowStock,
      overstock,
      expiringBatches: expiringMovements.map((m) => ({
        productId: m.productId,
        productName: m.product.name,
        batchNumber: m.batchNumber,
        expiryDate: m.expiryDate,
        quantity: m.quantity,
      })),
      summary: {
        outOfStockCount: outOfStock.length,
        lowStockCount: lowStock.length,
        overstockCount: overstock.length,
        expiringCount: expiringMovements.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener alertas' });
  }
});
```

- [ ] **Step 4: Add GET /export-csv endpoint**

```typescript
// GET /export-csv — download inventory as CSV
router.get('/export-csv', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      select: {
        sku: true, name: true, category: true, stock: true, lowStockThreshold: true,
        price: true, costPrice: true, supplier: true, weight: true, isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    const headers = ['SKU', 'Nombre', 'Categoría', 'Stock', 'Umbral', 'Precio', 'Costo', 'Proveedor', 'Peso (g)', 'Activo'];
    const rows = products.map((p) => [
      p.sku ?? '',
      p.name,
      p.category,
      p.stock,
      p.lowStockThreshold,
      p.price.toFixed(2),
      p.costPrice?.toFixed(2) ?? '',
      p.supplier ?? '',
      p.weight ?? '',
      p.isActive ? 'Sí' : 'No',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="inventario-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('﻿' + csv); // BOM for Excel
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al exportar inventario' });
  }
});
```

- [ ] **Step 5: Update GET / overview to include costPrice and sku**

In the `GET /` handler, update the `prisma.product.findMany` select to include:
```typescript
select: {
  id: true, name: true, slug: true, category: true, imageUrl: true,
  price: true, costPrice: true, stock: true, lowStockThreshold: true,
  isActive: true, sku: true, supplier: true,
},
```

And update the products map to include margin calculation:
```typescript
products: products.map((p: P) => ({
  ...p,
  status: p.stock === 0 ? 'OUT' : p.stock <= p.lowStockThreshold ? 'LOW' : 'OK',
  inventoryValue: p.stock * p.price,
  costValue: p.costPrice ? p.stock * p.costPrice : null,
  margin: p.costPrice ? ((p.price - p.costPrice) / p.price * 100).toFixed(1) : null,
})),
```

- [ ] **Step 6: TypeScript check**

```bash
cd /home/grxson/github/12porciento-cafe/server
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add server/src/routes/inventory.ts
git commit -m "feat: extend inventory routes with alerts, CSV export, cost/batch tracking"
```

---

## Task 4: Backend — Extend products routes with SKU, costPrice, supplier

**Files:**
- Modify: `server/src/routes/products.ts`

- [ ] **Step 1: Read current products.ts**

```bash
cat /home/grxson/github/12porciento-cafe/server/src/routes/products.ts
```

- [ ] **Step 2: Add new fields to parseProduct helper**

The existing `parseProduct` function parses `flavors` and `recipes` from JSON. Update it to also pass through new fields:

```typescript
const parseProduct = (p: any) => ({
  ...p,
  flavors: p.flavors ? JSON.parse(p.flavors) : [],
  // recipes field removed — now served via /api/recipes
});
```

Remove `recipes: p.recipes ? JSON.parse(p.recipes) : [],` from parseProduct since recipes are now their own model.

- [ ] **Step 3: Add new fields to POST / (create product)**

In the `POST /` handler body destructure, add:
```typescript
const { flavors, sku, costPrice, supplier, minOrderQty, ...data } = req.body;
```

And in `prisma.product.create` data:
```typescript
data: {
  ...data,
  flavors: flavors ? JSON.stringify(flavors) : null,
  sku: sku?.trim() ?? null,
  costPrice: costPrice ? parseFloat(costPrice) : null,
  supplier: supplier?.trim() ?? null,
  minOrderQty: minOrderQty ? parseInt(minOrderQty) : 1,
}
```

- [ ] **Step 4: Add new fields to PUT /:id (update product)**

In the `PUT /:id` handler, extend the update data to include:
```typescript
...(sku !== undefined && { sku: sku?.trim() ?? null }),
...(costPrice !== undefined && { costPrice: costPrice ? parseFloat(costPrice) : null }),
...(supplier !== undefined && { supplier: supplier?.trim() ?? null }),
...(minOrderQty !== undefined && { minOrderQty: minOrderQty ? parseInt(minOrderQty) : null }),
```

- [ ] **Step 5: TypeScript check**

```bash
cd /home/grxson/github/12porciento-cafe/server
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/products.ts
git commit -m "feat: add SKU, costPrice, supplier, minOrderQty to product create/update"
```

---

## Task 5: Frontend — Types + API client for recipes

**Files:**
- Modify: `client/src/types/index.ts`
- Modify: `client/src/api/index.ts`

- [ ] **Step 1: Update Recipe type in types/index.ts**

Read the current file. Replace the existing `Recipe` interface with the new shape:

```typescript
export interface RecipeStep {
  id: string;
  recipeId: string;
  order: number;
  title: string;
  description: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  duration?: number | null;
}

export interface Recipe {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  method: string;
  difficulty: 'FÁCIL' | 'MEDIA' | 'DIFÍCIL';
  prepTime?: number | null;
  yield?: string | null;
  temp?: string | null;
  grind?: string | null;
  ratio?: string | null;
  isPremium: boolean;
  isPublished: boolean;
  productId?: string | null;
  product?: { id: string; name: string; slug: string; imageUrl: string } | null;
  steps: RecipeStep[];
  locked?: boolean; // true when user doesn't have access to premium content
  createdAt: string;
  updatedAt: string;
}
```

Also update the `Product` type to remove `recipes: Recipe[]` and add the new inventory fields:

```typescript
export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  origin?: string;
  region?: string;
  altitude?: number;
  variety?: string;
  process?: string;
  scaScore?: number;
  roastLevel?: string;
  flavors: string[];
  price: number;
  weight?: number;
  stock: number;
  sku?: string | null;
  costPrice?: number | null;
  supplier?: string | null;
  minOrderQty?: number | null;
  lowStockThreshold: number;
  imageUrl: string;
  description: string;
  isLimited: boolean;
  isActive: boolean;
  createdAt: string;
}
```

- [ ] **Step 2: Add recipesApi to api/index.ts**

```typescript
export const recipesApi = {
  // Public
  list: (params?: { method?: string; productId?: string; premium?: boolean }) =>
    api.get<{ data: Recipe[] }>('/recipes', { params }),
  getById: (id: string) => api.get<{ data: Recipe }>(`/recipes/${id}`),
  getBySlug: (slug: string) => api.get<{ data: Recipe }>(`/recipes/by-slug/${slug}`),

  // Admin
  adminList: () => api.get<{ data: Recipe[] }>('/recipes/admin/all'),
  create: (data: Partial<Recipe> & { title: string; slug: string; method: string }) =>
    api.post<{ data: Recipe }>('/recipes/admin', data),
  update: (id: string, data: Partial<Recipe>) =>
    api.put<{ data: Recipe }>(`/recipes/admin/${id}`, data),
  delete: (id: string) => api.delete(`/recipes/admin/${id}`),
  addStep: (recipeId: string, data: Partial<RecipeStep> & { title: string; description: string }) =>
    api.post<{ data: RecipeStep }>(`/recipes/admin/${recipeId}/steps`, data),
  updateStep: (recipeId: string, stepId: string, data: Partial<RecipeStep>) =>
    api.put<{ data: RecipeStep }>(`/recipes/admin/${recipeId}/steps/${stepId}`, data),
  deleteStep: (recipeId: string, stepId: string) =>
    api.delete(`/recipes/admin/${recipeId}/steps/${stepId}`),
  reorderSteps: (recipeId: string, stepIds: string[]) =>
    api.put<{ data: RecipeStep[] }>(`/recipes/admin/${recipeId}/steps/reorder`, { stepIds }),
};
```

Import `Recipe` and `RecipeStep` at the top of api/index.ts:
```typescript
import type { UserProfile, Order, Review, Subscription, PaymentMethod, Recipe, RecipeStep } from '../types';
```

- [ ] **Step 3: Add inventory alerts and CSV export to api/index.ts**

Extend the existing `inventoryApi` or add it if missing. Add after other apis:

```typescript
export const inventoryApi = {
  overview: () => api.get('/inventory'),
  movements: (params?: Record<string, string>) => api.get('/inventory/movements', { params }),
  alerts: () => api.get('/inventory/alerts'),
  adjust: (data: {
    productId: string; type: string; quantity: number; notes?: string;
    unitCost?: number; batchNumber?: string; expiryDate?: string; supplier?: string;
  }) => api.post('/inventory/adjust', data),
  updateThreshold: (productId: string, threshold: number) =>
    api.put(`/inventory/products/${productId}/threshold`, { threshold }),
  exportCsvUrl: () => `${api.defaults.baseURL}/inventory/export-csv`,
};
```

- [ ] **Step 4: TypeScript check**

```bash
cd /home/grxson/github/12porciento-cafe/client
npx tsc --noEmit
```

Fix any errors (mainly anywhere `product.recipes` is used with the old Recipe shape — those files will need updating).

- [ ] **Step 5: Commit**

```bash
git add client/src/types/index.ts client/src/api/index.ts
git commit -m "feat: update Recipe/RecipeStep types and add recipesApi + inventoryApi to client"
```

---

## Task 6: Frontend — Rewrite Recipes.tsx with new access model + PDF export

**Files:**
- Modify: `client/src/pages/Recipes.tsx`

- [ ] **Step 1: Read current Recipes.tsx**

```bash
wc -l /home/grxson/github/12porciento-cafe/client/src/pages/Recipes.tsx
cat /home/grxson/github/12porciento-cafe/client/src/pages/Recipes.tsx
```

- [ ] **Step 2: Rewrite Recipes.tsx**

The new page fetches from `/api/recipes`, groups by method, shows premium badge on gated recipes, shows locked state for non-subscribers with subscribe CTA, and allows PDF download for free accessible recipes.

```typescript
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coffee, GlassWater, Snowflake, Wrench, Lock, Star,
  Clock, ChevronDown, ChevronUp, Download, Play,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { recipesApi } from '../api';
import { useUser } from '../context/UserContext';
import type { Recipe } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────

function MethodIcon({ method }: { method: string }) {
  const m = method.toLowerCase();
  if (m.includes('espresso') || m.includes('americano')) return <Coffee className="w-4 h-4" />;
  if (m.includes('cold') || m.includes('frío')) return <Snowflake className="w-4 h-4" />;
  if (m.includes('moka') || m.includes('presión')) return <Wrench className="w-4 h-4" />;
  return <GlassWater className="w-4 h-4" />;
}

const DIFFICULTY_COLORS = {
  'FÁCIL': 'text-green-400 bg-green-900/20 border-green-500/30',
  'MEDIA': 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
  'DIFÍCIL': 'text-red-400 bg-red-900/20 border-red-500/30',
};

function downloadRecipePDF(recipe: Recipe) {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const W = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(13, 8, 6);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(201, 169, 110);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('12%', 10, 17);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('CAFÉ DE ESPECIALIDAD', 10, 24);

  // Title
  doc.setTextColor(13, 8, 6);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(recipe.title, 10, 42);

  // Meta
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 80, 60);
  let metaY = 50;
  if (recipe.temp) { doc.text(`Temperatura: ${recipe.temp}`, 10, metaY); metaY += 6; }
  if (recipe.grind) { doc.text(`Molienda: ${recipe.grind}`, 10, metaY); metaY += 6; }
  if (recipe.ratio) { doc.text(`Ratio: ${recipe.ratio}`, 10, metaY); metaY += 6; }
  if (recipe.prepTime) { doc.text(`Tiempo: ${recipe.prepTime} min`, 10, metaY); metaY += 6; }

  // Gold divider
  doc.setDrawColor(201, 169, 110);
  doc.setLineWidth(0.3);
  doc.line(10, metaY + 2, W - 10, metaY + 2);
  metaY += 8;

  // Steps
  doc.setTextColor(13, 8, 6);
  recipe.steps.forEach((step, i) => {
    if (metaY > 185) { doc.addPage(); metaY = 15; }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${i + 1}. ${step.title}`, 10, metaY);
    metaY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(step.description, W - 20);
    doc.text(lines, 10, metaY);
    metaY += lines.length * 4.5 + 4;
  });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150, 120, 90);
  doc.text('12porciento.cafe', 10, doc.internal.pageSize.getHeight() - 8);

  doc.save(`${recipe.slug}.pdf`);
}

// ── Main component ────────────────────────────────────────────────────────

export default function Recipes() {
  const hasSubscription = useUser((s) => s.hasSubscription);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<string>('TODOS');

  useEffect(() => {
    recipesApi.list().then((r) => {
      setRecipes(r.data.data);
      setLoading(false);
    });
  }, []);

  const methods = ['TODOS', ...Array.from(new Set(recipes.map((r) => r.method))).sort()];

  const filtered = methodFilter === 'TODOS'
    ? recipes
    : recipes.filter((r) => r.method === methodFilter);

  // Free users: show first 2 non-premium, then locked
  const visible = hasSubscription
    ? filtered
    : (() => {
        const free = filtered.filter((r) => !r.isPremium);
        const premium = filtered.filter((r) => r.isPremium);
        return [...free.slice(0, 2), ...premium];
      })();

  const freeLimit = !hasSubscription && filtered.filter((r) => !r.isPremium).length > 2;

  if (loading) {
    return (
      <div className="min-h-screen bg-coffee-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-coffee-950 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs text-gold-500 uppercase tracking-[0.3em] mb-3">Guías de preparación</p>
          <h1 className="font-serif text-4xl text-cream mb-4">Recetas</h1>
          <p className="text-coffee-400 text-sm max-w-lg mx-auto">
            Desde espressos clásicos hasta métodos de filtrado de especialidad. Cada receta, paso a paso.
          </p>
        </div>

        {/* Method filter */}
        <div className="flex gap-2 flex-wrap justify-center mb-10">
          {methods.map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={`px-4 py-1.5 text-xs uppercase tracking-wider border transition-colors ${
                methodFilter === m
                  ? 'border-gold-500 text-gold-500 bg-gold-500/10'
                  : 'border-coffee-700 text-coffee-400 hover:border-coffee-600'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Recipe list */}
        <div className="space-y-4">
          {visible.map((recipe) => {
            const isLocked = recipe.isPremium && !hasSubscription;
            const isExpanded = expandedId === recipe.id;

            return (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border ${isLocked ? 'border-gold-500/20 bg-coffee-900/40' : 'border-coffee-800 bg-coffee-900'}`}
              >
                {/* Recipe header */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer"
                  onClick={() => !isLocked && setExpandedId(isExpanded ? null : recipe.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gold-400"><MethodIcon method={recipe.method} /></span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-cream font-medium">{recipe.title}</h3>
                        {recipe.isPremium && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-gold-500/10 border border-gold-500/30 text-gold-400 uppercase tracking-wider">
                            Premium
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-coffee-500">{recipe.method}</span>
                        {recipe.prepTime && (
                          <span className="flex items-center gap-1 text-xs text-coffee-500">
                            <Clock className="w-3 h-3" /> {recipe.prepTime} min
                          </span>
                        )}
                        {recipe.difficulty && (
                          <span className={`text-[10px] px-1.5 py-0.5 border rounded-sm ${DIFFICULTY_COLORS[recipe.difficulty] ?? ''}`}>
                            {recipe.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isLocked && (
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadRecipePDF(recipe); }}
                        className="p-1.5 text-coffee-500 hover:text-gold-400 transition-colors"
                        title="Descargar PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    {isLocked ? (
                      <Lock className="w-4 h-4 text-gold-500/50" />
                    ) : (
                      isExpanded ? <ChevronUp className="w-4 h-4 text-coffee-400" /> : <ChevronDown className="w-4 h-4 text-coffee-400" />
                    )}
                  </div>
                </div>

                {/* Locked CTA */}
                {isLocked && (
                  <div className="px-5 pb-5">
                    <div className="flex items-center gap-3 bg-gold-500/5 border border-gold-500/20 p-4">
                      <Star className="w-5 h-5 text-gold-500 shrink-0" />
                      <div>
                        <p className="text-cream text-sm font-medium">Receta exclusiva para suscriptores</p>
                        <p className="text-coffee-400 text-xs mt-0.5">Suscríbete para acceder a todas las recetas premium y más.</p>
                      </div>
                      <Link to="/suscripciones" className="ml-auto shrink-0 px-4 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 transition-colors">
                        Ver planes
                      </Link>
                    </div>
                    {/* Show first step teaser */}
                    {recipe.steps[0] && (
                      <div className="mt-3 px-2 opacity-50">
                        <p className="text-xs text-coffee-400 uppercase tracking-wider mb-1">Paso 1 (vista previa)</p>
                        <p className="text-coffee-300 text-sm">{recipe.steps[0].description}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded steps */}
                <AnimatePresence>
                  {isExpanded && !isLocked && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-t border-coffee-800"
                    >
                      <div className="p-5 space-y-6">
                        {/* Meta row */}
                        {(recipe.temp || recipe.grind || recipe.ratio || recipe.yield) && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { label: 'Temperatura', value: recipe.temp },
                              { label: 'Molienda', value: recipe.grind },
                              { label: 'Ratio', value: recipe.ratio },
                              { label: 'Rendimiento', value: recipe.yield },
                            ].filter((x) => x.value).map((x) => (
                              <div key={x.label} className="bg-coffee-800/50 p-3 text-center">
                                <p className="text-[10px] text-coffee-500 uppercase tracking-wider mb-1">{x.label}</p>
                                <p className="text-cream text-sm font-medium">{x.value}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Steps */}
                        <div className="space-y-5">
                          {recipe.steps.map((step, i) => (
                            <div key={step.id} className="flex gap-4">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center">
                                <span className="text-gold-400 text-xs font-bold">{i + 1}</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-cream font-medium mb-1">{step.title}</p>
                                <p className="text-coffee-300 text-sm leading-relaxed">{step.description}</p>
                                {step.duration && (
                                  <p className="text-xs text-coffee-500 mt-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {step.duration}s
                                  </p>
                                )}
                                {step.imageUrl && (
                                  <img src={step.imageUrl} alt={step.title} className="mt-3 rounded-lg max-h-64 object-cover" />
                                )}
                                {step.videoUrl && (
                                  <a href={step.videoUrl} target="_blank" rel="noopener noreferrer"
                                    className="mt-3 flex items-center gap-2 text-xs text-gold-400 hover:text-gold-300 transition-colors">
                                    <Play className="w-3.5 h-3.5" /> Ver video del paso
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Product link */}
                        {recipe.product && (
                          <div className="border-t border-coffee-800 pt-4">
                            <p className="text-xs text-coffee-500 mb-2">Recomendado con:</p>
                            <Link to={`/tienda/${recipe.product.slug}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                              <img src={recipe.product.imageUrl} alt={recipe.product.name} className="w-10 h-10 object-cover" />
                              <span className="text-gold-400 text-sm">{recipe.product.name}</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Free limit banner */}
        {freeLimit && (
          <div className="mt-8 text-center border border-gold-500/20 bg-gold-500/5 p-6">
            <Lock className="w-8 h-8 text-gold-500 mx-auto mb-3" />
            <p className="text-cream font-medium mb-1">Estás viendo 2 de {filtered.filter((r) => !r.isPremium).length} recetas gratuitas</p>
            <p className="text-coffee-400 text-sm mb-4">Suscríbete para ver todas las recetas + acceso a recetas premium exclusivas</p>
            <Link to="/suscripciones" className="inline-block px-6 py-3 bg-gold-500 text-coffee-950 text-xs font-bold uppercase tracking-wider hover:bg-gold-400 transition-colors">
              Ver planes de suscripción
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd /home/grxson/github/12porciento-cafe/client
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Recipes.tsx
git commit -m "feat: rewrite Recipes page with new API, subscriber access gating, and step-by-step UI"
```

---

## Task 7: Admin — Recipe manager UI

**Files:**
- Create: `client/src/admin/Recipes.tsx`
- Modify: `client/src/admin/AdminLayout.tsx`

- [ ] **Step 1: Read AdminLayout.tsx to understand nav link format**

```bash
head -30 /home/grxson/github/12porciento-cafe/client/src/admin/AdminLayout.tsx
```

- [ ] **Step 2: Create `client/src/admin/Recipes.tsx`**

Full admin CRUD for recipes with step management:

```typescript
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, ChevronUp, ChevronDown, Eye, EyeOff, Star, BookOpen } from 'lucide-react';
import { recipesApi, productsApi } from '../api';
import { useToast } from '../context/ToastContext';
import type { Recipe, RecipeStep } from '../types';

const METHODS = ['Espresso', 'V60', 'Pour Over', 'Chemex', 'Kalita Wave', 'Prensa Francesa', 'Cold Brew', 'Moka', 'AeroPress', 'Sifón', 'Americano'];
const DIFFICULTIES = ['FÁCIL', 'MEDIA', 'DIFÍCIL'];

const emptyRecipeForm = {
  title: '', slug: '', description: '', method: 'V60', difficulty: 'MEDIA',
  prepTime: '', yield: '', temp: '', grind: '', ratio: '',
  isPremium: false, isPublished: false, productId: '',
};

const emptyStepForm = {
  title: '', description: '', imageUrl: '', videoUrl: '', duration: '',
};

export default function AdminRecipes() {
  const { add } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Recipe form modal
  const [recipeModal, setRecipeModal] = useState<'add' | 'edit' | null>(null);
  const [recipeForm, setRecipeForm] = useState(emptyRecipeForm);
  const [editRecipeId, setEditRecipeId] = useState<string | null>(null);
  const [savingRecipe, setSavingRecipe] = useState(false);

  // Step form modal
  const [stepModal, setStepModal] = useState<{ recipeId: string; stepId?: string } | null>(null);
  const [stepForm, setStepForm] = useState(emptyStepForm);
  const [savingStep, setSavingStep] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [recipeRes, productRes] = await Promise.all([
        recipesApi.adminList(),
        productsApi.adminList(),
      ]);
      setRecipes(recipeRes.data.data);
      setProducts((productRes.data as any[]).map((p: any) => ({ id: p.id, name: p.name })));
    } catch {
      add('Error al cargar recetas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAddRecipe = () => {
    setRecipeForm(emptyRecipeForm);
    setEditRecipeId(null);
    setRecipeModal('add');
  };

  const openEditRecipe = (r: Recipe) => {
    setRecipeForm({
      title: r.title, slug: r.slug, description: r.description ?? '',
      method: r.method, difficulty: r.difficulty,
      prepTime: r.prepTime?.toString() ?? '', yield: r.yield ?? '',
      temp: r.temp ?? '', grind: r.grind ?? '', ratio: r.ratio ?? '',
      isPremium: r.isPremium, isPublished: r.isPublished,
      productId: r.productId ?? '',
    });
    setEditRecipeId(r.id);
    setRecipeModal('edit');
  };

  const saveRecipe = async () => {
    if (!recipeForm.title.trim() || !recipeForm.slug.trim() || !recipeForm.method) {
      add('Título, slug y método son requeridos', 'error');
      return;
    }
    setSavingRecipe(true);
    try {
      const payload = {
        ...recipeForm,
        prepTime: recipeForm.prepTime ? parseInt(recipeForm.prepTime) : undefined,
        productId: recipeForm.productId || undefined,
      };
      if (recipeModal === 'add') {
        await recipesApi.create(payload as any);
        add('Receta creada', 'success');
      } else if (editRecipeId) {
        await recipesApi.update(editRecipeId, payload as any);
        add('Receta actualizada', 'success');
      }
      setRecipeModal(null);
      load();
    } catch (err: any) {
      add(err.response?.data?.error ?? 'Error al guardar receta', 'error');
    } finally {
      setSavingRecipe(false);
    }
  };

  const deleteRecipe = async (id: string) => {
    if (!confirm('¿Eliminar esta receta y todos sus pasos?')) return;
    try {
      await recipesApi.delete(id);
      add('Receta eliminada', 'success');
      load();
    } catch { add('Error al eliminar', 'error'); }
  };

  const togglePublished = async (r: Recipe) => {
    try {
      await recipesApi.update(r.id, { isPublished: !r.isPublished });
      add(r.isPublished ? 'Receta despublicada' : 'Receta publicada', 'success');
      load();
    } catch { add('Error', 'error'); }
  };

  const openAddStep = (recipeId: string) => {
    setStepForm(emptyStepForm);
    setStepModal({ recipeId });
  };

  const openEditStep = (recipeId: string, step: RecipeStep) => {
    setStepForm({
      title: step.title, description: step.description,
      imageUrl: step.imageUrl ?? '', videoUrl: step.videoUrl ?? '',
      duration: step.duration?.toString() ?? '',
    });
    setStepModal({ recipeId, stepId: step.id });
  };

  const saveStep = async () => {
    if (!stepModal) return;
    if (!stepForm.title.trim() || !stepForm.description.trim()) {
      add('Título y descripción son requeridos', 'error');
      return;
    }
    setSavingStep(true);
    try {
      const payload = {
        ...stepForm,
        duration: stepForm.duration ? parseInt(stepForm.duration) : undefined,
        imageUrl: stepForm.imageUrl || undefined,
        videoUrl: stepForm.videoUrl || undefined,
      };
      if (stepModal.stepId) {
        await recipesApi.updateStep(stepModal.recipeId, stepModal.stepId, payload);
        add('Paso actualizado', 'success');
      } else {
        await recipesApi.addStep(stepModal.recipeId, payload as any);
        add('Paso agregado', 'success');
      }
      setStepModal(null);
      load();
    } catch { add('Error al guardar paso', 'error'); } finally { setSavingStep(false); }
  };

  const deleteStep = async (recipeId: string, stepId: string) => {
    try {
      await recipesApi.deleteStep(recipeId, stepId);
      add('Paso eliminado', 'success');
      load();
    } catch { add('Error', 'error'); }
  };

  const moveStep = async (recipeId: string, steps: RecipeStep[], fromIdx: number, toIdx: number) => {
    const reordered = [...steps];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    try {
      await recipesApi.reorderSteps(recipeId, reordered.map((s) => s.id));
      load();
    } catch { add('Error al reordenar', 'error'); }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-coffee-400 text-sm">{recipes.length} recetas · {recipes.filter((r) => r.isPublished).length} publicadas · {recipes.filter((r) => r.isPremium).length} premium</p>
        </div>
        <button onClick={openAddRecipe} className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 transition-colors">
          <Plus className="w-4 h-4" /> Nueva receta
        </button>
      </div>

      {/* Recipe list */}
      <div className="space-y-3">
        {recipes.map((recipe) => (
          <div key={recipe.id} className="bg-coffee-900 border border-coffee-800">
            {/* Recipe row */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 min-w-0">
                <BookOpen className="w-4 h-4 text-gold-400 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-cream text-sm font-medium truncate">{recipe.title}</p>
                    {recipe.isPremium && <Star className="w-3 h-3 text-gold-400 shrink-0" />}
                    {!recipe.isPublished && <span className="text-[10px] text-coffee-500 bg-coffee-800 px-1.5 py-0.5">Borrador</span>}
                  </div>
                  <p className="text-coffee-500 text-xs">{recipe.method} · {(recipe as any)._count?.steps ?? recipe.steps.length} pasos</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => togglePublished(recipe)} title={recipe.isPublished ? 'Despublicar' : 'Publicar'}
                  className="p-1.5 text-coffee-500 hover:text-cream transition-colors">
                  {recipe.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => openEditRecipe(recipe)} className="p-1.5 text-coffee-500 hover:text-gold-400 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => deleteRecipe(recipe.id)} className="p-1.5 text-coffee-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setExpanded(expanded === recipe.id ? null : recipe.id)}
                  className="p-1.5 text-coffee-500 hover:text-cream transition-colors">
                  {expanded === recipe.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Steps panel */}
            <AnimatePresence>
              {expanded === recipe.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-coffee-800">
                  <div className="p-4 space-y-2">
                    {recipe.steps.map((step, i) => (
                      <div key={step.id} className="flex items-start gap-3 bg-coffee-800/40 p-3">
                        <span className="w-6 h-6 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs flex items-center justify-center shrink-0">{step.order}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-cream text-xs font-medium">{step.title}</p>
                          <p className="text-coffee-400 text-xs mt-0.5 truncate">{step.description}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {i > 0 && (
                            <button onClick={() => moveStep(recipe.id, recipe.steps, i, i - 1)} className="p-1 text-coffee-500 hover:text-cream">
                              <ChevronUp className="w-3 h-3" />
                            </button>
                          )}
                          {i < recipe.steps.length - 1 && (
                            <button onClick={() => moveStep(recipe.id, recipe.steps, i, i + 1)} className="p-1 text-coffee-500 hover:text-cream">
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          )}
                          <button onClick={() => openEditStep(recipe.id, step)} className="p-1 text-coffee-500 hover:text-gold-400">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => deleteStep(recipe.id, step.id)} className="p-1 text-coffee-500 hover:text-red-400">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => openAddStep(recipe.id)}
                      className="w-full py-2 border border-dashed border-coffee-700 text-coffee-500 text-xs hover:border-gold-500/50 hover:text-gold-400 transition-colors flex items-center justify-center gap-1">
                      <Plus className="w-3 h-3" /> Agregar paso
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {recipes.length === 0 && (
          <div className="text-center py-16 text-coffee-500">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Sin recetas aún. Crea la primera.</p>
          </div>
        )}
      </div>

      {/* Recipe modal */}
      <AnimatePresence>
        {recipeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-coffee-900 border border-coffee-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-coffee-800 sticky top-0 bg-coffee-900 z-10">
                <h2 className="font-serif text-lg text-cream">{recipeModal === 'add' ? 'Nueva receta' : 'Editar receta'}</h2>
                <button onClick={() => setRecipeModal(null)} className="text-coffee-400 hover:text-cream"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-coffee-400 mb-1">Título *</label>
                    <input value={recipeForm.title} onChange={(e) => setRecipeForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-coffee-400 mb-1">Slug *</label>
                    <input value={recipeForm.slug} onChange={(e) => setRecipeForm((f) => ({ ...f, slug: e.target.value }))}
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Descripción</label>
                  <textarea value={recipeForm.description} onChange={(e) => setRecipeForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2} className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500 resize-none" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-coffee-400 mb-1">Método *</label>
                    <select value={recipeForm.method} onChange={(e) => setRecipeForm((f) => ({ ...f, method: e.target.value }))}
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500">
                      {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-coffee-400 mb-1">Dificultad</label>
                    <select value={recipeForm.difficulty} onChange={(e) => setRecipeForm((f) => ({ ...f, difficulty: e.target.value }))}
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500">
                      {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-coffee-400 mb-1">Tiempo (min)</label>
                    <input type="number" value={recipeForm.prepTime} onChange={(e) => setRecipeForm((f) => ({ ...f, prepTime: e.target.value }))}
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {(['temp', 'grind', 'ratio'] as const).map((field) => (
                    <div key={field}>
                      <label className="block text-xs text-coffee-400 mb-1 capitalize">{field === 'temp' ? 'Temperatura' : field === 'grind' ? 'Molienda' : 'Ratio'}</label>
                      <input value={recipeForm[field]} onChange={(e) => setRecipeForm((f) => ({ ...f, [field]: e.target.value }))}
                        className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-coffee-400 mb-1">Rendimiento</label>
                    <input value={recipeForm.yield} onChange={(e) => setRecipeForm((f) => ({ ...f, yield: e.target.value }))}
                      placeholder="ej. 1 taza 250ml"
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-coffee-400 mb-1">Café relacionado</label>
                    <select value={recipeForm.productId} onChange={(e) => setRecipeForm((f) => ({ ...f, productId: e.target.value }))}
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500">
                      <option value="">— Ninguno (receta general) —</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={recipeForm.isPremium} onChange={(e) => setRecipeForm((f) => ({ ...f, isPremium: e.target.checked }))}
                      className="w-4 h-4 accent-gold-500" />
                    <span className="text-xs text-coffee-300">Premium (solo suscriptores)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={recipeForm.isPublished} onChange={(e) => setRecipeForm((f) => ({ ...f, isPublished: e.target.checked }))}
                      className="w-4 h-4 accent-gold-500" />
                    <span className="text-xs text-coffee-300">Publicada</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-2 border-t border-coffee-800">
                  <button onClick={saveRecipe} disabled={savingRecipe}
                    className="px-5 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 disabled:opacity-50 transition-colors">
                    {savingRecipe ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button onClick={() => setRecipeModal(null)} className="px-5 py-2 border border-coffee-700 text-coffee-400 text-xs hover:text-cream transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step modal */}
      <AnimatePresence>
        {stepModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-coffee-900 border border-coffee-700 w-full max-w-lg">
              <div className="flex items-center justify-between p-5 border-b border-coffee-800">
                <h2 className="font-serif text-lg text-cream">{stepModal.stepId ? 'Editar paso' : 'Nuevo paso'}</h2>
                <button onClick={() => setStepModal(null)} className="text-coffee-400 hover:text-cream"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Título del paso *</label>
                  <input value={stepForm.title} onChange={(e) => setStepForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="ej. Precalentar el V60"
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
                </div>
                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Instrucción detallada *</label>
                  <textarea value={stepForm.description} onChange={(e) => setStepForm((f) => ({ ...f, description: e.target.value }))}
                    rows={4} className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-coffee-400 mb-1">URL de imagen (opcional)</label>
                    <input value={stepForm.imageUrl} onChange={(e) => setStepForm((f) => ({ ...f, imageUrl: e.target.value }))}
                      placeholder="https://..."
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-coffee-400 mb-1">URL de video (opcional)</label>
                    <input value={stepForm.videoUrl} onChange={(e) => setStepForm((f) => ({ ...f, videoUrl: e.target.value }))}
                      placeholder="https://youtube.com/..."
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Duración estimada (segundos)</label>
                  <input type="number" value={stepForm.duration} onChange={(e) => setStepForm((f) => ({ ...f, duration: e.target.value }))}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
                </div>
                <div className="flex gap-3 pt-2 border-t border-coffee-800">
                  <button onClick={saveStep} disabled={savingStep}
                    className="px-5 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 disabled:opacity-50 transition-colors">
                    {savingStep ? 'Guardando...' : 'Guardar paso'}
                  </button>
                  <button onClick={() => setStepModal(null)} className="px-5 py-2 border border-coffee-700 text-coffee-400 text-xs hover:text-cream transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 3: Add Recipes link to AdminLayout nav**

In `client/src/admin/AdminLayout.tsx`, add to the `navLinks` array:
```typescript
{ to: '/admin/recetas', label: 'Recetas', icon: BookOpen },
```

Also add to `pageTitles`:
```typescript
'/admin/recetas': 'Recetas',
```

Import `BookOpen` from lucide-react if not already imported.

- [ ] **Step 4: Register route in App.tsx admin section**

Read `client/src/App.tsx`. Find where admin routes are registered (look for `AdminProducts`, `AdminInventory` etc.) and add:
```typescript
import AdminRecipesPage from './admin/Recipes';

// In the admin Routes section:
<Route path="recetas" element={<AdminRecipesPage />} />
```

- [ ] **Step 5: TypeScript check**

```bash
cd /home/grxson/github/12porciento-cafe/client
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add client/src/admin/Recipes.tsx client/src/admin/AdminLayout.tsx client/src/App.tsx
git commit -m "feat: add admin recipe manager with step CRUD and reordering"
```

---

## Task 8: Admin — Extend Inventory UI with Alerts tab + CSV export + cost/batch fields in adjust form

**Files:**
- Modify: `client/src/admin/Inventory.tsx`

- [ ] **Step 1: Read current Inventory.tsx**

```bash
cat /home/grxson/github/12porciento-cafe/client/src/admin/Inventory.tsx
```

- [ ] **Step 2: Add 'alerts' tab to tab switcher**

Find the tab state definition: `const [tab, setTab] = useState<'overview' | 'movements' | 'adjust'>('overview');`

Change to: `const [tab, setTab] = useState<'overview' | 'movements' | 'adjust' | 'alerts'>('overview');`

Add alerts state:
```typescript
interface AlertsData {
  outOfStock: any[];
  lowStock: any[];
  expiringBatches: any[];
  summary: { outOfStockCount: number; lowStockCount: number; expiringCount: number };
}
const [alerts, setAlerts] = useState<AlertsData | null>(null);
```

Add load function for alerts (after loadMovements):
```typescript
const loadAlerts = () => {
  api.get('/inventory/alerts')
    .then((r) => setAlerts(r.data))
    .catch(() => add('Error al cargar alertas', 'error'));
};
```

Add to the tab button list (find existing tab buttons):
```typescript
<button onClick={() => { setTab('alerts'); loadAlerts(); }}
  className={`px-4 py-2 text-xs uppercase tracking-wider border-b-2 transition-colors ${tab === 'alerts' ? 'border-red-400 text-red-400' : 'border-transparent text-coffee-500 hover:text-cream'}`}>
  Alertas {alerts?.summary && alerts.summary.outOfStockCount + alerts.summary.lowStockCount > 0
    ? `(${alerts.summary.outOfStockCount + alerts.summary.lowStockCount})` : ''}
</button>
```

- [ ] **Step 3: Add CSV export button to Overview tab header**

In the overview tab section, find the header/actions area and add:
```typescript
<a
  href={`${import.meta.env.VITE_API_URL || '/api'}/inventory/export-csv`}
  download
  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-coffee-700 text-coffee-400 hover:text-cream hover:border-coffee-600 transition-colors"
>
  <Download className="w-3.5 h-3.5" /> Exportar CSV
</a>
```

Import `Download` from lucide-react if not already imported.

- [ ] **Step 4: Add cost/batch fields to the Adjust form**

In the adjust form section (tab === 'adjust'), after the `notes` input, add:
```typescript
<div className="grid grid-cols-2 gap-4">
  <div>
    <label className="block text-xs text-coffee-400 mb-1">Costo unitario (MXN)</label>
    <input type="number" step="0.01" value={adjUnitCost} onChange={(e) => setAdjUnitCost(e.target.value)}
      placeholder="0.00"
      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
  </div>
  <div>
    <label className="block text-xs text-coffee-400 mb-1">Número de lote</label>
    <input value={adjBatchNumber} onChange={(e) => setAdjBatchNumber(e.target.value)}
      placeholder="LOT-2026-001"
      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
  </div>
  <div>
    <label className="block text-xs text-coffee-400 mb-1">Fecha de caducidad</label>
    <input type="date" value={adjExpiryDate} onChange={(e) => setAdjExpiryDate(e.target.value)}
      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
  </div>
  <div>
    <label className="block text-xs text-coffee-400 mb-1">Proveedor</label>
    <input value={adjSupplier} onChange={(e) => setAdjSupplier(e.target.value)}
      placeholder="Nombre del proveedor"
      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
  </div>
</div>
```

Add corresponding state variables near the other adj* states:
```typescript
const [adjUnitCost, setAdjUnitCost] = useState('');
const [adjBatchNumber, setAdjBatchNumber] = useState('');
const [adjExpiryDate, setAdjExpiryDate] = useState('');
const [adjSupplier, setAdjSupplier] = useState('');
```

Update the adjust submit to include new fields:
```typescript
api.post('/inventory/adjust', {
  productId: adjProduct,
  type: adjType,
  quantity: parseInt(adjQty),
  notes: adjNotes || undefined,
  unitCost: adjUnitCost ? parseFloat(adjUnitCost) : undefined,
  batchNumber: adjBatchNumber || undefined,
  expiryDate: adjExpiryDate || undefined,
  supplier: adjSupplier || undefined,
})
```

And reset new fields after submit:
```typescript
setAdjUnitCost(''); setAdjBatchNumber(''); setAdjExpiryDate(''); setAdjSupplier('');
```

- [ ] **Step 5: Add Alerts tab content**

Add the alerts tab render section (after the existing tab conditionals):
```typescript
{tab === 'alerts' && alerts && (
  <div className="space-y-6">
    {/* Out of stock */}
    {alerts.outOfStock.length > 0 && (
      <div>
        <h3 className="text-xs text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <XCircle className="w-4 h-4" /> Agotados ({alerts.outOfStock.length})
        </h3>
        <div className="space-y-2">
          {alerts.outOfStock.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between bg-red-900/10 border border-red-500/20 p-3">
              <div className="flex items-center gap-3">
                <img src={p.imageUrl} alt={p.name} className="w-8 h-8 object-cover" />
                <div>
                  <p className="text-cream text-sm">{p.name}</p>
                  {p.sku && <p className="text-coffee-500 text-xs">SKU: {p.sku}</p>}
                </div>
              </div>
              <span className="text-red-400 text-xs font-medium">Stock: 0</span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Low stock */}
    {alerts.lowStock.length > 0 && (
      <div>
        <h3 className="text-xs text-yellow-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Stock bajo ({alerts.lowStock.length})
        </h3>
        <div className="space-y-2">
          {alerts.lowStock.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between bg-yellow-900/10 border border-yellow-500/20 p-3">
              <div className="flex items-center gap-3">
                <img src={p.imageUrl} alt={p.name} className="w-8 h-8 object-cover" />
                <div>
                  <p className="text-cream text-sm">{p.name}</p>
                  {p.supplier && <p className="text-coffee-500 text-xs">Proveedor: {p.supplier}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-yellow-400 text-xs font-medium">Stock: {p.stock}</p>
                <p className="text-coffee-500 text-xs">Umbral: {p.lowStockThreshold}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Expiring batches */}
    {alerts.expiringBatches.length > 0 && (
      <div>
        <h3 className="text-xs text-orange-400 uppercase tracking-wider mb-3">
          Lotes por vencer (próximos 30 días) ({alerts.expiringBatches.length})
        </h3>
        <div className="space-y-2">
          {alerts.expiringBatches.map((b: any, i: number) => (
            <div key={i} className="flex items-center justify-between bg-orange-900/10 border border-orange-500/20 p-3">
              <p className="text-cream text-sm">{b.productName}</p>
              <div className="text-right">
                {b.batchNumber && <p className="text-coffee-400 text-xs">Lote: {b.batchNumber}</p>}
                <p className="text-orange-400 text-xs">{new Date(b.expiryDate).toLocaleDateString('es-MX')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {alerts.summary.outOfStockCount === 0 && alerts.summary.lowStockCount === 0 && alerts.expiringBatches.length === 0 && (
      <p className="text-center text-coffee-500 text-sm py-8">Sin alertas activas ✓</p>
    )}
  </div>
)}
```

- [ ] **Step 6: TypeScript check**

```bash
cd /home/grxson/github/12porciento-cafe/client
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add client/src/admin/Inventory.tsx
git commit -m "feat: add alerts tab, CSV export, and cost/batch fields to admin inventory"
```

---

## Self-Review Checklist

1. ✅ Recipe model with RecipeStep (ordered steps, image/video per step) — Task 1
2. ✅ Recipe not tied to product (standalone technique recipes) — Task 1 (productId nullable)
3. ✅ Admin CRUD for recipes with step management + reordering — Tasks 2, 7
4. ✅ Subscriber-only premium access with locked preview for non-subscribers — Task 2 (route), Task 6 (UI)
5. ✅ Free users: max 2 non-premium recipes visible — Task 6
6. ✅ PDF download per recipe — Task 6
7. ✅ Product fields: SKU, costPrice, supplier, minOrderQty — Tasks 1, 4
8. ✅ StockMovement fields: unitCost, batchNumber, expiryDate, supplier — Tasks 1, 3
9. ✅ Inventory alerts: out-of-stock, low-stock, expiring batches — Tasks 3, 8
10. ✅ CSV export for inventory — Tasks 3, 8
11. ✅ Adjust form extended with cost/batch fields — Tasks 3, 8
