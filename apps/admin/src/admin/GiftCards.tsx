import { useState, useCallback, useEffect } from 'react';
import { Gift, ToggleLeft, ToggleRight, Search } from 'lucide-react';
import { giftCardsApi } from '../api';
import { useModuleToast } from './context/ModuleContext';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import Pagination from './components/Pagination';
import { PageMeta } from '../hooks/usePageMeta';
import type { GiftCard } from '../types';

export default function AdminGiftCards() {
  const { addToast } = useModuleToast();
  const [items, setItems] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchItems = useCallback(
    async (p: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await giftCardsApi.list();
        const all = res.data as { data: GiftCard[] };
        const filtered = search
          ? all.data.filter(
              (g) =>
                g.code.toLowerCase().includes(search.toLowerCase()) ||
                g.recipientName?.toLowerCase().includes(search.toLowerCase()) ||
                g.recipientEmail?.toLowerCase().includes(search.toLowerCase()),
            )
          : all.data;
        const ps = 20;
        const start = (p - 1) * ps;
        setItems(filtered.slice(start, start + ps));
        setTotalPages(Math.ceil(filtered.length / ps));
        setTotal(filtered.length);
        setPage(p);
      } catch {
        setError('Error al cargar gift cards');
      } finally {
        setLoading(false);
      }
    },
    [search],
  );

  useEffect(() => {
    fetchItems(1);
  }, [fetchItems]);

  const toggleActive = async (g: GiftCard) => {
    try {
      await giftCardsApi.toggle(g.id, !g.isActive);
      addToast(`Gift card ${g.code} ${!g.isActive ? 'activada' : 'desactivada'}`, 'success');
      fetchItems(page);
    } catch {
      addToast('Error al cambiar estado', 'error');
    }
  };

  return (
    <div>
      <PageMeta title="Gift Cards" noSuffix />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Gift Cards</h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mt-1">{total} gift cards</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-500" />
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por codigo, destinatario..."
          className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-gold-500/50"
        />
      </div>

      {loading ? (
        <AdminSkeleton rows={5} />
      ) : error ? (
        <AdminErrorState error={error} onRetry={() => fetchItems(page)} />
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-coffee-500 dark:text-cream/50">
          <Gift className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No hay gift cards{search ? ' que coincidan' : ''}</p>
        </div>
      ) : (
        <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-200 dark:border-coffee-800">
                  <th className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">
                    Codigo
                  </th>
                  <th className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">
                    Monto
                  </th>
                  <th className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">
                    Saldo
                  </th>
                  <th className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">
                    Remitente
                  </th>
                  <th className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">
                    Destinatario
                  </th>
                  <th className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">
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
                      <button onClick={() => toggleActive(g)} className="transition-colors">
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

      <Pagination page={page} totalPages={totalPages} onChange={fetchItems} />
    </div>
  );
}
