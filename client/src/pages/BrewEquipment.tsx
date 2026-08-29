import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Star, Coffee } from 'lucide-react';
import { brewApi } from '@12porciento/shared';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import EmptyState from '../components/ui/EmptyState';

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

export default function BrewEquipment() {
  const user = useUser((s) => s.user);
  const addToast = useToast((s) => s.add);

  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', brand: '', category: 'GRINDER' });

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await brewApi.createEquipment({
        name: form.name,
        brand: form.brand || undefined,
        category: form.category,
      });
      setForm({ name: '', brand: '', category: 'GRINDER' });
      setShowForm(false);
      load();
      addToast('Equipo añadido', 'success');
    } catch {
      addToast('No se pudo añadir', 'error');
    }
  }

  async function remove(id: string) {
    if (!window.confirm('¿Eliminar?')) return;
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
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-600 dark:text-gold-400">
              Mi equipo
            </p>
            <h1 className="mt-2 font-serif text-3xl text-coffee-900 dark:text-cream sm:text-4xl">
              Equipo
            </h1>
            <p className="mt-2 text-sm text-coffee-600 dark:text-coffee-400">
              Guarda tu molino, dripper, báscula, tetera, etc.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Añadir
          </button>
        </header>

        {showForm && (
          <form
            onSubmit={submit}
            className="mb-6 space-y-3 border border-coffee-200 bg-white p-5 dark:border-coffee-800 dark:bg-coffee-900"
          >
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
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border border-coffee-200 px-4 py-2 text-sm dark:border-coffee-700"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded bg-coffee-100 dark:bg-coffee-800"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Coffee className="h-10 w-10" />}
            title="Sin equipo"
            description="Añade tu molino y tu dripper para empezar."
          />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 border border-coffee-200 bg-white p-3 dark:border-coffee-800 dark:bg-coffee-900 sm:p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-coffee-900 dark:text-cream">
                    {item.name}
                    {item.brand && <span className="text-coffee-500"> · {item.brand}</span>}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-coffee-500">
                    {CATEGORY_LABEL[item.category] ?? item.category}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFavorite(item)}
                  className="p-2 text-coffee-400 hover:text-gold-500"
                  aria-label={item.isFavorite ? 'Quitar favorita' : 'Marcar favorita'}
                >
                  <Star
                    className={`h-4 w-4 ${item.isFavorite ? 'fill-gold-500 text-gold-500' : ''}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="p-2 text-coffee-400 hover:text-red-500"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
