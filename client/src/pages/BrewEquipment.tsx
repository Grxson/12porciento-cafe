import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  Cog,
  Coffee,
  Filter as FilterIcon,
  Flame,
  Loader2,
  Package,
  Pencil,
  Plus,
  Scale,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { api, brewApi } from '@12porciento/shared';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/ui/EmptyState';
import MediaFrame from '../components/ui/MediaFrame';

interface Equipment {
  id: string;
  name: string;
  brand: string | null;
  category: string;
  photoUrl: string | null;
  isFavorite: boolean;
  createdAt: string;
}

const CATEGORIES = [
  { value: 'GRINDER', label: 'Molino' },
  { value: 'DRIPPER', label: 'Dripper / Brewer' },
  { value: 'SCALE', label: 'Báscula' },
  { value: 'KETTLE', label: 'Tetera' },
  { value: 'ESPRESSO_MACHINE', label: 'Máquina espresso' },
  { value: 'FILTER', label: 'Filtro' },
  { value: 'OTHER', label: 'Otro' },
];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  GRINDER: <Cog className="h-7 w-7" />,
  DRIPPER: <Coffee className="h-7 w-7" />,
  SCALE: <Scale className="h-7 w-7" />,
  KETTLE: <Flame className="h-7 w-7" />,
  ESPRESSO_MACHINE: <Coffee className="h-7 w-7" />,
  FILTER: <FilterIcon className="h-7 w-7" />,
  OTHER: <Package className="h-7 w-7" />,
};

interface FormState {
  name: string;
  brand: string;
  category: string;
  photoUrl: string;
}

const EMPTY_FORM: FormState = { name: '', brand: '', category: 'GRINDER', photoUrl: '' };

