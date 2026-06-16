import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Package, X } from 'lucide-react';
import { bundlesApi, productsApi } from '../api';
import type { Bundle, Product } from '../types';
import { useModuleList } from './hooks/useModuleList';
import { useModuleToast } from './context/ModuleContext';
import ConfirmDialog from './components/ConfirmDialog';
import FormField from './components/FormField';
import ImageUploader from './components/ImageUploader';
import AdminModal from './components/AdminModal';

// ── types ──────────────────────────────────────────────────────────────────
type ModalMode = 'add' | 'edit';

interface FormItem {
  productId: string;
  quantity: number;
}

interface FormState {
  name: string;
  description: string;
  basePrice: number | '';
  discountPct: number | '';
  imageUrl: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  basePrice: '',
  discountPct: 0,
  imageUrl: '',
  isActive: true,
};

// ── component ──────────────────────────────────────────────────────────────
export default function AdminBundles() {
  const { addToast } = useModuleToast();

  const fetchList = useCallback(() => bundlesApi.list(), []);
  const createItem = useCallback((data: any) => bundlesApi.create(data), []);
  const updateItem = useCallback((id: string, data: any) => bundlesApi.update(id, data), []);
  const deleteItem = useCallback((id: string) => bundlesApi.delete(id), []);

  const {
    items: bundles,
    loading,
    create,
    update,
    delete: remove,
  } = useModuleList<Bundle>(fetchList, createItem, updateItem, deleteItem, {
    onSuccess: (_action, msg) => addToast(msg ?? 'Operación exitosa', 'success'),
    onError: (msg) => addToast(msg, 'error'),
  });

  // ── products for selector ────────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    productsApi
      .adminList()
      .then((res) => setProducts((res.data as Product[]) || []))
      .catch(() => addToast('No se pudieron cargar los productos', 'error'));
  }, []);

  // ── modal state ──────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editTarget, setEditTarget] = useState<Bundle | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formItems, setFormItems] = useState<FormItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [nameError, setNameError] = useState('');
  const [priceError, setPriceError] = useState('');

  // ── delete confirm ───────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Bundle | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── helpers ──────────────────────────────────────────────────────────────
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setFormItems([]);
    setSelectedProductId('');
    setNameError('');
    setPriceError('');
    setEditTarget(null);
    setModalMode('add');
    setModalOpen(true);
  };

  const openEdit = (bundle: Bundle) => {
    setForm({
      name: bundle.name,
      description: bundle.description,
      basePrice: bundle.basePrice,
      discountPct: bundle.discountPct,
      imageUrl: bundle.imageUrl ?? '',
      isActive: bundle.isActive,
    });
    setFormItems([]);
    setSelectedProductId('');
    setNameError('');
    setPriceError('');
    setEditTarget(bundle);
    setModalMode('edit');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditTarget(null);
  };

  // ── item selector actions ────────────────────────────────────────────────
  const addItem = () => {
    if (!selectedProductId) return;
    if (formItems.some((fi) => fi.productId === selectedProductId)) {
      addToast('Ese producto ya está en el bundle', 'info');
      return;
    }
    setFormItems((prev) => [...prev, { productId: selectedProductId, quantity: 1 }]);
    setSelectedProductId('');
  };

  const updateItemQty = (productId: string, quantity: number) => {
    setFormItems((prev) =>
      prev.map((fi) => (fi.productId === productId ? { ...fi, quantity } : fi)),
    );
  };

  const removeItem = (productId: string) => {
    setFormItems((prev) => prev.filter((fi) => fi.productId !== productId));
  };

  // ── save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    let valid = true;

    if (!form.name.trim()) {
      setNameError('El nombre es requerido');
      valid = false;
    } else {
      setNameError('');
    }

    if (!form.basePrice || Number(form.basePrice) <= 0) {
      setPriceError('El precio base debe ser mayor a 0');
      valid = false;
    } else {
      setPriceError('');
    }

    if (modalMode === 'add' && formItems.length === 0) {
      addToast('Agrega al menos un producto al bundle', 'error');
      valid = false;
    }

    if (!valid) return;

    setSaving(true);
    try {
      if (modalMode === 'add') {
        await create({
          name: form.name.trim(),
          description: form.description.trim(),
          basePrice: Number(form.basePrice),
          discountPct: Number(form.discountPct) || 0,
          imageUrl: form.imageUrl.trim() || undefined,
          items: formItems,
        });
      } else if (editTarget) {
        await update(editTarget.id, {
          name: form.name.trim(),
          description: form.description.trim(),
          basePrice: Number(form.basePrice),
          discountPct: Number(form.discountPct) || 0,
          imageUrl: form.imageUrl.trim() || undefined,
          isActive: form.isActive,
        });
      }
      closeModal();
    } catch {
      // error already toasted by useModuleList
    } finally {
      setSaving(false);
    }
  };

  // ── toggle active ─────────────────────────────────────────────────────────
  const toggleActive = async (bundle: Bundle) => {
    try {
      await update(bundle.id, {
        name: bundle.name,
        description: bundle.description,
        basePrice: bundle.basePrice,
        discountPct: bundle.discountPct,
        imageUrl: bundle.imageUrl,
        isActive: !bundle.isActive,
      });
    } catch {
      // already toasted
    }
  };

  // ── confirm delete ────────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await remove(deleteTarget.id);
    } catch {
      // already toasted
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Bundles</h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mt-1">{bundles.length} paquetes configurados</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Nuevo bundle
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
        </div>
      ) : bundles.length === 0 ? (
        <div className="text-center py-20 text-coffee-500">
          <Package size={40} className="mx-auto mb-4 text-coffee-700" />
          <p>No hay bundles configurados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bundles.map((bundle) => (
            <div
              key={bundle.id}
              className={`bg-coffee-100 dark:bg-coffee-900 border ${bundle.isActive ? 'border-coffee-200 dark:border-coffee-800' : 'border-coffee-200 dark:border-coffee-800 opacity-60'} p-5`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-serif text-lg text-coffee-900 dark:text-cream">{bundle.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {bundle.discountPct > 0 && (
                      <span className="bg-gold-500/20 text-gold-400 text-xs px-2 py-0.5">
                        {bundle.discountPct}% OFF
                      </span>
                    )}
                    {!bundle.isActive && (
                      <span className="bg-coffee-200 dark:bg-coffee-800 text-coffee-600 dark:text-coffee-400 text-xs px-2 py-0.5">
                        Inactivo
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(bundle)}
                    className="text-xs text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream border border-coffee-200 dark:border-coffee-700 px-2 py-1 transition-colors"
                  >
                    {bundle.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => openEdit(bundle)}
                    className="text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream p-1 transition-colors"
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(bundle)}
                    className="text-red-400 hover:text-red-300 p-1 transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-4">{bundle.description}</p>

              <div className="space-y-1 mb-4">
                {bundle.items.map((item) => (
                  <div key={item.id} className="text-xs text-coffee-700 dark:text-coffee-300 flex justify-between">
                    <span>
                      • {item.quantity > 1 ? `${item.quantity}x ` : ''}
                      {item.product.name}
                    </span>
                    <span className="text-coffee-500">${item.product.price}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-coffee-200 dark:border-coffee-800 pt-3 flex items-end justify-between">
                <div>
                  <p className="text-coffee-500 text-xs line-through">
                    ${bundle.basePrice.toLocaleString()}
                  </p>
                  <p className="text-gold-500 text-lg font-semibold">
                    ${bundle.finalPrice.toLocaleString()}
                  </p>
                </div>
                <div className="text-xs text-green-400">
                  Ahorro: ${(bundle.basePrice - bundle.finalPrice).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ──────────────────────────────────────────── */}
      <AdminModal
        open={modalOpen}
        title={modalMode === 'add' ? 'Nuevo bundle' : 'Editar bundle'}
        onClose={closeModal}
        footer={
          <>
            <button
              onClick={closeModal}
              disabled={saving}
              className="flex-1 px-4 py-2 border border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 text-sm hover:text-coffee-900 dark:hover:text-cream transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-coffee-950 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : modalMode === 'add' ? 'Crear bundle' : 'Guardar cambios'}
            </button>
          </>
        }
      >
            {/* Base fields */}
            <div className="space-y-4">
              <FormField
                label="Nombre"
                value={form.name}
                onChange={(v) => setField('name', String(v))}
                required
                placeholder="Ej. Pack Espresso Clásico"
                error={nameError}
              />

              <FormField
                label="Descripción"
                value={form.description}
                onChange={(v) => setField('description', String(v))}
                type="textarea"
                placeholder="Breve descripción del bundle..."
                rows={3}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label="Precio base"
                  value={form.basePrice}
                  onChange={(v) => setField('basePrice', v === '' ? '' : Number(v))}
                  type="number"
                  required
                  placeholder="0"
                  error={priceError}
                />
                <FormField
                  label="Descuento (%)"
                  value={form.discountPct}
                  onChange={(v) => setField('discountPct', v === '' ? '' : Number(v))}
                  type="number"
                  placeholder="0"
                />
              </div>

              <ImageUploader
                label="Imagen del bundle"
                value={form.imageUrl}
                onChange={(url) => setField('imageUrl', url)}
              />

              {/* isActive toggle — edit only */}
              {modalMode === 'edit' && (
                <div className="flex items-center gap-3">
                  <label className="text-xs text-coffee-400">Estado</label>
                  <button
                    type="button"
                    onClick={() => setField('isActive', !form.isActive)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      form.isActive ? 'bg-gold-500' : 'bg-coffee-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        form.isActive ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-xs text-coffee-300">
                    {form.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              )}

              {/* ── Item selector (add mode only) ─────────────────────── */}
              {modalMode === 'add' && (
                <div className="border-t border-coffee-800 pt-4">
                  <p className="text-xs text-coffee-400 mb-3">Productos del bundle *</p>

                  {/* Selector row */}
                  <div className="flex gap-2 mb-3">
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="flex-1 bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                    >
                      <option value="">-- Seleccionar producto --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ${p.price}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addItem}
                      disabled={!selectedProductId}
                      className="px-3 py-2 bg-gold-500 hover:bg-gold-600 text-coffee-950 text-sm font-semibold disabled:opacity-40 transition-colors"
                    >
                      Agregar
                    </button>
                  </div>

                  {/* Chosen items */}
                  {formItems.length === 0 ? (
                    <p className="text-xs text-coffee-600 italic">Ningún producto agregado aún.</p>
                  ) : (
                    <div className="space-y-2">
                      {formItems.map((fi) => {
                        const product = products.find((p) => p.id === fi.productId);
                        return (
                          <div
                            key={fi.productId}
                            className="flex items-center gap-2 bg-coffee-800 border border-coffee-700 px-3 py-2"
                          >
                            <span className="flex-1 text-xs text-coffee-300 truncate">
                              {product?.name}
                              <span className="text-coffee-500 ml-2">${product?.price}</span>
                            </span>
                            <input
                              type="number"
                              min={1}
                              value={fi.quantity}
                              onChange={(e) =>
                                updateItemQty(fi.productId, Math.max(1, Number(e.target.value)))
                              }
                              className="w-14 bg-coffee-700 border border-coffee-600 text-cream text-xs text-center px-2 py-1 focus:outline-none focus:border-gold-500"
                            />
                            <button
                              type="button"
                              onClick={() => removeItem(fi.productId)}
                              className="text-red-400 hover:text-red-300 transition-colors ml-1"
                              aria-label="Quitar producto"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Edit-mode read-only items note */}
              {modalMode === 'edit' && editTarget && (
                <div className="border-t border-coffee-800 pt-4">
                  <p className="text-xs text-coffee-500 italic mb-2">
                    Los productos del paquete no se pueden editar después de crearlo.
                  </p>
                  <div className="space-y-1">
                    {editTarget.items.map((item) => (
                      <div key={item.id} className="text-xs text-coffee-400 flex justify-between">
                        <span>
                          {item.quantity > 1 ? `${item.quantity}x ` : ''}
                          {item.product.name}
                        </span>
                        <span className="text-coffee-600">${item.product.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
      </AdminModal>

      {/* ── Delete ConfirmDialog ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar bundle"
        message={`¿Eliminar el bundle "${deleteTarget?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        isDangerous
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
