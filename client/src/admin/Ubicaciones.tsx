import { useState, useCallback, useEffect } from 'react';
import { MapPin, Plus, Edit2, Trash2 } from 'lucide-react';
import { ubicacionesApi } from '../api';
import { useModuleToast } from './context/ModuleContext';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import ConfirmDialog from './components/ConfirmDialog';
import Pagination from './components/Pagination';
import { PageMeta } from '../hooks/usePageMeta';

interface Ubicacion {
  id: string;
  nombre: string;
  pais: string | null;
  tipo: string | null;
  _count?: { lotes: number };
}

const EMPTY_FORM = { nombre: '', pais: '', tipo: 'FINCA' };

export default function AdminUbicaciones() {
  const { addToast } = useModuleToast();
  const [items, setItems] = useState<Ubicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Ubicacion | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Ubicacion | null>(null);

  const fetchItems = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await ubicacionesApi.list({ page: p, pageSize: 20 });
      const d = res.data as { data: Ubicacion[]; totalPages: number; total: number };
      setItems(d.data);
      setTotalPages(d.totalPages);
      setTotal(d.total);
      setPage(p);
    } catch {
      setError('Error al cargar ubicaciones');
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
  const openEdit = (u: Ubicacion) => {
    setEditing(u);
    setForm({ nombre: u.nombre, pais: u.pais ?? '', tipo: u.tipo ?? 'FINCA' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      addToast('Nombre requerido', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, pais: form.pais || undefined, tipo: form.tipo || undefined };
      if (editing) {
        await ubicacionesApi.update(editing.id, payload);
        addToast('Ubicacion actualizada', 'success');
      } else {
        await ubicacionesApi.create(payload);
        addToast('Ubicacion creada', 'success');
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
      await ubicacionesApi.delete(confirmDelete.id);
      addToast('Ubicacion eliminada', 'success');
      setConfirmDelete(null);
      fetchItems(page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast(msg || 'Error al eliminar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const tiposUbicacion = ['FINCA', 'REGION', 'PAIS', 'BODEGA', 'TOSTADURIA', 'ESTACION'];

  return (
    <div>
      <PageMeta title="Ubicaciones" noSuffix />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Ubicaciones</h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mt-1">{total} ubicaciones</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-coffee-800 text-cream px-4 py-2 rounded-lg hover:bg-coffee-900 transition-colors text-sm"
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
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No hay ubicaciones registradas</p>
        </div>
      ) : (
        <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-200 dark:border-coffee-800">
                  <th className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">
                    Nombre
                  </th>
                  <th className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">
                    Pais
                  </th>
                  <th className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">
                    Tipo
                  </th>
                  <th className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">
                    Lotes
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-coffee-200/50 dark:border-coffee-800/50 hover:bg-coffee-200/30 dark:hover:bg-coffee-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-coffee-900 dark:text-cream font-medium">
                      {u.nombre}
                    </td>
                    <td className="px-4 py-3 text-coffee-600 dark:text-coffee-400">
                      {u.pais || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 bg-coffee-100 dark:bg-coffee-800 text-coffee-700 dark:text-cream/70 rounded-full">
                        {u.tipo || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-coffee-600 dark:text-coffee-400">
                      {u._count?.lotes ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openEdit(u)}
                          className="text-coffee-400 dark:text-coffee-500 hover:text-gold-500 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(u)}
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
                {editing ? 'Editar Ubicacion' : 'Nueva Ubicacion'}
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
                  placeholder="Ej: Finca El Paraiso"
                  className="w-full border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream"
                />
              </div>
              <div>
                <label className="block text-sm text-coffee-700 dark:text-cream/70 mb-1">
                  Pais
                </label>
                <input
                  value={form.pais}
                  onChange={(e) => setForm((f) => ({ ...f, pais: e.target.value }))}
                  placeholder="Ej: Mexico"
                  className="w-full border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream"
                />
              </div>
              <div>
                <label className="block text-sm text-coffee-700 dark:text-cream/70 mb-1">
                  Tipo
                </label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                  className="w-full border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream"
                >
                  {tiposUbicacion.map((t) => (
                    <option key={t} value={t}>
                      {t}
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
                className="px-4 py-2 text-sm bg-coffee-800 text-cream rounded-lg hover:bg-coffee-900 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Ubicacion"
        message={`¿Eliminar "${confirmDelete?.nombre}"? Esta accion no se puede deshacer.`}
        confirmText="Eliminar"
        isDangerous
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={saving}
      />
    </div>
  );
}
