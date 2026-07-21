import { useEffect, useState } from 'react';
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  XCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Download,
  History,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import api from '../api';
import { useModuleToast } from './context/ModuleContext';
import QuickAdjustPopover from './components/QuickAdjustPopover';
import { resolveImageUrl } from '@12porciento/shared';
import SearchableProductSelect from '../components/SearchableProductSelect';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import AdminModal from './components/AdminModal';
import Pagination from './components/Pagination';
import { PageMeta } from '../hooks/usePageMeta';
import { useChartColors } from '../hooks/useChartColors';
import CollapsibleChart from './components/CollapsibleChart';
import { getApiError } from '@12porciento/shared';
import {
  useInventoryOverviewQuery,
  useInventoryMovementsQuery,
  useInventoryAlertsQuery,
  useProductMovementsQuery,
  useAdjustStockMutation,
  useUpdateThresholdMutation,
  type InventoryProduct,
} from './hooks/useInventoryQuery';

// ── Constants ─────────────────────────────────────────────────────────────

const MOVEMENT_TYPES: Record<
  string,
  { label: string; color: string; icon: React.FC<{ className?: string }> }
> = {
  SALE: { label: 'Venta', color: 'text-red-600 dark:text-red-400', icon: ArrowDownCircle },
  RESTOCK: { label: 'Reabasto', color: 'text-green-600 dark:text-green-400', icon: ArrowUpCircle },
  ADJUSTMENT: {
    label: 'Ajuste',
    color: 'text-blue-700 dark:text-blue-400',
    icon: SlidersHorizontal,
  },
  LOSS: { label: 'Merma', color: 'text-orange-600 dark:text-orange-400', icon: TrendingDown },
  RETURN: { label: 'Devolución', color: 'text-purple-700 dark:text-purple-400', icon: TrendingUp },
  INITIAL: { label: 'Inicial', color: 'text-coffee-600 dark:text-coffee-400', icon: Package },
};

const STATUS_CONFIG = {
  OK: {
    label: 'OK',
    cls: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border-green-500/30',
  },
  LOW: {
    label: 'Bajo',
    cls: 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 border-yellow-600 dark:border-yellow-500/30',
  },
  OUT: {
    label: 'Agotado',
    cls: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border-red-500/30',
  },
};

// ── Main Component ────────────────────────────────────────────────────────

