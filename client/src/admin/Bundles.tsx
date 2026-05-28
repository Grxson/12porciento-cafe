import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { bundlesApi } from '../api';
import type { Bundle } from '../types';

export default function AdminBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    bundlesApi.list().then((r) => { setBundles(r.data.data || []); setLoading(false); });
  };

  useEffect(load, []);

  const toggleActive = async (bundle: Bundle) => {
    await bundlesApi.update(bundle.id, { ...bundle, isActive: !bundle.isActive });
    load();
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar bundle "${name}"?`)) return;
    await bundlesApi.delete(id);
    load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-cream">Bundles</h1>
          <p className="text-coffee-400 text-sm mt-1">{bundles.length} paquetes configurados</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Nuevo bundle
        </button>
      </div>

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
            <div key={bundle.id} className={`bg-coffee-900 border ${bundle.isActive ? 'border-coffee-800' : 'border-coffee-800 opacity-60'} p-5`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-serif text-lg text-cream">{bundle.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {bundle.discountPct > 0 && (
                      <span className="bg-gold-500/20 text-gold-400 text-xs px-2 py-0.5">{bundle.discountPct}% OFF</span>
                    )}
                    {!bundle.isActive && <span className="bg-coffee-800 text-coffee-400 text-xs px-2 py-0.5">Inactivo</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleActive(bundle)} className="text-xs text-coffee-400 hover:text-cream border border-coffee-700 px-2 py-1 transition-colors">
                    {bundle.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                  <button onClick={() => remove(bundle.id, bundle.name)} className="text-red-400 hover:text-red-300 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <p className="text-coffee-400 text-sm mb-4">{bundle.description}</p>

              <div className="space-y-1 mb-4">
                {bundle.items.map((item) => (
                  <div key={item.id} className="text-xs text-coffee-300 flex justify-between">
                    <span>• {item.quantity > 1 ? `${item.quantity}x ` : ''}{item.product.name}</span>
                    <span className="text-coffee-500">${item.product.price}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-coffee-800 pt-3 flex items-end justify-between">
                <div>
                  <p className="text-coffee-500 text-xs line-through">${bundle.basePrice.toLocaleString()}</p>
                  <p className="text-gold-500 text-lg font-semibold">${bundle.finalPrice.toLocaleString()}</p>
                </div>
                <div className="text-xs text-green-400">
                  Ahorro: ${(bundle.basePrice - bundle.finalPrice).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
