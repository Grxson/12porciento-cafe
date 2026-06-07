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
      if (value === undefined || value === null || value === '') return true;
      const itemValue = (item as any)[key];
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
