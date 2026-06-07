# Admin Overhaul — Complete 100% Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify admin patterns across 10 modules, complete broken CRUDs (Bundles, Customers), add search/export/bulk actions, and ensure 100% functionality with coherent UI/UX.

**Architecture:** 
- **Phase 1 (Infra):** Extract `useModuleList` hook + `ModuleContext` pattern (Recipes model) for reuse across all modules.
- **Phase 2 (CRUDs):** Complete Bundles create/edit modal, Customers full CRUD, Subscribers item editor.
- **Phase 3 (Features):** Advanced filters, CSV export, bulk approve/delete, toast system unification.
- **Phase 4 (UX):** Paginatio, confirmations, loading states, responsive tables, form validation.
- **Phase 5 (Tests & Verify):** Unit tests for hooks, integration tests for modules, manual E2E.

**Tech Stack:** React 18, TypeScript, Tailwind, Framer Motion, TanStack Table (pagination), Zustand (optional state), Vitest

---

## File Structure

### New Files to Create
```
client/src/admin/
  ├── hooks/
  │   ├── useModuleList.ts          (generic CRUD list hook)
  │   ├── useModuleForm.ts          (generic form state + validation)
  │   ├── usePagination.ts          (page/size logic)
  │   └── __tests__/
  │       ├── useModuleList.test.ts
  │       └── usePagination.test.ts
  │
  ├── context/
  │   └── ModuleContext.tsx          (generic module state context)
  │
  ├── components/
  │   ├── ModuleTable.tsx            (reusable paginated table)
  │   ├── ModuleModal.tsx            (reusable create/edit modal)
  │   ├── BulkActionBar.tsx          (select + bulk approve/delete)
  │   ├── ExportButton.tsx           (CSV export wrapper)
  │   ├── SearchFilters.tsx          (advanced filter form)
  │   ├── ConfirmDialog.tsx          (delete warning, modal)
  │   ├── FormField.tsx              (labeled input + error)
  │   └── __tests__/
  │       └── ModuleTable.test.ts
  │
  └── Bundles.tsx (NEW - complete)
     Customers.tsx (REWRITE)
     Products.tsx (UPDATE - use new hooks)
     Orders.tsx (UPDATE)
     PromoCodes.tsx (UPDATE)
```

### Modified Files
- `Bundles.tsx` — add create/edit modal
- `Customers.tsx` — full CRUD + search
- `Products.tsx` — use new hooks
- `Orders.tsx` — add filters, CSV export, bulk actions
- `Inventory.tsx` — add pagination, bulk delete
- `Subscribers.tsx` — item editor modal
- `PromoCodes.tsx` — form validation
- All other admin pages — add toasts, paginatio if needed

---

## PHASE 1: INFRA (Tasks 1-4)

### Task 1: Generic useModuleList Hook

**Files:**
- Create: `client/src/admin/hooks/useModuleList.ts`
- Test: `client/src/admin/hooks/__tests__/useModuleList.test.ts`

- [ ] **Step 1: Write test**

```typescript
// client/src/admin/hooks/__tests__/useModuleList.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useModuleList } from '../useModuleList';

describe('useModuleList', () => {
  it('loads items on mount', async () => {
    const mockApi = { list: vi.fn().mockResolvedValue({ data: { data: [{ id: '1', name: 'Test' }] } }) };
    const { result } = renderHook(() => useModuleList(mockApi.list));
    expect(result.current.loading).toBe(true);
    
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([{ id: '1', name: 'Test' }]);
  });

  it('creates item', async () => {
    const mockApi = {
      list: vi.fn().mockResolvedValue({ data: { data: [] } }),
      create: vi.fn().mockResolvedValue({ data: { data: { id: '2', name: 'New' } } }),
    };
    const { result } = renderHook(() => useModuleList(mockApi.list, mockApi.create));
    
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    await act(async () => {
      await result.current.createItem({ name: 'New' });
    });

    expect(result.current.items).toContainEqual(expect.objectContaining({ name: 'New' }));
  });

  it('deletes item', async () => {
    const mockApi = {
      list: vi.fn().mockResolvedValue({ data: { data: [{ id: '1', name: 'Test' }] } }),
      delete: vi.fn().mockResolvedValue({}),
    };
    const { result } = renderHook(() => useModuleList(mockApi.list, undefined, mockApi.delete));
    
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    await act(async () => {
      await result.current.deleteItem('1');
    });

    expect(result.current.items).not.toContainEqual(expect.objectContaining({ id: '1' }));
  });

  it('filters items', async () => {
    const mockApi = { list: vi.fn().mockResolvedValue({ data: { data: [{ id: '1', status: 'ACTIVE' }, { id: '2', status: 'INACTIVE' }] } }) };
    const { result } = renderHook(() => useModuleList(mockApi.list));
    
    await waitFor(() => expect(result.current.loading).toBe(false));
    
    act(() => {
      result.current.setFilters({ status: 'ACTIVE' });
    });

    expect(result.current.filtered).toEqual([{ id: '1', status: 'ACTIVE' }]);
  });
});
```

