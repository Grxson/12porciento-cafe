import { useEffect, useState } from 'react';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { productVersionsApi } from '../../api';
import SearchableCaficultorSelect from '../../components/SearchableCaficultorSelect';
import type { ProductVersion } from '../../types';

interface Props {
  productId: string;
}

export default function ProductVersionsSection({ productId }: Props) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<ProductVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newVersion, setNewVersion] = useState({
    cosecha: '',
    caficultorId: '',
    scoreFinal: '',
    notasSabor: '',
  });

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    productVersionsApi
      .list(productId)
      .then((r) => setVersions(r.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, productId]);

  const handleCreate = async () => {
    if (!newVersion.cosecha.trim()) return;
    setSaving(true);
    try {
      await productVersionsApi.create(productId, {
        cosecha: newVersion.cosecha,
        caficultorId: newVersion.caficultorId || undefined,
        scoreFinal: newVersion.scoreFinal ? Number(newVersion.scoreFinal) : undefined,
        notasSabor: newVersion.notasSabor || undefined,
      });
      setNewVersion({ cosecha: '', caficultorId: '', scoreFinal: '', notasSabor: '' });
      setShowNew(false);
      const r = await productVersionsApi.list(productId);
      setVersions(r.data.data || []);
    } catch {
      console.error('Error creating version');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-coffee-200 dark:border-coffee-700 mt-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest py-2 px-3 bg-coffee-200/50 dark:bg-coffee-800/50"
      >
        Versiones ({versions.length})
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="p-3 space-y-2">
          {loading ? (
            <p className="text-xs text-coffee-500">Cargando...</p>
          ) : versions.length === 0 ? (
            <p className="text-xs text-coffee-500">Sin versiones registradas</p>
          ) : (
            versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between text-sm py-1 border-b border-coffee-100 dark:border-coffee-800 last:border-0"
              >
                <div>
                  <span className="text-coffee-900 dark:text-cream font-medium">v{v.version}</span>
                  <span className="text-coffee-500 dark:text-coffee-400 ml-2">{v.cosecha}</span>
                  {v.scoreFinal && <span className="text-gold-500 ml-2">SCA: {v.scoreFinal}</span>}
                  {v.caficultor && (
                    <span className="text-coffee-400 ml-2">— {v.caficultor.nombre}</span>
                  )}
                </div>
                {v.isActive && (
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Activa
                  </span>
                )}
              </div>
            ))
          )}

          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="flex items-center gap-1 text-xs text-gold-600 dark:text-gold-400 hover:text-gold-500 mt-2"
          >
            <Plus className="w-3 h-3" /> {showNew ? 'Cancelar' : 'Nueva versión'}
          </button>

          {showNew && (
            <div className="space-y-3 pt-2 border-t border-coffee-200 dark:border-coffee-700">
              <div>
                <label className="block text-xs text-coffee-600 dark:text-coffee-400 mb-1">
                  Cosecha *
                </label>
                <input
                  value={newVersion.cosecha}
                  onChange={(e) => setNewVersion((f) => ({ ...f, cosecha: e.target.value }))}
                  placeholder="2025"
                  className="w-full border border-coffee-200 dark:border-coffee-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream"
                />
              </div>
              <div>
                <label className="block text-xs text-coffee-600 dark:text-coffee-400 mb-1">
                  Caficultor
                </label>
                <SearchableCaficultorSelect
                  value={newVersion.caficultorId}
                  onChange={(id) => setNewVersion((f) => ({ ...f, caficultorId: id }))}
                  placeholder="Seleccionar..."
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-coffee-600 dark:text-coffee-400 mb-1">
                    SCA Score
                  </label>
                  <input
                    type="number"
                    value={newVersion.scoreFinal}
                    onChange={(e) => setNewVersion((f) => ({ ...f, scoreFinal: e.target.value }))}
                    placeholder="85"
                    className="w-full border border-coffee-200 dark:border-coffee-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream"
                  />
                </div>
                <div>
                  <label className="block text-xs text-coffee-600 dark:text-coffee-400 mb-1">
                    Notas
                  </label>
                  <input
                    value={newVersion.notasSabor}
                    onChange={(e) => setNewVersion((f) => ({ ...f, notasSabor: e.target.value }))}
                    placeholder="Chocolate, Citrico..."
                    className="w-full border border-coffee-200 dark:border-coffee-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || !newVersion.cosecha.trim()}
                className="text-xs bg-coffee-800 text-cream px-3 py-1.5 rounded hover:bg-coffee-900 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Crear versión'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
