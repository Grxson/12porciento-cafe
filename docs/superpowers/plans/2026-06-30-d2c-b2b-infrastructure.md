# D2C + B2B Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the supply-chain and dual-channel infrastructure that enables traceable coffee lots (with quarantine QC gate), farmer management, cost-based pricing, product versioning, and a B2B ordering channel — all on top of the existing D2C shop.

**Architecture:** Five sequential phases, each independently deployable. Phases 1-3 build the foundational data layer (Lots → Farmers → Pricing). Phase 4 adds the narrative layer (Versioning). Phase 5 opens the B2B channel. Every phase adds a Prisma migration, a new Express router, and a new admin page following existing patterns (`requireAuth`, `logAdminAction`, `adminLimiter`, `useModuleToast`/`AdminSkeleton`/`AdminErrorState`).

**Tech Stack:** Prisma (PostgreSQL), Express + TypeScript, React 19, Tailwind + shadcn/ui, existing admin hooks (`useModuleToast`, `Pagination`, `AdminSkeleton`, `AdminErrorState`, `ConfirmDialog`)

---

## File Map

### Phase 1 — Lotes + Cuarentena

| Action | Path                               |
| ------ | ---------------------------------- |
| Modify | `server/prisma/schema.prisma`      |
| Create | `server/src/routes/lotes.ts`       |
| Modify | `server/src/index.ts`              |
| Modify | `client/src/types/index.ts`        |
| Modify | `client/src/api/index.ts`          |
| Create | `client/src/admin/Lotes.tsx`       |
| Modify | `client/src/App.tsx`               |
| Modify | `client/src/admin/AdminLayout.tsx` |

### Phase 2 — Caficultor

| Action | Path                                                   |
| ------ | ------------------------------------------------------ |
| Modify | `server/prisma/schema.prisma`                          |
| Create | `server/src/routes/caficultores.ts`                    |
| Modify | `server/src/index.ts`                                  |
| Modify | `client/src/types/index.ts`                            |
| Modify | `client/src/api/index.ts`                              |
| Create | `client/src/admin/Caficultores.tsx`                    |
| Modify | `client/src/App.tsx`                                   |
| Modify | `client/src/admin/AdminLayout.tsx`                     |
| Modify | `client/src/admin/Lotes.tsx` (add caficultor selector) |

### Phase 3 — Pricing Engine

| Action | Path                               |
| ------ | ---------------------------------- |
| Modify | `server/prisma/schema.prisma`      |
| Create | `server/src/lib/pricing.ts`        |
| Create | `server/src/routes/pricing.ts`     |
| Modify | `server/src/index.ts`              |
| Modify | `client/src/types/index.ts`        |
| Modify | `client/src/api/index.ts`          |
| Create | `client/src/admin/Pricing.tsx`     |
| Modify | `client/src/App.tsx`               |
| Modify | `client/src/admin/AdminLayout.tsx` |

### Phase 4 — Product Versioning

| Action | Path                                                     |
| ------ | -------------------------------------------------------- |
| Modify | `server/prisma/schema.prisma`                            |
| Create | `server/src/routes/product-versions.ts`                  |
| Modify | `server/src/index.ts`                                    |
| Modify | `client/src/types/index.ts`                              |
| Modify | `client/src/api/index.ts`                                |
| Modify | `client/src/admin/Products.tsx` (add versions tab)       |
| Modify | `client/src/pages/ProductDetail.tsx` (show version info) |

### Phase 5 — B2B Channel

| Action | Path                               |
| ------ | ---------------------------------- |
| Modify | `server/prisma/schema.prisma`      |
| Create | `server/src/routes/b2b.ts`         |
| Modify | `server/src/index.ts`              |
| Modify | `client/src/types/index.ts`        |
| Modify | `client/src/api/index.ts`          |
| Create | `client/src/admin/B2BOrders.tsx`   |
| Create | `client/src/pages/B2BCatalog.tsx`  |
| Modify | `client/src/App.tsx`               |
| Modify | `client/src/admin/AdminLayout.tsx` |

---

## Phase 1 — Lotes + Cuarentena

### Task 1.1: Lote schema

**Files:**

- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add Lote model to schema**

At the end of `server/prisma/schema.prisma`, before the last model, add:

```prisma
model Lote {
  id              String    @id @default(cuid())
  productId       String
  product         Product   @relation(fields: [productId], references: [id])
  batchNumber     String    @unique
  quantity        Int
  costPerKg       Float?
  unitCost        Float?
  supplier        String?
  origin          String?
  receivedAt      DateTime  @default(now())
  expiryDate      DateTime?
  status          String    @default("CUARENTENA")
  notes           String?
  humedad         Float?
  defectos        Int?
  scoreAroma      Float?
  scoreSabor      Float?
  scoreAcidez     Float?
  scoreBody       Float?
  scoreFinal      Float?
  evaluadoPor     String?
  approvedAt      DateTime?
  approvedBy      String?
  rejectedAt      DateTime?
  rejectedBy      String?
  rejectionReason String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([productId])
  @@index([status])
}
```

Also add reverse relation on `Product` model (after `priceRecords PriceRecord[]`):

```prisma
  lotes           Lote[]
```

- [ ] **Step 2: Run migration**

```bash
cd server && npx prisma migrate dev --name add_lote_quarantine
```

Expected: `✔ Generated Prisma Client`

---

### Task 1.2: Lotes API route

**Files:**

- Create: `server/src/routes/lotes.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create route file**

```typescript
// server/src/routes/lotes.ts
import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logAdminAction } from '../lib/adminLog';

const router = Router();

// GET /api/lotes — paginated list with filters
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as string | undefined;
    const productId = req.query.productId as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (productId) where.productId = productId;

    const [data, total] = await Promise.all([
      prisma.lote.findMany({
        where,
        include: { product: { select: { id: true, name: true, sku: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.lote.count({ where }),
    ]);

    res.json({ data, total, page, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    console.error('[lotes] GET /', err);
    res.status(500).json({ error: 'Error al obtener lotes' });
  }
});

// GET /api/lotes/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const lote = await prisma.lote.findUnique({
      where: { id: req.params.id },
      include: { product: { select: { id: true, name: true, sku: true, stock: true } } },
    });
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
    res.json({ data: lote });
  } catch (err) {
    console.error('[lotes] GET /:id', err);
    res.status(500).json({ error: 'Error al obtener lote' });
  }
});

// POST /api/lotes — register incoming batch (starts as CUARENTENA)
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      productId,
      batchNumber,
      quantity,
      costPerKg,
      unitCost,
      supplier,
      origin,
      receivedAt,
      expiryDate,
      notes,
    } = req.body;

    if (!productId || !batchNumber || !quantity) {
      return res.status(400).json({ error: 'productId, batchNumber y quantity son requeridos' });
    }

    const lote = await prisma.lote.create({
      data: {
        productId,
        batchNumber,
        quantity: parseInt(quantity),
        costPerKg: costPerKg ? parseFloat(costPerKg) : null,
        unitCost: unitCost ? parseFloat(unitCost) : null,
        supplier: supplier || null,
        origin: origin || null,
        receivedAt: receivedAt ? new Date(receivedAt) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes: notes || null,
        status: 'CUARENTENA',
      },
    });

    await logAdminAction({
      adminId: req.admin?.id,
      action: 'CREATE',
      entity: 'Lote',
      entityId: lote.id,
      metadata: { batchNumber, productId, quantity },
    });

    res.status(201).json({ data: lote });
  } catch (err: unknown) {
    console.error('[lotes] POST /', err);
    if ((err as { code?: string }).code === 'P2002') {
      return res.status(400).json({ error: 'Número de lote ya existe' });
    }
    res.status(500).json({ error: 'Error al crear lote' });
  }
});