- [ ] **Step 2: Run test, verify fails**

```bash
cd client && pnpm test useModuleList.test.ts
```

Expected: FAIL (`useModuleList not defined`)

- [ ] **Step 3: Implement hook**

```typescript
// client/src/admin/hooks/useModuleList.ts
import { useState, useCallback, useEffect } from 'react';

export interface ModuleListConfig {
  onSuccess?: (action: 'create' | 'update' | 'delete', message?: string) => void;
  onError?: (message: string) => void;
}

export function useModuleList<T extends { id: string }>(
  fetchList: () => Promise<any>,
  createItem?: (data: any) => Promise<any>,
  updateItem?: (id: string, data: any) => Promise<any>,
  deleteItem?: (id: string) => Promise<any>,
  config?: ModuleListConfig,
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchList();
      setItems(res.data?.data || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al cargar');
      config?.onError?.(error || 'Error');
    } finally {
      setLoading(false);
    }
  }, [fetchList, config]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async (data: any) => {
      if (!createItem) throw new Error('Create not available');
      try {
        const res = await createItem(data);
        setItems((prev) => [...prev, res.data.data]);
        config?.onSuccess?.('create', 'Creado correctamente');
        return res.data.data;
      } catch (err: any) {
        const msg = err?.response?.data?.error || 'Error al crear';
        setError(msg);
        config?.onError?.(msg);
        throw err;
      }
    },
    [createItem, config],
  );

  const update = useCallback(
    async (id: string, data: any) => {
      if (!updateItem) throw new Error('Update not available');
      try {
        const res = await updateItem(id, data);
        setItems((prev) => prev.map((i) => (i.id === id ? res.data.data : i)));
        config?.onSuccess?.('update', 'Actualizado correctamente');
        return res.data.data;
      } catch (err: any) {
        const msg = err?.response?.data?.error || 'Error al actualizar';
        setError(msg);
        config?.onError?.(msg);
        throw err;
      }
    },
    [updateItem, config],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!deleteItem) throw new Error('Delete not available');
      try {
        await deleteItem(id);
        setItems((prev) => prev.filter((i) => i.id !== id));
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        config?.onSuccess?.('delete', 'Eliminado correctamente');
      } catch (err: any) {
        const msg = err?.response?.data?.error || 'Error al eliminar';
        setError(msg);
        config?.onError?.(msg);
        throw err;
      }
    },
    [deleteItem, config],
  );

  const filtered = items.filter((item) => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      const itemValue = (item as any)[key];
      if (typeof value === 'string') return itemValue?.toString().toLowerCase().includes(value.toLowerCase());
      return itemValue === value;
    });
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelected = useCallback(
    async () => {
      const toDelete = Array.from(selected);
      for (const id of toDelete) {
        try {
          await remove(id);
        } catch {
          // continue deleting others
        }
      }
      setSelected(new Set());
    },
    [selected, remove],
  );

  return {
    items: filtered,
    allItems: items,
    loading,
    error,
    filters,
    setFilters,
    create,
    update,
    delete: remove,
    deleteSelected,
    selected,
    toggleSelect,
    selectAll: () => setSelected(new Set(items.map((i) => i.id))),
    clearSelect: () => setSelected(new Set()),
    reload: load,
  };
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
cd client && pnpm test useModuleList.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add client/src/admin/hooks/useModuleList.ts client/src/admin/hooks/__tests__/useModuleList.test.ts
git commit -m "feat: add generic useModuleList hook for CRUD pattern reuse"
```

---

### Task 2: Generic usePagination Hook

