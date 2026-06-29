import { useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag } from 'lucide-react';
import { promoCodesApi } from '../api';
import { useModuleToast } from './context/ModuleContext';
import ConfirmDialog from './components/ConfirmDialog';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import { PageMeta } from '../hooks/usePageMeta';
import { useModuleList } from './hooks/useModuleList';

interface PromoCode {
  id: string;
  code: string;
  discount: number;
  type: string; // 'PERCENTAGE' | 'FIXED' (legacy rows may use 'PERCENT')
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = { code: '', discount: '', type: 'PERCENTAGE', maxUses: '', expiresAt: '' };

// Any type that isn't an explicit FIXED amount is treated as a percentage.
const isFixed = (type: string) => type === 'FIXED';

export default function AdminPromoCodes() {
  const { addToast } = useModuleToast();

  const { items: codes, loading, error: listError, reload } = useModuleList<PromoCode>(
    promoCodesApi.list,
    undefined,
    undefined,
    undefined,
    { onError: (msg) => addToast(msg, 'error') },
  );

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const validateForm = (): string | null => {
    if (!form.code.trim()) return 'El código es requerido';
    const discount = parseFloat(form.discount);
    if (isNaN(discount) || discount <= 0) return 'El descuento debe ser mayor a 0';
    if (!isFixed(form.type) && discount > 100) return 'El porcentaje no puede ser mayor a 100';
    if (form.maxUses && parseInt(form.maxUses) <= 0) return 'Los usos máximos deben ser mayores a 0';
    if (form.expiresAt && new Date(form.expiresAt) < new Date(new Date().toDateString())) {
      return 'La fecha de expiración debe ser futura';
    }
    return null;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true); setError('');
    try {
      await promoCodesApi.create({
        code: form.code,
        discount: parseFloat(form.discount),
        type: form.type,
        maxUses: form.maxUses ? parseInt(form.maxUses) : undefined,
        expiresAt: form.expiresAt || undefined,
      });
      setForm(emptyForm);
      addToast('Código creado', 'success');
      reload();
    } catch (e: any) {
      const msg = e.response?.data?.error || 'Error al crear código';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id: string) => {
    try {
      await promoCodesApi.toggle(id);
      reload();
    } catch {
      addToast('Error al cambiar estado', 'error');
    }
  };

  const remove = async (id: string) => {
    setDeleting(true);
    try {
      await promoCodesApi.delete(id);
      addToast('Código eliminado', 'success');
      reload();
    } catch {
      addToast('Error al eliminar', 'error');
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  // Days until expiry (negative = already expired).
  const daysUntil = (date: string) => {
    const diff = new Date(date).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="p-8">
      <PageMeta title="Códigos de Descuento" noSuffix />
      <div className="flex items-center gap-3 mb-8">
        <Tag className="w-6 h-6 text-gold-500" />
        <div>
          <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Códigos de Descuento</h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mt-1">{codes.length} códigos</p>
        </div>
      </div>

      <form onSubmit={submit} className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6 mb-8">
        <h2 className="text-coffee-900 dark:text-cream font-medium mb-4">Nuevo código</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <input
            required
            placeholder="CAFE20"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500/50 uppercase"
          />
          <input
            required
            type="number"
            step="0.01"
            placeholder="Descuento"
            value={form.discount}
            onChange={(e) => setForm({ ...form, discount: e.target.value })}
            className="bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:outline-none"
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:outline-none"
          >
            <option value="PERCENTAGE">% Porcentaje</option>
            <option value="FIXED">$ Fijo MXN</option>
          </select>
          <input
            type="number"
            placeholder="Usos máx (opcional)"
            value={form.maxUses}
            onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
            className="bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:outline-none"
          />
          <input
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            className="bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:outline-none"
          />
        </div>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        <button type="submit" disabled={saving} className="mt-4 btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Crear código'}
        </button>
      </form>

      {loading ? (
        <AdminSkeleton rows={4} />
      ) : listError ? (
        <AdminErrorState error={listError ?? ''} onRetry={reload} />
      ) : codes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Tag className="w-12 h-12 text-coffee-300 dark:text-coffee-600 mb-4" />
          <p className="text-coffee-500 dark:text-coffee-400">No hay códigos creados.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => {
            const days = c.expiresAt ? daysUntil(c.expiresAt) : null;
            const expired = days !== null && days < 0;
            return (
              <div
                key={c.id}
                className={`flex items-center justify-between px-5 py-4 border ${
                  c.isActive && !expired ? 'bg-coffee-100 dark:bg-coffee-900 border-coffee-200 dark:border-coffee-800' : 'bg-coffee-50/50 dark:bg-coffee-900/50 border-coffee-200/50 dark:border-coffee-800/50 opacity-60'
                }`}
              >
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <span className="font-mono text-gold-500 font-bold tracking-widest">{c.code}</span>
                  <span className="text-coffee-900 dark:text-cream text-sm">
                    {isFixed(c.type) ? `$${c.discount} MXN OFF` : `${c.discount}% OFF`}
                  </span>
                  <span className="text-coffee-600 dark:text-coffee-400 text-xs">
                    {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ''} usos
                  </span>
                  {c.expiresAt && (
                    <span className={`text-xs ${expired ? 'text-red-600 dark:text-red-400' : days !== null && days <= 7 ? 'text-yellow-700 dark:text-yellow-400' : 'text-coffee-500 dark:text-coffee-400'}`}>
                      {expired ? 'Expirado' : days === 0 ? 'Expira hoy' : `Expira en ${days} día${days === 1 ? '' : 's'}`}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => toggle(c.id)} className="text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream transition-colors" aria-label="Activar/desactivar">
                    {c.isActive ? <ToggleRight className="w-5 h-5 text-gold-500" /> : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button onClick={() => setConfirmDelete(c.id)} className="text-coffee-600 dark:text-coffee-400 hover:text-red-400 transition-colors" aria-label="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar código"
        message="¿Estás seguro? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        isDangerous
        loading={deleting}
        onConfirm={() => confirmDelete && remove(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
