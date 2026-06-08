import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { usersApi } from '../../api';
import type { Order } from '../../types';

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Pendiente',   color: 'text-yellow-400' },
  PROCESSING: { label: 'Procesando',  color: 'text-blue-400' },
  SHIPPED:    { label: 'Enviado',     color: 'text-purple-400' },
  DELIVERED:  { label: 'Entregado',   color: 'text-green-400' },
  CANCELLED:  { label: 'Cancelado',   color: 'text-red-400' },
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    usersApi.myOrders()
      .then((r) => { setOrders(r.data); })
      .catch(() => { setError('No se pudieron cargar tus pedidos.'); })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={load} className="text-sm text-gold-500 hover:text-gold-400 border border-gold-500/30 px-4 py-2 transition-colors">
          Reintentar
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <Package className="w-12 h-12 text-coffee-600 mx-auto mb-4" />
        <p className="text-coffee-400">Aún no tienes pedidos.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {orders.map((order, i) => (
        <motion.div key={order.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }} className="bg-coffee-900 border border-coffee-800 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <p className="text-cream text-sm font-medium truncate">Pedido #{order.id.slice(-8).toUpperCase()}</p>
              <p className="text-coffee-400 text-xs mt-0.5">
                {new Date(order.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-gold-500 font-semibold">${order.total.toLocaleString('es-MX')}</p>
              <p className={`text-xs mt-0.5 ${statusLabels[order.status]?.color ?? 'text-coffee-400'}`}>
                {statusLabels[order.status]?.label ?? order.status}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            {order.items.map((item) => (
              <p key={item.id} className="text-coffee-300 text-xs truncate">{item.product.name} × {item.quantity}</p>
            ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