**Files:**
- Create: `client/src/admin/hooks/usePagination.ts`
- Test: `client/src/admin/hooks/__tests__/usePagination.test.ts`

- [ ] **Step 1: Write test**

```typescript
// client/src/admin/hooks/__tests__/usePagination.test.ts
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../usePagination';

describe('usePagination', () => {
  it('paginates items', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1) }));
    const { result } = renderHook(() => usePagination(items, 10));

    expect(result.current.pageItems).toHaveLength(10);
    expect(result.current.pageItems[0]).toEqual({ id: '1' });
    expect(result.current.totalPages).toBe(3);
  });

  it('navigates pages', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1) }));
    const { result } = renderHook(() => usePagination(items, 10));

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.page).toBe(2);
    expect(result.current.pageItems[0]).toEqual({ id: '11' });
  });

  it('changes page size', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1) }));
    const { result } = renderHook(() => usePagination(items, 10));

    act(() => {
      result.current.setPageSize(20);
    });

    expect(result.current.pageSize).toBe(20);
    expect(result.current.pageItems).toHaveLength(20);
    expect(result.current.totalPages).toBe(2);
  });
});
```

- [ ] **Step 2: Run test, verify fails**

```bash
cd client && pnpm test usePagination.test.ts
```

Expected: FAIL (`usePagination not defined`)

- [ ] **Step 3: Implement hook**

```typescript
// client/src/admin/hooks/usePagination.ts
import { useState, useMemo } from 'react';

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const [size, setPageSize] = useState(pageSize);

  const totalPages = Math.ceil(items.length / size);
  const pageItems = useMemo(() => {
    const start = (page - 1) * size;
    return items.slice(start, start + size);
  }, [items, page, size]);

  return {
    page,
    pageSize: size,
    totalPages,
    pageItems,
    goToPage: (p: number) => setPage(Math.max(1, Math.min(p, totalPages))),
    nextPage: () => setPage((p) => Math.min(p + 1, totalPages)),
    prevPage: () => setPage((p) => Math.max(p - 1, 1)),
    setPageSize,
  };
}
```

- [ ] **Step 4: Run tests, verify pass**

```bash
cd client && pnpm test usePagination.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add client/src/admin/hooks/usePagination.ts client/src/admin/hooks/__tests__/usePagination.test.ts
git commit -m "feat: add usePagination hook for table pagination"
```

---

### Task 3: Reusable UI Components (ModuleTable, ConfirmDialog, FormField)

**Files:**
- Create: `client/src/admin/components/ModuleTable.tsx`
- Create: `client/src/admin/components/ConfirmDialog.tsx`
- Create: `client/src/admin/components/FormField.tsx`
- Create: `client/src/admin/components/BulkActionBar.tsx`

- [ ] **Step 1: Create ModuleTable (paginated, selectable)**

