import { useEffect, useState } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag } from 'lucide-react';
import { promoCodesApi } from '../api';

interface PromoCode {
  id: string;
  code: string;
  discount: number;
  type: 'PERCENT' | 'FIXED';
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

const emptyForm = { code: '', discount: '', type: 'PERCENT', maxUses: '', expiresAt: '' };

export default function AdminPromoCodes() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    promoCodesApi.list().then((r) => { setCodes(r.data.data); setLoading(false); });
  };

  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      load();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Error al crear código');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (id: string) => {
    await promoCodesApi.toggle(id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar este código?')) return;
    await promoCodesApi.delete(id);
    load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <Tag className="w-6 h-6 text-gold-500" />
        <div>
          <h1 className="font-serif text-3xl text-cream">Códigos de Descuento</h1>
          <p className="text-coffee-400 text-sm mt-1">{codes.length} códigos</p>
        </div>
      </div>

      <form onSubmit={submit} className="bg-coffee-900 border border-coffee-800 p-6 mb-8">
        <h2 className="text-cream font-medium mb-4">Nuevo código</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <input
            required
            placeholder="CAFE20"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500/50 uppercase"
          />
          <input
            required
            type="number"
            step="0.01"
            placeholder="Descuento"
            value={form.discount}
            onChange={(e) => setForm({ ...form, discount: e.target.value })}
            className="bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none"
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none"
          >
            <option value="PERCENT">% Porcentaje</option>
            <option value="FIXED">$ Fijo MXN</option>
          </select>
          <input
            type="number"
            placeholder="Usos máx (opcional)"
            value={form.maxUses}
            onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
            className="bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none"
          />
          <input
            type="date"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            className="bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none"
          />
        </div>
        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        <button type="submit" disabled={saving} className="mt-4 btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Crear código'}
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
        </div>
      ) : codes.length === 0 ? (
        <p className="text-center text-coffee-500 py-10">No hay códigos creados.</p>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => (
            <div
              key={c.id}
              className={`flex items-center justify-between px-5 py-4 border ${
                c.isActive ? 'bg-coffee-900 border-coffee-800' : 'bg-coffee-900/50 border-coffee-800/50 opacity-60'
              }`}
            >
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <span className="font-mono text-gold-500 font-bold tracking-widest">{c.code}</span>
                <span className="text-cream text-sm">
                  {c.type === 'PERCENT' ? `${c.discount}% OFF` : `$${c.discount} MXN OFF`}
                </span>
                <span className="text-coffee-400 text-xs">
                  {c.usedCount}{c.maxUses ? `/${c.maxUses}` : ''} usos
                </span>
                {c.expiresAt && (
                  <span className="text-coffee-500 text-xs">
                    Expira: {new Date(c.expiresAt).toLocaleDateString('es-MX')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => toggle(c.id)} className="text-coffee-400 hover:text-cream transition-colors">
                  {c.isActive ? <ToggleRight className="w-5 h-5 text-gold-500" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => remove(c.id)} className="text-coffee-600 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
