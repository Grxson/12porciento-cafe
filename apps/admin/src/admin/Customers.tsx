import { useEffect, useState } from 'react';
import { Search, Users, ShoppingBag, ChevronRight, Download } from 'lucide-react';
import { useModuleToast } from './context/ModuleContext';
import { exportToCsv } from './utils/csvExport';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import Pagination from './components/Pagination';
import { PageMeta } from '../hooks/usePageMeta';
import { useCustomersQuery, useCustomerDetailQuery } from './hooks/useCustomersQuery';

export default function AdminCustomers() {
  const [search, setSearch] = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { addToast } = useModuleToast();
  const [page, setPage] = useState(1);

  const { customers, totalPages, loading, error, refetch } = useCustomersQuery({
    page,
    search: committedSearch,
  });
  const { customer: selected, error: detailError } = useCustomerDetailQuery(selectedId);

  useEffect(() => {
    if (detailError) addToast('Error al cargar detalle del cliente', 'error');
  }, [detailError]);

  const openDetail = (id: string) => setSelectedId(id);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCommittedSearch(search);
    setPage(1);
  };

  if (selected) {
    return (
      <div>
        <button
          onClick={() => setSelectedId(null)}
          className="flex items-center gap-2 text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream text-sm mb-6 transition-colors"
        >
          ← Volver a clientes
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6">
            <p className="text-gold-500 text-xs tracking-[0.3em] uppercase mb-3">Perfil</p>
            <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-1">
              {selected.name}
            </h2>
            <p className="text-coffee-600 dark:text-coffee-400 text-sm">{selected.email}</p>
            {selected.phone && (
              <p className="text-coffee-600 dark:text-coffee-400 text-sm">{selected.phone}</p>
            )}
            {selected.city && (
              <p className="text-coffee-500 text-sm mt-1">
                {selected.city}, {selected.state}
              </p>
            )}
            <p className="text-coffee-600 dark:text-coffee-400 text-xs mt-3">
              Cliente desde {new Date(selected.createdAt).toLocaleDateString('es-MX')}
            </p>
            <div className="flex gap-6 mt-4 pt-4 border-t border-coffee-200 dark:border-coffee-800">
              <div className="text-center">
                <p className="text-coffee-900 dark:text-cream font-bold text-xl">
                  {selected._count?.orders ?? selected.orders?.length ?? 0}
                </p>
                <p className="text-coffee-500 text-xs">Pedidos</p>
              </div>
              <div className="text-center">
                <p className="text-coffee-900 dark:text-cream font-bold text-xl">
                  {selected._count?.subscriptions ?? selected.subscriptions?.length ?? 0}
                </p>
                <p className="text-coffee-500 text-xs">Suscripciones</p>
              </div>
              <div className="text-center">
                <p className="text-coffee-900 dark:text-cream font-bold text-xl">
                  {selected.reviews?.length ?? 0}
                </p>
                <p className="text-coffee-500 text-xs">Reseñas</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6">
              <p className="text-coffee-600 dark:text-coffee-400 text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                <ShoppingBag className="w-3.5 h-3.5" /> Pedidos recientes
              </p>
              {selected.orders.length === 0 ? (
                <p className="text-coffee-600 dark:text-coffee-400 text-sm">Sin pedidos.</p>
              ) : (
                <div className="space-y-2">
                  {selected.orders.map((o) => (
                    <div
                      key={o.id}
                      className="flex justify-between items-center text-sm py-2 border-b border-coffee-200 dark:border-coffee-800 last:border-0"
                    >
                      <div>
                        <p className="text-coffee-800 dark:text-coffee-300">
                          {o.items.map((i) => i.product?.name).join(', ')}
                        </p>
                        <p className="text-coffee-500 text-xs">
                          {new Date(o.createdAt).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-coffee-900 dark:text-cream">${o.total.toFixed(2)}</p>
                        <p className="text-coffee-500 text-xs">{o.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6">
              <p className="text-coffee-600 dark:text-coffee-400 text-xs uppercase tracking-wider mb-3">
                Reseñas
              </p>
              {!selected.reviews || selected.reviews.length === 0 ? (
                <p className="text-coffee-600 dark:text-coffee-400 text-sm">Sin reseñas.</p>
              ) : (
                <div className="space-y-3">
                  {selected.reviews.map((r) => (
                    <div
                      key={r.id}
                      className="py-3 border-b border-coffee-200 dark:border-coffee-800 last:border-0"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-coffee-800 dark:text-coffee-300 text-sm font-medium">
                          {r.product?.name}
                        </p>
                        <p className="text-coffee-500 text-xs">
                          {new Date(r.createdAt).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                      <p className="text-gold-500 text-sm mb-1">
                        {'★'.repeat(r.rating)}
                        {'☆'.repeat(5 - r.rating)}
                      </p>
                      {(r.comment ?? r.content) && (
                        <p className="text-coffee-600 dark:text-coffee-400 text-sm">
                          {r.comment ?? r.content}
                        </p>
                      )}
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
    <div>
      <PageMeta title="Clientes" noSuffix />
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-gold-500" />
        <div>
          <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Clientes</h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mt-1">
            {customers.length} registrados
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-gold-500/50"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-gold-500 text-coffee-950 text-sm font-medium hover:bg-gold-400 transition-colors"
        >
          Buscar
        </button>
        <button
          type="button"
          disabled={customers.length === 0}
          onClick={() =>
            exportToCsv(customers, 'clientes', [
              { key: 'name', label: 'Nombre' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Teléfono' },
              { key: 'city', label: 'Ciudad' },
              { key: 'state', label: 'Estado' },
              { key: 'createdAt', label: 'Registro' },
            ])
          }
          className="px-4 py-2 border border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 text-sm hover:text-coffee-900 dark:hover:text-cream transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Download size={16} /> Exportar CSV
        </button>
      </form>

      {loading ? (
        <AdminSkeleton rows={4} />
      ) : error ? (
        <AdminErrorState
          error="Error al cargar clientes. Intenta de nuevo."
          onRetry={() => refetch()}
        />
      ) : customers.length === 0 ? (
        <p className="text-center text-coffee-500 py-10">No se encontraron clientes.</p>
      ) : (
        <>
          <div className="space-y-1">
            {customers.map((c) => (
              <button
                key={c.id}
                onClick={() => openDetail(c.id)}
                className="w-full flex items-center justify-between px-5 py-4 bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 hover:bg-coffee-200/40 dark:hover:bg-coffee-800/40 transition-colors text-left"
              >
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-coffee-900 dark:text-cream font-medium">{c.name}</p>
                    <p className="text-coffee-600 dark:text-coffee-400 text-xs mt-0.5">{c.email}</p>
                  </div>
                  {c.city && (
                    <p className="text-coffee-500 text-sm hidden sm:block">
                      {c.city}, {c.state}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden md:block">
                    <p className="text-coffee-700 dark:text-coffee-300 text-sm">
                      {c._count.orders} pedidos
                    </p>
                    {c._count.subscriptions > 0 && (
                      <p className="text-gold-500/70 text-xs">
                        {c._count.subscriptions} suscripción
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-coffee-600 dark:text-coffee-400" />
                </div>
              </button>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
