import { useState, useCallback, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, MapPin, Mountain, Eye } from 'lucide-react';
import { caficultoresApi, tiposCataApi } from '../api';
import { Caficultor, TipoCata } from '../types';
import { useModuleToast } from './context/ModuleContext';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import ConfirmDialog from './components/ConfirmDialog';
import Pagination from './components/Pagination';
import ImageUploader from './components/ImageUploader';
import SearchableUbicacionSelect from '../components/SearchableUbicacionSelect';

const EMPTY_FORM: Partial<Caficultor> & { tipoCataIds: string[] } = {
  nombre: '',
  region: '',
  modalidad: 'DIRECTO',
  fairTrade: false,
  isActive: true,
  tipoCataIds: [],
};

export default function AdminCaficultores() {
  const { addToast } = useModuleToast();
  const [items, setItems] = useState<Caficultor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Caficultor | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Caficultor | null>(null);
  const [viewing, setViewing] = useState<Caficultor | null>(null);

  const [tiposCata, setTiposCata] = useState<TipoCata[]>([]);
  const [ubicacionId, setUbicacionId] = useState('');

  useEffect(() => {
    tiposCataApi
      .list()
      .then((r) => setTiposCata(r.data.data || []))
      .catch(() => {});
  }, []);

  const fetchItems = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await caficultoresApi.list({ page: p, pageSize: 20 });
      setItems(res.data.data);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
      setPage(p);
    } catch {
      setError('Error al cargar caficultores');
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
    setUbicacionId('');
    setShowForm(true);
  };
  const openEdit = (c: Caficultor) => {
    setEditing(c);
    setForm({
      ...c,
      tipoCataIds: c.tiposCata?.map((t) => t.id) ?? [],
    });
    setUbicacionId('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nombre?.trim() || !form.region?.trim()) {
      addToast('Nombre y región son requeridos', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, tipoCataIds: form.tipoCataIds };
      if (editing) {
        await caficultoresApi.update(editing.id, payload);
        addToast('Caficultor actualizado', 'success');
      } else {
        await caficultoresApi.create(payload);
        addToast('Caficultor creado', 'success');
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
      await caficultoresApi.delete(confirmDelete.id);
      addToast('Caficultor eliminado', 'success');
      setConfirmDelete(null);
      fetchItems(page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast(msg || 'Error al eliminar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleTipoCata = (id: string) => {
    setForm((f) => ({
      ...f,
      tipoCataIds: f.tipoCataIds.includes(id)
        ? f.tipoCataIds.filter((tid) => tid !== id)
        : [...f.tipoCataIds, id],
    }));
  };

  const formFields = [
    { key: 'nombre', label: 'Nombre *', placeholder: 'Don Ernesto Méndez' },
    { key: 'altitud', label: 'Altitud (msnm)', placeholder: '1800', type: 'number' },
    { key: 'variedad', label: 'Variedad', placeholder: 'Bourbon, Typica' },
    { key: 'contacto', label: 'Contacto', placeholder: '+52 999 000 0000' },
    { key: 'acuerdoPrecioKg', label: 'Precio acordado $/kg', placeholder: '85.00', type: 'number' },
    { key: 'foto', label: 'Foto', placeholder: 'https://...' },
  ] as { key: string; label: string; placeholder: string; type?: string }[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Caficultores</h1>
          <p className="text-coffee-600 dark:text-cream/60 text-sm mt-1">
            {total} caficultor{total !== 1 ? 'es' : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-coffee-800 dark:bg-coffee-600 text-cream px-4 py-2 rounded-lg hover:bg-coffee-900 dark:hover:bg-coffee-500 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Agregar Caficultor
        </button>
      </div>

      {loading ? (
        <AdminSkeleton rows={5} />
      ) : error ? (
        <AdminErrorState error={error} onRetry={() => fetchItems(page)} />
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-coffee-500 dark:text-cream/50">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No hay caficultores registrados</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-coffee-900 rounded-xl border border-coffee-100 dark:border-coffee-700 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-coffee-900 dark:text-cream truncate">
                    {c.nombre}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-coffee-500 dark:text-cream/60 mt-0.5">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{c.region}</span>
                    {c.altitud && (
                      <>
                        <Mountain className="w-3 h-3 shrink-0 ml-1" />
                        <span>{c.altitud}m</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setViewing(c)}
                    className="p-1.5 text-coffee-400 hover:text-coffee-700 dark:hover:text-cream hover:bg-coffee-50 dark:hover:bg-coffee-800 rounded-lg"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 text-coffee-400 hover:text-coffee-700 dark:hover:text-cream hover:bg-coffee-50 dark:hover:bg-coffee-800 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(c)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {c.tiposCata &&
                  c.tiposCata.map((t) => (
                    <span
                      key={t.id}
                      className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full"
                    >
                      {t.nombre}
                    </span>
                  ))}
                <span className="px-2 py-0.5 bg-coffee-100 dark:bg-coffee-800 text-coffee-700 dark:text-cream/70 rounded-full">
                  {c.modalidad}
                </span>
                {c.fairTrade && (
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                    Fair Trade
                  </span>
                )}
                {c.acuerdoPrecioKg && (
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                    ${c.acuerdoPrecioKg}/kg
                  </span>
                )}
              </div>
              {c._count && (
                <p className="text-xs text-coffee-400 dark:text-cream/40">
                  {c._count.lotes} lote{c._count.lotes !== 1 ? 's' : ''} registrado
                  {c._count.lotes !== 1 ? 's' : ''}
                </p>
              )}
              {!c.isActive && (
                <span className="text-xs text-red-500 dark:text-red-400">Inactivo</span>
              )}
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={fetchItems} />

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-coffee-900 rounded-2xl w-full max-w-lg shadow-xl">
            <div className="p-6 border-b border-coffee-100 dark:border-coffee-700">
              <h2 className="text-lg font-semibold text-coffee-900 dark:text-cream">
                {editing ? 'Editar Caficultor' : 'Nuevo Caficultor'}
              </h2>
            </div>
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div>
                <label className="block text-sm text-coffee-700 dark:text-cream/70 mb-1">
                  Región *
                </label>
                <SearchableUbicacionSelect
                  value={ubicacionId}
                  onChange={setUbicacionId}
                  onSelectLabel={(label) => setForm((f) => ({ ...f, region: label }))}
                  initialLabel={form.region || 'Seleccionar región'}
                />
                <input
                  type="text"
                  placeholder="O escribir manualmente..."
                  value={form.region ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                  className="w-full mt-2 border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream"
                />
              </div>
              {formFields.map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-sm text-coffee-700 dark:text-cream/70 mb-1">
                    {label}
                  </label>
                  {key === 'foto' ? (
                    <ImageUploader
                      value={(form[key as keyof typeof form] as string | undefined) ?? ''}
                      onChange={(url) => setForm((f) => ({ ...f, [key]: url }))}
                      label=""
                    />
                  ) : (
                    <input
                      type={type || 'text'}
                      placeholder={placeholder}
                      value={
                        (
                          form as unknown as Record<
                            string,
                            string | number | boolean | null | undefined
                          >
                        )[key]?.toString() ?? ''
                      }
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="w-full border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream"
                    />
                  )}
                </div>
              ))}

              <div>
                <label className="block text-sm text-coffee-700 dark:text-cream/70 mb-1">
                  Modalidad
                </label>
                <select
                  value={form.modalidad || 'DIRECTO'}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, modalidad: e.target.value as Caficultor['modalidad'] }))
                  }
                  className="w-full border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream"
                >
                  <option value="DIRECTO">Directo</option>
                  <option value="COOPERATIVA">Cooperativa</option>
                  <option value="INTERMEDIARIO">Intermediario</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-coffee-700 dark:text-cream/70 mb-1">
                  Tipos de Cata
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {tiposCata.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTipoCata(t.id)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        form.tipoCataIds.includes(t.id)
                          ? 'bg-gold-500 text-coffee-950 border-gold-500'
                          : 'bg-white dark:bg-coffee-800 text-coffee-700 dark:text-cream/70 border-coffee-200 dark:border-coffee-600 hover:border-gold-500'
                      }`}
                    >
                      {t.nombre}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-coffee-700 dark:text-cream/70 mb-1">Bio</label>
                <textarea
                  rows={3}
                  placeholder="Historia del caficultor..."
                  value={form.bio ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  className="w-full border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream resize-none"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.fairTrade ?? false}
                    onChange={(e) => setForm((f) => ({ ...f, fairTrade: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-coffee-700 dark:text-cream/70">Fair Trade</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive ?? true}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-coffee-700 dark:text-cream/70">Activo</span>
                </label>
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

      {viewing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-coffee-900 rounded-2xl w-full max-w-lg shadow-xl">
            <div className="p-6 border-b border-coffee-100 dark:border-coffee-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-coffee-900 dark:text-cream">
                {viewing.nombre}
              </h2>
              <button
                onClick={() => setViewing(null)}
                className="text-coffee-400 hover:text-coffee-700 dark:hover:text-cream text-sm"
              >
                Cerrar
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              {viewing.foto && (
                <img
                  src={viewing.foto}
                  alt={viewing.nombre}
                  className="w-full h-48 object-cover rounded-lg"
                />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-coffee-500 dark:text-cream/50 text-xs uppercase">Región</p>
                  <p className="text-coffee-900 dark:text-cream">{viewing.region}</p>
                </div>
                {viewing.altitud && (
                  <div>
                    <p className="text-coffee-500 dark:text-cream/50 text-xs uppercase">Altitud</p>
                    <p className="text-coffee-900 dark:text-cream">{viewing.altitud} msnm</p>
                  </div>
                )}
                {viewing.variedad && (
                  <div>
                    <p className="text-coffee-500 dark:text-cream/50 text-xs uppercase">Variedad</p>
                    <p className="text-coffee-900 dark:text-cream">{viewing.variedad}</p>
                  </div>
                )}
                <div>
                  <p className="text-coffee-500 dark:text-cream/50 text-xs uppercase">Modalidad</p>
                  <p className="text-coffee-900 dark:text-cream">{viewing.modalidad}</p>
                </div>
                {viewing.contacto && (
                  <div>
                    <p className="text-coffee-500 dark:text-cream/50 text-xs uppercase">Contacto</p>
                    <p className="text-coffee-900 dark:text-cream">{viewing.contacto}</p>
                  </div>
                )}
                {viewing.acuerdoPrecioKg && (
                  <div>
                    <p className="text-coffee-500 dark:text-cream/50 text-xs uppercase">
                      Precio/kg
                    </p>
                    <p className="text-coffee-900 dark:text-cream">${viewing.acuerdoPrecioKg}</p>
                  </div>
                )}
                <div>
                  <p className="text-coffee-500 dark:text-cream/50 text-xs uppercase">Fair Trade</p>
                  <p className="text-coffee-900 dark:text-cream">
                    {viewing.fairTrade ? 'Sí' : 'No'}
                  </p>
                </div>
                <div>
                  <p className="text-coffee-500 dark:text-cream/50 text-xs uppercase">Estado</p>
                  <p className="text-coffee-900 dark:text-cream">
                    {viewing.isActive ? 'Activo' : 'Inactivo'}
                  </p>
                </div>
              </div>
              {viewing.bio && (
                <div>
                  <p className="text-coffee-500 dark:text-cream/50 text-xs uppercase mb-1">Bio</p>
                  <p className="text-sm text-coffee-700 dark:text-cream/80">{viewing.bio}</p>
                </div>
              )}
              {viewing.tiposCata && viewing.tiposCata.length > 0 && (
                <div>
                  <p className="text-coffee-500 dark:text-cream/50 text-xs uppercase mb-1">
                    Tipos de Cata
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {viewing.tiposCata.map((t) => (
                      <span
                        key={t.id}
                        className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full text-xs"
                      >
                        {t.nombre}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {viewing._count && (
                <p className="text-xs text-coffee-400 dark:text-cream/40">
                  {viewing._count.lotes} lote{viewing._count.lotes !== 1 ? 's' : ''} registrado
                  {viewing._count.lotes !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Caficultor"
        message={`¿Eliminar a ${confirmDelete?.nombre}? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isDangerous
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={saving}
      />
    </div>
  );
}