// PUT /api/lotes/:id — update fields (only while in CUARENTENA)
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const lote = await prisma.lote.findUnique({ where: { id: req.params.id } });
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });

    const {
      notes,
      humedad,
      defectos,
      scoreAroma,
      scoreSabor,
      scoreAcidez,
      scoreBody,
      scoreFinal,
      expiryDate,
      quantity,
      costPerKg,
      unitCost,
      supplier,
      origin,
    } = req.body;

    const updated = await prisma.lote.update({
      where: { id: req.params.id },
      data: {
        notes: notes ?? lote.notes,
        humedad: humedad != null ? parseFloat(humedad) : lote.humedad,
        defectos: defectos != null ? parseInt(defectos) : lote.defectos,
        scoreAroma: scoreAroma != null ? parseFloat(scoreAroma) : lote.scoreAroma,
        scoreSabor: scoreSabor != null ? parseFloat(scoreSabor) : lote.scoreSabor,
        scoreAcidez: scoreAcidez != null ? parseFloat(scoreAcidez) : lote.scoreAcidez,
        scoreBody: scoreBody != null ? parseFloat(scoreBody) : lote.scoreBody,
        scoreFinal: scoreFinal != null ? parseFloat(scoreFinal) : lote.scoreFinal,
        expiryDate: expiryDate ? new Date(expiryDate) : lote.expiryDate,
        quantity: quantity != null ? parseInt(quantity) : lote.quantity,
        costPerKg: costPerKg != null ? parseFloat(costPerKg) : lote.costPerKg,
        unitCost: unitCost != null ? parseFloat(unitCost) : lote.unitCost,
        supplier: supplier ?? lote.supplier,
        origin: origin ?? lote.origin,
      },
    });

    await logAdminAction({
      adminId: req.admin?.id,
      action: 'UPDATE',
      entity: 'Lote',
      entityId: lote.id,
      metadata: { batchNumber: lote.batchNumber },
    });

    res.json({ data: updated });
  } catch (err) {
    console.error('[lotes] PUT /:id', err);
    res.status(500).json({ error: 'Error al actualizar lote' });
  }
});

// PATCH /api/lotes/:id/aprobar — approve + auto-restock inventory
router.patch('/:id/aprobar', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const lote = await prisma.lote.findUnique({
      where: { id: req.params.id },
      include: { product: true },
    });
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
    if (lote.status !== 'CUARENTENA') {
      return res.status(400).json({ error: 'Solo lotes en cuarentena pueden aprobarse' });
    }

    const { notes } = req.body;
    const now = new Date();

    const [updatedLote] = await prisma.$transaction([
      prisma.lote.update({
        where: { id: lote.id },
        data: {
          status: 'APROBADO',
          approvedAt: now,
          approvedBy: req.admin?.id,
          evaluadoPor: req.admin?.id,
          notes: notes ?? lote.notes,
        },
      }),
      prisma.stockMovement.create({
        data: {
          productId: lote.productId,
          type: 'RESTOCK',
          quantity: lote.quantity,
          previousStock: lote.product.stock,
          newStock: lote.product.stock + lote.quantity,
          notes: `Lote aprobado: ${lote.batchNumber}`,
          batchNumber: lote.batchNumber,
          expiryDate: lote.expiryDate,
          supplier: lote.supplier,
          unitCost: lote.unitCost,
        },
      }),
      prisma.product.update({
        where: { id: lote.productId },
        data: { stock: { increment: lote.quantity } },
      }),
    ]);

    await logAdminAction({
      adminId: req.admin?.id,
      action: 'APPROVE',
      entity: 'Lote',
      entityId: lote.id,
      metadata: { batchNumber: lote.batchNumber, quantity: lote.quantity },
    });

    res.json({ data: updatedLote });
  } catch (err) {
    console.error('[lotes] PATCH /:id/aprobar', err);
    res.status(500).json({ error: 'Error al aprobar lote' });
  }
});

// PATCH /api/lotes/:id/rechazar
router.patch('/:id/rechazar', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const lote = await prisma.lote.findUnique({ where: { id: req.params.id } });
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
    if (lote.status !== 'CUARENTENA') {
      return res.status(400).json({ error: 'Solo lotes en cuarentena pueden rechazarse' });
    }

    const { rejectionReason } = req.body;
    if (!rejectionReason?.trim()) {
      return res.status(400).json({ error: 'Se requiere motivo de rechazo' });
    }

    const now = new Date();
    const updated = await prisma.lote.update({
      where: { id: req.params.id },
      data: {
        status: 'RECHAZADO',
        rejectedAt: now,
        rejectedBy: req.admin?.id,
        rejectionReason: rejectionReason.trim(),
      },
    });

    await logAdminAction({
      adminId: req.admin?.id,
      action: 'STATUS_CHANGE',
      entity: 'Lote',
      entityId: lote.id,
      metadata: { batchNumber: lote.batchNumber, rejectionReason },
    });

    res.json({ data: updated });
  } catch (err) {
    console.error('[lotes] PATCH /:id/rechazar', err);
    res.status(500).json({ error: 'Error al rechazar lote' });
  }
});

// DELETE /api/lotes/:id (only RECHAZADO)
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const lote = await prisma.lote.findUnique({ where: { id: req.params.id } });
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
    if (lote.status !== 'RECHAZADO') {
      return res.status(400).json({ error: 'Solo lotes rechazados pueden eliminarse' });
    }

    await prisma.lote.delete({ where: { id: req.params.id } });

    await logAdminAction({
      adminId: req.admin?.id,
      action: 'DELETE',
      entity: 'Lote',
      entityId: lote.id,
      metadata: { batchNumber: lote.batchNumber },
    });

    res.json({ data: { deleted: true } });
  } catch (err) {
    console.error('[lotes] DELETE /:id', err);
    res.status(500).json({ error: 'Error al eliminar lote' });
  }
});

export default router;
```

- [ ] **Step 2: Mount in index.ts**

In `server/src/index.ts`, after line with `import adminLogsRouter`:

```typescript
import lotesRouter from './routes/lotes';
```

After `app.use('/api/admin/logs', adminLogsRouter);`:

```typescript
app.use('/api/lotes', adminLimiter, lotesRouter);
```

- [ ] **Step 3: Type check**

```bash
cd server && npx tsc --noEmit
```

Expected: no errors

---

### Task 1.3: Lotes client types + API

**Files:**

- Modify: `client/src/types/index.ts`
- Modify: `client/src/api/index.ts`

- [ ] **Step 1: Add types**

At the end of `client/src/types/index.ts`, add:

```typescript
export type LoteStatus = 'CUARENTENA' | 'APROBADO' | 'RECHAZADO';

