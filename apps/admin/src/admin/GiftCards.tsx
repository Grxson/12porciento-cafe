import { useState } from 'react';
import { CreditCard, ToggleLeft, ToggleRight, Download } from 'lucide-react';
import { useModuleToast } from './context/ModuleContext';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import ConfirmDialog from './components/ConfirmDialog';
import Pagination from './components/Pagination';
import { PageMeta } from '../hooks/usePageMeta';
import { useGiftCardsQuery } from './hooks/useGiftCardsQuery';
import { exportToCsv } from './utils/csvExport';
import type { GiftCard } from '../types';

export default function AdminGiftCards() {
  const { addToast } = useModuleToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{ id: string; gc: GiftCard } | null>(null);

  const { items, total, totalPages, loading, error, refetch, toggle } = useGiftCardsQuery(
    page,
    search || undefined,
  );

  const handleToggleClick = (gc: GiftCard) => {
    if (gc.isActive) {
      setConfirmToggle({ id: gc.id, gc });
    } else {
      doToggle(gc.id, true);
    }
  };

  const doToggle = async (id: string, newState: boolean) => {
    setTogglingId(id);
    try {
      await toggle(id, newState);
      addToast(`Gift card ${newState ? 'activada' : 'desactivada'}`, 'success');
    } catch {
      addToast('Error al cambiar estado', 'error');
    } finally {
      setTogglingId(null);
      setConfirmToggle(null);
    }
  };

  return (
    <div>
      <PageMeta title="Gift Cards" noSuffix />
      <div className="flex items-center gap-3 mb-8">
        <CreditCard className="w-6 h-6 text-gold-500" />
        <div>
          <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Gift Cards</h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mt-1">{total} gift cards</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() =>
            exportToCsv(items, 'gift-cards', [
              { key: 'code', label: 'Código' },
              { key: 'initialAmount', label: 'Monto inicial' },
              { key: 'balance', label: 'Saldo' },
              { key: 'senderName', label: 'Remitente' },
              { key: 'recipientName', label: 'Destinatario' },
              { key: 'isActive', label: 'Activa' },
            ])
          }
          className="flex items-center gap-1.5 px-3 py-2 border border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 text-sm hover:text-coffee-900 dark:hover:text-cream transition-colors"
          title="Exportar CSV"
        >
          <Download size={14} /> CSV
        </button>
      </div>

      {loading ? (
        <AdminSkeleton rows={5} />
      ) : error ? (
        <AdminErrorState error="Error al cargar gift cards" onRetry={() => refetch()} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CreditCard className="w-12 h-12 text-coffee-300 dark:text-coffee-600 mb-4" />
          <p className="text-coffee-500 dark:text-coffee-400">No hay gift cards.</p>
        </div>
      ) : (
        <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-200 dark:border-coffee-800">
                  <th className="text-left text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest px-4 py-3 font-medium">
                    Código
                  </th>
                  <th className="text-left text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest px-4 py-3 font-medium">
                    Monto
                  </th>
                  <th className="text-left text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest px-4 py-3 font-medium">
                    Saldo
                  </th>
                  <th className="text-left text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest px-4 py-3 font-medium">
                    Remitente
                  </th>
                  <th className="text-left text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest px-4 py-3 font-medium">
                    Destinatario
                  </th>
                  <th className="text-left text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest px-4 py-3 font-medium">
                    Estado
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((g) => (
                  <tr
                    key={g.id}
                    className="border-b border-coffee-200/50 dark:border-coffee-800/50 hover:bg-coffee-200/30 dark:hover:bg-coffee-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-coffee-900 dark:text-cream font-medium">
                      {g.code}
                    </td>
                    <td className="px-4 py-3 text-gold-500 font-medium">${g.initialAmount}</td>
                    <td className="px-4 py-3 text-coffee-600 dark:text-coffee-400">${g.balance}</td>
                    <td className="px-4 py-3 text-coffee-600 dark:text-coffee-400">
                      {g.senderName || g.sender?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-coffee-600 dark:text-coffee-400">
                      {g.recipientName || g.recipient?.name || g.recipientEmail || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium ${g.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}
                      >
                        {g.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleClick(g)}
                        disabled={togglingId === g.id}
                        className="transition-colors disabled:opacity-50"
                      >
                        {g.isActive ? (
                          <ToggleRight className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-coffee-600 dark:text-coffee-400" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <ConfirmDialog
        open={!!confirmToggle}
        title="Desactivar gift card"
        message={`¿Desactivar la gift card ${confirmToggle?.gc.code}? Los usuarios no podrán usarla.`}
        confirmText="Desactivar"
        isDangerous
        loading={togglingId !== null}
        onConfirm={() => {
          if (confirmToggle) {
            doToggle(confirmToggle.id, false);
          }
        }}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
}
