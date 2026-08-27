/**
 * 12% Brew — Admin: BrewMethod CRUD
 *
 * Mirrors the admin pattern used by Ubicaciones / TiposCata. Self-contained
 * module so it slots in without touching the central Recipes module.
 */

import { useCallback, useEffect, useState } from 'react';
import { Coffee, Plus, Edit2, Trash2 } from 'lucide-react';
import { api } from '@12porciento/shared';
import { useModuleToast } from './context/ModuleContext';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import ConfirmDialog from './components/ConfirmDialog';
import AdminModal from './components/AdminModal';
import FormField from './components/FormField';
import Pagination from './components/Pagination';
import { PageMeta } from '../hooks/usePageMeta';

interface BrewMethod {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  category: string;
  icon: string | null;
  image: string | null;
  difficulty: string;
  defaultRatioMin: number;
  defaultRatioMax: number;
  defaultTemperatureMin: number;
  defaultTemperatureMax: number;
  defaultGrindMin: number | null;
  defaultGrindMax: number | null;
  active: boolean;
  _count?: { recipes: number; brewSessions: number };
}

interface Form {
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  category: string;
  icon: string;
  difficulty: string;
  defaultRatioMin: number;
  defaultRatioMax: number;
  defaultTemperatureMin: number;
  defaultTemperatureMax: number;
  defaultGrindMin: number | null;
  defaultGrindMax: number | null;
  active: boolean;
}

const EMPTY_FORM: Form = {
  slug: '',
  name: '',
  description: '',
  shortDescription: '',
  category: 'POUR_OVER',
  icon: '☕',
  difficulty: 'MEDIA',
  defaultRatioMin: 13,
  defaultRatioMax: 18,
  defaultTemperatureMin: 88,
  defaultTemperatureMax: 96,
  defaultGrindMin: null,
  defaultGrindMax: null,
  active: true,
};

const CATEGORIES = [
  { value: 'POUR_OVER', label: 'Vertido' },
  { value: 'IMMERSION', label: 'Inmersión' },
  { value: 'PRESSURE', label: 'Presión' },
  { value: 'STOVETOP', label: 'Estufa' },
  { value: 'COLD', label: 'Frío' },
  { value: 'TRADITIONAL', label: 'Tradicional' },
  { value: 'EVALUATION', label: 'Catación' },
];

const DIFFICULTIES = ['FÁCIL', 'MEDIA', 'DIFÍCIL'];

