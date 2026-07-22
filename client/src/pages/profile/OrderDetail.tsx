import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Check,
  Truck,
  Clock,
  MapPin,
  RotateCcw,
  PackageCheck,
} from 'lucide-react';
import { usersApi } from '../../api';
import PageSkeleton from '../../components/PageSkeleton';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { PageMeta } from '../../hooks/usePageMeta';
import type { Order } from '../../types';

const STEPS = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

const STEP_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  PROCESSING: 'Procesando',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
};

const STEP_ICONS: Record<string, typeof Clock> = {
  PENDING: Clock,
  PROCESSING: Package,
  SHIPPED: Truck,
  DELIVERED: Check,
};

const statusBadge: Record<string, { label: string; color: string }> = {
  PENDING: {
    label: 'Pendiente',
    color:
      'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 border-yellow-200 dark:border-yellow-500/20',
  },
  PROCESSING: {
    label: 'Procesando',
    color:
      'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20',
  },
  SHIPPED: {
    label: 'Enviado',
    color:
      'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20',
  },
  DELIVERED: {
    label: 'Entregado',
    color:
      'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20',
  },
  CANCELLED: {
    label: 'Cancelado',
    color:
      'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20',
  },
};

function StatusTimeline({ currentStatus }: { currentStatus: string }) {
  const currentIdx = STEPS.indexOf(currentStatus as (typeof STEPS)[number]);

  if (currentStatus === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 py-3 px-4 rounded-lg bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/10">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        <span className="text-sm font-medium text-red-600 dark:text-red-400">Pedido cancelado</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* connecting line */}
      <div className="absolute left-[17px] top-3 bottom-3 w-0.5 bg-coffee-200 dark:bg-coffee-700" />

      <div className="space-y-0">
        {STEPS.map((step, idx) => {
          const Icon = STEP_ICONS[step];
          const isCompleted = idx < currentIdx;
          const isActive = idx === currentIdx;
          const _isPending = idx > currentIdx;

          return (
            <div key={step} className="flex items-start gap-4 pb-6 last:pb-0 relative">
              {/* dot */}
              <div className="relative z-10 shrink-0">
                {isCompleted ? (
                  <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                ) : isActive ? (
                  <div className="w-9 h-9 rounded-full bg-gold-500 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-coffee-900" />
                    <span className="absolute inset-0 rounded-full bg-gold-500 animate-ping opacity-30" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-coffee-100 dark:bg-coffee-800 border border-coffee-300 dark:border-coffee-700 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-coffee-400 dark:text-coffee-500" />
                  </div>
                )}
              </div>

              {/* label */}
              <div className="min-h-9 flex items-center">
                <span
                  className={`text-sm font-medium ${
                    isCompleted
                      ? 'text-green-600 dark:text-green-400'
                      : isActive
                        ? 'text-gold-600 dark:text-gold-400'
                        : 'text-coffee-400 dark:text-coffee-500'
                  }`}
                >
                  {STEP_LABELS[step]}
                  {isActive && (
                    <span className="ml-2 text-xs text-gold-500/70 font-normal">(Actual)</span>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reordering, setReordering] = useState(false);
  const addItem = useCart((s) => s.addItem);
  const addToast = useToast((s) => s.add);

  const load = () => {
    if (!id) return;
    setLoading(true);
    setError('');
    usersApi
      .myOrder(id)
      .then((r) => {
        setOrder(r.data);
      })
      .catch(() => {
        setError('No se pudo cargar el pedido.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleReorder = async () => {
    if (!order) return;
    setReordering(true);
    try {
      for (const item of order.items) {
        addItem(item.product, item.quantity);
      }
      addToast('Productos agregados al carrito', 'success');
    } catch {
      addToast('Error al reordenar', 'error');
    } finally {
      setReordering(false);
    }
  };

  const displayId = order ? `#${order.id.slice(-8).toUpperCase()}` : '';

  // ── Loading ──
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <PageMeta title="Cargando pedido..." />
        <PageSkeleton variant="profile-list" />
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="text-center py-16">
        <PageMeta title="Error" />
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={load}
          className="text-sm text-gold-500 hover:text-gold-400 border border-gold-500/30 px-4 py-2 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // ── Not found ──
  if (!order) {
    return (
      <div className="text-center py-16">
        <PageMeta title="Pedido no encontrado" />
        <Package className="w-12 h-12 text-coffee-400 dark:text-coffee-600 mx-auto mb-4" />
        <p className="text-coffee-600 dark:text-coffee-400 mb-4">Pedido no encontrado.</p>
        <Link
          to="/perfil/pedidos"
          className="text-sm text-gold-500 hover:text-gold-400 border border-gold-500/30 px-4 py-2 transition-colors"
        >
          Volver a mis pedidos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageMeta title={`Pedido ${displayId}`} />

      {/* Back link */}
      <Link
        to="/perfil/pedidos"
        className="inline-flex items-center gap-1.5 text-sm text-coffee-500 dark:text-coffee-400 hover:text-gold-500 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a mis pedidos
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
          <h1 className="text-xl font-bold text-coffee-900 dark:text-cream">Pedido {displayId}</h1>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusBadge[order.status]?.color ?? 'text-coffee-400 border-coffee-300 dark:border-coffee-700'}`}
          >
            {statusBadge[order.status]?.label ?? order.status}
          </span>
        </div>
        <p className="text-sm text-coffee-500 dark:text-coffee-400">
          {new Date(order.createdAt).toLocaleDateString('es-MX', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {/* Items */}
      <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-5 sm:p-8">
        <h2 className="text-sm font-semibold text-coffee-900 dark:text-cream uppercase tracking-wider mb-4">
          Productos
        </h2>
        <div className="divide-y divide-coffee-100 dark:divide-coffee-800">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-coffee-100 dark:bg-coffee-800 shrink-0">
                {item.product.imageUrl ? (
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-coffee-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/productos/${item.product.slug}`}
                  className="text-sm font-medium text-coffee-900 dark:text-cream hover:text-gold-500 transition-colors truncate block"
                >
                  {item.product.name}
                </Link>
                <p className="text-xs text-coffee-500 dark:text-coffee-400 mt-0.5">
                  Cantidad: {item.quantity} × ${item.price.toLocaleString('es-MX')}
                </p>
              </div>
              <p className="text-sm font-semibold text-coffee-900 dark:text-cream shrink-0">
                ${(item.price * item.quantity).toLocaleString('es-MX')}
              </p>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="border-t border-coffee-200 dark:border-coffee-800 mt-4 pt-4 space-y-1">
          <div className="flex justify-between text-sm text-coffee-600 dark:text-coffee-400">
            <span>Subtotal</span>
            <span>${order.total.toLocaleString('es-MX')}</span>
          </div>
          <div className="flex justify-between text-sm text-coffee-600 dark:text-coffee-400">
            <span>Envío</span>
            <span className="text-green-600 dark:text-green-400">Gratis</span>
          </div>
          <div className="flex justify-between text-base font-bold text-coffee-900 dark:text-cream pt-2 border-t border-coffee-100 dark:border-coffee-800">
            <span>Total</span>
            <span>${order.total.toLocaleString('es-MX')}</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-5 sm:p-8">
        <h2 className="text-sm font-semibold text-coffee-900 dark:text-cream uppercase tracking-wider mb-5">
          Estado del pedido
        </h2>
        <StatusTimeline currentStatus={order.status} />
      </div>

      {/* Tracking */}
      {order.trackingNumber && (
        <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-5 sm:p-8">
          <h2 className="text-sm font-semibold text-coffee-900 dark:text-cream uppercase tracking-wider mb-3 flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-coffee-400" />
            Información de envío
          </h2>
          <div className="text-sm text-coffee-700 dark:text-coffee-300 space-y-1">
            <p>
              Número de rastreo:{' '}
              <span className="font-medium text-coffee-900 dark:text-cream">
                {order.trackingNumber}
              </span>
            </p>
            {order.carrier && (
              <p>
                Paquetería:{' '}
                <span className="font-medium text-coffee-900 dark:text-cream">{order.carrier}</span>
              </p>
            )}
            {order.estimatedDelivery && (
              <p>
                Entrega estimada:{' '}
                <span className="font-medium text-coffee-900 dark:text-cream">
                  {new Date(order.estimatedDelivery).toLocaleDateString('es-MX', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Shipping */}
      {order.address && (
        <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-5 sm:p-8">
          <h2 className="text-sm font-semibold text-coffee-900 dark:text-cream uppercase tracking-wider mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-coffee-400" />
            Dirección de envío
          </h2>
          <div className="text-sm text-coffee-700 dark:text-coffee-300 space-y-0.5">
            <p className="font-medium text-coffee-900 dark:text-cream">{order.customerName}</p>
            <p>{order.address}</p>
            <p>
              {order.city}, {order.state} {order.zipCode}
            </p>
            {order.phone && (
              <p className="text-coffee-500 dark:text-coffee-400">Tel: {order.phone}</p>
            )}
            {order.email && <p className="text-coffee-500 dark:text-coffee-400">{order.email}</p>}
          </div>
        </div>
      )}

      {/* Reorder */}
      {order.status !== 'CANCELLED' && (
        <div className="flex justify-center sm:justify-start">
          <button
            onClick={handleReorder}
            disabled={reordering}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 hover:bg-gold-400 disabled:bg-gold-500/50 text-coffee-900 font-medium text-sm transition-colors rounded-lg"
          >
            {reordering ? (
              <div className="w-4 h-4 border-2 border-coffee-900/30 border-t-coffee-900 rounded-full animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            {reordering ? 'Agregando...' : 'Reordenar'}
          </button>
        </div>
      )}
    </div>
  );
}