```typescript
// client/src/admin/components/ModuleTable.tsx
import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check, Trash2 } from 'lucide-react';
import { usePagination } from '../hooks/usePagination';

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: any, item: T) => React.ReactNode;
  width?: string;
}

interface ModuleTableProps<T extends { id: string }> {
  items: T[];
  columns: Column<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  selectable?: boolean;
  selected?: Set<string>;
  onToggleSelect?: (id: string) => void;
  pageSize?: number;
  loading?: boolean;
}

export default function ModuleTable<T extends { id: string }>({
  items,
  columns,
  onEdit,
  onDelete,
  selectable,
  selected,
  onToggleSelect,
  pageSize = 10,
  loading,
}: ModuleTableProps<T>) {
  const pagination = usePagination(items, pageSize);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return <div className="text-center text-coffee-500 py-10">No hay registros.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-coffee-800">
              {selectable && (
                <th className="px-4 py-2 text-left w-12">
                  <input type="checkbox" className="w-4 h-4 accent-gold-500" onChange={(e) => {
                    if (e.target.checked) pagination.pageItems.forEach((item) => onToggleSelect?.(item.id));
                    else pagination.pageItems.forEach((item) => onToggleSelect?.(item.id));
                  }} />
                </th>
              )}
              {columns.map((col) => (
                <th key={String(col.key)} className="px-4 py-2 text-left text-coffee-400 font-medium"
                  style={{ width: col.width }}>
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-2 text-left text-coffee-400 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagination.pageItems.map((item) => (
              <tr key={item.id} className="border-b border-coffee-900 hover:bg-coffee-800/30">
                {selectable && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected?.has(item.id) || false}
                      onChange={() => onToggleSelect?.(item.id)}
                      className="w-4 h-4 accent-gold-500"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={String(col.key)} className="px-4 py-3 text-cream">
                    {col.render ? col.render((item as any)[col.key], item) : (item as any)[col.key]}
                  </td>
                ))}
                <td className="px-4 py-3 flex gap-2">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className="text-gold-400 hover:text-gold-300 text-xs px-2 py-1 border border-coffee-700 transition-colors"
                    >
                      Editar
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(item)}
                      className="text-red-400 hover:text-red-300 p-1 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-coffee-900 border border-coffee-800">
          <span className="text-xs text-coffee-400">
            Página {pagination.page} de {pagination.totalPages} ({items.length} total)
          </span>
          <div className="flex gap-2">
            <button
              disabled={pagination.page === 1}
              onClick={pagination.prevPage}
              className="p-1 text-coffee-400 hover:text-cream disabled:opacity-50 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={pagination.page === pagination.totalPages}
              onClick={pagination.nextPage}
              className="p-1 text-coffee-400 hover:text-cream disabled:opacity-50 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ConfirmDialog**

```typescript
// client/src/admin/components/ConfirmDialog.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDangerous,
  onConfirm,
  onCancel,
  loading,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-coffee-900 border border-coffee-700 max-w-sm w-full p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg text-cream font-serif">{title}</h2>
              <button
                onClick={onCancel}
                className="text-coffee-400 hover:text-cream transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-coffee-300 mb-6">{message}</p>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-coffee-700 text-coffee-400 text-sm hover:text-cream transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                  isDangerous
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gold-500 hover:bg-gold-600 text-coffee-950'
                }`}
              >
                {loading ? 'Procesando...' : confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Create FormField**

```typescript
// client/src/admin/components/FormField.tsx
interface FormFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string | number) => void;
  error?: string;
  type?: 'text' | 'email' | 'number' | 'textarea' | 'select';
  options?: { label: string; value: string }[];
  required?: boolean;
  placeholder?: string;
  rows?: number;
}

export default function FormField({
  label,
  value,
  onChange,
  error,
  type = 'text',
  options,
  required,
  placeholder,
  rows = 3,
}: FormFieldProps) {
  return (
    <div>
      <label className="block text-xs text-coffee-400 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500 resize-none"
        />
      ) : type === 'select' ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
        >
          <option value="">-- Seleccionar --</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
          placeholder={placeholder}
          className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
        />
      )}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Create BulkActionBar**

```typescript
// client/src/admin/components/BulkActionBar.tsx
import { Trash2 } from 'lucide-react';

interface BulkActionBarProps {
  selectedCount: number;
  onDeleteSelected: () => void;
  onClearSelect: () => void;
  loading?: boolean;
}

export default function BulkActionBar({
  selectedCount,
  onDeleteSelected,
  onClearSelect,
  loading,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-gold-500/10 border border-gold-500/30 p-3 flex items-center justify-between">
      <span className="text-sm text-gold-400">{selectedCount} seleccionado(s)</span>
      <div className="flex gap-2">
        <button
          onClick={onClearSelect}
          disabled={loading}
          className="px-3 py-1 text-xs border border-coffee-700 text-coffee-400 hover:text-cream transition-colors disabled:opacity-50"
        >
          Limpiar
        </button>
        <button
          onClick={onDeleteSelected}
          disabled={loading}
          className="px-3 py-1 text-xs bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          <Trash2 size={12} /> Eliminar seleccionados
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/admin/components/ModuleTable.tsx client/src/admin/components/ConfirmDialog.tsx client/src/admin/components/FormField.tsx client/src/admin/components/BulkActionBar.tsx
git commit -m "feat: add reusable admin UI components (ModuleTable, ConfirmDialog, FormField, BulkActionBar)"
```

---

### Task 4: ModuleContext + Toast System

**Files:**
- Create: `client/src/admin/context/ModuleContext.tsx`
- Create: `client/src/admin/context/ToastContext.tsx`

- [ ] **Step 1: Create ModuleContext**

