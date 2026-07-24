import { useEffect, useState, useCallback } from 'react';
import { Gift, Edit3, Plus, Search, Power } from 'lucide-react';
import { PageMeta } from '../hooks/usePageMeta';
import { useModuleToast } from './context/ModuleContext';
import AdminSkeleton from './components/AdminSkeleton';
import AdminReiconIcon from '../components/AdminReiconIcon';
import IconPickerModal from '../components/IconPickerModal';
import { toEmoji } from '../utils/toEmoji';
import AdminErrorState from './components/AdminErrorState';
import AdminModal from './components/AdminModal';
import FormField from './components/FormField';
import ConfirmDialog from './components/ConfirmDialog';
import { rewardsAdminApi, type Reward } from '../api';

interface FormData {
  name: string;
  description: string;
  icon: string;
  xpCost: number;
  discountPct: number;
  maxUses: number;
  stock: number | '';
}

const emptyForm: FormData = {
  name: '',
  description: '',
  icon: '🎁',
  xpCost: 100,
  discountPct: 10,
  maxUses: 1,
  stock: '',
};

export default function Rewards() {
  const { addToast } = useModuleToast();

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasListError, setHasListError] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Reward | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [confirmToggle, setConfirmToggle] = useState<Reward | null>(null);
  const [toggling, setToggling] = useState(false);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const handleIconSelect = useCallback((name: string) => {
    setForm((prev) => ({ ...prev, icon: name }));
  }, []);

  const fetchRewards = useCallback(async () => {
    setLoading(true);
    setHasListError(false);
    try {
      const res = await rewardsAdminApi.list();
      setRewards(res.data.data);
    } catch {
      setHasListError(true);
      addToast('Error al cargar recompensas', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (r: Reward) => {
    setEditing(r);
    setForm({
      name: r.name,
      description: r.description,
      icon: r.icon,
      xpCost: r.xpCost,
      discountPct: r.discountPct,
      maxUses: r.maxUses,
      stock: r.stock ?? '',
    });
    setError('');
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('El nombre es requerido');
      addToast('El nombre es requerido', 'error');
      return;
    }
    if (form.xpCost < 1) {
      setError('El costo en XP debe ser al menos 1');
      addToast('El costo en XP debe ser al menos 1', 'error');
      return;
    }
    if (form.discountPct < 1 || form.discountPct > 100) {
      setError('El descuento debe estar entre 1 y 100');
      addToast('El descuento debe estar entre 1 y 100', 'error');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        icon: toEmoji(form.icon) || '🎁',
        xpCost: form.xpCost,
        discountPct: form.discountPct,
        maxUses: form.maxUses,
        stock: form.stock === '' ? null : Number(form.stock),
      };
      if (editing) {
        const res = await rewardsAdminApi.update(editing.id, payload);
        setRewards((prev) => prev.map((r) => (r.id === editing.id ? res.data.data : r)));
        addToast('Recompensa actualizada', 'success');
      } else {
        const res = await rewardsAdminApi.create(payload);
        setRewards((prev) => [res.data.data, ...prev]);
        addToast('Recompensa creada', 'success');
      }
      setModalOpen(false);
    } catch (e: unknown) {
      const msg =
        (e && typeof e === 'object' && 'response' in e
          ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined) || 'Error al guardar recompensa';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!confirmToggle) return;
    setToggling(true);
    try {
      const res = await rewardsAdminApi.delete(confirmToggle.id);
      setRewards((prev) => prev.map((r) => (r.id === confirmToggle.id ? res.data.data : r)));
      addToast(
        res.data.data.isActive ? 'Recompensa activada' : 'Recompensa desactivada',
        'success',
      );
    } catch {
      addToast('Error al cambiar estado', 'error');
    } finally {
      setToggling(false);
      setConfirmToggle(null);
    }
  };

  const filtered = rewards.filter(
    (r) =>
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageMeta title="Recompensas" noSuffix />
      <div className="flex items-center gap-3 mb-8">
        <Gift className="w-6 h-6 text-gold-500" />
        <div>
          <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Recompensas</h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mt-1">
            {rewards.length} recompensas
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-8">
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Crear Recompensa
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar recompensa..."
          className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-gold-500/50"
        />
      </div>

      {loading ? (
        <AdminSkeleton rows={4} />
      ) : hasListError ? (
        <AdminErrorState
          error="Error al cargar recompensas. Intenta de nuevo."
          onRetry={fetchRewards}
        />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Gift className="w-12 h-12 text-coffee-300 dark:text-coffee-600 mb-4" />
          <p className="text-coffee-500 dark:text-coffee-400">No hay recompensas creadas.</p>
        </div>
      ) : (
        <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-coffee-200 dark:border-coffee-800 text-coffee-600 dark:text-coffee-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Icono</th>
                <th className="text-left px-4 py-3 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 font-medium">XP</th>
                <th className="text-left px-4 py-3 font-medium">Descuento</th>
                <th className="text-left px-4 py-3 font-medium">Usos/usuario</th>
                <th className="text-left px-4 py-3 font-medium">Stock</th>
                <th className="text-left px-4 py-3 font-medium">Estado</th>
                <th className="text-left px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-coffee-200 dark:border-coffee-800 hover:bg-coffee-200/50 dark:hover:bg-coffee-800/30"
                >
                  <td className="px-4 py-3 text-xl">
                    <AdminReiconIcon icon={r.icon} size={24} />
                  </td>
                  <td className="px-4 py-3 text-coffee-900 dark:text-cream font-medium">
                    {r.name}
                  </td>
                  <td className="px-4 py-3 text-coffee-900 dark:text-cream">{r.xpCost}</td>
                  <td className="px-4 py-3 text-coffee-900 dark:text-cream">{r.discountPct}%</td>
                  <td className="px-4 py-3 text-coffee-900 dark:text-cream">{r.maxUses}</td>
                  <td className="px-4 py-3 text-coffee-900 dark:text-cream">
                    {r.stock === null || r.stock === undefined ? '∞' : r.stock}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium ${
                        r.isActive
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      {r.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(r)}
                        className="text-coffee-600 dark:text-coffee-400 hover:text-gold-500 transition-colors"
                        aria-label="Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmToggle(r)}
                        className={`transition-colors ${
                          r.isActive
                            ? 'text-coffee-600 dark:text-coffee-400 hover:text-red-400'
                            : 'text-coffee-600 dark:text-coffee-400 hover:text-green-500'
                        }`}
                        aria-label={r.isActive ? 'Desactivar' : 'Activar'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminModal
        open={modalOpen}
        title={editing ? 'Editar Recompensa' : 'Crear Recompensa'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 px-4 py-2 border border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 text-sm hover:text-coffee-900 dark:hover:text-cream transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="reward-form"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-coffee-950 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </button>
          </>
        }
      >
        <form id="reward-form" onSubmit={submit}>
          <FormField
            label="Nombre"
            value={form.name}
            onChange={(v) => setForm((p) => ({ ...p, name: String(v) }))}
            required
          />
          <FormField
            label="Descripción"
            value={form.description}
            onChange={(v) => setForm((p) => ({ ...p, description: String(v) }))}
            type="textarea"
            rows={3}
          />
          {/* Icon picker */}
          <div>
            <label className="block text-xs text-coffee-600 dark:text-coffee-400 mb-1">Icono</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIconPickerOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm hover:border-gold-500 transition-colors"
              >
                <AdminReiconIcon icon={form.icon} size={20} />
                <span className="text-xs text-coffee-500">{form.icon || '🎁'}</span>
              </button>
              <input
                type="text"
                value={form.icon}
                onChange={(v) => setForm((p) => ({ ...p, icon: String(v) }))}
                placeholder="o escribe emoji"
                className="flex-1 bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
              />
            </div>
          </div>
          <FormField
            label="Costo en XP"
            value={form.xpCost}
            onChange={(v) => setForm((p) => ({ ...p, xpCost: Number(v) }))}
            type="number"
          />
          <FormField
            label="Descuento (%)"
            value={form.discountPct}
            onChange={(v) => setForm((p) => ({ ...p, discountPct: Number(v) }))}
            type="number"
          />
          <FormField
            label="Usos máximos por usuario"
            value={form.maxUses}
            onChange={(v) => setForm((p) => ({ ...p, maxUses: Number(v) }))}
            type="number"
          />
          <FormField
            label="Stock (vacío = ilimitado)"
            value={form.stock}
            onChange={(v) =>
              setForm((p) => ({
                ...p,
                stock: v === '' || v === undefined ? '' : Number(v),
              }))
            }
            type="number"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </form>
      </AdminModal>

      <IconPickerModal
        isOpen={iconPickerOpen}
        onClose={() => setIconPickerOpen(false)}
        onSelect={handleIconSelect}
        currentIcon={form.icon}
      />

      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.isActive ? 'Desactivar recompensa' : 'Activar recompensa'}
        message={
          confirmToggle?.isActive
            ? '¿Desactivar esta recompensa? Los usuarios no podrán canjearla.'
            : '¿Activar esta recompensa?'
        }
        confirmText={confirmToggle?.isActive ? 'Desactivar' : 'Activar'}
        isDangerous={confirmToggle?.isActive}
        loading={toggling}
        onConfirm={toggleActive}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
}
