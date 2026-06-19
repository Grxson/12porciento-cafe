import { useEffect, useRef, useState } from 'react';
import { Award, Edit3, Plus, Trash2 } from 'lucide-react';
import { PageMeta } from '../hooks/usePageMeta';
import { achievementsApi } from '../api';
import { useModuleToast } from './context/ModuleContext';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import AdminModal from './components/AdminModal';
import FormField from './components/FormField';
import ConfirmDialog from './components/ConfirmDialog';

interface Achievement {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  rarity: string;
  xpReward: number;
  unlockedAt?: string | null;
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  icon: string;
  rarity: string;
  xpReward: number;
}

const emptyForm: FormData = {
  name: '',
  slug: '',
  description: '',
  icon: '🏆',
  rarity: 'COMMON',
  xpReward: 20,
};

const rarityBadge = (rarity: string) => {
  const styles: Record<string, string> = {
    COMMON: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    RARE: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    EPIC: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    LEGENDARY: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  };
  return styles[rarity] ?? styles.COMMON;
};

const slugFrom = (name: string) =>
  name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

export default function Achievements() {
  const { addToast } = useModuleToast();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const slugEdited = useRef(false);

  const load = () => {
    setLoading(true);
    setListError('');
    achievementsApi.list()
      .then((r) => {
        const list = (r.data?.achievements ?? []).sort(
          (a: Achievement, b: Achievement) => a.xpReward - b.xpReward,
        );
        setAchievements(list);
      })
      .catch(() => {
        setListError('Error al cargar logros');
        addToast('Error al cargar logros', 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    slugEdited.current = false;
    setError('');
    setModalOpen(true);
  };

  const openEdit = (a: Achievement) => {
    setEditing(a);
    setForm({
      name: a.name,
      slug: a.slug,
      description: a.description ?? '',
      icon: a.icon ?? '🏆',
      rarity: a.rarity,
      xpReward: a.xpReward,
    });
    slugEdited.current = true;
    setError('');
    setModalOpen(true);
  };

  const handleNameChange = (value: string | number) => {
    const name = String(value);
    setForm((prev) => ({
      ...prev,
      name,
      slug: slugEdited.current ? prev.slug : slugFrom(name),
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('El nombre es requerido');
      addToast('El nombre es requerido', 'error');
      return;
    }
    if (!form.slug.trim()) {
      setError('El slug es requerido');
      addToast('El slug es requerido', 'error');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
        icon: form.icon.trim() || undefined,
        rarity: form.rarity,
        xpReward: form.xpReward,
      };
      if (editing) {
        await achievementsApi.update(editing.id, payload);
        addToast('Logro actualizado', 'success');
      } else {
        await achievementsApi.create(payload);
        addToast('Logro creado', 'success');
      }
      setModalOpen(false);
      load();
    } catch (e: any) {
      const msg = e.response?.data?.error || 'Error al guardar logro';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setDeleting(true);
    try {
      await achievementsApi.delete(id);
      addToast('Logro eliminado', 'success');
      load();
    } catch {
      addToast('Error al eliminar', 'error');
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  };

  return (
    <div className="p-8">
      <PageMeta title="Logros" noSuffix />
      <div className="flex items-center gap-3 mb-8">
        <Award className="w-6 h-6 text-gold-500" />
        <div>
          <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Logros</h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mt-1">{achievements.length} logros</p>
        </div>
      </div>

      <button onClick={openCreate} className="btn-primary flex items-center gap-2 mb-8">
        <Plus className="w-4 h-4" />
        Crear Logro
      </button>

      {loading ? (
        <AdminSkeleton rows={4} />
      ) : listError ? (
        <AdminErrorState error={listError} onRetry={load} />
      ) : achievements.length === 0 ? (
        <p className="text-center text-coffee-500 py-10">No hay logros creados.</p>
      ) : (
        <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-coffee-200 dark:border-coffee-800 text-coffee-600 dark:text-coffee-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Icono</th>
                <th className="text-left px-4 py-3 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 font-medium">Slug</th>
                <th className="text-left px-4 py-3 font-medium">Rareza</th>
                <th className="text-left px-4 py-3 font-medium">XP</th>
                <th className="text-left px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {achievements.map((a) => (
                <tr key={a.id} className="border-b border-coffee-200 dark:border-coffee-800 hover:bg-coffee-200/50 dark:hover:bg-coffee-800/30">
                  <td className="px-4 py-3 text-xl">{a.icon || '🏆'}</td>
                  <td className="px-4 py-3 text-coffee-900 dark:text-cream font-medium">{a.name}</td>
                  <td className="px-4 py-3 text-coffee-600 dark:text-coffee-400 font-mono text-xs">{a.slug}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium ${rarityBadge(a.rarity)}`}>
                      {a.rarity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-coffee-900 dark:text-cream">{a.xpReward}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(a)} className="text-coffee-600 dark:text-coffee-400 hover:text-gold-500 transition-colors" aria-label="Editar">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setConfirmDelete(a.id)} className="text-coffee-600 hover:text-red-400 transition-colors" aria-label="Eliminar">
                        <Trash2 className="w-4 h-4" />
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
        title={editing ? 'Editar Logro' : 'Crear Logro'}
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
              form="achievement-form"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-coffee-950 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
            </button>
          </>
        }
      >
        <form id="achievement-form" onSubmit={submit}>
          <FormField
            label="Nombre"
            value={form.name}
            onChange={handleNameChange}
            required
          />
          <FormField
            label="Slug"
            value={form.slug}
            onChange={(v) => {
              slugEdited.current = true;
              setForm((prev) => ({ ...prev, slug: String(v) }));
            }}
          />
          <FormField
            label="Descripción"
            value={form.description}
            onChange={(v) => setForm((prev) => ({ ...prev, description: String(v) }))}
            type="textarea"
            rows={3}
          />
          <FormField
            label="Icono (emoji)"
            value={form.icon}
            onChange={(v) => setForm((prev) => ({ ...prev, icon: String(v) }))}
          />
          <FormField
            label="Rareza"
            value={form.rarity}
            onChange={(v) => setForm((prev) => ({ ...prev, rarity: String(v) }))}
            type="select"
            options={[
              { label: 'COMMON', value: 'COMMON' },
              { label: 'RARE', value: 'RARE' },
              { label: 'EPIC', value: 'EPIC' },
              { label: 'LEGENDARY', value: 'LEGENDARY' },
            ]}
          />
          <FormField
            label="XP"
            value={form.xpReward}
            onChange={(v) => setForm((prev) => ({ ...prev, xpReward: Number(v) }))}
            type="number"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </form>
      </AdminModal>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar logro"
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