export default function BrewEquipment() {
  const user = useUser((s) => s.user);
  const addToast = useToast((s) => s.add);

  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    if (!user) return;
    setLoading(true);
    brewApi
      .listEquipment()
      .then((r) => setItems((r.data.data as Equipment[]) ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, [user?.id]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(item: Equipment) {
    setEditing(item);
    setModalOpen(true);
  }

  async function save(form: FormState) {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim() || undefined,
        category: form.category,
        photoUrl: form.photoUrl || undefined,
      };
      if (editing) {
        await brewApi.updateEquipment(editing.id, payload);
        addToast('Equipo actualizado', 'success');
      } else {
        await brewApi.createEquipment(payload);
        addToast('Equipo añadido', 'success');
      }
      setModalOpen(false);
      load();
    } catch {
      addToast('No se pudo guardar', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('¿Eliminar este equipo?')) return;
    try {
      await brewApi.deleteEquipment(id);
      load();
      addToast('Eliminado', 'success');
    } catch {
      addToast('No se pudo eliminar', 'error');
    }
  }

  async function toggleFavorite(item: Equipment) {
    try {
      await brewApi.updateEquipment(item.id, { isFavorite: !item.isFavorite });
      load();
    } catch {
      addToast('No se pudo actualizar', 'error');
    }
  }

  if (!user) {
    return (
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          title="Inicia sesión"
          description="Necesitas una cuenta para registrar tu equipo."
          action={
            <Link to="/login?redirect=/brew/equipo" className="btn-primary">
              Iniciar sesión
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-600 dark:text-gold-400">
              Mi equipo
            </p>
            <h1 className="mt-2 font-serif text-3xl text-coffee-900 dark:text-cream sm:text-4xl">
              Equipo
            </h1>
            <p className="mt-2 text-sm text-coffee-600 dark:text-coffee-400">
              Guarda tu molino, dripper, báscula, tetera… El wizard de preparación lo usa como
              contexto.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Añadir
          </button>
        </header>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-lg bg-coffee-100 dark:bg-coffee-800"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Coffee className="h-10 w-10" />}
            title="Sin equipo"
            description="Añade tu molino y tu dripper para empezar."
            action={
              <button type="button" onClick={openCreate} className="btn-primary">
                Añadir equipo
              </button>
            }
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map((item) => (
              <li
                key={item.id}
                className="group relative overflow-hidden rounded-lg border border-coffee-200 bg-white transition-all hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-md dark:border-coffee-800 dark:bg-coffee-900"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-coffee-100 dark:bg-coffee-800">
                  {item.photoUrl ? (
                    <MediaFrame
                      src={item.photoUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-coffee-400">
                      {CATEGORY_ICON[item.category] ?? <Package className="h-7 w-7" />}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold text-coffee-900 dark:text-cream">
                    {item.name}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] uppercase tracking-widest text-coffee-500">
                    {item.brand ? `${item.brand} · ` : ''}
                    {CATEGORY_LABEL[item.category] ?? item.category}
                  </p>
                </div>
                <div className="absolute right-2 top-2 flex gap-1 rounded-full bg-coffee-950/60 p-1 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => toggleFavorite(item)}
                    className="p-1 text-coffee-200 hover:text-gold-400"
                    aria-label={item.isFavorite ? 'Quitar favorita' : 'Marcar favorita'}
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${item.isFavorite ? 'fill-gold-500 text-gold-500' : ''}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="p-1 text-coffee-200 hover:text-gold-400"
                    aria-label="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(item.id)}
                    className="p-1 text-coffee-200 hover:text-red-400"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {item.isFavorite && (
                  <span className="absolute left-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-gold-500 text-coffee-950">
                    <Star className="h-3 w-3 fill-coffee-950" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {modalOpen && (
        <EquipmentModal
          initial={
            editing
              ? {
                  name: editing.name,
                  brand: editing.brand ?? '',
                  category: editing.category,
                  photoUrl: editing.photoUrl ?? '',
                }
              : EMPTY_FORM
          }
          saving={saving}
          onCancel={() => setModalOpen(false)}
          onSave={save}
        />
      )}
    </div>
  );
}

function EquipmentModal({
  initial,
  saving,
  onCancel,
  onSave,
}: {
  initial: FormState;
  saving: boolean;
  onCancel: () => void;
  onSave: (form: FormState) => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const r = await api.post<{ data: { url: string } }>('/uploads', fd);
      setForm((f) => ({ ...f, photoUrl: r.data.data.url }));
    } catch {
      // upload endpoint response shape mismatched? show generic error in caller
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-coffee-950/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto border border-coffee-200 bg-white p-6 shadow-2xl dark:border-coffee-800 dark:bg-coffee-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl text-coffee-900 dark:text-cream">
            {initial.name ? 'Editar equipo' : 'Nuevo equipo'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-coffee-400 hover:text-coffee-900 dark:hover:text-cream"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
          className="space-y-3"
        >
          {form.photoUrl ? (
            <div className="relative overflow-hidden rounded-lg">
              <MediaFrame
                src={form.photoUrl}
                alt="Foto del equipo"
                className="aspect-[4/3] w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, photoUrl: '' }))}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-coffee-950/60 text-cream hover:bg-coffee-950"
                aria-label="Quitar foto"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="grid aspect-[4/3] w-full cursor-pointer place-items-center rounded-lg border border-dashed border-coffee-300 bg-coffee-50 text-center text-xs text-coffee-500 transition-colors hover:border-gold-400 dark:border-coffee-700 dark:bg-coffee-950">
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <span className="inline-flex flex-col items-center gap-1">
                  <Camera className="h-6 w-6" />
                  Foto (opcional)
                </span>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          )}

          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-coffee-500">
              Nombre
            </span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Timemore C3"
              required
              className="mt-1 w-full border border-coffee-200 bg-coffee-50 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 dark:border-coffee-700 dark:bg-coffee-950"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-coffee-500">
              Marca (opcional)
            </span>
            <input
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              placeholder="Timemore"
              className="mt-1 w-full border border-coffee-200 bg-coffee-50 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 dark:border-coffee-700 dark:bg-coffee-950"
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-coffee-500">
              Categoría
            </span>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1 w-full border border-coffee-200 bg-coffee-50 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500 dark:border-coffee-700 dark:bg-coffee-950"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || uploading}
              className="btn-primary disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="border border-coffee-200 px-4 py-2 text-sm dark:border-coffee-700"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
