import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, ShoppingBag, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrderHistory } from '../../context/OrderHistoryContext';
import type { Order } from '../../types';
import { PageMeta } from '../../hooks/usePageMeta';
import PageSkeleton from '../../components/PageSkeleton';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendiente', color: 'text-yellow-400' },
  PROCESSING: { label: 'Procesando', color: 'text-blue-400' },
  SHIPPED: { label: 'Enviado', color: 'text-purple-400' },
  DELIVERED: { label: 'Entregado', color: 'text-green-400' },
  CANCELLED: { label: 'Cancelado', color: 'text-red-400' },
};

function OfflineBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400/40 dark:border-yellow-500/30 text-yellow-800 dark:text-yellow-300 text-sm mb-4">
      <WifiOff className="w-4 h-4 shrink-0" />
      {message}
    </div>
  );
}

export default function Orders() {
  const { orders, loading, error, isOffline, fetchOrders } = useOrderHistory();
  const addItem = useCart((s) => s.addItem);
  const { add: addToast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (loading) {
    return (
      <div className="py-4">
        <PageMeta title="Mis Pedidos" />
        <PageSkeleton variant="profile-list" />
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="text-center py-16">
        <PageMeta title="Mis Pedidos" />
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchOrders}
          className="text-sm text-gold-500 hover:text-gold-400 border border-gold-500/30 px-4 py-2 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <PageMeta title="Mis Pedidos" />
        <Package className="w-12 h-12 text-coffee-400 dark:text-coffee-600 mx-auto mb-4" />
        <p className="text-coffee-600 dark:text-coffee-400">Aún no tienes pedidos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageMeta title="Mis Pedidos" />
      {isOffline && <OfflineBanner message="Modo offline — pedidos guardados localmente." />}
      {orders.map((order: Order, i: number) => (
        <motion.div
          key={order.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <div className="min-w-0">
              <p className="text-coffee-900 dark:text-cream text-sm font-medium truncate">
                Pedido #{order.id.slice(-8).toUpperCase()}
              </p>
              <p className="text-coffee-600 dark:text-coffee-400 text-xs mt-0.5">
                {new Date(order.createdAt).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-gold-500 font-semibold">${order.total.toLocaleString('es-MX')}</p>
              <p
                className={`text-xs mt-0.5 ${statusLabels[order.status]?.color ?? 'text-coffee-400'}`}
              >
                {statusLabels[order.status]?.label ?? order.status}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            {order.items.map((item) => (
              <p key={item.id} className="text-coffee-700 dark:text-coffee-300 text-xs truncate">
                {item.product.name} × {item.quantity}
              </p>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-coffee-100 dark:border-coffee-800">
            <Link
              to={`/perfil/pedidos/${order.id}`}
              className="text-xs text-gold-500 hover:text-gold-400 border border-gold-500/30 px-3 py-1.5 transition-colors"
            >
              Ver detalle
            </Link>
            <button
              onClick={() => {
                order.items.forEach((item) => addItem(item.product, item.quantity));
                addToast('Productos agregados al carrito', 'success');
              }}
              className="flex items-center gap-1.5 text-xs text-coffee-700 dark:text-coffee-300 hover:text-coffee-900 dark:hover:text-cream border border-coffee-300 dark:border-coffee-700 px-3 py-1.5 transition-colors"
            >
              <ShoppingBag className="w-3 h-3" />
              Volver a pedir
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