```typescript
// client/src/admin/context/ModuleContext.tsx
import { createContext, useContext, ReactNode, useState, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface ModuleContextType {
  toasts: Toast[];
  addToast: (message: string, type: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ModuleCtx = createContext<ModuleContextType | null>(null);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'], duration = 3000) => {
    const id = Math.random().toString(36);
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ModuleCtx.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
    </ModuleCtx.Provider>
  );
}

export function useModuleToast() {
  const ctx = useContext(ModuleCtx);
  if (!ctx) throw new Error('useModuleToast must be inside ModuleProvider');
  return ctx;
}
```

- [ ] **Step 2: Create ToastContainer component**

```typescript
// client/src/admin/components/ToastContainer.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useModuleToast } from '../context/ModuleContext';

export default function ToastContainer() {
  const { toasts, removeToast } = useModuleToast();

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm space-y-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`flex items-center gap-3 px-4 py-3 border ${
              toast.type === 'success'
                ? 'bg-green-900/30 border-green-700 text-green-400'
                : toast.type === 'error'
                ? 'bg-red-900/30 border-red-700 text-red-400'
                : 'bg-blue-900/30 border-blue-700 text-blue-400'
            }`}
          >
            {toast.type === 'success' && <CheckCircle size={18} />}
            {toast.type === 'error' && <AlertCircle size={18} />}
            {toast.type === 'info' && <Info size={18} />}
            <span className="text-sm flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="hover:opacity-70 transition-opacity"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 3: Wrap AdminLayout with provider**

Read AdminLayout, then wrap the component with ModuleProvider and add ToastContainer:

```typescript
// In client/src/admin/AdminLayout.tsx
import { ModuleProvider } from './context/ModuleContext';
import ToastContainer from './components/ToastContainer';