export default function AdminBrewMethods() {
  const { addToast } = useModuleToast();

  const [items, setItems] = useState<BrewMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BrewMethod | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<BrewMethod | null>(null);

  const fetchItems = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: BrewMethod[]; totalPages: number; total: number }>(
        '/brew/admin/methods',
      );
      const d = res.data;
      setItems(d.data ?? []);
      setTotalPages(d.totalPages ?? 1);
      setTotal(d.total ?? 0);
      setPage(p);
    } catch {
      setError('Error al cargar métodos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(1);
  }, [fetchItems]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(m: BrewMethod) {
    setEditing(m);
    setForm({
      slug: m.slug,
      name: m.name,
      description: m.description ?? '',
      shortDescription: m.shortDescription ?? '',
      category: m.category,
      icon: m.icon ?? '',
      difficulty: m.difficulty,
      defaultRatioMin: m.defaultRatioMin,
      defaultRatioMax: m.defaultRatioMax,
      defaultTemperatureMin: m.defaultTemperatureMin,
      defaultTemperatureMax: m.defaultTemperatureMax,
      defaultGrindMin: m.defaultGrindMin ?? null,
      defaultGrindMax: m.defaultGrindMax ?? null,
      active: m.active,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim() || !form.slug.trim()) {
      addToast('Nombre y slug son requeridos', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        slug: form.slug.trim().toLowerCase().replace(/\s+/g, '-'),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        shortDescription: form.shortDescription.trim() || undefined,
        category: form.category,
        icon: form.icon.trim() || undefined,
        difficulty: form.difficulty,
        defaultRatioMin: form.defaultRatioMin,
        defaultRatioMax: form.defaultRatioMax,
        defaultTemperatureMin: form.defaultTemperatureMin,
        defaultTemperatureMax: form.defaultTemperatureMax,
        defaultGrindMin: form.defaultGrindMin ?? undefined,
        defaultGrindMax: form.defaultGrindMax ?? undefined,
        active: form.active,
      };
      if (editing) {
        await api.put(`/brew/admin/methods/${editing.id}`, payload);
        addToast('Método actualizado', 'success');
      } else {
        await api.post('/brew/admin/methods', payload);
        addToast('Método creado', 'success');
      }
      setShowForm(false);
      fetchItems(page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast(msg || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      await api.delete(`/brew/admin/methods/${confirmDelete.id}`);
      addToast('Método eliminado', 'success');
      setConfirmDelete(null);
      fetchItems(page);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast(msg || 'Error al eliminar', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(m: BrewMethod) {
    try {
      await api.put(`/brew/admin/methods/${m.id}`, { active: !m.active });
      addToast(`${m.name} ${!m.active ? 'activado' : 'desactivado'}`, 'success');
      fetchItems(page);
    } catch {
      addToast('Error al cambiar estado', 'error');
    }
  }

  if (loading) return <AdminSkeleton variant="table" />;
  if (error) return <AdminErrorState message={error} onRetry={() => fetchItems(page)} />;

  return (
    <>
      <PageMeta title="12% Brew — Métodos" />
      <div className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-600 dark:text-gold-400">
              12% Brew
            </p>
            <h1 className="mt-1 font-serif text-2xl text-coffee-900 dark:text-cream sm:text-3xl">
              Métodos de preparación
            </h1>
            <p className="mt-1 text-sm text-coffee-600 dark:text-coffee-400">
              {total} método{total === 1 ? '' : 's'} configurado{total === 1 ? '' : 's'}.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-coffee-900 px-4 py-2 text-sm font-semibold text-cream hover:bg-coffee-800 dark:bg-gold-500 dark:text-coffee-950 dark:hover:bg-gold-400"
          >
            <Plus className="h-4 w-4" /> Nuevo método
          </button>
        </header>

        <div className="overflow-x-auto rounded border border-coffee-200 bg-white dark:border-coffee-800 dark:bg-coffee-950">
          <table className="w-full text-sm">
            <thead className="bg-coffee-50 text-coffee-700 dark:bg-coffee-900 dark:text-coffee-200">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest">
                  Método
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest">
                  Categoría
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest">
                  Ratio
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest">
                  Temp
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-widest">
                  Recetas
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-widest">
                  Sesiones
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-widest">
                  Estado
                </th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-t border-coffee-100 dark:border-coffee-800">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-coffee-100 dark:bg-coffee-800">
                        {m.icon || <Coffee className="h-4 w-4" />}
                      </span>
                      <div>
                        <p className="font-medium text-coffee-900 dark:text-cream">{m.name}</p>
                        <p className="font-mono text-[10px] text-coffee-500">{m.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-coffee-700 dark:text-coffee-300">
                    {CATEGORIES.find((c) => c.value === m.category)?.label ?? m.category}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    1:{m.defaultRatioMin}–1:{m.defaultRatioMax}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {m.defaultTemperatureMin}–{m.defaultTemperatureMax} °C
                  </td>
                  <td className="px-4 py-3 text-center text-xs">{m._count?.recipes ?? 0}</td>
                  <td className="px-4 py-3 text-center text-xs">{m._count?.brewSessions ?? 0}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => toggleActive(m)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                        m.active
                          ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                          : 'bg-coffee-100 text-coffee-600 dark:bg-coffee-800 dark:text-coffee-300'
                      }`}
                    >
                      {m.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(m)}
                        className="p-1.5 text-coffee-500 hover:text-coffee-900 dark:hover:text-cream"
                        aria-label="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(m)}
                        className="p-1.5 text-coffee-500 hover:text-red-600"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-coffee-500">
                    Sin métodos configurados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} onPageChange={fetchItems} />
      </div>

      {/* Form modal */}
      <AdminModal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? `Editar ${editing.name}` : 'Nuevo método'}
        width="max-w-2xl"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Nombre" required>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="admin-input"
            />
          </FormField>
          <FormField label="Slug" required>
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="admin-input font-mono"
              placeholder="v60"
            />
          </FormField>
          <FormField label="Categoría">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="admin-input"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Dificultad">
            <select
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              className="admin-input"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Icono (emoji o URL)">
            <input
              value={form.icon}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              className="admin-input"
              placeholder="☕"
            />
          </FormField>
          <FormField label="Ratio por defecto (mín–máx)">
            <div className="flex gap-2">
              <input
                type="number"
                value={form.defaultRatioMin}
                step={0.5}
                onChange={(e) => setForm({ ...form, defaultRatioMin: parseFloat(e.target.value) })}
                className="admin-input"
              />
              <input
                type="number"
                value={form.defaultRatioMax}
                step={0.5}
                onChange={(e) => setForm({ ...form, defaultRatioMax: parseFloat(e.target.value) })}
                className="admin-input"
              />
            </div>
          </FormField>
          <FormField label="Temperatura por defecto (°C)">
            <div className="flex gap-2">
              <input
                type="number"
                value={form.defaultTemperatureMin}
                onChange={(e) =>
                  setForm({ ...form, defaultTemperatureMin: parseInt(e.target.value) })
                }
                className="admin-input"
              />
              <input
                type="number"
                value={form.defaultTemperatureMax}
                onChange={(e) =>
                  setForm({ ...form, defaultTemperatureMax: parseInt(e.target.value) })
                }
                className="admin-input"
              />
            </div>
          </FormField>
          <FormField label="Descripción corta">
            <input
              value={form.shortDescription}
              onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              className="admin-input"
            />
          </FormField>
          <FormField label="Descripción" fullWidth>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="admin-input"
            />
          </FormField>
          <FormField label="Activo" fullWidth>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
              />
              Visible para usuarios
            </label>
          </FormField>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="border border-coffee-200 px-4 py-2 text-sm dark:border-coffee-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="bg-coffee-900 px-4 py-2 text-sm font-semibold text-cream hover:bg-coffee-800 disabled:opacity-60 dark:bg-gold-500 dark:text-coffee-950 dark:hover:bg-gold-400"
          >
            {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear método'}
          </button>
        </div>
      </AdminModal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar método"
        message={`¿Eliminar "${confirmDelete?.name}"? Las recetas que lo usan perderán el vínculo.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={saving}
      />
    </>
  );
}
