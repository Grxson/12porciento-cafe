import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X, ChevronLeft, ChevronRight as ChevronRightIcon, Download } from 'lucide-react';
import { ordersApi } from '../api';
import { exportToCsv } from './utils/csvExport';
import type { Order, OrderStatus } from '../types';

const statusConfig: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  PENDING:    { label: 'Pendiente',   color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  PROCESSING: { label: 'Procesando',  color: 'text-blue-400',   bg: 'bg-blue-900/20' },
  SHIPPED:    { label: 'Enviado',     color: 'text-purple-400', bg: 'bg-purple-900/20' },
  DELIVERED:  { label: 'Entregado',   color: 'text-green-400',  bg: 'bg-green-900/20' },
  CANCELLED:  { label: 'Cancelado',   color: 'text-red-400',    bg: 'bg-red-900/20' },
};

const allStatuses = Object.keys(statusConfig) as OrderStatus[];

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = (overrides?: Record<string, string>) => {
    setLoading(true);
    setLoadError('');
    const params: Record<string, string> = {};
    const s = overrides?.status ?? status;
    const q = overrides?.search ?? search;
    const df = overrides?.dateFrom ?? dateFrom;
    const dt = overrides?.dateTo ?? dateTo;
    const p = overrides?.page ?? String(page);
    if (s) params.status = s;
    if (q) params.search = q;
    if (df) params.dateFrom = df;
    if (dt) params.dateTo = dt;
    params.page = p;
    params.pageSize = '50';
    ordersApi.list(params)
      .then((r) => {
        const res = r.data as any;
        setOrders(res.data ?? res);
        setTotal(res.total ?? res.length ?? 0);
        setTotalPages(res.totalPages ?? 1);
      })
      .catch(() => { setLoadError('Error al cargar pedidos. Intenta de nuevo.'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [status, page]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); load({ page: '1' }); };

  const clearFilters = () => {
    setStatus(''); setSearch(''); setDateFrom(''); setDateTo(''); setPage(1);
    load({ status: '', search: '', dateFrom: '', dateTo: '', page: '1' });
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const prev = orders;
    // Optimistic: reflect the new status immediately, revert on failure
    setOrders((list) => list.map((o) => (o.id === id ? { ...o, status: newStatus as OrderStatus } : o)));
    try {
      await ordersApi.updateStatus(id, newStatus);
    } catch {
      setOrders(prev);
    }
  };

  const hasFilters = status || search || dateFrom || dateTo;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-cream">Pedidos</h1>
          <p className="text-coffee-400 text-sm mt-1">{total} pedidos</p>
        </div>
        <button
          onClick={() => exportToCsv(
            orders.map((o) => ({
              id: o.id,
              cliente: o.customerName,
              email: o.email,
              telefono: o.phone ?? '',
              ciudad: o.city,
              estado: o.state,
              total: o.total,
              status: statusConfig[o.status as OrderStatus]?.label ?? o.status,
              fecha: new Date(o.createdAt).toLocaleDateString('es-MX'),
            })),
            'pedidos',
            [
              { key: 'id', label: 'ID' },
              { key: 'cliente', label: 'Cliente' },
              { key: 'email', label: 'Email' },
              { key: 'telefono', label: 'Teléfono' },
              { key: 'ciudad', label: 'Ciudad' },
              { key: 'estado', label: 'Estado' },
              { key: 'total', label: 'Total' },
              { key: 'status', label: 'Estatus' },
              { key: 'fecha', label: 'Fecha' },
            ],
          )}
          disabled={orders.length === 0}
          className="px-4 py-2 border border-coffee-700 text-coffee-400 text-sm hover:text-cream transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      <form onSubmit={handleSearch} className="bg-coffee-900 border border-coffee-800 p-4 mb-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-500" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre o email..."
            className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm pl-9 pr-3 py-2 focus:outline-none focus:border-gold-500/50"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {allStatuses.map((s) => <option key={s} value={s}>{statusConfig[s].label}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="flex-1 bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="flex-1 bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none" />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 bg-gold-500 text-coffee-950 text-sm font-medium px-4 py-2 hover:bg-gold-400 transition-colors">
            Filtrar
          </button>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="px-3 py-2 border border-coffee-700 text-coffee-400 hover:text-cream transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
        </div>
      ) : loadError ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{loadError}</p>
          <button onClick={() => load()} className="text-sm text-gold-500 hover:text-gold-400 border border-gold-500/30 px-4 py-2 transition-colors">
            Reintentar
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-coffee-500">No hay pedidos con ese filtro.</div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const cfg = statusConfig[order.status as OrderStatus] ?? statusConfig.PENDING;
            const isOpen = expanded === order.id;
            return (
              <div key={order.id} className="bg-coffee-900 border border-coffee-800">
                <button
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-coffee-800/30 transition-colors"
                >
                  <div className="flex items-center gap-6 text-left">
                    <div>
                      <p className="text-cream font-medium">{order.customerName}</p>
                      <p className="text-coffee-400 text-xs mt-0.5">{order.email}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-coffee-300 text-sm">{order.city}, {order.state}</p>
                      <p className="text-coffee-500 text-xs">{new Date(order.createdAt).toLocaleDateString('es-MX')}</p>
                    </div>
                    <span className={`hidden md:inline text-xs px-2.5 py-1 font-medium ${cfg.color} ${cfg.bg}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gold-500 font-semibold">${order.total.toLocaleString('es-MX')}</span>
                    <ChevronDown className={`w-4 h-4 text-coffee-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-coffee-800 p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-gold-500 uppercase tracking-widest mb-3">Productos</p>
                        <div className="space-y-2">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-coffee-200">{item.product.name} × {item.quantity}</span>
                              <span className="text-coffee-400">${(item.price * item.quantity).toLocaleString('es-MX')}</span>
                            </div>
                          ))}
                        </div>
                        {order.notes && (
                          <div className="mt-4">
                            <p className="text-xs text-coffee-500 uppercase tracking-widest mb-1">Notas</p>
                            <p className="text-coffee-300 text-sm">{order.notes}</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-xs text-gold-500 uppercase tracking-widest mb-3">Envío</p>
                        <p className="text-coffee-200 text-sm">{order.address}</p>
                        <p className="text-coffee-300 text-sm">{order.city}, {order.state} {order.zipCode}</p>
                        {order.phone && <p className="text-coffee-400 text-sm mt-1">{order.phone}</p>}

                        <div className="mt-5">
                          <p className="text-xs text-coffee-500 uppercase tracking-widest mb-2">Cambiar estado</p>
                          <div className="flex flex-wrap gap-2">
                            {allStatuses.map((s) => (
                              <button
                                key={s}
                                onClick={() => updateStatus(order.id, s)}
                                className={`text-xs px-3 py-1.5 border transition-all ${
                                  order.status === s
                                    ? `${statusConfig[s].color} ${statusConfig[s].bg} border-current`
                                    : 'border-coffee-700 text-coffee-500 hover:border-coffee-500'
                                }`}
                              >
                                {statusConfig[s].label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}
            className="p-2 border border-coffee-700 text-coffee-400 hover:border-coffee-500 disabled:opacity-40 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-coffee-400 text-sm">Página {page} de {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page === totalPages}
            className="p-2 border border-coffee-700 text-coffee-400 hover:border-coffee-500 disabled:opacity-40 transition-colors">
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
