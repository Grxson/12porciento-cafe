import { useEffect, useState } from 'react';
import {
  Search,
  ShoppingBag,
  Plus,
  Edit2,
  Trash2,
  Star,
  ToggleLeft,
  ToggleRight,
  Tag,
  ChevronDown,
  Download,
} from 'lucide-react';
import AdminModal from './components/AdminModal';
import ConfirmDialog from './components/ConfirmDialog';
import ImageUploader from './components/ImageUploader';
import GalleryUploader from './components/GalleryUploader';
import { resolveImageUrl } from './utils/imageUrl';
import { useModuleToast } from './context/ModuleContext';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import Pagination from './components/Pagination';
import { PageMeta } from '../hooks/usePageMeta';
import { getApiError } from '../lib/api-error';
import { exportToCsv } from './utils/csvExport';
import SearchableCaficultorSelect from '../components/SearchableCaficultorSelect';
import ProductVersionsSection from './components/ProductVersionsSection';
import type { Product } from '../types';
import { useProductsQuery } from './hooks/useProductsQuery';

const emptyForm = {
  name: '',
  slug: '',
  category: 'CAFÉ',
  origin: 'México',
  region: '',
  altitude: '' as string | number,
  variety: '',
  process: '',
  scaScore: '' as string | number,
  roastLevel: '',
  flavors: '',
  price: 0,
  weight: '' as string | number,
  stock: 0,
  imageUrl: '',
  images: [] as string[],
  description: '',
  isLimited: false,
  isActive: true,
  producer: '',
  farmName: '',
  harvestYear: '' as string | number,
  certifications: '',
  body: '',
  acidity: '',
  processingDescription: '',
  recommendedBrewMethod: '',
  brewTemperature: '' as string | number,
  brewRatio: '',
  grindSize: '',
  tastingNotes: '',
  pairingSuggestions: '',
  isMemberExclusive: false,
  caficultorId: '',
};

const categoryLabels: Record<string, string> = {
  CAFÉ: 'Café',
  ACCESORIOS: 'Accesorios',
  MERCH: 'Merch',
};