export default function Inventory() {
  const [tab, setTab] = useState<'overview' | 'movements' | 'adjust' | 'alerts'>('overview');
  const [movPage, setMovPage] = useState(1);
  const [filterType, setFilterType] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [search, setSearch] = useState('');
  const { addToast } = useModuleToast();
  const chartColors = useChartColors();

  // Adjust form
  const [adjProduct, setAdjProduct] = useState('');
  const [adjType, setAdjType] = useState<'RESTOCK' | 'ADJUSTMENT' | 'LOSS' | 'RETURN'>('RESTOCK');
  const [adjQty, setAdjQty] = useState('');
  const [adjNotes, setAdjNotes] = useState('');

  // New batch/cost fields for adjust form
  const [adjUnitCost, setAdjUnitCost] = useState('');
  const [adjBatchNumber, setAdjBatchNumber] = useState('');
  const [adjExpiryDate, setAdjExpiryDate] = useState('');
  const [adjSupplier, setAdjSupplier] = useState('');

  // Per-product movement history modal
  const [historyProduct, setHistoryProduct] = useState<InventoryProduct | null>(null);
  const [quickAdjustId, setQuickAdjustId] = useState<string | null>(null);

  const {
    summary,
    products,
    loading,
    error: overviewErrorFlag,
    refetch: loadOverview,
    patchProductStock,
  } = useInventoryOverviewQuery();
  const overviewError = overviewErrorFlag ? 'Error al cargar inventario' : '';
  const error = '';

  const {
    movements,
    total: movTotal,
    totalPages: movTotalPages,
    loading: movLoading,
  } = useInventoryMovementsQuery(
    { page: movPage, filterType, filterProduct, filterFrom, filterTo },
    tab === 'movements',
  );

  const { alerts } = useInventoryAlertsQuery(tab === 'alerts');
  const { movements: historyMovements, loading: historyLoading } = useProductMovementsQuery(
    historyProduct?.id ?? null,
  );

  const adjustMutation = useAdjustStockMutation();

  useEffect(() => {
    setMovPage(1);
  }, [filterType, filterProduct, filterFrom, filterTo]);

  const openHistory = (p: InventoryProduct) => setHistoryProduct(p);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjProduct || !adjQty) return;
    try {
      await adjustMutation.mutateAsync({
        productId: adjProduct,
        type: adjType,
        quantity: parseInt(adjQty),
        notes: adjNotes || undefined,
        unitCost: adjUnitCost ? parseFloat(adjUnitCost) : undefined,
        batchNumber: adjBatchNumber || undefined,
        expiryDate: adjExpiryDate || undefined,
        supplier: adjSupplier || undefined,
      });
      addToast(`Stock ajustado exitosamente`, 'success');
      setAdjQty('');
      setAdjNotes('');
      setAdjProduct('');
      setAdjUnitCost('');
      setAdjBatchNumber('');
      setAdjExpiryDate('');
      setAdjSupplier('');
    } catch (err: unknown) {
      addToast(getApiError(err, 'Error al ajustar stock'), 'error');
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await api.get('/inventory/export-csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `inventario-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      addToast('Error al exportar inventario', 'error');
    }
  };

  const filteredProducts = products.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const fmt = (n: number) => n.toLocaleString('es-MX');
  const fmtCurrency = (n: number) =>
    `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div>
      <PageMeta title="Inventario" noSuffix />
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Inventario</h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mt-1">
            Control de stock, existencias y movimientos
          </p>
        </div>
        <button
          onClick={() => loadOverview()}
          className="flex items-center gap-2 text-xs text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream border border-coffee-300 dark:border-coffee-700 px-3 py-2 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            {
              label: 'SKUs activos',
              value: summary.activeSKUs,
              sub: `de ${summary.totalSKUs}`,
              icon: Package,
              color: 'text-coffee-700 dark:text-coffee-300',
            },
            {
              label: 'Unidades totales',
              value: fmt(summary.totalUnits),
              icon: TrendingUp,
              color: 'text-blue-700 dark:text-blue-400',
            },
            {
              label: 'Valor inventario',
              value: fmtCurrency(summary.totalValue),
              icon: TrendingUp,
              color: 'text-gold-500',
            },
            {
              label: 'Stock bajo',
              value: summary.lowStockCount,
              icon: AlertTriangle,
              color: 'text-yellow-700 dark:text-yellow-400',
              alert: summary.lowStockCount > 0,
            },
            {
              label: 'Sin stock',
              value: summary.outOfStockCount,
              icon: XCircle,
              color: 'text-red-600 dark:text-red-400',
              alert: summary.outOfStockCount > 0,
            },
          ].map(({ label, value, sub, icon: Icon, color, alert }) => (
            <div
              key={label}
              className={`bg-coffee-100 dark:bg-coffee-900 border p-4 ${alert ? 'border-yellow-500/30' : 'border-coffee-200 dark:border-coffee-800'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-coffee-500 dark:text-coffee-400 text-xs uppercase tracking-widest">
                  {label}
                </p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`font-serif text-2xl font-bold ${color}`}>{value}</p>
              {sub && <p className="text-coffee-600 dark:text-coffee-400 text-xs mt-0.5">{sub}</p>}
            </div>
          ))}
          <button
            onClick={() => setTab('adjust')}
            className="bg-gold-500/10 border border-gold-500/30 hover:bg-gold-500/20 p-4 transition-colors text-left"
          >
            <p className="text-coffee-600 dark:text-coffee-400 text-xs uppercase tracking-widest mb-2">
              Acción rápida
            </p>
            <p className="text-gold-400 text-sm font-medium">Ajustar stock →</p>
          </button>
        </div>
      )}

      {/* Stock Levels Bar Chart */}
      {products.length > 0 && (
        <CollapsibleChart id="inventory-stock-levels" title="Niveles de stock por producto">
          <ResponsiveContainer
            width="100%"
            height={Math.max(240, products.filter((p) => p.isActive).slice(0, 12).length * 44)}
          >
            <BarChart
              data={products
                .filter((p) => p.isActive)
                .sort((a, b) => b.stock - a.stock)
                .slice(0, 12)
                .map((p) => ({
                  name: p.name.length > 18 ? p.name.slice(0, 16) + '…' : p.name,
                  stock: p.stock,
                  umbral: p.lowStockThreshold,
                }))}
              margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: chartColors.text, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: chartColors.text, fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                width={140}
              />
              <Tooltip
                contentStyle={{
                  background: chartColors.tooltipBg,
                  border: `1px solid ${chartColors.tooltipBorder}`,
                  borderRadius: 0,
                }}
                labelStyle={{ color: chartColors.gold, fontSize: 11 }}
                itemStyle={{ color: chartColors.tooltipText, fontSize: 12 }}
                formatter={(v, name) => [`${v} unidades`, name === 'umbral' ? 'Umbral' : 'Stock']}
              />
              {/* Umbral as thin reference bar */}
              <Bar dataKey="umbral" fill="#e8d5b7" radius={0} barSize={4} />
              {/* Stock as main thick bar */}
              <Bar dataKey="stock" fill={chartColors.gold} radius={[0, 6, 6, 0]} barSize={22}>
                <LabelList
                  dataKey="stock"
                  position="right"
                  formatter={(v) => `${v}`}
                  style={{ fill: chartColors.text, fontSize: 11, fontWeight: 500 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CollapsibleChart>
      )}

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-coffee-200 dark:border-coffee-800 mb-6">
        {(
          [
            { id: 'overview', label: 'Resumen' },
            { id: 'movements', label: 'Movimientos' },
            { id: 'adjust', label: 'Ajustar stock' },
            { id: 'alerts', label: 'Alertas' },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === id
                ? 'border-gold-500 text-gold-500'
                : 'border-transparent text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {tab === 'overview' &&
        (overviewError ? (
          <>
            <AdminErrorState error={overviewError} onRetry={loadOverview} />
            <AdminSkeleton rows={4} />
          </>
        ) : loading ? (
          <AdminSkeleton rows={4} />
        ) : error ? (
          <AdminErrorState error={error} onRetry={loadOverview} />
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-500 dark:text-coffee-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar producto..."
                  className="w-full bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 text-coffee-900 dark:text-cream text-sm pl-9 pr-3 py-2 focus:border-gold-500/50 focus:outline-none"
                />
              </div>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-2 text-xs border border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream hover:border-coffee-400 dark:hover:border-coffee-600 transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </button>
            </div>
            <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-coffee-200 dark:border-coffee-800">
                      {[
                        'Producto',
                        'Categoría',
                        'Stock actual',
                        'Valor',
                        'Umbral',
                        'Estado',
                        'Acciones',
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest px-4 py-3"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => {
                      const s = STATUS_CONFIG[p.status];
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-coffee-200/50 dark:border-coffee-800/50 hover:bg-coffee-100 dark:hover:bg-coffee-800/20 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={resolveImageUrl(p.imageUrl)}
                                alt={p.name}
                                className="w-9 h-9 object-cover shrink-0"
                              />
                              <div>
                                <p className="text-coffee-900 dark:text-cream text-sm font-medium leading-tight">
                                  {p.name}
                                </p>
                                {!p.isActive && (
                                  <span className="text-xs text-coffee-600 dark:text-coffee-400">
                                    Inactivo
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-xs border border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 px-2 py-0.5">
                              {p.category}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-lg font-bold font-serif ${
                                p.status === 'OUT'
                                  ? 'text-red-600 dark:text-red-400'
                                  : p.status === 'LOW'
                                    ? 'text-yellow-600 dark:text-yellow-400'
                                    : 'text-coffee-900 dark:text-cream'
                              }`}
                            >
                              {p.stock}
                            </span>
                            <span className="text-coffee-600 dark:text-coffee-400 text-xs ml-1">
                              uds.
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-coffee-700 dark:text-coffee-300 text-sm">
                            {fmtCurrency(p.inventoryValue)}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <ThresholdEditor productId={p.id} current={p.lowStockThreshold} />
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 border ${s.cls}`}>{s.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative flex items-center gap-2">
                              <button
                                onClick={() =>
                                  setQuickAdjustId(quickAdjustId === p.id ? null : p.id)
                                }
                                className="text-xs text-gold-500 hover:text-gold-400 border border-gold-500/30 px-3 py-1 transition-colors"
                              >
                                Ajuste rápido
                              </button>
                              <button
                                onClick={() => openHistory(p)}
                                title="Ver historial de movimientos"
                                className="text-xs text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream border border-coffee-300 dark:border-coffee-700 px-2 py-1 transition-colors"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                              {quickAdjustId === p.id && (
                                <QuickAdjustPopover
                                  productId={p.id}
                                  productName={p.name}
                                  currentStock={p.stock}
                                  onClose={() => setQuickAdjustId(null)}
                                  onDone={(newStock) => patchProductStock(p.id, newStock)}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="text-center py-12 text-coffee-500 dark:text-coffee-400"
                        >
                          Sin productos
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ))}

      {/* ── Movements tab ── */}
      {tab === 'movements' && (
        <div>
          {/* Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:border-gold-500/50 focus:outline-none"
            >
              <option value="">Todos los tipos</option>
              {Object.entries(MOVEMENT_TYPES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
            <SearchableProductSelect
              value={filterProduct}
              onChange={(id) => setFilterProduct(id)}
              initialLabel="Todos los productos"
            />
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:border-gold-500/50 focus:outline-none"
            />
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:border-gold-500/50 focus:outline-none"
            />
          </div>

          {movLoading ? (
            <AdminSkeleton rows={4} />
          ) : (
            <>
              <div className="text-coffee-500 dark:text-coffee-400 text-xs mb-3">
                {movTotal} movimientos
              </div>
              <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-coffee-200 dark:border-coffee-800">
                        {['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Antes → Después', 'Notas'].map(
                          (h) => (
                            <th
                              key={h}
                              className="text-left text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest px-4 py-3"
                            >
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((m) => {
                        const mt = MOVEMENT_TYPES[m.type] ?? MOVEMENT_TYPES.ADJUSTMENT;
                        const Icon = mt.icon;
                        return (
                          <tr
                            key={m.id}
                            className="border-b border-coffee-200/50 dark:border-coffee-800/50 hover:bg-coffee-100 dark:hover:bg-coffee-800/20 transition-colors"
                          >
                            <td className="px-4 py-3 text-coffee-600 dark:text-coffee-400 text-xs whitespace-nowrap">
                              {new Date(m.createdAt).toLocaleString('es-MX', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3">
                              {m.product && (
                                <div className="flex items-center gap-2">
                                  <img
                                    src={m.product.imageUrl}
                                    className="w-7 h-7 object-cover shrink-0"
                                    alt=""
                                  />
                                  <span className="text-coffee-900 dark:text-cream text-xs truncate max-w-[120px]">
                                    {m.product.name}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className={`flex items-center gap-1.5 ${mt.color}`}>
                                <Icon className="w-3.5 h-3.5" />
                                <span className="text-xs font-medium">{mt.label}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-sm font-bold ${m.quantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                              >
                                {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-coffee-600 dark:text-coffee-400 text-xs">
                              {m.previousStock} →{' '}
                              <span className="text-coffee-900 dark:text-cream font-medium">
                                {m.newStock}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-coffee-500 dark:text-coffee-400 text-xs max-w-[180px] truncate">
                              {m.notes ?? '—'}
                            </td>
                          </tr>
                        );
                      })}
                      {movements.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-12 text-coffee-500 dark:text-coffee-400"
                          >
                            Sin movimientos
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {movTotalPages > 1 && (
                <div>
                  <Pagination
                    page={movPage}
                    totalPages={movTotalPages}
                    onChange={(p) => setMovPage(p)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Adjust tab ── */}
      {tab === 'adjust' && (
        <div className="max-w-xl">
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-6">
            Registra ingresos, mermas, devoluciones o ajustes manuales. Cada cambio queda en el
            historial de movimientos.
          </p>
          <form
            onSubmit={handleAdjust}
            className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6 space-y-5"
          >
            <div>
              <label
                htmlFor="inventory-product"
                className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2"
              >
                Producto *
              </label>
              <SearchableProductSelect
                value={adjProduct}
                onChange={(id) => setAdjProduct(id)}
                initialLabel="Seleccionar producto"
              />
            </div>

            <div>
              <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2">
                Tipo de movimiento *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    {
                      value: 'RESTOCK',
                      label: 'Reabasto',
                      desc: 'Entrada de mercancía',
                      color: 'text-green-600 dark:text-green-400',
                      icon: ArrowUpCircle,
                    },
                    {
                      value: 'LOSS',
                      label: 'Merma',
                      desc: 'Pérdida / vencimiento',
                      color: 'text-orange-600 dark:text-orange-400',
                      icon: TrendingDown,
                    },
                    {
                      value: 'RETURN',
                      label: 'Devolución',
                      desc: 'Regreso de cliente',
                      color: 'text-purple-700 dark:text-purple-400',
                      icon: TrendingUp,
                    },
                    {
                      value: 'ADJUSTMENT',
                      label: 'Ajuste',
                      desc: 'Corrección de conteo',
                      color: 'text-blue-700 dark:text-blue-400',
                      icon: SlidersHorizontal,
                    },
                  ] as const
                ).map(({ value, label, desc, color, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAdjType(value)}
                    className={`flex items-start gap-2.5 p-3 border text-left transition-all ${
                      adjType === value
                        ? 'border-gold-500/60 bg-gold-500/5'
                        : 'border-coffee-300 dark:border-coffee-700 hover:border-coffee-400 dark:hover:border-coffee-600'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${color}`} />
                    <div>
                      <p className="text-coffee-900 dark:text-cream text-xs font-medium">{label}</p>
                      <p className="text-coffee-500 dark:text-coffee-400 text-xs">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="inventory-qty"
                className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2"
              >
                Cantidad *
                <span className="text-coffee-600 dark:text-coffee-400 ml-2 normal-case tracking-normal">
                  {adjType === 'ADJUSTMENT'
                    ? '(+ para agregar, − para quitar)'
                    : '(número positivo)'}
                </span>
              </label>
              <input
                id="inventory-qty"
                type="number"
                value={adjQty}
                onChange={(e) => setAdjQty(e.target.value)}
                required
                min={adjType === 'ADJUSTMENT' ? undefined : 1}
                placeholder={adjType === 'ADJUSTMENT' ? 'ej: -5 o 10' : 'ej: 50'}
                className="w-full bg-white dark:bg-coffee-800 border border-coffee-300 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2.5 text-sm focus:border-gold-500/60 focus:outline-none"
              />
              {adjProduct &&
                adjQty &&
                (() => {
                  const p = products.find((x) => x.id === adjProduct);
                  if (!p) return null;
                  const delta =
                    adjType === 'RESTOCK' || adjType === 'RETURN'
                      ? Math.abs(parseInt(adjQty))
                      : adjType === 'LOSS'
                        ? -Math.abs(parseInt(adjQty))
                        : parseInt(adjQty);
                  const newStock = p.stock + (isNaN(delta) ? 0 : delta);
                  return (
                    <p
                      className={`text-xs mt-1 ${newStock < 0 ? 'text-red-600 dark:text-red-400' : 'text-coffee-600 dark:text-coffee-400'}`}
                    >
                      Stock actual: {p.stock} → resultado:{' '}
                      <strong>{newStock < 0 ? 'insuficiente' : newStock}</strong>
                    </p>
                  );
                })()}
            </div>

            <div>
              <label
                htmlFor="inventory-notes"
                className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2"
              >
                Notas / razón
              </label>
              <textarea
                id="inventory-notes"
                value={adjNotes}
                onChange={(e) => setAdjNotes(e.target.value)}
                rows={2}
                placeholder="Ej: Llegó pedido proveedor, mercancía dañada en transporte..."
                className="w-full bg-white dark:bg-coffee-800 border border-coffee-300 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2.5 text-sm focus:border-gold-500/60 focus:outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="inventory-unit-cost"
                  className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2"
                >
                  Costo unitario (MXN)
                </label>
                <input
                  id="inventory-unit-cost"
                  type="number"
                  step="0.01"
                  value={adjUnitCost}
                  onChange={(e) => setAdjUnitCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white dark:bg-coffee-800 border border-coffee-300 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2.5 text-sm focus:border-gold-500/60 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="inventory-batch"
                  className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2"
                >
                  Número de lote
                </label>
                <input
                  id="inventory-batch"
                  value={adjBatchNumber}
                  onChange={(e) => setAdjBatchNumber(e.target.value)}
                  placeholder="LOT-2026-001"
                  className="w-full bg-white dark:bg-coffee-800 border border-coffee-300 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2.5 text-sm focus:border-gold-500/60 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="inventory-expiry"
                  className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2"
                >
                  Fecha de caducidad
                </label>
                <input
                  id="inventory-expiry"
                  type="date"
                  value={adjExpiryDate}
                  onChange={(e) => setAdjExpiryDate(e.target.value)}
                  className="w-full bg-white dark:bg-coffee-800 border border-coffee-300 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2.5 text-sm focus:border-gold-500/60 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="inventory-supplier"
                  className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2"
                >
                  Proveedor
                </label>
                <input
                  id="inventory-supplier"
                  value={adjSupplier}
                  onChange={(e) => setAdjSupplier(e.target.value)}
                  placeholder="Nombre del proveedor"
                  className="w-full bg-white dark:bg-coffee-800 border border-coffee-300 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 py-2.5 text-sm focus:border-gold-500/60 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={adjustMutation.isPending || !adjProduct || !adjQty}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adjustMutation.isPending ? 'Registrando...' : 'Registrar movimiento'}
            </button>
          </form>
        </div>
      )}

      {/* ── Alerts tab ── */}
      {tab === 'alerts' &&
        (!alerts ? (
          <AdminSkeleton rows={4} />
        ) : (
          <div className="space-y-6">
            {alerts.outOfStock.length > 0 && (
              <div>
                <h3 className="text-xs text-red-600 dark:text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Agotados ({alerts.outOfStock.length})
                </h3>
                <div className="space-y-2">
                  {alerts.outOfStock.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-red-100 dark:bg-red-900/10 border border-red-300 dark:border-red-500/20 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <img src={p.imageUrl} alt={p.name} className="w-8 h-8 object-cover" />
                        <div>
                          <p className="text-coffee-900 dark:text-cream text-sm">{p.name}</p>
                          {p.sku && (
                            <p className="text-coffee-500 dark:text-coffee-400 text-xs">
                              SKU: {p.sku}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-red-600 dark:text-red-400 text-xs font-medium">
                        Stock: 0
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alerts.lowStock.length > 0 && (
              <div>
                <h3 className="text-xs text-yellow-700 dark:text-yellow-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Stock bajo ({alerts.lowStock.length})
                </h3>
                <div className="space-y-2">
                  {alerts.lowStock.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-yellow-100 dark:bg-yellow-900/10 border border-yellow-300 dark:border-yellow-500/20 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <img src={p.imageUrl} alt={p.name} className="w-8 h-8 object-cover" />
                        <div>
                          <p className="text-coffee-900 dark:text-cream text-sm">{p.name}</p>
                          {p.supplier && (
                            <p className="text-coffee-500 dark:text-coffee-400 text-xs">
                              Proveedor: {p.supplier}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-700 dark:text-yellow-400 text-xs font-medium">
                          Stock: {p.stock}
                        </p>
                        <p className="text-coffee-500 dark:text-coffee-400 text-xs">
                          Umbral: {p.lowStockThreshold}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alerts.expiringBatches.length > 0 && (
              <div>
                <h3 className="text-xs text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-3">
                  Lotes por vencer (próximos 30 días) ({alerts.expiringBatches.length})
                </h3>
                <div className="space-y-2">
                  {alerts.expiringBatches.map((b, i) => (
                    <div
                      key={`${b.productId}-${b.batchNumber ?? i}`}
                      className="flex items-center justify-between bg-orange-100 dark:bg-orange-900/10 border border-orange-300 dark:border-orange-500/20 p-3"
                    >
                      <p className="text-coffee-900 dark:text-cream text-sm">{b.productName}</p>
                      <div className="text-right">
                        {b.batchNumber && (
                          <p className="text-coffee-600 dark:text-coffee-400 text-xs">
                            Lote: {b.batchNumber}
                          </p>
                        )}
                        <p className="text-orange-600 dark:text-orange-400 text-xs">
                          {new Date(b.expiryDate).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alerts.overstock.length > 0 && (
              <div>
                <h3 className="text-xs text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Sobreabasto ({alerts.overstock.length})
                </h3>
                <div className="space-y-2">
                  {alerts.overstock.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-blue-100 dark:bg-blue-900/10 border border-blue-300 dark:border-blue-500/20 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <img src={p.imageUrl} alt={p.name} className="w-8 h-8 object-cover" />
                        <div>
                          <p className="text-coffee-900 dark:text-cream text-sm">{p.name}</p>
                          <p className="text-coffee-500 dark:text-coffee-400 text-xs">
                            Umbral: {p.lowStockThreshold}
                          </p>
                        </div>
                      </div>
                      <span className="text-blue-700 dark:text-blue-400 text-xs font-medium">
                        Stock: {p.stock}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alerts.summary.outOfStockCount === 0 &&
              alerts.summary.lowStockCount === 0 &&
              alerts.expiringBatches.length === 0 &&
              alerts.overstock.length === 0 && (
                <p className="text-center text-coffee-500 dark:text-coffee-400 text-sm py-12">
                  Sin alertas activas ✓
                </p>
              )}
          </div>
        ))}

      {/* ── Per-product movement history modal ── */}
      <AdminModal
        open={!!historyProduct}
        title={historyProduct?.name ?? ''}
        onClose={() => setHistoryProduct(null)}
        maxWidth="max-w-2xl"
      >
        <p className="text-coffee-500 dark:text-coffee-400 text-xs -mt-2 mb-2">
          Historial de movimientos (últimos 100)
        </p>
        {historyLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
          </div>
        ) : historyMovements.length === 0 ? (
          <p className="text-center text-coffee-500 dark:text-coffee-400 text-sm py-12">
            Sin movimientos registrados
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-200 dark:border-coffee-800">
                  {['Fecha', 'Tipo', 'Cantidad', 'Antes → Después', 'Notas'].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest px-4 py-3"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyMovements.map((m) => {
                  const mt = MOVEMENT_TYPES[m.type] ?? MOVEMENT_TYPES.ADJUSTMENT;
                  const Icon = mt.icon;
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-coffee-200/40 dark:border-coffee-800/40 hover:bg-coffee-100 dark:hover:bg-coffee-800/20 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-coffee-600 dark:text-coffee-400 text-xs whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className={`flex items-center gap-1.5 ${mt.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                          <span className="text-xs font-medium">{mt.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`text-sm font-bold ${m.quantity > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                        >
                          {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-coffee-600 dark:text-coffee-400 text-xs">
                        {m.previousStock} →{' '}
                        <span className="text-coffee-900 dark:text-cream font-medium">
                          {m.newStock}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-coffee-500 dark:text-coffee-400 text-xs max-w-[160px] truncate">
                        {m.notes ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminModal>
    </div>
  );
}

// ── Inline threshold editor ───────────────────────────────────────────────
function ThresholdEditor({ productId, current }: { productId: string; current: number }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(current));
  const { addToast } = useModuleToast();
  const updateThreshold = useUpdateThresholdMutation();

  const save = async () => {
    const n = parseInt(val);
    if (isNaN(n) || n < 0) return;
    try {
      await updateThreshold.mutateAsync({ productId, threshold: n });
      addToast('Umbral actualizado', 'success');
      setEditing(false);
    } catch {
      addToast('Error al actualizar umbral', 'error');
    }
  };

  if (!editing)
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-coffee-600 dark:text-coffee-400 hover:text-gold-500 text-xs transition-colors"
      >
        {current} uds.
      </button>
    );

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-14 bg-white dark:bg-coffee-800 border border-gold-500/40 text-coffee-900 dark:text-cream text-xs px-2 py-1 focus:outline-none"
        min={0}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') setEditing(false);
        }}
      />
      <button onClick={save} className="text-xs text-gold-500 hover:text-gold-400">
        ✓
      </button>
      <button
        onClick={() => setEditing(false)}
        className="text-xs text-coffee-600 dark:text-coffee-400"
      >
        ✕
      </button>
    </div>
  );
}
