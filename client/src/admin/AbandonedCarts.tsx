import { useEffect, useState } from 'react';
import { ShoppingBag, Send, CheckCircle, Loader2 } from 'lucide-react';
import { PageMeta } from '../hooks/usePageMeta';
import { abandonedCartApi } from '../api';
import { useModuleToast } from './context/ModuleContext';
import Pagination from './components/Pagination';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import type { AbandonedCart } from '../types';

export default function AbandonedCarts() {
  const { addToast } = useModuleToast();
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [recoveringId, setRecoveringId] = useState<string | null>(null);

  const load = (p: number) => {
    setLoading(true);
    setListError('');
    abandonedCartApi.list(p)
      .then((res) => {
        setCarts(res.data.data);
        setTotal(res.data.total);
        setPage(res.data.page);
        setTotalPages(res.data.totalPages);
      })
      .catch(() => {
        setListError('Error al cargar carritos abandonados');
        addToast('Error al cargar carritos abandonados', 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page); }, [page]);

  const handleSendReminder = async (id: string) => {
    setSendingId(id);
    try {
      const res = await abandonedCartApi.sendReminder(id);
      if (res.data.success) {
        addToast('Recordatorio enviado', 'success');
        load(page);
      } else {
        addToast('No se pudo enviar el recordatorio (sin proveedor de correo)', 'info');
      }
    } catch {
      addToast('Error al enviar recordatorio', 'error');
    } finally {
      setSendingId(null);
    }
  };

  const handleRecover = async (id: string) => {
    setRecoveringId(id);
    try {
      await abandonedCartApi.recover(id);
      addToast('Carrito marcado como recuperado', 'success');
      load(page);
    } catch {
      addToast('Error al marcar como recuperado', 'error');
    } finally {
      setRecoveringId(null);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="p-8">
      <PageMeta title="Carritos Abandonados" noSuffix />
      <div className="flex items-center gap-3 mb-8">
        <ShoppingBag className="w-6 h-6 text-gold-500" />
        <div>
          <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Carritos Abandonados</h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mt-1">{total} carritos</p>
        </div>
      </div>

      {loading ? (
        <AdminSkeleton rows={5} />
      ) : listError ? (
        <AdminErrorState error={listError} onRetry={() => load(page)} />
      ) : carts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingBag className="w-12 h-12 text-coffee-300 dark:text-coffee-600 mb-4" />
          <p className="text-coffee-500 dark:text-coffee-400">No hay carritos abandonados.</p>
        </div>
      ) : (
        <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-coffee-200 dark:border-coffee-800 text-coffee-600 dark:text-coffee-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Email</th>
                <th className="text-left px-4 py-3 font-medium">Artículos</th>
                <th className="text-left px-4 py-3 font-medium">Cupón</th>
                <th className="text-left px-4 py-3 font-medium">Recordatorios</th>
                <th className="text-left px-4 py-3 font-medium">Estado</th>
                <th className="text-left px-4 py-3 font-medium">Creado</th>
                <th className="text-left px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {carts.map((c) => {
                let itemsCount = 0;
                try { const parsed = JSON.parse(c.items); itemsCount = Array.isArray(parsed) ? parsed.length : 0; } catch {}
                return (
                  <tr key={c.id} className="border-b border-coffee-200 dark:border-coffee-800 hover:bg-coffee-200/50 dark:hover:bg-coffee-800/30">
                    <td className="px-4 py-3 text-coffee-900 dark:text-cream font-medium">{c.email}</td>
                    <td className="px-4 py-3 text-coffee-600 dark:text-coffee-400">{itemsCount} productos</td>
                    <td className="px-4 py-3 text-coffee-600 dark:text-coffee-400">{c.couponCode || '—'}</td>
                    <td className="px-4 py-3 text-coffee-600 dark:text-coffee-400">
                      {c.reminderCount > 0 ? (
                        <span>{c.reminderCount} ({c.reminderSentAt ? formatDate(c.reminderSentAt) : ''})</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium ${
                        c.recovered
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}>
                        {c.recovered ? 'Recuperado' : 'Abandonado'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-coffee-500 text-xs">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!c.recovered && (
                          <>
                            <button
                              onClick={() => handleSendReminder(c.id)}
                              disabled={sendingId === c.id}
                              className="flex items-center gap-1 text-coffee-600 dark:text-coffee-400 hover:text-gold-500 transition-colors text-xs disabled:opacity-50"
                              aria-label="Enviar recordatorio"
                            >
                              {sendingId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              Recordatorio
                            </button>
                            <button
                              onClick={() => handleRecover(c.id)}
                              disabled={recoveringId === c.id}
                              className="flex items-center gap-1 text-coffee-600 dark:text-coffee-400 hover:text-green-500 transition-colors text-xs disabled:opacity-50"
                              aria-label="Marcar recuperado"
                            >
                              {recoveringId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                              Recuperado
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