export default function AdminLayout() {
  return (
    <ModuleProvider>
      {/* existing layout */}
      <ToastContainer />
    </ModuleProvider>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/admin/context/ModuleContext.tsx client/src/admin/components/ToastContainer.tsx client/src/admin/AdminLayout.tsx
git commit -m "feat: add ModuleContext and toast notification system for all admin modules"
```

---

## PHASE 2: FIX BROKEN CRUDs (Tasks 5-7)

### Task 5: Bundles Complete CRUD

**Files:**
- Modify: `client/src/admin/Bundles.tsx` (rewrite)

- [ ] **Step 1: Rewrite Bundles with useModuleList + modal**

```typescript
// client/src/admin/Bundles.tsx (complete rewrite)
import { useEffect, useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { bundlesApi } from '../api';
import { useModuleList } from './hooks/useModuleList';
import { useModuleToast } from './context/ModuleContext';
import ModuleTable from './components/ModuleTable';
import FormField from './components/FormField';
import ConfirmDialog from './components/ConfirmDialog';
import BulkActionBar from './components/BulkActionBar';
import type { Bundle } from '../types';

const emptyForm = { name: '', description: '', basePrice: '', discountPct: '', items: [] };

export default function AdminBundles() {
  const { toasts, addToast } = useModuleToast();
  const list = useModuleList(
    () => bundlesApi.list(),
    (data) => bundlesApi.create(data),
    (id, data) => bundlesApi.update(id, data),
    (id) => bundlesApi.delete(id),
    { onSuccess: (_, msg) => addToast(msg || '✓', 'success'), onError: (msg) => addToast(msg, 'error') }
  );

  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleEdit = (bundle: Bundle) => {
    setForm({
      name: bundle.name,
      description: bundle.description,
      basePrice: bundle.basePrice.toString(),
      discountPct: bundle.discountPct.toString(),
      items: bundle.items,
    });
    setEditId(bundle.id);
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      addToast('Nombre es requerido', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        basePrice: parseFloat(form.basePrice),
        discountPct: parseFloat(form.discountPct),
      };
      if (editId) {
        await list.update(editId, payload);
      } else {
        await list.create(payload);
      }
      setModal(null);
      setForm(emptyForm);
      setEditId(null);
    } catch (err) {
      // error toast sent via context
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirmDelete) {
      setSaving(true);
      try {
        await list.delete(confirmDelete);
      } finally {
        setSaving(false);
        setConfirmDelete(null);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-cream">Bundles</h1>
          <p className="text-coffee-400 text-sm mt-1">{list.allItems.length} paquetes</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditId(null); setModal('add'); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Nuevo
        </button>
      </div>

      <BulkActionBar
        selectedCount={list.selected.size}
        onDeleteSelected={list.deleteSelected}
        onClearSelect={list.clearSelect}
        loading={saving}
      />

      <ModuleTable
        items={list.items}
        columns={[
          { key: 'name', label: 'Nombre' },
          { key: 'basePrice', label: 'Precio Base', render: (v) => `$${v}` },
          { key: 'discountPct', label: 'Descuento', render: (v) => `${v}%` },
        ]}
        onEdit={handleEdit}
        onDelete={(b) => setConfirmDelete(b.id)}
        selectable
        selected={list.selected}
        onToggleSelect={list.toggleSelect}
        loading={list.loading}
      />

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-coffee-900 border border-coffee-700 max-w-md w-full p-6 space-y-4">
            <h2 className="font-serif text-xl text-cream">{modal === 'add' ? 'Nuevo Bundle' : 'Editar Bundle'}</h2>

            <FormField label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: String(v) })} required />
            <FormField label="Descripción" value={form.description} onChange={(v) => setForm({ ...form, description: String(v) })} type="textarea" />
            <FormField label="Precio Base" value={form.basePrice} onChange={(v) => setForm({ ...form, basePrice: String(v) })} type="number" />
            <FormField label="Descuento %" value={form.discountPct} onChange={(v) => setForm({ ...form, discountPct: String(v) })} type="number" />

            <div className="flex gap-3 pt-4 border-t border-coffee-800">
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-gold-500 text-coffee-950 font-semibold hover:bg-gold-600 disabled:opacity-50 transition-colors">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2 border border-coffee-700 text-coffee-400 hover:text-cream transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Bundle"
        message="¿Estás seguro? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        isDangerous
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={saving}
      />
    </div>
  );
}
```

- [ ] **Step 2: Test create/edit/delete manually in dev server**

```bash
cd client && pnpm dev
# Navigate to /admin/bundles, test "Nuevo" button, create bundle, edit, delete
```

Expected: Modal opens, saves to API, toast appears, list updates

- [ ] **Step 3: Commit**

```bash
git add client/src/admin/Bundles.tsx
git commit -m "feat: complete Bundles CRUD with create/edit modal and bulk actions"
```

---

### Task 6: Customers Full CRUD + Search

**Files:**
- Modify: `client/src/admin/Customers.tsx` (rewrite)

- [ ] **Step 1: Rewrite Customers with full CRUD + filters**

```typescript
// client/src/admin/Customers.tsx (rewrite)
import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { customersApi } from '../api';
import { useModuleList } from './hooks/useModuleList';
import { useModuleToast } from './context/ModuleContext';
import ModuleTable from './components/ModuleTable';
import FormField from './components/FormField';
import ConfirmDialog from './components/ConfirmDialog';
import type { UserProfile } from '../types';

const emptyForm = { name: '', email: '', phone: '', address: '' };

export default function AdminCustomers() {
  const { addToast } = useModuleToast();
  const list = useModuleList(
    () => customersApi.list(),
    (data) => customersApi.create(data),
    (id, data) => customersApi.update(id, data),
    (id) => customersApi.delete(id),
    { onSuccess: (_, msg) => addToast(msg || '✓', 'success'), onError: (msg) => addToast(msg, 'error') }
  );

  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = list.allItems.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      addToast('Nombre y email requeridos', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await list.update(editId, form);
      } else {
        await list.create(form);
      }
      setModal(null);
      setForm(emptyForm);
      setEditId(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-cream">Clientes</h1>
          <p className="text-coffee-400 text-sm mt-1">{list.allItems.length} clientes</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setEditId(null); setModal('add'); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2 bg-coffee-900 border border-coffee-800 px-3 py-2">
        <Search size={16} className="text-coffee-500" />
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-cream text-sm focus:outline-none"
        />
      </div>

      <ModuleTable
        items={filtered}
        columns={[
          { key: 'name', label: 'Nombre' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Teléfono' },
          { key: 'address', label: 'Dirección' },
        ]}
        onEdit={(c) => {
          setForm({ name: c.name, email: c.email, phone: c.phone || '', address: c.address || '' });
          setEditId(c.id);
          setModal('edit');
        }}
        onDelete={(c) => setConfirmDelete(c.id)}
        loading={list.loading}
      />

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-coffee-900 border border-coffee-700 max-w-md w-full p-6 space-y-4">
            <h2 className="font-serif text-xl text-cream">{modal === 'add' ? 'Nuevo Cliente' : 'Editar Cliente'}</h2>
            <FormField label="Nombre" value={form.name} onChange={(v) => setForm({ ...form, name: String(v) })} required />
            <FormField label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: String(v) })} type="email" required />
            <FormField label="Teléfono" value={form.phone} onChange={(v) => setForm({ ...form, phone: String(v) })} />
            <FormField label="Dirección" value={form.address} onChange={(v) => setForm({ ...form, address: String(v) })} />

            <div className="flex gap-3 pt-4 border-t border-coffee-800">
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2 bg-gold-500 text-coffee-950 font-semibold hover:bg-gold-600 disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => setModal(null)} className="flex-1 px-4 py-2 border border-coffee-700 text-coffee-400 hover:text-cream">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Cliente"
        message="¿Estás seguro?"
        isDangerous
        onConfirm={async () => {
          if (confirmDelete) {
            setSaving(true);
            try {
              await list.delete(confirmDelete);
            } finally {
              setSaving(false);
              setConfirmDelete(null);
            }
          }
        }}
        onCancel={() => setConfirmDelete(null)}
        loading={saving}
      />
    </div>
  );
}
```

- [ ] **Step 2: Test in dev server**

- [ ] **Step 3: Commit**

```bash
git add client/src/admin/Customers.tsx
git commit -m "feat: implement Customers full CRUD with search and form validation"
```

---

### Task 7: Subscribers Item Editor Modal

**Files:**
- Modify: `client/src/admin/Subscribers.tsx` (add item editor)

- [ ] **Step 1: Add modal for editing items**

Read current Subscribers, add `useState` for item editing modal, render FormField for item selection, save via API.

- [ ] **Step 2: Commit**

---

## PHASE 3: FEATURES (Tasks 8-10)

### Task 8: CSV Export Utility

**Files:**
- Create: `client/src/admin/utils/csvExport.ts`
- Create: `client/src/admin/components/ExportButton.tsx`

- [ ] **Step 1: Write CSV export utility**

```typescript
// client/src/admin/utils/csvExport.ts
export function exportToCsv<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns: (keyof T)[]
) {
  const headers = columns.join(',');
  const rows = data.map((row) =>
    columns.map((col) => {
      const val = row[col];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string' && val.includes(',')) return `"${val.replace(/"/g, '""')}"`;
      return String(val);
    }).join(',')
  );

  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Create ExportButton component**

```typescript
// client/src/admin/components/ExportButton.tsx
import { Download } from 'lucide-react';
import { exportToCsv } from '../utils/csvExport';

interface ExportButtonProps<T> {
  data: T[];
  filename: string;
  columns: (keyof T)[];
  disabled?: boolean;
}

export default function ExportButton<T extends Record<string, any>>({
  data,
  filename,
  columns,
  disabled,
}: ExportButtonProps<T>) {
  return (
    <button
      onClick={() => exportToCsv(data, filename, columns)}
      disabled={disabled || data.length === 0}
      className="px-3 py-2 text-xs border border-coffee-700 text-coffee-400 hover:text-cream disabled:opacity-50 flex items-center gap-1 transition-colors"
    >
      <Download size={14} /> CSV
    </button>
  );
}
```

- [ ] **Step 3: Integrate into Orders (example)**

Add to Orders module:
```tsx
<ExportButton data={list.allItems} filename="orders" columns={['id', 'customerName', 'total', 'status', 'createdAt']} />
```

- [ ] **Step 4: Commit**

---

### Task 9: Advanced Filters

**Files:**
- Create: `client/src/admin/components/FilterForm.tsx`

- [ ] **Step 1: Create generic filter form**

```typescript
// client/src/admin/components/FilterForm.tsx
import FormField from './FormField';

interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number';
  options?: { label: string; value: string }[];
}

interface FilterFormProps {
  fields: FilterField[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onReset: () => void;
}

export default function FilterForm({ fields, values, onChange, onReset }: FilterFormProps) {
  return (
    <div className="bg-coffee-900 border border-coffee-800 p-4 space-y-3 mb-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {fields.map((field) => (
          <FormField
            key={field.key}
            label={field.label}
            value={values[field.key] ?? ''}
            onChange={(v) => onChange({ ...values, [field.key]: v })}
            type={field.type}
            options={field.options}
          />
        ))}
      </div>
      <button onClick={onReset} className="text-xs text-coffee-400 hover:text-cream border-b border-coffee-700">
        Limpiar filtros
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Use in Orders**

- [ ] **Step 3: Commit**

---

### Task 10: Bulk Actions (approve, delete)

**Files:**
- Modify: `BulkActionBar.tsx` (add approve button if needed)
- Modify: modules that need bulk approve (Reviews)

- [ ] **Step 1: Add bulk approve to Reviews**

- [ ] **Step 2: Test**

- [ ] **Step 3: Commit**

---

## PHASE 4: UX IMPROVEMENTS (Tasks 11-13)

### Task 11: Fix all modules to use new patterns + toasts

**Files:**
- Modify: `Products.tsx`, `Orders.tsx`, `Inventory.tsx`, `PromoCodes.tsx`, `Reviews.tsx`

- [ ] **Step 1: Update each to use useModuleList + useModuleToast**

- [ ] **Step 2: Replace inline edits with modals**

- [ ] **Step 3: Add pagination if > 50 items**

- [ ] **Step 4: Commit modules as group**

```bash
git add client/src/admin/Products.tsx client/src/admin/Orders.tsx client/src/admin/Inventory.tsx client/src/admin/PromoCodes.tsx client/src/admin/Reviews.tsx
git commit -m "refactor: unify admin modules with useModuleList, toasts, and pagination"
```

---

### Task 12: Responsive tables + loading states

**Files:**
- Modify: `ModuleTable.tsx`, all modules

- [ ] **Step 1: Make tables mobile-friendly (scroll on small screens)**

- [ ] **Step 2: Add loading skeleton while fetching**

- [ ] **Step 3: Test on mobile viewport**

---

### Task 13: Form validation + confirmations

**Files:**
- Modify: all modals to add validation before save
- Modify: all delete buttons to use ConfirmDialog

- [ ] **Step 1: Validate all required fields before submit**

- [ ] **Step 2: Show field-level errors**

- [ ] **Step 3: Test form validation**

---

## PHASE 5: TESTS + VERIFY (Tasks 14-15)

### Task 14: Integration tests for modules

**Files:**
- Create: `client/src/admin/__tests__/Bundles.test.tsx`
- Create: `client/src/admin/__tests__/Customers.test.tsx`

- [ ] **Step 1: Write test for Bundles CRUD**

```typescript
// client/src/admin/__tests__/Bundles.test.tsx
// Renders list, opens create modal, fills form, saves, verifies toast, checks list updated
```

- [ ] **Step 2: Write test for Customers search**

- [ ] **Step 3: Run: pnpm test**

- [ ] **Step 4: Commit**

---

### Task 15: Manual E2E + verify 100% functionality

**Files:** none (manual testing)

- [ ] **Step 1: Start dev server**

```bash
pnpm dev
```

- [ ] **Step 2: Test each module:**
  - **Dashboard** — stats render, no errors
  - **Products** — create/edit/delete works, see toast
  - **Orders** — filter/search, paginate, CSV export
  - **Inventory** — paginate, bulk delete
  - **Bundles** — modal works, edit updates list
  - **Customers** — search, create/edit/delete
  - **PromoCodes** — form validation, delete warn
  - **Reviews** — approve/delete, bulk approve
  - **Subscribers** — item editor modal
  - **Recipes** — unchanged, verify still works

- [ ] **Step 3: Check no console errors, responsive on mobile**

- [ ] **Step 4: Final commit (if any cleanup)**

---

## Execution Options

**Plan complete and saved to `docs/superpowers/plans/2026-06-07-admin-overhaul.md`.**

Two execution paths:

**1. Subagent-Driven (recommended)** — Fresh subagent per task, parallel where possible, structured reviews. Best for large multi-phase work.

**2. Inline Execution** — Execute tasks sequentially in this session using executing-plans skill. Faster for small scopes, uses less context.

Recommend subagent-driven + **parallel Phase 1 + Phase 2 start** (infra ready → CRUDs begin immediately). Then Phase 3+ once verified.

Which approach, and ready to start Phase 1?
