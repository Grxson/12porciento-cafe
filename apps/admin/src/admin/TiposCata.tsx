import { useState, useCallback, useEffect } from 'react';
import { Tag, Plus, Edit2, Trash2 } from 'lucide-react';
import { tiposCataApi } from '../api';
import { useModuleToast } from './context/ModuleContext';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import ConfirmDialog from './components/ConfirmDialog';
import Pagination from './components/Pagination';
import { PageMeta } from '../hooks/usePageMeta';

interface TipoCataItem {
  id: string;
  nombre: string;
  categoria: string | null;
  isActive: boolean;
}

const EMPTY_FORM = { nombre: '', categoria: 'SABOR' };

const CATEGORIAS = ['SABOR', 'AROMA', 'CUERPO', 'ACIDEZ', 'POST-GUSTO', 'OTRO'];

export default function AdminTiposCata() {
  const { addToast } = useModuleToast();
  const [items, setItems] = useState<TipoCataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TipoCataItem | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<TipoCataItem | null>(null);

  const fetchItems = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await tiposCataApi.list({ page: p, pageSize: 20 });
      const d = res.data as { data: TipoCataItem[]; totalPages: number; total: number };
      setItems(d.data);
      setTotalPages(d.totalPages);
      setTotal(d.total);
      setPage(p);
    } catch {
      setError('Error al cargar tipos de cata');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(1);
  }, [fetchItems]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };
  const openEdit = (t: TipoCataItem) => {
    setEditing(t);
    setForm({ nombre: t.nombre, categoria: t.categoria ?? 'SABOR' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      addToast('Nombre requerido', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, categoria: form.categoria || undefined };
      if (editing) {
        await tiposCataApi.update(editing.id, payload);
        addToast('Tipo de cata actualizado', 'success');
      } else {
        await tiposCataApi.create(payload);
        addToast('Tipo de cata creado', 'success');
      }
      setShowForm(false);
      fetchItems(page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast(msg || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      await tiposCataApi.delete(confirmDelete.id);
      addToast('Tipo de cata eliminado', 'success');
      setConfirmDelete(null);
      fetchItems(page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast(msg || 'Error al eliminar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: TipoCataItem) => {
    try {
      await tiposCataApi.update(t.id, { isActive: !t.isActive });
      addToast(`${t.nombre} ${!t.isActive ? 'activado' : 'desactivado'}`, 'success');
      fetchItems(page);
    } catch {
      addToast('Error al cambiar estado', 'error');
    }
  };

  return (
    <div>
      <PageMeta title="Tipos de Cata" noSuffix />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Tipos de Cata</h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mt-1">{total} tipos</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-coffee-800 dark:bg-coffee-600 text-cream px-4 py-2 rounded-lg hover:bg-coffee-900 dark:hover:bg-coffee-500 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      {loading ? (
        <AdminSkeleton rows={5} />
      ) : error ? (
        <AdminErrorState error={error} onRetry={() => fetchItems(page)} />
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-coffee-500 dark:text-cream/50">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No hay tipos de cata registrados</p>
        </div>
      ) : (
        <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-200 dark:border-coffee-800">
                  <th className="text-left text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest px-4 py-3">
                    Nombre
                  </th>
                  <th className="text-left text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest px-4 py-3">
                    Categoria
                  </th>
                  <th className="text-left text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest px-4 py-3">
                    Estado
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-coffee-200/50 dark:border-coffee-800/50 hover:bg-coffee-200/30 dark:hover:bg-coffee-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-coffee-900 dark:text-cream font-medium">
                      {t.nombre}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                        {t.categoria || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(t)} className="transition-colors">
                        {t.isActive ? (
                          <span className="text-green-600 dark:text-green-400 text-xs font-medium">
                            Activo
                          </span>
                        ) : (
                          <span className="text-red-500 dark:text-red-400 text-xs font-medium">
                            Inactivo
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openEdit(t)}
                          className="text-coffee-400 dark:text-coffee-500 hover:text-gold-500 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(t)}
                          className="text-coffee-400 dark:text-coffee-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={fetchItems} />

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-coffee-900 rounded-2xl w-full max-w-md shadow-xl">
            <div className="p-6 border-b border-coffee-100 dark:border-coffee-700">
              <h2 className="text-lg font-semibold text-coffee-900 dark:text-cream">
                {editing ? 'Editar Tipo de Cata' : 'Nuevo Tipo de Cata'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-coffee-700 dark:text-cream/70 mb-1">
                  Nombre *
                </label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Chocolate, Citrico, Floral"
                  className="w-full border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream"
                />
              </div>
              <div>
                <label className="block text-sm text-coffee-700 dark:text-cream/70 mb-1">
                  Categoria
                </label>
                <select
                  value={form.categoria}
                  onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                  className="w-full border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream"
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-coffee-100 dark:border-coffee-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-coffee-600 dark:text-cream/60 hover:text-coffee-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-coffee-800 dark:bg-coffee-600 text-cream rounded-lg hover:bg-coffee-900 dark:hover:bg-coffee-500 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Tipo de Cata"
        message={`¿Eliminar "${confirmDelete?.nombre}"?`}
        confirmText="Eliminar"
        isDangerous
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={saving}
      />
    </div>
  );
}
