import { useState, useCallback, useEffect, useMemo } from 'react';
import { getApiError } from '../../lib/api-error';

export interface ModuleListConfig {
  /** When true, fetchList receives { page, ...serverFilters } and response must include { data, total, page, totalPages } */
  serverSide?: boolean;
  onSuccess?: (action: 'create' | 'update' | 'delete', message?: string) => void;
  onError?: (message: string) => void;
}

export type FetchParams = Record<string, string | number | boolean | undefined>;
export type ItemData = Record<string, unknown>;

interface ApiListResponse {
  data?: {
    data?: unknown[];
    totalPages?: number;
    total?: number;
    page?: number;
  };
}

interface ApiItemResponse {
  data?: {
    data?: unknown;
  };
}

export function useModuleList<T extends { id: string }>(
  fetchList: (params?: FetchParams) => Promise<unknown>,
  createItem?: (data: ItemData) => Promise<unknown>,
  updateItem?: (id: string, data: ItemData) => Promise<unknown>,
  deleteItem?: (id: string) => Promise<unknown>,
  config?: ModuleListConfig,
) {
  const serverSide = config?.serverSide ?? false;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Client-side filters (legacy behaviour, no-op in serverSide mode)
  const [filters, setFilters] = useState<Record<string, unknown>>({});
  // Server-side filters + pagination
  const [serverFilters, setServerFiltersRaw] = useState<Record<string, unknown>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = serverSide ? { page, ...serverFilters } : undefined;
      const res = await fetchList(params) as ApiListResponse;
      if (serverSide) {
        setItems((res.data?.data ?? []) as T[]);
        setTotalPages(res.data?.totalPages ?? 1);
        setTotal(res.data?.total ?? 0);
        // Trust server page echo if present, else keep local
        if (res.data?.page) setPage(res.data.page);
      } else {
        setItems((res.data?.data ?? []) as T[]);
      }
    } catch (err: unknown) {
      const msg = getApiError(err, 'Error al cargar');
      setError(msg);
      config?.onError?.(msg);
    } finally {
      setLoading(false);
    }
  }, [fetchList, serverSide, page, serverFilters]);

  useEffect(() => {
    load();
  }, [load]);

  // Server-side filter setter — always resets to page 1
  const setServerFilters = useCallback((f: Record<string, unknown>) => {
    setServerFiltersRaw(f);
    setPage(1);
  }, []);

  // Convenience: update one server filter key
  const setServerFilter = useCallback((key: string, value: unknown) => {
    setServerFiltersRaw((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const fetchPage = useCallback((p: number) => {
    setPage(p);
  }, []);

  const create = useCallback(
    async (data: ItemData) => {
      if (!createItem) throw new Error('Create not available');
      try {
        const res = await createItem(data) as ApiItemResponse;
        if (serverSide) {
          // Reload to get accurate server state
          load();
        } else {
          setItems((prev) => [...prev, res.data?.data as T]);
        }
        config?.onSuccess?.('create', 'Creado correctamente');
        return res.data?.data as T;
      } catch (err: unknown) {
        const msg = getApiError(err, 'Error al crear');
        setError(msg);
        config?.onError?.(msg);
        throw err;
      }
    },
    [createItem, serverSide, load],
  );

  const update = useCallback(
    async (id: string, data: ItemData) => {
      if (!updateItem) throw new Error('Update not available');
      try {
        const res = await updateItem(id, data) as ApiItemResponse;
        if (serverSide) {
          load();
        } else {
          setItems((prev) => prev.map((i) => (i.id === id ? res.data?.data as T : i)));
        }
        config?.onSuccess?.('update', 'Actualizado correctamente');
        return res.data?.data as T;
      } catch (err: unknown) {
        const msg = getApiError(err, 'Error al actualizar');
        setError(msg);
        config?.onError?.(msg);
        throw err;
      }
    },
    [updateItem, serverSide, load],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!deleteItem) throw new Error('Delete not available');
      try {
        await deleteItem(id);
        if (serverSide) {
          load();
        } else {
          setItems((prev) => prev.filter((i) => i.id !== id));
        }
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        config?.onSuccess?.('delete', 'Eliminado correctamente');
      } catch (err: unknown) {
        const msg = getApiError(err, 'Error al eliminar');
        setError(msg);
        config?.onError?.(msg);
        throw err;
      }
    },
    [deleteItem, serverSide, load],
  );

  // Client-side filtered view (only used when serverSide=false)
  const filtered = useMemo(() => {
    if (serverSide) return items;
    return items.filter((item) =>
      Object.entries(filters).every(([key, value]) => {
        if (value === undefined || value === null || value === '') return true;
        return (item as Record<string, unknown>)[key] === value;
      }),
    );
  }, [items, filters, serverSide]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const deleteSelected = useCallback(async () => {
    const toDelete = Array.from(selected);
    for (const id of toDelete) {
      try { await remove(id); } catch { /* continue */ }
    }
    setSelected(new Set());
  }, [selected, remove]);

  const selectAll = useCallback(() => {
    setSelected(new Set(items.map((i) => i.id)));
  }, [items]);

  const clearSelect = useCallback(() => {
    setSelected(new Set());
  }, []);

  return {
    items: filtered,
    loading,
    error,
    // Client-side filter API (legacy)
    filters,
    setFilters,
    // Server-side pagination + filter API
    page,
    totalPages,
    total,
    fetchPage,
    serverFilters,
    setServerFilters,
    setServerFilter,
    // CRUD
    create,
    update,
    delete: remove,
    deleteSelected,
    // Selection
    selected,
    toggleSelect,
    selectAll,
    clearSelect,
    // Reload
    reload: load,
    retry: load,
  };
}