export interface Lote {
  id: string;
  productId: string;
  product: { id: string; name: string; sku: string | null };
  batchNumber: string;
  quantity: number;
  costPerKg: number | null;
  unitCost: number | null;
  supplier: string | null;
  origin: string | null;
  receivedAt: string;
  expiryDate: string | null;
  status: LoteStatus;
  notes: string | null;
  humedad: number | null;
  defectos: number | null;
  scoreAroma: number | null;
  scoreSabor: number | null;
  scoreAcidez: number | null;
  scoreBody: number | null;
  scoreFinal: number | null;
  evaluadoPor: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoteFormData {
  productId: string;
  batchNumber: string;
  quantity: number;
  costPerKg?: number;
  unitCost?: number;
  supplier?: string;
  origin?: string;
  receivedAt?: string;
  expiryDate?: string;
  notes?: string;
}
```

- [ ] **Step 2: Add API functions**

In `client/src/api/index.ts`, after the last export, add:

```typescript
export const lotesApi = {
  list: (params?: Record<string, unknown>) => api.get('/lotes', { params }),
  get: (id: string) => api.get(`/lotes/${id}`),
  create: (data: LoteFormData) => api.post('/lotes', data),
  update: (
    id: string,
    data: Partial<LoteFormData> & {
      humedad?: number;
      defectos?: number;
      scoreAroma?: number;
      scoreSabor?: number;
      scoreAcidez?: number;
      scoreBody?: number;
      scoreFinal?: number;
    },
  ) => api.put(`/lotes/${id}`, data),
  aprobar: (id: string, notes?: string) => api.patch(`/lotes/${id}/aprobar`, { notes }),
  rechazar: (id: string, rejectionReason: string) =>
    api.patch(`/lotes/${id}/rechazar`, { rejectionReason }),
  delete: (id: string) => api.delete(`/lotes/${id}`),
};
```

---

### Task 1.4: Lotes admin page

**Files:**

- Create: `client/src/admin/Lotes.tsx`

- [ ] **Step 1: Create admin page**

```tsx
// client/src/admin/Lotes.tsx
import { useState, useCallback } from 'react';
import { Package, CheckCircle, XCircle, Clock, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { lotesApi } from '../api';
import { Lote, LoteFormData } from '../types';
import { useModuleToast } from './context/ModuleContext';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import ConfirmDialog from './components/ConfirmDialog';
import Pagination from './components/Pagination';
import PageMeta from './components/PageMeta';

type Tab = 'cuarentena' | 'aprobados' | 'rechazados' | 'todos';

const TAB_STATUS: Record<Tab, string | undefined> = {
  cuarentena: 'CUARENTENA',
  aprobados: 'APROBADO',
  rechazados: 'RECHAZADO',
  todos: undefined,
};

const STATUS_BADGE: Record<string, string> = {
  CUARENTENA: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  APROBADO: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  RECHAZADO: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const EMPTY_FORM: LoteFormData = {
  productId: '',
  batchNumber: '',
  quantity: 0,
  costPerKg: undefined,
  unitCost: undefined,
  supplier: '',
  origin: '',
  receivedAt: '',
  expiryDate: '',
  notes: '',
};

export default function AdminLotes() {
  const { addToast } = useModuleToast();
  const [tab, setTab] = useState<Tab>('cuarentena');
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<LoteFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [qcForm, setQcForm] = useState<Record<string, string>>({});

  const [confirmApprove, setConfirmApprove] = useState<Lote | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Lote | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Lote | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchLotes = useCallback(async (p: number, t: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const status = TAB_STATUS[t];
      const res = await lotesApi.list({ status, page: p, pageSize: 20 });
      setLotes(res.data.data);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
      setPage(p);
    } catch {
      setError('Error al cargar lotes');
    } finally {
      setLoading(false);
    }
  }, []);

  const changeTab = (t: Tab) => {
    setTab(t);
    fetchLotes(1, t);
  };

  // Initial load
  useState(() => {
    fetchLotes(1, 'cuarentena');
  });

  const handleCreate = async () => {
    if (!form.productId || !form.batchNumber || !form.quantity) {
      addToast('Producto, número de lote y cantidad son requeridos', 'error');
      return;
    }
    setSaving(true);
    try {
      await lotesApi.create(form);
      addToast('Lote registrado en cuarentena', 'success');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      fetchLotes(page, tab);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast(msg || 'Error al crear lote', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQc = async (lote: Lote) => {
    setSaving(true);
    try {
      const payload: Record<string, number | undefined> = {};
      [
        'humedad',
        'defectos',
        'scoreAroma',
        'scoreSabor',
        'scoreAcidez',
        'scoreBody',
        'scoreFinal',
      ].forEach((k) => {
        if (qcForm[k] !== undefined) payload[k] = parseFloat(qcForm[k]);
      });
      await lotesApi.update(lote.id, payload);
      addToast('Evaluación guardada', 'success');
      fetchLotes(page, tab);
    } catch {
      addToast('Error al guardar evaluación', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!confirmApprove) return;
    setSaving(true);
    try {
      await lotesApi.aprobar(confirmApprove.id);
      addToast(`Lote ${confirmApprove.batchNumber} aprobado. Stock actualizado.`, 'success');
      setConfirmApprove(null);
      fetchLotes(page, tab);
    } catch {
      addToast('Error al aprobar lote', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      addToast('Se requiere motivo de rechazo', 'error');
      return;
    }
    setSaving(true);
    try {
      await lotesApi.rechazar(rejectTarget.id, rejectReason.trim());
      addToast(`Lote ${rejectTarget.batchNumber} rechazado`, 'success');
      setRejectTarget(null);
      setRejectReason('');
      fetchLotes(page, tab);
    } catch {
      addToast('Error al rechazar lote', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      await lotesApi.delete(confirmDelete.id);
      addToast('Lote eliminado', 'success');
      setConfirmDelete(null);
      fetchLotes(page, tab);
    } catch {
      addToast('Error al eliminar lote', 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'cuarentena', label: 'Cuarentena' },
    { id: 'aprobados', label: 'Aprobados' },
    { id: 'rechazados', label: 'Rechazados' },
    { id: 'todos', label: 'Todos' },
  ];

  return (
    <div className="space-y-6">
      <PageMeta title="Gestión de Lotes" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900 dark:text-cream">Gestión de Lotes</h1>
          <p className="text-coffee-600 dark:text-cream/60 text-sm mt-1">
            {total} lote{total !== 1 ? 's' : ''} en vista actual
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-coffee-800 text-cream px-4 py-2 rounded-lg hover:bg-coffee-900 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Registrar Lote
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-coffee-200 dark:border-coffee-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => changeTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-coffee-800 text-coffee-800 dark:border-cream dark:text-cream'
                : 'border-transparent text-coffee-500 hover:text-coffee-700 dark:text-cream/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <AdminSkeleton rows={5} />
      ) : error ? (
        <AdminErrorState message={error} onRetry={() => fetchLotes(page, tab)} />
      ) : lotes.length === 0 ? (
        <div className="text-center py-12 text-coffee-500 dark:text-cream/50">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No hay lotes en esta vista</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lotes.map((lote) => (
            <div
              key={lote.id}
              className="bg-white dark:bg-coffee-900 rounded-xl border border-coffee-100 dark:border-coffee-700 overflow-hidden"
            >
              {/* Row */}
              <div className="flex items-center justify-between p-4 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Package className="w-5 h-5 text-coffee-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-coffee-900 dark:text-cream truncate">
                      {lote.batchNumber}
                    </p>
                    <p className="text-sm text-coffee-500 dark:text-cream/60 truncate">
                      {lote.product.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm text-coffee-600 dark:text-cream/70">
                    {lote.quantity} u.
                  </span>
                  {lote.origin && (
                    <span className="text-sm text-coffee-500 dark:text-cream/50 hidden sm:block">
                      {lote.origin}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[lote.status]}`}
                  >
                    {lote.status}
                  </span>
                  {lote.status === 'CUARENTENA' && (
                    <>
                      <button
                        onClick={() => setConfirmApprove(lote)}
                        className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                        title="Aprobar"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setRejectTarget(lote);
                          setRejectReason('');
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Rechazar"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {lote.status === 'RECHAZADO' && (
                    <button
                      onClick={() => setConfirmDelete(lote)}
                      className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      title="Eliminar"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setExpandedId(expandedId === lote.id ? null : lote.id)}
                    className="p-1.5 text-coffee-400 hover:bg-coffee-50 dark:hover:bg-coffee-800 rounded-lg"
                  >
                    {expandedId === lote.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded QC panel */}
              {expandedId === lote.id && (
                <div className="border-t border-coffee-100 dark:border-coffee-700 p-4 bg-coffee-50/50 dark:bg-coffee-950/50 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {[
                      ['Proveedor', lote.supplier],
                      ['Origen', lote.origin],
                      ['Costo/kg', lote.costPerKg ? `$${lote.costPerKg}` : '—'],
                      [
                        'Vence',
                        lote.expiryDate
                          ? new Date(lote.expiryDate).toLocaleDateString('es-MX')
                          : '—',
                      ],
                    ].map(([label, val]) => (
                      <div key={label as string}>
                        <p className="text-coffee-500 dark:text-cream/50 text-xs">{label}</p>
                        <p className="text-coffee-900 dark:text-cream font-medium">{val || '—'}</p>
                      </div>
                    ))}
                  </div>

                  {lote.status === 'RECHAZADO' && lote.rejectionReason && (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                        Motivo de rechazo
                      </p>
                      <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                        {lote.rejectionReason}
                      </p>
                    </div>
                  )}

                  {lote.status === 'CUARENTENA' && (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-coffee-700 dark:text-cream/70 uppercase tracking-wide">
                        Evaluación QC
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { key: 'humedad', label: 'Humedad %', placeholder: '11.5' },
                          { key: 'defectos', label: 'Defectos', placeholder: '3' },
                          { key: 'scoreAroma', label: 'Aroma /10', placeholder: '8.5' },
                          { key: 'scoreSabor', label: 'Sabor /10', placeholder: '8.0' },
                          { key: 'scoreAcidez', label: 'Acidez /10', placeholder: '7.5' },
                          { key: 'scoreBody', label: 'Cuerpo /10', placeholder: '8.0' },
                          { key: 'scoreFinal', label: 'Score Final /100', placeholder: '84' },
                        ].map(({ key, label, placeholder }) => (
                          <div key={key}>
                            <label className="text-xs text-coffee-600 dark:text-cream/60">
                              {label}
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder={placeholder}
                              defaultValue={
                                (lote as unknown as Record<string, number | null>)[key] ?? ''
                              }
                              onChange={(e) => setQcForm((f) => ({ ...f, [key]: e.target.value }))}
                              className="mt-1 w-full text-sm border border-coffee-200 dark:border-coffee-600 rounded-lg px-2 py-1.5 bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream"
                            />
                          </div>
                        ))}
                      </div>
                      <div>
                        <label className="text-xs text-coffee-600 dark:text-cream/60">Notas</label>
                        <textarea
                          rows={2}
                          defaultValue={lote.notes ?? ''}
                          onChange={(e) => setQcForm((f) => ({ ...f, notes: e.target.value }))}
                          className="mt-1 w-full text-sm border border-coffee-200 dark:border-coffee-600 rounded-lg px-2 py-1.5 bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream resize-none"
                        />
                      </div>
                      <button
                        onClick={() => handleSaveQc(lote)}
                        disabled={saving}
                        className="text-sm bg-coffee-800 text-cream px-3 py-1.5 rounded-lg hover:bg-coffee-900 disabled:opacity-50 transition-colors"
                      >
                        Guardar evaluación
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={(p) => fetchLotes(p, tab)} />

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-coffee-900 rounded-2xl w-full max-w-lg shadow-xl">
            <div className="p-6 border-b border-coffee-100 dark:border-coffee-700">
              <h2 className="text-lg font-semibold text-coffee-900 dark:text-cream">
                Registrar Lote Entrante
              </h2>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {[
                { key: 'batchNumber', label: 'Número de Lote *', placeholder: 'LOT-2026-001' },
                { key: 'productId', label: 'ID de Producto *', placeholder: 'cuid del producto' },
                {
                  key: 'quantity',
                  label: 'Cantidad (unidades) *',
                  placeholder: '100',
                  type: 'number',
                },
                {
                  key: 'costPerKg',
                  label: 'Costo por kg ($)',
                  placeholder: '85.00',
                  type: 'number',
                },
                {
                  key: 'unitCost',
                  label: 'Costo por unidad ($)',
                  placeholder: '45.00',
                  type: 'number',
                },
                { key: 'supplier', label: 'Proveedor', placeholder: 'Nombre del proveedor' },
                { key: 'origin', label: 'Origen', placeholder: 'Chiapas, México' },
                { key: 'expiryDate', label: 'Fecha de vencimiento', placeholder: '', type: 'date' },
                {
                  key: 'notes',
                  label: 'Notas iniciales',
                  placeholder: 'Observaciones al recibir...',
                },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-sm text-coffee-700 dark:text-cream/70 mb-1">
                    {label}
                  </label>
                  <input
                    type={type || 'text'}
                    placeholder={placeholder}
                    value={(form as unknown as Record<string, string>)[key] || ''}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream"
                  />
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-coffee-100 dark:border-coffee-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-coffee-600 dark:text-cream/60 hover:text-coffee-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 text-sm bg-coffee-800 text-cream rounded-lg hover:bg-coffee-900 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-coffee-900 rounded-2xl w-full max-w-md shadow-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-coffee-900 dark:text-cream">Rechazar Lote</h2>
            <p className="text-sm text-coffee-600 dark:text-cream/60">
              Lote: <strong>{rejectTarget.batchNumber}</strong>
            </p>
            <div>
              <label className="block text-sm text-coffee-700 dark:text-cream/70 mb-1">
                Motivo de rechazo *
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Describe por qué se rechaza este lote..."
                className="w-full border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRejectTarget(null)}
                className="px-4 py-2 text-sm text-coffee-600 dark:text-cream/60 hover:text-coffee-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={saving || !rejectReason.trim()}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Rechazando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmApprove}
        title="Aprobar Lote"
        message={`¿Aprobar lote ${confirmApprove?.batchNumber}? Esto agregará ${confirmApprove?.quantity} unidades al inventario del producto.`}
        confirmLabel="Aprobar"
        confirmVariant="default"
        onConfirm={handleApprove}
        onCancel={() => setConfirmApprove(null)}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Lote"
        message={`¿Eliminar definitivamente el lote ${confirmDelete?.batchNumber}?`}
        confirmLabel="Eliminar"
        confirmVariant="destructive"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
```

---

### Task 1.5: Wire admin route + nav

**Files:**

- Modify: `client/src/App.tsx`
- Modify: `client/src/admin/AdminLayout.tsx`

- [ ] **Step 1: Add route in App.tsx**

Find the admin `<Route>` block and add:

```tsx
import AdminLotes from './admin/Lotes';
// Inside <Route path="/admin" element={...}>:
<Route path="lotes" element={<AdminLotes />} />;
```

- [ ] **Step 2: Add nav entry in AdminLayout.tsx**

Find the `navLinks` array and add an entry (group with Inventario):

```tsx
{ href: '/admin/lotes', label: 'Lotes', icon: Package }
```

Find `pageTitles` map and add:

```tsx
'/admin/lotes': 'Gestión de Lotes'
```

Import `Package` from `lucide-react` if not already imported.

- [ ] **Step 3: Build check**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit Phase 1**

```bash
git add server/prisma server/src/routes/lotes.ts server/src/index.ts client/src/types/index.ts client/src/api/index.ts client/src/admin/Lotes.tsx client/src/App.tsx client/src/admin/AdminLayout.tsx
git commit -m "feat(lotes): add batch quarantine system with QC evaluation and auto-restock on approval"
```

---

## Phase 2 — Caficultor Module

### Task 2.1: Caficultor schema

**Files:**

- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add Caficultor model and link Lote**

Add before `Lote` model in schema:

```prisma
model Caficultor {
  id              String    @id @default(cuid())
  nombre          String
  region          String
  altitud         Int?
  variedad        String?
  foto            String?
  contacto        String?
  bio             String?
  acuerdoPrecioKg Float?
  modalidad       String    @default("DIRECTO")
  fairTrade       Boolean   @default(false)
  notas           String?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  lotes           Lote[]
  productVersions ProductVersion[]
}
```

Add `caficultorId` to `Lote` model (after `productId`):

```prisma
  caficultorId    String?
  caficultor      Caficultor? @relation(fields: [caficultorId], references: [id])
```

- [ ] **Step 2: Run migration**

```bash
cd server && npx prisma migrate dev --name add_caficultor
```

---

### Task 2.2: Caficultor API route

**Files:**

- Create: `server/src/routes/caficultores.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create route file**

```typescript
// server/src/routes/caficultores.ts
import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logAdminAction } from '../lib/adminLog';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;

    const where: Record<string, unknown> = {};
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await Promise.all([
      prisma.caficultor.findMany({
        where,
        include: { _count: { select: { lotes: true } } },
        orderBy: { nombre: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.caficultor.count({ where }),
    ]);

    res.json({ data, total, page, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    console.error('[caficultores] GET /', err);
    res.status(500).json({ error: 'Error al obtener caficultores' });
  }
});

router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const c = await prisma.caficultor.findUnique({
      where: { id: req.params.id },
      include: {
        lotes: {
          include: { product: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { lotes: true } },
      },
    });
    if (!c) return res.status(404).json({ error: 'Caficultor no encontrado' });
    res.json({ data: c });
  } catch (err) {
    console.error('[caficultores] GET /:id', err);
    res.status(500).json({ error: 'Error al obtener caficultor' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      nombre,
      region,
      altitud,
      variedad,
      foto,
      contacto,
      bio,
      acuerdoPrecioKg,
      modalidad,
      fairTrade,
      notas,
    } = req.body;
    if (!nombre?.trim() || !region?.trim()) {
      return res.status(400).json({ error: 'Nombre y región son requeridos' });
    }
    const c = await prisma.caficultor.create({
      data: {
        nombre: nombre.trim(),
        region: region.trim(),
        altitud: altitud ? parseInt(altitud) : null,
        variedad: variedad?.trim() || null,
        foto: foto?.trim() || null,
        contacto: contacto?.trim() || null,
        bio: bio?.trim() || null,
        acuerdoPrecioKg: acuerdoPrecioKg ? parseFloat(acuerdoPrecioKg) : null,
        modalidad: modalidad || 'DIRECTO',
        fairTrade: fairTrade === true || fairTrade === 'true',
        notas: notas?.trim() || null,
      },
    });
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'CREATE',
      entity: 'Caficultor',
      entityId: c.id,
      metadata: { nombre },
    });
    res.status(201).json({ data: c });
  } catch (err) {
    console.error('[caficultores] POST /', err);
    res.status(500).json({ error: 'Error al crear caficultor' });
  }
});

router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const exists = await prisma.caficultor.findUnique({ where: { id: req.params.id } });
    if (!exists) return res.status(404).json({ error: 'Caficultor no encontrado' });
    const {
      nombre,
      region,
      altitud,
      variedad,
      foto,
      contacto,
      bio,
      acuerdoPrecioKg,
      modalidad,
      fairTrade,
      notas,
      isActive,
    } = req.body;
    const updated = await prisma.caficultor.update({
      where: { id: req.params.id },
      data: {
        nombre: nombre?.trim() ?? exists.nombre,
        region: region?.trim() ?? exists.region,
        altitud: altitud != null ? parseInt(altitud) : exists.altitud,
        variedad: variedad?.trim() ?? exists.variedad,
        foto: foto?.trim() ?? exists.foto,
        contacto: contacto?.trim() ?? exists.contacto,
        bio: bio?.trim() ?? exists.bio,
        acuerdoPrecioKg:
          acuerdoPrecioKg != null ? parseFloat(acuerdoPrecioKg) : exists.acuerdoPrecioKg,
        modalidad: modalidad ?? exists.modalidad,
        fairTrade:
          fairTrade !== undefined ? fairTrade === true || fairTrade === 'true' : exists.fairTrade,
        notas: notas?.trim() ?? exists.notas,
        isActive:
          isActive !== undefined ? isActive === true || isActive === 'true' : exists.isActive,
      },
    });
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'UPDATE',
      entity: 'Caficultor',
      entityId: exists.id,
      metadata: { nombre: exists.nombre },
    });
    res.json({ data: updated });
  } catch (err) {
    console.error('[caficultores] PUT /:id', err);
    res.status(500).json({ error: 'Error al actualizar caficultor' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const c = await prisma.caficultor.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { lotes: true } } },
    });
    if (!c) return res.status(404).json({ error: 'Caficultor no encontrado' });
    if (c._count.lotes > 0) {
      return res
        .status(400)
        .json({ error: 'No se puede eliminar un caficultor con lotes registrados' });
    }
    await prisma.caficultor.delete({ where: { id: req.params.id } });
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'DELETE',
      entity: 'Caficultor',
      entityId: c.id,
      metadata: { nombre: c.nombre },
    });
    res.json({ data: { deleted: true } });
  } catch (err) {
    console.error('[caficultores] DELETE /:id', err);
    res.status(500).json({ error: 'Error al eliminar caficultor' });
  }
});

export default router;
```

- [ ] **Step 2: Mount in index.ts**

```typescript
import caficultoresRouter from './routes/caficultores';
// after lotes mount:
app.use('/api/caficultores', adminLimiter, caficultoresRouter);
```

---

### Task 2.3: Caficultor client + admin page

**Files:**

- Modify: `client/src/types/index.ts`
- Modify: `client/src/api/index.ts`
- Create: `client/src/admin/Caficultores.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/admin/AdminLayout.tsx`
- Modify: `client/src/admin/Lotes.tsx`

- [ ] **Step 1: Add types**

```typescript
// Add to client/src/types/index.ts
export interface Caficultor {
  id: string;
  nombre: string;
  region: string;
  altitud: number | null;
  variedad: string | null;
  foto: string | null;
  contacto: string | null;
  bio: string | null;
  acuerdoPrecioKg: number | null;
  modalidad: 'DIRECTO' | 'COOPERATIVA' | 'INTERMEDIARIO';
  fairTrade: boolean;
  notas: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { lotes: number };
}
```

- [ ] **Step 2: Add API functions**

```typescript
// Add to client/src/api/index.ts
export const caficultoresApi = {
  list: (params?: Record<string, unknown>) => api.get('/caficultores', { params }),
  get: (id: string) => api.get(`/caficultores/${id}`),
  create: (data: Partial<Caficultor>) => api.post('/caficultores', data),
  update: (id: string, data: Partial<Caficultor>) => api.put(`/caficultores/${id}`, data),
  delete: (id: string) => api.delete(`/caficultores/${id}`),
};
```

- [ ] **Step 3: Create Caficultores.tsx admin page**

Build a CRUD admin page following the same pattern as `Lotes.tsx`. Key fields in the create/edit form: `nombre`, `region`, `altitud` (number, msnm), `variedad`, `contacto`, `bio` (textarea), `acuerdoPrecioKg`, `modalidad` (select: DIRECTO / COOPERATIVA / INTERMEDIARIO), `fairTrade` (checkbox), `notas` (textarea). Table columns: Nombre, Región, Altitud, Variedad, Lotes (#), Precio/kg, Estado. Actions: Edit (inline form), Delete (with `ConfirmDialog`, blocked if lotes > 0).

```tsx
// client/src/admin/Caficultores.tsx
// [Full component following Lotes.tsx pattern — CRUD with useModuleToast,
//  AdminSkeleton, AdminErrorState, ConfirmDialog, Pagination]
// Key difference: no status tabs — simple paginated table with edit/delete
```

The full implementation mirrors `Lotes.tsx` in structure. Build the table, modal for create/edit, and wire the `caficultoresApi` calls. Reference `Lotes.tsx` Task 1.4 for the exact component skeleton.

- [ ] **Step 4: Update Lotes.tsx to show caficultor selector**

In the create modal form in `Lotes.tsx`, add a `caficultorId` select field. Before the form renders, fetch `caficultoresApi.list({ isActive: 'true', pageSize: 100 })` on mount and store in `caficultores` state. Add to the form:

```tsx
<div>
  <label className="block text-sm text-coffee-700 dark:text-cream/70 mb-1">Caficultor</label>
  <select
    value={form.caficultorId || ''}
    onChange={(e) => setForm((f) => ({ ...f, caficultorId: e.target.value }))}
    className="w-full border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream"
  >
    <option value="">— Sin caficultor —</option>
    {caficultores.map((c) => (
      <option key={c.id} value={c.id}>
        {c.nombre} — {c.region}
      </option>
    ))}
  </select>
</div>
```

Also add `caficultorId?: string` to `LoteFormData` type in `types/index.ts`.

- [ ] **Step 5: Wire route + nav**

In `App.tsx`:

```tsx
import AdminCaficultores from './admin/Caficultores';
<Route path="caficultores" element={<AdminCaficultores />} />;
```

In `AdminLayout.tsx` navLinks:

```tsx
{ href: '/admin/caficultores', label: 'Caficultores', icon: Users }
```

- [ ] **Step 6: Commit Phase 2**

```bash
git add server/prisma server/src/routes/caficultores.ts server/src/index.ts client/src/types/index.ts client/src/api/index.ts client/src/admin/Caficultores.tsx client/src/admin/Lotes.tsx client/src/App.tsx client/src/admin/AdminLayout.tsx
git commit -m "feat(caficultores): add farmer profile management linked to batch lots"
```

---

## Phase 3 — Pricing Engine

### Task 3.1: PricingConfig schema

**Files:**

- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add PricingConfig model**

```prisma
model PricingConfig {
  id                   String   @id @default(cuid())
  productId            String   @unique
  product              Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  roastingCostPerUnit  Float    @default(0)
  packagingCostPerUnit Float    @default(0)
  overheadFixed        Float    @default(0)
  marginRetailPct      Float    @default(60)
  marginB2bPct         Float    @default(30)
  minAlertMarginPct    Float    @default(20)
  updatedAt            DateTime @updatedAt
}
```

Add reverse relation on `Product`:

```prisma
  pricingConfig  PricingConfig?
```

- [ ] **Step 2: Run migration**

```bash
cd server && npx prisma migrate dev --name add_pricing_config
```

---

### Task 3.2: Pricing library + API route

**Files:**

- Create: `server/src/lib/pricing.ts`
- Create: `server/src/routes/pricing.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create pricing utility**

```typescript
// server/src/lib/pricing.ts
export interface PricingInputs {
  costPerKg: number; // from lote or product.costPrice
  gramsPerUnit: number; // e.g. 250 for 250g bag
  roastingCostPerUnit: number;
  packagingCostPerUnit: number;
  overheadFixed: number;
  marginRetailPct: number;
  marginB2bPct: number;
}

export interface PricingResult {
  rawCostPerUnit: number;
  totalCostPerUnit: number;
  suggestedRetailPrice: number;
  suggestedB2bPrice: number;
  retailMarginAmount: number;
  b2bMarginAmount: number;
}

export function calculatePrices(inputs: PricingInputs): PricingResult {
  const {
    costPerKg,
    gramsPerUnit,
    roastingCostPerUnit,
    packagingCostPerUnit,
    overheadFixed,
    marginRetailPct,
    marginB2bPct,
  } = inputs;

  // 15% roasting yield loss: 250g bag needs ~294g raw beans
  const roastYieldFactor = 1 / 0.85;
  const rawKgNeeded = (gramsPerUnit / 1000) * roastYieldFactor;
  const rawCostPerUnit = rawKgNeeded * costPerKg;
  const totalCostPerUnit =
    rawCostPerUnit + roastingCostPerUnit + packagingCostPerUnit + overheadFixed;

  const suggestedRetailPrice = totalCostPerUnit / (1 - marginRetailPct / 100);
  const suggestedB2bPrice = totalCostPerUnit / (1 - marginB2bPct / 100);

  return {
    rawCostPerUnit: Math.round(rawCostPerUnit * 100) / 100,
    totalCostPerUnit: Math.round(totalCostPerUnit * 100) / 100,
    suggestedRetailPrice: Math.round(suggestedRetailPrice * 100) / 100,
    suggestedB2bPrice: Math.round(suggestedB2bPrice * 100) / 100,
    retailMarginAmount: Math.round((suggestedRetailPrice - totalCostPerUnit) * 100) / 100,
    b2bMarginAmount: Math.round((suggestedB2bPrice - totalCostPerUnit) * 100) / 100,
  };
}
```

- [ ] **Step 2: Create pricing route**

```typescript
// server/src/routes/pricing.ts
import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { calculatePrices } from '../lib/pricing';
import { logAdminAction } from '../lib/adminLog';

const router = Router();

// GET /api/pricing — all products with their config + calculated prices
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        costPrice: true,
        weight: true,
        pricingConfig: true,
      },
      orderBy: { name: 'asc' },
    });

    const data = products.map((p) => {
      const cfg = p.pricingConfig;
      let calculated = null;
      if (cfg && p.costPrice && p.weight) {
        calculated = calculatePrices({
          costPerKg: p.costPrice,
          gramsPerUnit: p.weight,
          roastingCostPerUnit: cfg.roastingCostPerUnit,
          packagingCostPerUnit: cfg.packagingCostPerUnit,
          overheadFixed: cfg.overheadFixed,
          marginRetailPct: cfg.marginRetailPct,
          marginB2bPct: cfg.marginB2bPct,
        });
      }
      return { ...p, calculated };
    });

    res.json({ data });
  } catch (err) {
    console.error('[pricing] GET /', err);
    res.status(500).json({ error: 'Error al obtener precios' });
  }
});

// POST /api/pricing/calculate — calculate without saving
router.post('/calculate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = calculatePrices(req.body);
    res.json({ data: result });
  } catch (err) {
    console.error('[pricing] POST /calculate', err);
    res.status(400).json({ error: 'Parámetros inválidos para calcular precio' });
  }
});

// PUT /api/pricing/:productId — upsert pricing config
router.put('/:productId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const {
      roastingCostPerUnit,
      packagingCostPerUnit,
      overheadFixed,
      marginRetailPct,
      marginB2bPct,
      minAlertMarginPct,
    } = req.body;

    const config = await prisma.pricingConfig.upsert({
      where: { productId },
      create: {
        productId,
        roastingCostPerUnit: parseFloat(roastingCostPerUnit) || 0,
        packagingCostPerUnit: parseFloat(packagingCostPerUnit) || 0,
        overheadFixed: parseFloat(overheadFixed) || 0,
        marginRetailPct: parseFloat(marginRetailPct) || 60,
        marginB2bPct: parseFloat(marginB2bPct) || 30,
        minAlertMarginPct: parseFloat(minAlertMarginPct) || 20,
      },
      update: {
        roastingCostPerUnit: parseFloat(roastingCostPerUnit) || 0,
        packagingCostPerUnit: parseFloat(packagingCostPerUnit) || 0,
        overheadFixed: parseFloat(overheadFixed) || 0,
        marginRetailPct: parseFloat(marginRetailPct) || 60,
        marginB2bPct: parseFloat(marginB2bPct) || 30,
        minAlertMarginPct: parseFloat(minAlertMarginPct) || 20,
      },
    });

    await logAdminAction({
      adminId: req.admin?.id,
      action: 'UPDATE',
      entity: 'PricingConfig',
      entityId: productId,
      metadata: { marginRetailPct, marginB2bPct },
    });
    res.json({ data: config });
  } catch (err) {
    console.error('[pricing] PUT /:productId', err);
    res.status(500).json({ error: 'Error al guardar configuración de precios' });
  }
});

export default router;
```

- [ ] **Step 3: Mount**

```typescript
import pricingRouter from './routes/pricing';
app.use('/api/pricing', adminLimiter, pricingRouter);
```

---

### Task 3.3: Pricing admin page

**Files:**

- Create: `client/src/admin/Pricing.tsx`
- Modify: `client/src/api/index.ts`
- Modify: `client/src/types/index.ts`
- Modify: `client/src/App.tsx`
- Modify: `client/src/admin/AdminLayout.tsx`

- [ ] **Step 1: Add types**

```typescript
// Add to client/src/types/index.ts
export interface PricingConfig {
  id: string;
  productId: string;
  roastingCostPerUnit: number;
  packagingCostPerUnit: number;
  overheadFixed: number;
  marginRetailPct: number;
  marginB2bPct: number;
  minAlertMarginPct: number;
}

export interface PricingCalculation {
  rawCostPerUnit: number;
  totalCostPerUnit: number;
  suggestedRetailPrice: number;
  suggestedB2bPrice: number;
  retailMarginAmount: number;
  b2bMarginAmount: number;
}

export interface ProductWithPricing {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  costPrice: number | null;
  weight: number | null;
  pricingConfig: PricingConfig | null;
  calculated: PricingCalculation | null;
}
```

- [ ] **Step 2: Add API functions**

```typescript
export const pricingApi = {
  list: () => api.get('/pricing'),
  calculate: (inputs: Record<string, number>) => api.post('/pricing/calculate', inputs),
  save: (productId: string, config: Partial<PricingConfig>) =>
    api.put(`/pricing/${productId}`, config),
};
```

- [ ] **Step 3: Create Pricing.tsx admin page**

Build a table of all active products with their pricing config. Each row shows:

- Product name + SKU
- Current `price` (in DB)
- `costPrice` (raw)
- If `pricingConfig` exists: suggestedRetailPrice, suggestedB2bPrice, retailMarginPct%
- Alert badge if margin < `minAlertMarginPct`
- "Configurar" button → inline expanded form with the 5 config fields + live preview of calculated prices
- "Aplicar precio sugerido" button → calls `api.put('/products/:id', { price: suggestedRetailPrice })`

Key component structure:

```tsx
// client/src/admin/Pricing.tsx
export default function AdminPricing() {
  const [products, setProducts] = useState<ProductWithPricing[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [configForms, setConfigForms] = useState<Record<string, Partial<PricingConfig>>>({});
  const [previews, setPreviews] = useState<Record<string, PricingCalculation>>({});
  // fetch on mount, render table, handle save config + apply price
}
```

- [ ] **Step 4: Wire route + nav**

```tsx
// App.tsx
import AdminPricing from './admin/Pricing';
<Route path="pricing" element={<AdminPricing />} />;
```

```tsx
// AdminLayout.tsx navLinks
{ href: '/admin/pricing', label: 'Precios', icon: DollarSign }
```

- [ ] **Step 5: Commit Phase 3**

```bash
git add server/prisma server/src/lib/pricing.ts server/src/routes/pricing.ts server/src/index.ts client/src/types/index.ts client/src/api/index.ts client/src/admin/Pricing.tsx client/src/App.tsx client/src/admin/AdminLayout.tsx
git commit -m "feat(pricing): add cost-based pricing engine with D2C/B2B margin calculator"
```

---

## Phase 4 — Product Versioning

### Task 4.1: ProductVersion schema

**Files:**

- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add ProductVersion model**

```prisma
model ProductVersion {
  id           String      @id @default(cuid())
  productId    String
  product      Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  version      Int
  cosecha      String?
  caficultorId String?
  caficultor   Caficultor? @relation(fields: [caficultorId], references: [id])
  loteId       String?
  scoreFinal   Float?
  notasSabor   String?
  isActive     Boolean     @default(true)
  createdAt    DateTime    @default(now())

  @@unique([productId, version])
  @@index([productId])
}
```

Add to `Product` model:

```prisma
  versions     ProductVersion[]
```

Add to `Caficultor` model (after `lotes`):

```prisma
  productVersions ProductVersion[]
```

- [ ] **Step 2: Run migration**

```bash
cd server && npx prisma migrate dev --name add_product_versions
```

---

### Task 4.2: ProductVersions API route

**Files:**

- Create: `server/src/routes/product-versions.ts`
- Modify: `server/src/index.ts`
- Modify: `server/src/routes/products.ts` (add versions to public GET)

- [ ] **Step 1: Create versions route**

```typescript
// server/src/routes/product-versions.ts
import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logAdminAction } from '../lib/adminLog';

const router = Router();

// GET /api/product-versions/:productId
router.get('/:productId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const versions = await prisma.productVersion.findMany({
      where: { productId: req.params.productId },
      include: { caficultor: { select: { id: true, nombre: true, region: true } } },
      orderBy: { version: 'desc' },
    });
    res.json({ data: versions });
  } catch (err) {
    console.error('[product-versions] GET /:productId', err);
    res.status(500).json({ error: 'Error al obtener versiones' });
  }
});

// POST /api/product-versions/:productId
router.post('/:productId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { cosecha, caficultorId, loteId, scoreFinal, notasSabor } = req.body;

    const lastVersion = await prisma.productVersion.findFirst({
      where: { productId: req.params.productId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (lastVersion?.version ?? 0) + 1;

    // Deactivate previous versions
    await prisma.productVersion.updateMany({
      where: { productId: req.params.productId, isActive: true },
      data: { isActive: false },
    });

    const version = await prisma.productVersion.create({
      data: {
        productId: req.params.productId,
        version: nextVersion,
        cosecha: cosecha?.trim() || null,
        caficultorId: caficultorId || null,
        loteId: loteId || null,
        scoreFinal: scoreFinal ? parseFloat(scoreFinal) : null,
        notasSabor: notasSabor?.trim() || null,
        isActive: true,
      },
      include: { caficultor: { select: { id: true, nombre: true, region: true } } },
    });

    await logAdminAction({
      adminId: req.admin?.id,
      action: 'CREATE',
      entity: 'ProductVersion',
      entityId: version.id,
      metadata: { productId: req.params.productId, version: nextVersion, cosecha },
    });
    res.status(201).json({ data: version });
  } catch (err) {
    console.error('[product-versions] POST /:productId', err);
    res.status(500).json({ error: 'Error al crear versión' });
  }
});

export default router;
```

- [ ] **Step 2: Mount**

```typescript
import productVersionsRouter from './routes/product-versions';
app.use('/api/product-versions', adminLimiter, productVersionsRouter);
```

- [ ] **Step 3: Expose active version on public product endpoint**

In `server/src/routes/products.ts`, in the `GET /` and `GET /:idOrSlug` queries, add to `include`:

```typescript
versions: {
  where: { isActive: true },
  include: { caficultor: { select: { nombre: true, region: true } } },
  take: 1,
},
```

---

### Task 4.3: Version UI in admin + public product page

**Files:**

- Modify: `client/src/admin/Products.tsx`
- Modify: `client/src/pages/ProductDetail.tsx`
- Modify: `client/src/types/index.ts`
- Modify: `client/src/api/index.ts`

- [ ] **Step 1: Add types**

```typescript
// Add to client/src/types/index.ts
export interface ProductVersion {
  id: string;
  productId: string;
  version: number;
  cosecha: string | null;
  caficultorId: string | null;
  caficultor: { id: string; nombre: string; region: string } | null;
  loteId: string | null;
  scoreFinal: number | null;
  notasSabor: string | null;
  isActive: boolean;
  createdAt: string;
}
```

- [ ] **Step 2: Add API functions**

```typescript
export const productVersionsApi = {
  list: (productId: string) => api.get(`/product-versions/${productId}`),
  create: (productId: string, data: Partial<ProductVersion>) =>
    api.post(`/product-versions/${productId}`, data),
};
```

- [ ] **Step 3: Add Versions tab to Products admin**

In `client/src/admin/Products.tsx`, in the product detail/edit modal, add a "Versiones" tab/section. When expanded for a product, fetch `productVersionsApi.list(product.id)` and render:

- Version history list (version number, cosecha, caficultor, score, isActive badge)
- "Nueva versión" form: `cosecha` (text), `caficultorId` (select from active caficultores), `scoreFinal` (number), `notasSabor` (text — comma-separated flavor notes)

- [ ] **Step 4: Show active version info on ProductDetail page**

In `client/src/pages/ProductDetail.tsx`, after the product origin/altitude section, add — if `product.versions[0]` exists:

```tsx
{
  product.versions?.[0] && (
    <div className="mt-4 p-4 bg-coffee-50 dark:bg-coffee-900/50 rounded-xl space-y-1">
      <p className="text-xs font-medium text-coffee-500 dark:text-cream/50 uppercase tracking-wide">
        Cosecha actual
      </p>
      <p className="text-coffee-900 dark:text-cream font-medium">{product.versions[0].cosecha}</p>
      {product.versions[0].caficultor && (
        <p className="text-sm text-coffee-600 dark:text-cream/70">
          {product.versions[0].caficultor.nombre} — {product.versions[0].caficultor.region}
        </p>
      )}
      {product.versions[0].scoreFinal && (
        <p className="text-sm text-coffee-500 dark:text-cream/50">
          Score SCA: {product.versions[0].scoreFinal}/100
        </p>
      )}
      {product.versions[0].notasSabor && (
        <p className="text-xs text-coffee-500 dark:text-cream/50">
          {product.versions[0].notasSabor}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit Phase 4**

```bash
git add server/prisma server/src/routes/product-versions.ts server/src/routes/products.ts server/src/index.ts client/src/types/index.ts client/src/api/index.ts client/src/admin/Products.tsx client/src/pages/ProductDetail.tsx
git commit -m "feat(versioning): add product version tracking with harvest, farmer, and sensory score"
```

---

## Phase 5 — B2B Channel

### Task 5.1: B2B schema

**Files:**

- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add B2B fields and model**

Add `type`, `businessName`, `rfc`, `paymentTerms` to `Order` model (after `paymentIntentId`):

```prisma
  type          String   @default("D2C")
  businessName  String?
  rfc           String?
  paymentTerms  String?
```

Add `B2BPriceTier` model:

```prisma
model B2BPriceTier {
  id           String   @id @default(cuid())
  productId    String
  product      Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  minQty       Int
  maxQty       Int?
  pricePerUnit Float
  createdAt    DateTime @default(now())

  @@index([productId])
}
```

Add reverse relation on `Product`:

```prisma
  b2bPriceTiers B2BPriceTier[]
```

- [ ] **Step 2: Run migration**

```bash
cd server && npx prisma migrate dev --name add_b2b_channel
```

---

### Task 5.2: B2B API route

**Files:**

- Create: `server/src/routes/b2b.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create b2b route**

```typescript
// server/src/routes/b2b.ts
import { Router, Response, Request } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logAdminAction } from '../lib/adminLog';

const router = Router();

// Public: GET /api/b2b/catalog — products with B2B price tiers
router.get('/catalog', async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true, category: 'CAFÉ' },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        description: true,
        origin: true,
        weight: true,
        sku: true,
        b2bPriceTiers: { orderBy: { minQty: 'asc' } },
      },
    });
    res.json({ data: products });
  } catch (err) {
    console.error('[b2b] GET /catalog', err);
    res.status(500).json({ error: 'Error al obtener catálogo B2B' });
  }
});

// Public: POST /api/b2b/inquiry — submit a B2B quote request
router.post('/inquiry', async (req: Request, res: Response) => {
  try {
    const { businessName, rfc, contactName, email, phone, items, notes } = req.body;
    if (!businessName?.trim() || !email?.trim() || !items?.length) {
      return res.status(400).json({ error: 'Empresa, email e ítems son requeridos' });
    }

    const inquiry = await prisma.b2BInquiry.create({
      data: {
        empresa: businessName.trim(),
        rfc: rfc?.trim() || null,
        contacto: contactName?.trim() || null,
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        status: 'NEW',
      },
    });

    res
      .status(201)
      .json({
        data: {
          inquiryId: inquiry.id,
          message: 'Solicitud recibida. Te contactaremos en 24-48 horas.',
        },
      });
  } catch (err) {
    console.error('[b2b] POST /inquiry', err);
    res.status(500).json({ error: 'Error al enviar solicitud' });
  }
});

// Admin: GET /api/b2b/tiers/:productId
router.get('/tiers/:productId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tiers = await prisma.b2BPriceTier.findMany({
      where: { productId: req.params.productId },
      orderBy: { minQty: 'asc' },
    });
    res.json({ data: tiers });
  } catch (err) {
    console.error('[b2b] GET /tiers/:productId', err);
    res.status(500).json({ error: 'Error al obtener tiers' });
  }
});

// Admin: POST /api/b2b/tiers/:productId — create a price tier
router.post('/tiers/:productId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { minQty, maxQty, pricePerUnit } = req.body;
    if (!minQty || !pricePerUnit) {
      return res.status(400).json({ error: 'minQty y pricePerUnit son requeridos' });
    }
    const tier = await prisma.b2BPriceTier.create({
      data: {
        productId: req.params.productId,
        minQty: parseInt(minQty),
        maxQty: maxQty ? parseInt(maxQty) : null,
        pricePerUnit: parseFloat(pricePerUnit),
      },
    });
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'CREATE',
      entity: 'B2BPriceTier',
      entityId: tier.id,
      metadata: { productId: req.params.productId, minQty, pricePerUnit },
    });
    res.status(201).json({ data: tier });
  } catch (err) {
    console.error('[b2b] POST /tiers/:productId', err);
    res.status(500).json({ error: 'Error al crear tier' });
  }
});

// Admin: DELETE /api/b2b/tiers/item/:tierId
router.delete('/tiers/item/:tierId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tier = await prisma.b2BPriceTier.findUnique({ where: { id: req.params.tierId } });
    if (!tier) return res.status(404).json({ error: 'Tier no encontrado' });
    await prisma.b2BPriceTier.delete({ where: { id: req.params.tierId } });
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'DELETE',
      entity: 'B2BPriceTier',
      entityId: tier.id,
      metadata: {},
    });
    res.json({ data: { deleted: true } });
  } catch (err) {
    console.error('[b2b] DELETE /tiers/item/:tierId', err);
    res.status(500).json({ error: 'Error al eliminar tier' });
  }
});

// Admin: GET /api/b2b/orders — B2B orders (type=B2B)
router.get('/orders', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 20;
    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where: { type: 'B2B' },
        include: { items: { include: { product: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where: { type: 'B2B' } }),
    ]);
    res.json({ data, total, page, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    console.error('[b2b] GET /orders', err);
    res.status(500).json({ error: 'Error al obtener pedidos B2B' });
  }
});

export default router;
```

- [ ] **Step 2: Mount**

```typescript
import b2bRouter from './routes/b2b';
app.use('/api/b2b', b2bRouter); // public catalog + inquiry (no adminLimiter)
// B2B admin endpoints within the router use requireAuth internally
```

---

### Task 5.3: B2B Admin page

**Files:**

- Create: `client/src/admin/B2BOrders.tsx`
- Modify: `client/src/types/index.ts`
- Modify: `client/src/api/index.ts`
- Modify: `client/src/App.tsx`
- Modify: `client/src/admin/AdminLayout.tsx`

- [ ] **Step 1: Add types**

```typescript
// Add to client/src/types/index.ts
export interface B2BPriceTier {
  id: string;
  productId: string;
  minQty: number;
  maxQty: number | null;
  pricePerUnit: number;
}

export interface B2BOrder extends Order {
  type: 'B2B';
  businessName: string | null;
  rfc: string | null;
  paymentTerms: string | null;
}
```

- [ ] **Step 2: Add API functions**

```typescript
export const b2bApi = {
  catalog: () => api.get('/b2b/catalog'),
  getTiers: (productId: string) => api.get(`/b2b/tiers/${productId}`),
  createTier: (productId: string, data: Partial<B2BPriceTier>) =>
    api.post(`/b2b/tiers/${productId}`, data),
  deleteTier: (tierId: string) => api.delete(`/b2b/tiers/item/${tierId}`),
  orders: (params?: Record<string, unknown>) => api.get('/b2b/orders', { params }),
};
```

- [ ] **Step 3: Create B2BOrders.tsx admin page**

Two tabs: "Pedidos B2B" (table of B2B orders with businessName, rfc, paymentTerms, status, total) and "Precios por Volumen" (select product → show/add/delete price tiers).

Price tier table columns: Mínimo qty | Máximo qty | Precio/unidad | Acciones (delete).
Add tier form: minQty, maxQty (optional), pricePerUnit.

Follow `Lotes.tsx` structure for state management and UI patterns.

- [ ] **Step 4: Wire route + nav**

```tsx
// App.tsx
import AdminB2BOrders from './admin/B2BOrders';
<Route path="b2b" element={<AdminB2BOrders />} />;
```

```tsx
// AdminLayout.tsx navLinks
{ href: '/admin/b2b', label: 'B2B', icon: Briefcase }
```

---

### Task 5.4: B2B public catalog page

**Files:**

- Create: `client/src/pages/B2BCatalog.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Create B2BCatalog.tsx**

Public-facing B2B landing page at `/b2b`:

- Hero section: "Café de especialidad para tu empresa"
- Product cards with price tier table (qty brackets + price/unit)
- Inquiry form at bottom: empresa, RFC, contacto, email, teléfono, textarea para necesidades
- On submit: calls `b2bApi.inquiry(data)` → success message

- [ ] **Step 2: Wire route**

```tsx
// App.tsx (outside admin routes)
import B2BCatalog from './pages/B2BCatalog';
<Route path="/b2b" element={<B2BCatalog />} />;
```

- [ ] **Step 3: Add "Empresas" link to public Navbar**

In `client/src/components/Navbar.tsx`, add to secondary/más dropdown:

```tsx
{ href: '/b2b', label: 'Empresas' }
```

- [ ] **Step 4: Commit Phase 5**

```bash
git add server/prisma server/src/routes/b2b.ts server/src/index.ts client/src/types/index.ts client/src/api/index.ts client/src/admin/B2BOrders.tsx client/src/pages/B2BCatalog.tsx client/src/App.tsx client/src/admin/AdminLayout.tsx client/src/components/Navbar.tsx
git commit -m "feat(b2b): add B2B channel with volume pricing tiers, catalog page, and admin order management"
```

---

## Verification (end-to-end)

```bash
# 1. Start
pnpm dev

# 2. Phase 1 — Lotes
# Navigate /admin/lotes
# Create lote → verify appears in Cuarentena tab
# Add QC scores → save → verify scores persist
# Approve → verify StockMovement created + Product.stock incremented
# Reject → verify appears in Rechazados with reason
# Check /admin/logs for Lote audit entries

# 3. Phase 2 — Caficultores
# Navigate /admin/caficultores → create caficultor
# Go back to /admin/lotes → create lote → caficultor appears in selector

# 4. Phase 3 — Pricing
# Navigate /admin/pricing → configure costs for a product
# Verify suggested prices calculate correctly
# Verify alert badge shows if margin < minAlertMarginPct

# 5. Phase 4 — Versioning
# Navigate /admin/products → open a product → Versiones tab
# Create version with cosecha + caficultor
# Navigate to /productos/:slug → verify version info appears

# 6. Phase 5 — B2B
# Navigate /admin/b2b → Precios por Volumen tab
# Select product → add tiers (1-10 units at $X, 11-50 at $Y)
# Navigate /b2b → verify catalog shows products with tiers
# Submit inquiry form → verify B2BInquiry created in DB

# 7. TypeScript
cd client && npx tsc --noEmit
cd server && npx tsc --noEmit
```
