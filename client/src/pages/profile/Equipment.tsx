import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Star, Wrench, Upload } from 'lucide-react';
import { baristaApi } from '../../api/barista';
import { uploadsApi } from '../../api';
import { PageMeta } from '../../hooks/usePageMeta';
import EquipmentCard from '../../components/EquipmentCard';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import type { BaristaEquipment } from '../../types';

type FormMode = 'create' | 'edit';

interface FormState {
  name: string;
  brand: string;
  category: string;
  photoUrl: string;
  isFavorite: boolean;
}

const emptyForm: FormState = {
  name: '',
  brand: '',
  category: 'OTHER',
  photoUrl: '',
  isFavorite: false,
};

export default function Equipment() {
  const queryClient = useQueryClient();
  const addToast = useToast((s) => s.add);

  const [modalOpen, setModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['barista-equipment'],
    queryFn: () => baristaApi.listEquipment().then((r) => r.data as BaristaEquipment[]),
  });

  const createMutation = useMutation({
    mutationFn: (d: FormState) => baristaApi.createEquipment(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barista-equipment'] });
      addToast('Equipo agregado', 'success');
      closeModal();
    },
    onError: () => addToast('Error al agregar equipo', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: string; d: Partial<FormState> }) =>
      baristaApi.updateEquipment(id, d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barista-equipment'] });
      addToast('Equipo actualizado', 'success');
      closeModal();
    },
    onError: () => addToast('Error al actualizar equipo', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => baristaApi.deleteEquipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barista-equipment'] });
      addToast('Equipo eliminado', 'success');
      setDeleteTarget(null);
    },
    onError: () => addToast('Error al eliminar equipo', 'error'),
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      baristaApi.updateEquipment(id, { isFavorite }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barista-equipment'] });
    },
  });

  const equipmentList = Array.isArray(data) ? data : [];

  function openCreate() {
    setForm(emptyForm);
    setFormMode('create');
    setEditId(null);
    setModalOpen(true);
  }

  function openEdit(item: BaristaEquipment) {
    setForm({
      name: item.name,
      brand: item.brand ?? '',
      category: item.category,
      photoUrl: item.photoUrl ?? '',
      isFavorite: item.isFavorite,
    });
    setFormMode('edit');
    setEditId(item.id);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setForm(emptyForm);
    setFormMode('create');
    setEditId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (formMode === 'create') {
      createMutation.mutate(form);
    } else if (editId) {
      updateMutation.mutate({ id: editId, d: form });
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadsApi.upload(file);
      setForm((prev) => ({ ...prev, photoUrl: res.data.data.url }));
    } catch {
      addToast('Error al subir foto', 'error');
    } finally {
      setUploading(false);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div>
        <PageMeta title="Equipo" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-coffee-100 dark:bg-coffee-800 animate-pulse">
              <div className="h-36 bg-coffee-200 dark:bg-coffee-700" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-coffee-200 dark:bg-coffee-700 rounded w-3/4" />
                <div className="h-3 bg-coffee-200 dark:bg-coffee-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (isError) {
    return (
      <div className="text-center py-16">
        <PageMeta title="Equipo" />
        <p className="text-red-500 mb-4">Error al cargar equipo</p>
        <button onClick={() => refetch()} className="btn-primary">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageMeta title="Equipo" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-xl text-coffee-900 dark:text-cream">Mi Equipo</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-gold-500 hover:bg-gold-400 text-coffee-950 px-3 py-2 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Añadir equipo
        </button>
      </div>

      {/* Empty state */}
      {equipmentList.length === 0 ? (
        <div className="text-center py-16">
          <Wrench className="w-12 h-12 text-coffee-400 dark:text-coffee-600 mx-auto mb-4" />
          <p className="text-coffee-600 dark:text-coffee-400 mb-4">No tienes equipo registrado</p>
          <button onClick={openCreate} className="btn-primary">
            Añadir equipo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {equipmentList.map((item) => (
            <EquipmentCard
              key={item.id}
              equipment={item}
              onEdit={openEdit}
              onDelete={(id) => setDeleteTarget(id)}
              onToggleFavorite={(id, isFavorite) =>
                toggleFavoriteMutation.mutate({ id, isFavorite })
              }
            />
          ))}
        </div>
      )}

      {/* ── Modal Form ── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.form
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSubmit}
              className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6 max-w-md w-full max-h-[min(90vh,calc(100dvh-8rem))] overflow-y-auto overscroll-contain"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-serif text-lg text-coffee-900 dark:text-cream">
                  {formMode === 'create' ? 'Añadir equipo' : 'Editar equipo'}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Cerrar"
                  className="p-1 text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Name */}
              <div className="mb-4">
                <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-1.5">
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  placeholder="Ej: Baratza Encore"
                  className="w-full bg-coffee-50 dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500 focus:outline-none"
                />
              </div>

              {/* Brand */}
              <div className="mb-4">
                <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-1.5">
                  Marca
                </label>
                <input
                  value={form.brand}
                  onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                  placeholder="Ej: Baratza"
                  className="w-full bg-coffee-50 dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500 focus:outline-none"
                />
              </div>

              {/* Category */}
              <div className="mb-4">
                <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-1.5">
                  Categoría
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full bg-coffee-50 dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500 focus:outline-none"
                >
                  <option value="GRINDER">Molino</option>
                  <option value="KETTLE">Tetera</option>
                  <option value="DRIPPER">Dripper</option>
                  <option value="SCALE">Báscula</option>
                  <option value="OTHER">Otro</option>
                </select>
              </div>

              {/* Photo */}
              <div className="mb-4">
                <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-1.5">
                  Foto
                </label>
                {form.photoUrl ? (
                  <div className="relative">
                    <img src={form.photoUrl} alt="Preview" className="w-full h-28 object-cover" />
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, photoUrl: '' }))}
                      aria-label="Eliminar foto"
                      className="absolute top-1 right-1 p-1 bg-red-600/80 text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-coffee-200 dark:border-coffee-700 p-4 cursor-pointer hover:border-gold-500 transition-colors">
                    <Upload className="w-4 h-4 text-coffee-500" />
                    <span className="text-xs text-coffee-600 dark:text-coffee-400">Subir foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      aria-label="Seleccionar foto"
                    />
                  </label>
                )}
              </div>

              {/* Favorite */}
              <div className="mb-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFavorite}
                    onChange={(e) => setForm((p) => ({ ...p, isFavorite: e.target.checked }))}
                    className="accent-gold-500"
                  />
                  <span className="text-sm text-coffee-700 dark:text-coffee-300 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-gold-500" />
                    Marcar como favorito
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!form.name.trim() || isPending || uploading}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading
                  ? 'Subiendo foto...'
                  : isPending
                    ? 'Guardando...'
                    : formMode === 'create'
                      ? 'Agregar equipo'
                      : 'Guardar cambios'}
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirm ── */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Eliminar equipo"
        description="¿Estás seguro de eliminar este equipo? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
