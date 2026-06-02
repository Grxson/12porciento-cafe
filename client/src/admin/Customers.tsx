import { useEffect, useState } from 'react';
import { Search, Users, ShoppingBag, ChevronRight } from 'lucide-react';
import { customersApi } from '../api';

interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  state?: string;
  createdAt: string;
  _count: { orders: number; subscriptions: number };
}

interface CustomerDetail extends CustomerSummary {
  orders: any[];
  subscriptions: any[];
  reviews: any[];
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CustomerDetail | null>(null);

  const load = (q?: string) => {
    setLoading(true);
    const params = q ? { search: q } : undefined;
    customersApi.list(params).then((r) => { setCustomers(r.data.data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (id: string) => {
    const r = await customersApi.getById(id);
    setSelected(r.data.data);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(search || undefined);
  };

  if (selected) {
    return (
      <div className="p-8">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-coffee-400 hover:text-cream text-sm mb-6 transition-colors"
        >
          ← Volver a clientes
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-coffee-900 border border-coffee-800 p-6">
            <p className="text-gold-500 text-xs tracking-[0.3em] uppercase mb-3">Perfil</p>
            <h2 className="font-serif text-2xl text-cream mb-1">{selected.name}</h2>
            <p className="text-coffee-400 text-sm">{selected.email}</p>
            {selected.phone && <p className="text-coffee-400 text-sm">{selected.phone}</p>}
            {selected.city && <p className="text-coffee-500 text-sm mt-1">{selected.city}, {selected.state}</p>}
            <p className="text-coffee-600 text-xs mt-3">Cliente desde {new Date(selected.createdAt).toLocaleDateString('es-MX')}</p>
            <div className="flex gap-6 mt-4 pt-4 border-t border-coffee-800">
              <div className="text-center">
                <p className="text-cream font-bold text-xl">{selected._count.orders}</p>
                <p className="text-coffee-500 text-xs">Pedidos</p>
              </div>
              <div className="text-center">
                <p className="text-cream font-bold text-xl">{selected._count.subscriptions}</p>
                <p className="text-coffee-500 text-xs">Suscripciones</p>
              </div>
              <div className="text-center">
                <p className="text-cream font-bold text-xl">{selected.reviews?.length ?? 0}</p>
                <p className="text-coffee-500 text-xs">Reseñas</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-coffee-900 border border-coffee-800 p-6">
              <p className="text-coffee-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                <ShoppingBag className="w-3.5 h-3.5" /> Pedidos recientes
              </p>
              {selected.orders.length === 0 ? (
                <p className="text-coffee-600 text-sm">Sin pedidos.</p>
              ) : (
                <div className="space-y-2">
                  {selected.orders.map((o: any) => (
                    <div key={o.id} className="flex justify-between items-center text-sm py-2 border-b border-coffee-800 last:border-0">
                      <div>
                        <p className="text-coffee-200">{o.items.map((i: any) => i.product?.name).join(', ')}</p>
                        <p className="text-coffee-500 text-xs">{new Date(o.createdAt).toLocaleDateString('es-MX')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-cream">${o.total.toFixed(2)}</p>
                        <p className="text-coffee-500 text-xs">{o.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-gold-500" />
        <div>
          <h1 className="font-serif text-3xl text-cream">Clientes</h1>
          <p className="text-coffee-400 text-sm mt-1">{customers.length} registrados</p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full bg-coffee-900 border border-coffee-800 text-cream text-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-gold-500/50"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-gold-500 text-coffee-950 text-sm font-medium hover:bg-gold-400 transition-colors">
          Buscar
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
        </div>
      ) : customers.length === 0 ? (
        <p className="text-center text-coffee-500 py-10">No se encontraron clientes.</p>
      ) : (
        <div className="space-y-1">
          {customers.map((c) => (
            <button
              key={c.id}
              onClick={() => openDetail(c.id)}
              className="w-full flex items-center justify-between px-5 py-4 bg-coffee-900 border border-coffee-800 hover:bg-coffee-800/40 transition-colors text-left"
            >
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-cream font-medium">{c.name}</p>
                  <p className="text-coffee-400 text-xs mt-0.5">{c.email}</p>
                </div>
                {c.city && <p className="text-coffee-500 text-sm hidden sm:block">{c.city}, {c.state}</p>}
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden md:block">
                  <p className="text-coffee-300 text-sm">{c._count.orders} pedidos</p>
                  {c._count.subscriptions > 0 && (
                    <p className="text-gold-500/70 text-xs">{c._count.subscriptions} suscripción</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-coffee-600" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
