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

  useEffect(() => {
    usersApi.myOrders().then((r) => { setOrders(r.data); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
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
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-cream text-sm font-medium">Pedido #{order.id.slice(-8).toUpperCase()}</p>
              <p className="text-coffee-400 text-xs mt-0.5">
                {new Date(order.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gold-500 font-semibold">${order.total.toLocaleString('es-MX')}</p>
              <p className={`text-xs mt-0.5 ${statusLabels[order.status]?.color ?? 'text-coffee-400'}`}>
                {statusLabels[order.status]?.label ?? order.status}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            {order.items.map((item) => (
              <p key={item.id} className="text-coffee-300 text-xs">{item.product.name} × {item.quantity}</p>
            ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
