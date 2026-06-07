import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Star, ToggleLeft, ToggleRight, Tag } from 'lucide-react';
import { productsApi } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import ImageUploader from './components/ImageUploader';
import { resolveImageUrl } from './utils/imageUrl';
import type { Product } from '../types';

const emptyForm = {
  name: '', slug: '', category: 'CAFÉ', origin: 'México', region: '', altitude: '' as string | number,
  variety: '', process: '', scaScore: '' as string | number, roastLevel: '', flavors: '',
  price: 0, weight: '' as string | number, stock: 0, imageUrl: '', description: '', isLimited: false, isActive: true,
};

const categoryLabels: Record<string, string> = { 'CAFÉ': 'Café', 'ACCESORIOS': 'Accesorios', 'MERCH': 'Merch' };

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [catFilter, setCatFilter] = useState('TODOS');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [loadError, setLoadError] = useState('');

  const load = () => {
    setLoading(true);
    setLoadError('');
    productsApi.adminList()
      .then((r) => { setProducts(r.data); })
      .catch(() => { setLoadError('Error al cargar productos. Intenta de nuevo.'); })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => { setForm(emptyForm); setEditId(null); setModal('add'); };

  const openEdit = (p: Product) => {
    setForm({
      ...p,
      flavors: (p.flavors || []).join(', '),
      altitude: p.altitude ?? '',
      scaScore: p.scaScore ?? '',
      weight: p.weight ?? '',
    } as any);
    setEditId(p.id);
    setModal('edit');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const data: any = {
      ...form,
      flavors: form.category === 'CAFÉ' ? form.flavors.split(',').map((f) => f.trim()).filter(Boolean) : [],
      altitude: form.altitude !== '' ? Number(form.altitude) : null,
      scaScore: form.scaScore !== '' ? Number(form.scaScore) : null,
      weight: form.weight !== '' ? Number(form.weight) : null,
    };
    try {
      if (modal === 'add') await productsApi.create(data);
      else if (editId) await productsApi.update(editId, data);
      setModal(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await productsApi.delete(deleteConfirm.id);
      setDeleteConfirm(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (p: Product) => {
    await productsApi.update(p.id, { isActive: !p.isActive });
    load();
  };

  const isCafe = form.category === 'CAFÉ';
  const filtered = catFilter === 'TODOS' ? products : products.filter((p) => p.category === catFilter);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-cream">Productos</h1>
          <p className="text-coffee-400 text-sm mt-1">{products.length} en catálogo</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Agregar
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-6">
        {['TODOS', 'CAFÉ', 'ACCESORIOS', 'MERCH'].map((cat) => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={`text-xs px-3 py-1.5 border transition-all ${
              catFilter === cat ? 'border-gold-500 text-gold-500 bg-gold-500/10' : 'border-coffee-700 text-coffee-400 hover:border-coffee-500'
            }`}
          >
            {cat === 'TODOS' ? 'Todos' : categoryLabels[cat]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
        </div>
      ) : loadError ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{loadError}</p>
          <button onClick={load} className="text-sm text-gold-500 hover:text-gold-400 border border-gold-500/30 px-4 py-2 transition-colors">
            Reintentar
          </button>
        </div>
      ) : (
        <div className="bg-coffee-900 border border-coffee-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-800">
                  {['Producto', 'Categoría', 'Info', 'Precio', 'Stock', 'Estado', ''].map((h) => (
                    <th key={h} className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-coffee-800/50 hover:bg-coffee-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={resolveImageUrl(p.imageUrl)} alt={p.name} className="w-10 h-10 object-cover shrink-0" />
                        <div>
                          <p className="text-cream font-medium">{p.name}</p>
                          {p.isLimited && <span className="text-xs text-red-400">Limitado</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs border border-coffee-700 text-coffee-400 px-2 py-0.5">
                        {categoryLabels[p.category] ?? p.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-coffee-300 text-xs">
                      {p.category === 'CAFÉ' && p.scaScore ? (
                        <span className="sca-badge"><Star className="w-3 h-3 fill-gold-500 text-gold-500" /> {p.scaScore}</span>
                      ) : (
                        <span className="text-coffee-500">{p.region || '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gold-500 font-medium">${p.price}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${p.stock <= 5 ? 'text-red-400' : p.stock <= 15 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(p)} className="transition-colors">
                        {p.isActive ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5 text-coffee-600" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(p)} className="text-coffee-400 hover:text-gold-500 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(p.id, p.name)} className="text-coffee-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirm}
        title="Eliminar producto"
        description={`¿Eliminar "${deleteConfirm?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-coffee-950/80 flex items-start justify-center z-50 p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-coffee-900 border border-coffee-800 w-full max-w-2xl my-8"
            >
              <div className="flex items-center justify-between p-6 border-b border-coffee-800">
                <h2 className="font-serif text-2xl text-cream">
                  {modal === 'add' ? 'Agregar producto' : 'Editar producto'}
                </h2>
                <button onClick={() => setModal(null)} className="text-coffee-400 hover:text-cream transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Category */}
                <div>
                  <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-1.5">Categoría *</label>
                  <div className="flex gap-2">
                    {['CAFÉ', 'ACCESORIOS', 'MERCH'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, category: cat }))}
                        className={`text-xs px-4 py-2 border flex items-center gap-1.5 transition-all ${
                          form.category === cat ? 'border-gold-500 text-gold-500 bg-gold-500/10' : 'border-coffee-700 text-coffee-400'
                        }`}
                      >
                        <Tag size={11} /> {categoryLabels[cat]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: 'name', label: 'Nombre', required: true },
                    { name: 'slug', label: 'Slug (URL)', required: true },
                    ...(isCafe ? [
                      { name: 'origin', label: 'Origen' },
                      { name: 'region', label: 'Región' },
                      { name: 'variety', label: 'Variedad' },
                    ] : []),
                  ].map(({ name, label, required }) => (
                    <div key={name}>
                      <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-1.5">{label}</label>
                      <input
                        required={required}
                        value={(form as any)[name] ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
                        className="w-full bg-coffee-800 border border-coffee-700 text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                      />
                    </div>
                  ))}

                  {isCafe && (
                    <>
                      <div>
                        <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-1.5">Proceso</label>
                        <select
                          value={form.process}
                          onChange={(e) => setForm((f) => ({ ...f, process: e.target.value }))}
                          className="w-full bg-coffee-800 border border-coffee-700 text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                        >
                          {['', 'Lavado', 'Natural', 'Honey', 'Anaeróbico Natural'].map((o) => <option key={o} value={o}>{o || 'Seleccionar'}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-1.5">Tueste</label>
                        <select
                          value={form.roastLevel}
                          onChange={(e) => setForm((f) => ({ ...f, roastLevel: e.target.value }))}
                          className="w-full bg-coffee-800 border border-coffee-700 text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                        >
                          {['', 'Ligero', 'Medio-Ligero', 'Medio', 'Oscuro'].map((o) => <option key={o} value={o}>{o || 'Seleccionar'}</option>)}
                        </select>
                      </div>
                    </>
                  )}

                  {[
                    ...(isCafe ? [
                      { name: 'scaScore', label: 'SCA Score', type: 'number', step: '0.1' },
                      { name: 'altitude', label: 'Altitud (msnm)', type: 'number' },
                    ] : []),
                    { name: 'price', label: 'Precio (MXN)', type: 'number', required: true },
                    { name: 'weight', label: 'Gramaje (g)', type: 'number' },
                    { name: 'stock', label: 'Stock', type: 'number', required: true },
                  ].map(({ name, label, type, step, required }: any) => (
                    <div key={name}>
                      <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-1.5">{label}</label>
                      <input
                        type={type}
                        step={step}
                        required={required}
                        value={(form as any)[name] ?? ''}
                        onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
                        className="w-full bg-coffee-800 border border-coffee-700 text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>

                <ImageUploader
                  label="Imagen del producto"
                  value={form.imageUrl}
                  onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
                />

                {isCafe && (
                  <div>
                    <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-1.5">Notas de cata (separadas por coma)</label>
                    <input
                      value={form.flavors}
                      onChange={(e) => setForm((f) => ({ ...f, flavors: e.target.value }))}
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none"
                      placeholder="Chocolate, Frambuesa, Miel"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-1.5">Descripción</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream px-3 py-2 text-sm focus:border-gold-500/60 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isLimited} onChange={(e) => setForm((f) => ({ ...f, isLimited: e.target.checked }))} className="accent-gold-500" />
                    <span className="text-sm text-coffee-300">Edición limitada</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="accent-gold-500" />
                    <span className="text-sm text-coffee-300">Activo</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                    {saving ? 'Guardando...' : modal === 'add' ? 'Agregar producto' : 'Guardar cambios'}
                  </button>
                  <button type="button" onClick={() => setModal(null)} className="btn-outline-dark">Cancelar</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