export default function AdminProducts() {
  const { addToast } = useModuleToast();
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState('TODOS');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [formError, setFormError] = useState('');
  const [page, setPage] = useState(1);
  const [showCoffeeProfile, setShowCoffeeProfile] = useState(false);
  const [filters, setFilters] = useState({ caficultorId: '' });

  const {
    products,
    total,
    totalPages,
    loading,
    error: loadError,
    refetch,
    create,
    update,
    remove,
    bulkUpdateActive,
    saving,
    deleting,
    bulkBusy,
  } = useProductsQuery({
    page,
    search: debouncedSearch,
    category: catFilter,
    caficultorId: filters.caficultorId,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditId(null);
    setModal('add');
    setShowCoffeeProfile(false);
  };

  const openEdit = (p: Product) => {
    const certStr = p.certifications
      ? typeof p.certifications === 'string'
        ? JSON.parse(p.certifications).join(', ')
        : (p.certifications as string[]).join(', ')
      : '';
    const whitelisted = Object.fromEntries(
      Object.keys(emptyForm).map((key) => [key, (p as unknown as Record<string, unknown>)[key]]),
    ) as typeof emptyForm;
    setForm({
      ...whitelisted,
      flavors: (p.flavors || []).join(', '),
      altitude: p.altitude ?? '',
      scaScore: p.scaScore ?? '',
      weight: p.weight ?? '',
      images: p.images ?? [],
      harvestYear: p.harvestYear ?? '',
      brewTemperature: p.brewTemperature ?? '',
      certifications: certStr,
    } as typeof emptyForm);
    setEditId(p.id);
    setModal('edit');
    setShowCoffeeProfile(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.name || form.name.trim().length < 2) {
      setFormError('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    if (!form.price || form.price <= 0) {
      setFormError('El precio debe ser mayor a 0.');
      return;
    }
    if (form.stock === undefined || form.stock < 0) {
      setFormError('El stock no puede ser negativo.');
      return;
    }
    const data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
      ...form,
      flavors:
        form.category === 'CAFÉ'
          ? form.flavors
              .split(',')
              .map((f: string) => f.trim())
              .filter(Boolean)
          : [],
      altitude: form.altitude !== '' ? Number(form.altitude) : undefined,
      scaScore: form.scaScore !== '' ? Number(form.scaScore) : undefined,
      weight: form.weight !== '' ? Number(form.weight) : undefined,
      harvestYear: form.harvestYear !== '' ? Number(form.harvestYear) : undefined,
      brewTemperature: form.brewTemperature !== '' ? Number(form.brewTemperature) : undefined,
      certifications: form.certifications
        ? JSON.stringify(
            form.certifications
              .split(',')
              .map((c: string) => c.trim())
              .filter(Boolean),
          )
        : undefined,
    };
    try {
      if (modal === 'add') await create(data);
      else if (editId) await update({ id: editId, payload: data });
      setModal(null);
    } catch (err: unknown) {
      setFormError(getApiError(err, 'Error al guardar el producto.'));
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await remove(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch {
      addToast('Error al eliminar producto', 'error');
    }
  };

  const toggleActive = async (p: Product) => {
    try {
      await update({ id: p.id, payload: { isActive: !p.isActive } });
      addToast(`${p.name} ${!p.isActive ? 'activado' : 'desactivado'}`, 'success');
    } catch {
      addToast('Error al cambiar estado', 'error');
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === products.length) setSelected(new Set());
    else setSelected(new Set(products.map((p) => p.id)));
  };

  const handleBulkActive = async (active: boolean) => {
    const { success, fail } = await bulkUpdateActive({ ids: [...selected], isActive: active });
    if (success > 0)
      addToast(
        `${success} producto${success !== 1 ? 's' : ''} ${active ? 'activado' : 'desactivado'}${success !== 1 ? 's' : ''}`,
        'success',
      );
    if (fail > 0) addToast(`${fail} producto${fail !== 1 ? 's' : ''} fallaron`, 'error');
    setSelected(new Set());
  };

  const isCafe = form.category === 'CAFÉ';

  return (
    <div>
      <PageMeta title="Productos" noSuffix />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Productos</h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mt-1">{total} en catálogo</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              exportToCsv(products, 'productos', [
                { key: 'name', label: 'Nombre' },
                { key: 'category', label: 'Categoría' },
                { key: 'price', label: 'Precio' },
                { key: 'stock', label: 'Stock' },
                { key: 'sku', label: 'SKU' },
                { key: 'isActive', label: 'Activo' },
                { key: 'isLimited', label: 'Limitado' },
                { key: 'createdAt', label: 'Creado' },
              ])
            }
            className="flex items-center gap-1.5 px-3 py-2 border border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 text-sm hover:text-coffee-900 dark:hover:text-cream transition-colors"
            title="Exportar CSV"
          >
            <Download size={14} /> CSV
          </button>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-gold-500 text-coffee-950 text-sm font-medium hover:bg-gold-400 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-gold-500/50"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6">
        {['TODOS', 'CAFÉ', 'ACCESORIOS', 'MERCH'].map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setCatFilter(cat);
              setPage(1);
              setSelected(new Set());
            }}
            className={`text-xs px-3 py-1.5 border transition-all ${
              catFilter === cat
                ? 'border-gold-500 text-gold-500 bg-gold-500/10'
                : 'border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-400 dark:hover:border-coffee-500'
            }`}
          >
            {cat === 'TODOS' ? 'Todos' : categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Caficultor filter */}
      <div className="mb-6 max-w-xs">
        <SearchableCaficultorSelect
          value={filters.caficultorId || ''}
          onChange={(id) => {
            setFilters((f) => ({ ...f, caficultorId: id || '' }));
            setPage(1);
            setSelected(new Set());
          }}
          placeholder="Filtrar por caficultor"
        />
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-coffee-50 dark:bg-coffee-800/50 border border-coffee-200 dark:border-coffee-700">
          <span className="text-sm text-coffee-700 dark:text-coffee-300">
            {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => handleBulkActive(true)}
            disabled={bulkBusy}
            className="text-xs bg-green-600 dark:bg-green-500 text-white px-3 py-1 hover:bg-green-500 dark:hover:bg-green-400 disabled:opacity-50"
          >
            Activar
          </button>
          <button
            onClick={() => handleBulkActive(false)}
            disabled={bulkBusy}
            className="text-xs bg-red-600 text-white px-3 py-1 hover:bg-red-500 disabled:opacity-50"
          >
            Desactivar
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-coffee-500 hover:text-coffee-700 dark:hover:text-cream ml-auto"
          >
            Limpiar
          </button>
        </div>
      )}

      {loading ? (
        <AdminSkeleton rows={4} />
      ) : loadError ? (
        <AdminErrorState
          error="Error al cargar productos. Intenta de nuevo."
          onRetry={() => refetch()}
        />
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingBag className="w-12 h-12 text-coffee-300 dark:text-coffee-600 mb-4" />
          <p className="text-coffee-500 dark:text-coffee-400">No hay productos con este filtro.</p>
        </div>
      ) : (
        <>
          <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-coffee-200 dark:border-coffee-800">
                    <th className="w-8 px-4 py-3">
                      <input
                        type="checkbox"
                        onChange={toggleSelectAll}
                        checked={selected.size === products.length && products.length > 0}
                        className="w-4 h-4 rounded border-coffee-400 dark:border-coffee-500 text-gold-500 focus:ring-gold-500"
                      />
                    </th>
                    {[
                      'Producto',
                      'Categoría',
                      'Info',
                      'Caficultor',
                      'Precio',
                      'Stock',
                      'Estado',
                      '',
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-coffee-200/50 dark:border-coffee-800/50 hover:bg-coffee-200/30 dark:hover:bg-coffee-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(p.id)}
                          onChange={() => toggleSelect(p.id)}
                          className="w-4 h-4 rounded border-coffee-400 dark:border-coffee-500 text-gold-500 focus:ring-gold-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={resolveImageUrl(p.imageUrl)}
                            alt={p.name}
                            className="w-10 h-10 object-cover shrink-0"
                          />
                          <div>
                            <p className="text-coffee-900 dark:text-cream font-medium">{p.name}</p>
                            {p.isLimited && <span className="text-xs text-red-400">Limitado</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs border border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 px-2 py-0.5">
                          {categoryLabels[p.category] ?? p.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-coffee-700 dark:text-coffee-300 text-xs">
                        {p.category === 'CAFÉ' && p.scaScore ? (
                          <span className="sca-badge">
                            <Star className="w-3 h-3 fill-gold-500 text-gold-500" /> {p.scaScore}
                          </span>
                        ) : (
                          <span className="text-coffee-500">{p.region || '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-coffee-600 dark:text-coffee-400 text-xs">
                        {p.caficultor?.nombre || (
                          <span className="text-coffee-400 dark:text-coffee-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gold-500 font-medium">${p.price}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-medium ${p.stock <= 5 ? 'text-red-600 dark:text-red-400' : p.stock <= 15 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleActive(p)} className="transition-colors">
                          {p.isActive ? (
                            <ToggleRight className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-coffee-600 dark:text-coffee-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="text-coffee-400 dark:text-coffee-500 hover:text-gold-500 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
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
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Eliminar producto"
        message={`¿Eliminar "${deleteConfirm?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isDangerous
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Modal */}
      <AdminModal
        open={!!modal}
        title={modal === 'add' ? 'Agregar producto' : 'Editar producto'}
        onClose={() => setModal(null)}
        maxWidth="max-w-2xl"
        footer={
          <div className="flex gap-3 w-full">
            <button
              type="submit"
              form="product-form"
              disabled={saving}
              className="px-4 py-2 bg-gold-500 text-coffee-950 text-sm font-medium hover:bg-gold-400 transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : modal === 'add' ? 'Agregar producto' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              onClick={() => setModal(null)}
              className="px-4 py-2 border border-coffee-200 dark:border-coffee-700 text-coffee-700 dark:text-coffee-300 text-sm hover:bg-coffee-200 dark:hover:bg-coffee-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        }
      >
        <form
          id="product-form"
          onSubmit={handleSubmit}
          className="space-y-4"
          onReset={() => setFormError('')}
        >
          {/* Category */}
          <div>
            <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5">
              Categoría *
            </label>
            <div className="flex gap-2">
              {['CAFÉ', 'ACCESORIOS', 'MERCH'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: cat }))}
                  className={`text-xs px-4 py-2 border flex items-center gap-1.5 transition-all ${
                    form.category === cat
                      ? 'border-gold-500 text-gold-500 bg-gold-500/10'
                      : 'border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400'
                  }`}
                >
                  <Tag size={11} /> {categoryLabels[cat]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'name', label: 'Nombre', required: true, id: 'product-name' },
              { name: 'slug', label: 'Slug (URL)', required: true, id: 'product-slug' },
              ...(isCafe
                ? [
                    { name: 'origin', label: 'Origen', id: 'product-origin' },
                    { name: 'region', label: 'Región', id: 'product-region' },
                    { name: 'variety', label: 'Variedad', id: 'product-variety' },
                  ]
                : []),
            ].map(({ name, label, required, id }) => (
              <div key={name}>
                <label
                  htmlFor={id}
                  className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5"
                >
                  {label}
                </label>
                <input
                  id={id}
                  required={required}
                  value={String(form[name as keyof typeof emptyForm] ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
                  className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                />
              </div>
            ))}

            {isCafe && (
              <>
                <div>
                  <label
                    htmlFor="product-process"
                    className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5"
                  >
                    Proceso
                  </label>
                  <select
                    id="product-process"
                    value={form.process}
                    onChange={(e) => setForm((f) => ({ ...f, process: e.target.value }))}
                    className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                  >
                    {['', 'Lavado', 'Natural', 'Honey', 'Anaeróbico Natural'].map((o) => (
                      <option key={o} value={o}>
                        {o || 'Seleccionar'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="product-roast"
                    className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5"
                  >
                    Tueste
                  </label>
                  <select
                    id="product-roast"
                    value={form.roastLevel}
                    onChange={(e) => setForm((f) => ({ ...f, roastLevel: e.target.value }))}
                    className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                  >
                    {['', 'Ligero', 'Medio-Ligero', 'Medio', 'Oscuro'].map((o) => (
                      <option key={o} value={o}>
                        {o || 'Seleccionar'}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {[
              ...(isCafe
                ? [
                    {
                      name: 'scaScore',
                      label: 'SCA Score',
                      type: 'number',
                      step: '0.1',
                      id: 'product-sca-score',
                    },
                    {
                      name: 'altitude',
                      label: 'Altitud (msnm)',
                      type: 'number',
                      id: 'product-altitude',
                    },
                  ]
                : []),
              {
                name: 'price',
                label: 'Precio (MXN)',
                type: 'number',
                required: true,
                id: 'product-price',
              },
              { name: 'weight', label: 'Gramaje (g)', type: 'number', id: 'product-weight' },
              {
                name: 'stock',
                label: 'Stock',
                type: 'number',
                required: true,
                id: 'product-stock',
              },
            ].map(({ name, label, type, step, required, id }: any) => (
              <div key={name}>
                <label
                  htmlFor={id}
                  className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5"
                >
                  {label}
                </label>
                <input
                  id={id}
                  type={type}
                  step={step}
                  required={required}
                  value={String(form[name as keyof typeof emptyForm] ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
                  className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                />
              </div>
            ))}
          </div>

          <ImageUploader
            label="Imagen del producto"
            value={form.imageUrl}
            onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
          />

          <GalleryUploader
            value={form.images}
            onChange={(images) => setForm((f) => ({ ...f, images }))}
          />

          {isCafe && (
            <div>
              <label
                htmlFor="product-flavors"
                className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5"
              >
                Notas de cata (separadas por coma)
              </label>
              <input
                id="product-flavors"
                value={form.flavors}
                onChange={(e) => setForm((f) => ({ ...f, flavors: e.target.value }))}
                className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                placeholder="Chocolate, Frambuesa, Miel"
              />
            </div>
          )}

          {isCafe && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowCoffeeProfile(!showCoffeeProfile)}
                className="flex items-center justify-between w-full text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest py-2 px-3 bg-coffee-200/50 dark:bg-coffee-800/50 border border-coffee-200 dark:border-coffee-700 mb-3"
              >
                Perfil de Café (campos nuevos)
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showCoffeeProfile ? 'rotate-180' : ''}`}
                />
              </button>

              {showCoffeeProfile && (
                <>
                  <div className="mb-4">
                    <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5">
                      Caficultor
                    </label>
                    <SearchableCaficultorSelect
                      value={form.caficultorId}
                      onChange={(id) => setForm((f) => ({ ...f, caficultorId: id }))}
                      placeholder="Seleccionar caficultor..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label
                        htmlFor="product-producer"
                        className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5"
                      >
                        Productor
                      </label>
                      <input
                        id="product-producer"
                        value={form.producer}
                        onChange={(e) => setForm((f) => ({ ...f, producer: e.target.value }))}
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                        placeholder="Ej: Finca El Injerto"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="product-farm"
                        className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5"
                      >
                        Finca
                      </label>
                      <input
                        id="product-farm"
                        value={form.farmName}
                        onChange={(e) => setForm((f) => ({ ...f, farmName: e.target.value }))}
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                        placeholder="Nombre de la finca"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label
                        htmlFor="product-certifications"
                        className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5"
                      >
                        Certificaciones
                      </label>
                      <input
                        id="product-certifications"
                        value={form.certifications}
                        onChange={(e) => setForm((f) => ({ ...f, certifications: e.target.value }))}
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                        placeholder="Orgánico, Comercio Justo, Rainforest Alliance"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="product-body"
                        className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5"
                      >
                        Cuerpo
                      </label>
                      <select
                        id="product-body"
                        value={form.body}
                        onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                      >
                        {['', 'Ligero', 'Medio', 'Completo'].map((o) => (
                          <option key={o} value={o}>
                            {o || 'Seleccionar'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="product-acidity"
                        className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5"
                      >
                        Acidez
                      </label>
                      <select
                        id="product-acidity"
                        value={form.acidity}
                        onChange={(e) => setForm((f) => ({ ...f, acidity: e.target.value }))}
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                      >
                        {['', 'Baja', 'Media', 'Alta'].map((o) => (
                          <option key={o} value={o}>
                            {o || 'Seleccionar'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label
                        htmlFor="product-brew-method"
                        className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5"
                      >
                        Método recomendado
                      </label>
                      <select
                        id="product-brew-method"
                        value={form.recommendedBrewMethod}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, recommendedBrewMethod: e.target.value }))
                        }
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                      >
                        {['', 'V60', 'AeroPress', 'Espresso', 'Chemex', 'French Press'].map((o) => (
                          <option key={o} value={o}>
                            {o || 'Seleccionar'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="product-brew-temp"
                        className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5"
                      >
                        Temperatura (°C)
                      </label>
                      <input
                        id="product-brew-temp"
                        type="number"
                        value={form.brewTemperature}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, brewTemperature: e.target.value }))
                        }
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                        placeholder="92"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="product-brew-ratio"
                        className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5"
                      >
                        Proporción
                      </label>
                      <input
                        id="product-brew-ratio"
                        value={form.brewRatio}
                        onChange={(e) => setForm((f) => ({ ...f, brewRatio: e.target.value }))}
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                        placeholder="1:15"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="product-grind-size"
                        className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5"
                      >
                        Molido
                      </label>
                      <select
                        id="product-grind-size"
                        value={form.grindSize}
                        onChange={(e) => setForm((f) => ({ ...f, grindSize: e.target.value }))}
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                      >
                        {['', 'Fino', 'Medio-Fino', 'Medio', 'Grueso'].map((o) => (
                          <option key={o} value={o}>
                            {o || 'Seleccionar'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4 mb-4">
                    <div>
                      <label
                        htmlFor="product-harvest-year"
                        className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5"
                      >
                        Año de cosecha
                      </label>
                      <input
                        id="product-harvest-year"
                        type="number"
                        value={form.harvestYear}
                        onChange={(e) => setForm((f) => ({ ...f, harvestYear: e.target.value }))}
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                        placeholder="2025"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="product-processing-desc"
                        className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5"
                      >
                        Descripción del proceso
                      </label>
                      <textarea
                        id="product-processing-desc"
                        value={form.processingDescription}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, processingDescription: e.target.value }))
                        }
                        rows={2}
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none resize-none"
                        placeholder="Detalles del proceso de producción..."
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="product-tasting-notes"
                        className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5"
                      >
                        Notas de cata detalladas
                      </label>
                      <textarea
                        id="product-tasting-notes"
                        value={form.tastingNotes}
                        onChange={(e) => setForm((f) => ({ ...f, tastingNotes: e.target.value }))}
                        rows={2}
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none resize-none"
                        placeholder="Notas adicionales de cata..."
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="product-pairing"
                        className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5"
                      >
                        Maridaje sugerido
                      </label>
                      <input
                        id="product-pairing"
                        value={form.pairingSuggestions}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, pairingSuggestions: e.target.value }))
                        }
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                        placeholder="Chocolate oscuro, Frutos secos..."
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer mb-4">
                    <input
                      type="checkbox"
                      checked={form.isMemberExclusive}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, isMemberExclusive: e.target.checked }))
                      }
                      className="accent-gold-500"
                    />
                    <span className="text-sm text-coffee-700 dark:text-coffee-300">
                      Exclusivo para miembros
                    </span>
                  </label>

                  {editId && <ProductVersionsSection productId={editId} />}
                </>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="product-description"
              className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1.5"
            >
              Descripción
            </label>
            <textarea
              id="product-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none resize-none"
            />
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isLimited}
                onChange={(e) => setForm((f) => ({ ...f, isLimited: e.target.checked }))}
                className="accent-gold-500"
              />
              <span className="text-sm text-coffee-700 dark:text-coffee-300">Edición limitada</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="accent-gold-500"
              />
              <span className="text-sm text-coffee-700 dark:text-coffee-300">Activo</span>
            </label>
          </div>

          {formError && <p className="text-red-400 text-sm">{formError}</p>}
        </form>
      </AdminModal>
    </div>
  );
}
