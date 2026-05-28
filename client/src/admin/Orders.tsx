import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ordersApi } from '../api';
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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = () => {
    const params: Record<string, string> | undefined = filter ? { status: filter } : undefined;
    ordersApi.list(params).then((r) => { setOrders(r.data); setLoading(false); });
  };

  useEffect(load, [filter]);

  const updateStatus = async (id: string, status: string) => {
    await ordersApi.updateStatus(id, status);
    load();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-cream">Pedidos</h1>
          <p className="text-coffee-400 text-sm mt-1">{orders.length} pedidos</p>
        </div>

        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setLoading(true); }}
          className="bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none"
        >
          <option value="">Todos los estados</option>
          {allStatuses.map((s) => <option key={s} value={s}>{statusConfig[s].label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
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
    </div>
  );
}
