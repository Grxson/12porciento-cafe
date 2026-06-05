import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package, TrendingUp, TrendingDown, AlertTriangle, XCircle,
  ArrowUpCircle, ArrowDownCircle, RefreshCw, Search, ChevronLeft, ChevronRight, SlidersHorizontal, Download,
} from 'lucide-react';
import api from '../api';
import { useToast } from '../context/ToastContext';

// ── Types ─────────────────────────────────────────────────────────────────

interface InventoryProduct {
  id: string; name: string; slug: string; category: string; imageUrl: string;
  price: number; stock: number; lowStockThreshold: number; isActive: boolean;
  status: 'OK' | 'LOW' | 'OUT'; inventoryValue: number;
}
interface Summary {
  totalSKUs: number; activeSKUs: number; totalUnits: number;
  totalValue: number; lowStockCount: number; outOfStockCount: number;
}
interface Movement {
  id: string; productId: string; type: string; quantity: number;
  previousStock: number; newStock: number; notes: string | null;
  orderId: string | null; createdAt: string;
  product?: { id: string; name: string; imageUrl: string; category: string };
}

// ── Constants ─────────────────────────────────────────────────────────────

const MOVEMENT_TYPES: Record<string, { label: string; color: string; icon: React.FC<any> }> = {
  SALE:       { label: 'Venta',      color: 'text-red-400',    icon: ArrowDownCircle },
  RESTOCK:    { label: 'Reabasto',   color: 'text-green-400',  icon: ArrowUpCircle },
  ADJUSTMENT: { label: 'Ajuste',     color: 'text-blue-400',   icon: SlidersHorizontal },
  LOSS:       { label: 'Merma',      color: 'text-orange-400', icon: TrendingDown },
  RETURN:     { label: 'Devolución', color: 'text-purple-400', icon: TrendingUp },
  INITIAL:    { label: 'Inicial',    color: 'text-coffee-400', icon: Package },
};

const STATUS_CONFIG = {
  OK:  { label: 'OK',     cls: 'text-green-400 bg-green-900/20 border-green-500/30' },
  LOW: { label: 'Bajo',   cls: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30' },
  OUT: { label: 'Agotado', cls: 'text-red-400 bg-red-900/20 border-red-500/30' },
};

// ── Main Component ────────────────────────────────────────────────────────

export default function Inventory() {
  const [tab, setTab] = useState<'overview' | 'movements' | 'adjust' | 'alerts'>('overview');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [movTotal, setMovTotal] = useState(0);
  const [movPage, setMovPage] = useState(1);
  const [movTotalPages, setMovTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [movLoading, setMovLoading] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [search, setSearch] = useState('');
  const { add } = useToast();

  // Adjust form
  const [adjProduct, setAdjProduct] = useState('');
  const [adjType, setAdjType] = useState<'RESTOCK' | 'ADJUSTMENT' | 'LOSS' | 'RETURN'>('RESTOCK');
  const [adjQty, setAdjQty] = useState('');
  const [adjNotes, setAdjNotes] = useState('');
  const [adjSaving, setAdjSaving] = useState(false);

  // Alerts
  const [alerts, setAlerts] = useState<{
    outOfStock: any[];
    lowStock: any[];
    overstock: any[];
    expiringBatches: any[];
    summary: { outOfStockCount: number; lowStockCount: number; overstockCount: number; expiringCount: number };
  } | null>(null);

  // New batch/cost fields for adjust form
  const [adjUnitCost, setAdjUnitCost] = useState('');
  const [adjBatchNumber, setAdjBatchNumber] = useState('');
  const [adjExpiryDate, setAdjExpiryDate] = useState('');
  const [adjSupplier, setAdjSupplier] = useState('');

  const loadOverview = () => {
    setLoading(true);
    api.get('/inventory')
      .then((r) => { setSummary(r.data.summary); setProducts(r.data.products); })
      .catch(() => add('Error al cargar inventario', 'error'))
      .finally(() => setLoading(false));
  };

  const loadMovements = (page = 1) => {
    setMovLoading(true);
    const params: any = { page, pageSize: 50 };
    if (filterType) params.type = filterType;
    if (filterProduct) params.productId = filterProduct;
    if (filterFrom) params.dateFrom = filterFrom;
    if (filterTo) params.dateTo = filterTo;
    api.get('/inventory/movements', { params })
      .then((r) => {
        setMovements(r.data.data);
        setMovTotal(r.data.total);
        setMovTotalPages(r.data.totalPages);
        setMovPage(r.data.page);
      })
      .catch(() => add('Error al cargar movimientos', 'error'))
      .finally(() => setMovLoading(false));
  };

  const loadAlerts = () => {
    api.get('/inventory/alerts')
      .then((r) => setAlerts(r.data))
      .catch(() => add('Error al cargar alertas', 'error'));
  };

  useEffect(() => { loadOverview(); }, []);
  useEffect(() => { if (tab === 'movements') loadMovements(1); }, [tab, filterType, filterProduct, filterFrom, filterTo]);
  useEffect(() => { if (tab === 'alerts') loadAlerts(); }, [tab]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjProduct || !adjQty) return;
    setAdjSaving(true);
    try {
      await api.post('/inventory/adjust', {
        productId: adjProduct,
        type: adjType,
        quantity: parseInt(adjQty),
        notes: adjNotes || undefined,
        unitCost: adjUnitCost ? parseFloat(adjUnitCost) : undefined,
        batchNumber: adjBatchNumber || undefined,
        expiryDate: adjExpiryDate || undefined,
        supplier: adjSupplier || undefined,
      });
      add(`Stock ajustado exitosamente`, 'success');
      setAdjQty(''); setAdjNotes(''); setAdjProduct('');
      setAdjUnitCost(''); setAdjBatchNumber(''); setAdjExpiryDate(''); setAdjSupplier('');
      loadOverview();
    } catch (err: any) {
      add(err.response?.data?.error ?? 'Error al ajustar stock', 'error');
    } finally { setAdjSaving(false); }
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
      add('Error al exportar inventario', 'error');
    }
  };

  const filteredProducts = products.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const fmt = (n: number) => n.toLocaleString('es-MX');
  const fmtCurrency = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-cream">Inventario</h1>
          <p className="text-coffee-400 text-sm mt-1">Control de stock, existencias y movimientos</p>
        </div>
        <button onClick={loadOverview} className="flex items-center gap-2 text-xs text-coffee-400 hover:text-cream border border-coffee-700 px-3 py-2 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { label: 'SKUs activos', value: summary.activeSKUs, sub: `de ${summary.totalSKUs}`, icon: Package, color: 'text-coffee-300' },
            { label: 'Unidades totales', value: fmt(summary.totalUnits), icon: TrendingUp, color: 'text-blue-400' },
            { label: 'Valor inventario', value: fmtCurrency(summary.totalValue), icon: TrendingUp, color: 'text-gold-500' },
            { label: 'Stock bajo', value: summary.lowStockCount, icon: AlertTriangle, color: 'text-yellow-400', alert: summary.lowStockCount > 0 },
            { label: 'Sin stock', value: summary.outOfStockCount, icon: XCircle, color: 'text-red-400', alert: summary.outOfStockCount > 0 },
          ].map(({ label, value, sub, icon: Icon, color, alert }) => (
            <div key={label} className={`bg-coffee-900 border p-4 ${alert ? 'border-yellow-500/30' : 'border-coffee-800'}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-coffee-500 text-[10px] uppercase tracking-widest">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className={`font-serif text-2xl font-bold ${color}`}>{value}</p>
              {sub && <p className="text-coffee-600 text-xs mt-0.5">{sub}</p>}
            </div>
          ))}
          <button
            onClick={() => setTab('adjust')}
            className="bg-gold-500/10 border border-gold-500/30 hover:bg-gold-500/20 p-4 transition-colors text-left"
          >
            <p className="text-coffee-400 text-[10px] uppercase tracking-widest mb-2">Acción rápida</p>
            <p className="text-gold-400 text-sm font-medium">Ajustar stock →</p>
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-coffee-800 mb-6">
        {([
          { id: 'overview',   label: 'Resumen' },
          { id: 'movements',  label: 'Movimientos' },
          { id: 'adjust',     label: 'Ajustar stock' },
          { id: 'alerts',     label: 'Alertas' },
        ] as const).map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${
              tab === id ? 'border-gold-500 text-gold-500' : 'border-transparent text-coffee-400 hover:text-cream'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {tab === 'overview' && (
        loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" /></div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-500" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar producto..."
                  className="w-full bg-coffee-900 border border-coffee-800 text-cream text-sm pl-9 pr-3 py-2 focus:border-gold-500/50 focus:outline-none" />
              </div>
              <button onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-2 text-xs border border-coffee-700 text-coffee-400 hover:text-cream hover:border-coffee-600 transition-colors whitespace-nowrap">
                <Download className="w-3.5 h-3.5" /> Exportar CSV
              </button>
            </div>
            <div className="bg-coffee-900 border border-coffee-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-coffee-800">
                      {['Producto', 'Categoría', 'Stock actual', 'Valor', 'Umbral', 'Estado', 'Acciones'].map((h) => (
                        <th key={h} className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((p) => {
                      const s = STATUS_CONFIG[p.status];
                      return (
                        <tr key={p.id} className="border-b border-coffee-800/50 hover:bg-coffee-800/20 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img src={p.imageUrl} alt={p.name} className="w-9 h-9 object-cover shrink-0" />
                              <div>
                                <p className="text-cream text-sm font-medium leading-tight">{p.name}</p>
                                {!p.isActive && <span className="text-[10px] text-coffee-600">Inactivo</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-xs border border-coffee-700 text-coffee-400 px-2 py-0.5">{p.category}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-lg font-bold font-serif ${
                              p.status === 'OUT' ? 'text-red-400' : p.status === 'LOW' ? 'text-yellow-400' : 'text-cream'
                            }`}>{p.stock}</span>
                            <span className="text-coffee-600 text-xs ml-1">uds.</span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-coffee-300 text-sm">
                            {fmtCurrency(p.inventoryValue)}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <ThresholdEditor productId={p.id} current={p.lowStockThreshold} onSaved={loadOverview} />
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-2 py-1 border ${s.cls}`}>{s.label}</span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => { setTab('adjust'); setAdjProduct(p.id); setAdjType('RESTOCK'); }}
                              className="text-xs text-gold-500 hover:text-gold-400 border border-gold-500/30 px-3 py-1 transition-colors"
                            >
                              Reabastecer
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-12 text-coffee-500">Sin productos</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )
      )}

      {/* ── Movements tab ── */}
      {tab === 'movements' && (
        <div>
          {/* Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
              className="bg-coffee-900 border border-coffee-800 text-cream text-sm px-3 py-2 focus:border-gold-500/50 focus:outline-none">
              <option value="">Todos los tipos</option>
              {Object.entries(MOVEMENT_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)}
              className="bg-coffee-900 border border-coffee-800 text-cream text-sm px-3 py-2 focus:border-gold-500/50 focus:outline-none">
              <option value="">Todos los productos</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
              className="bg-coffee-900 border border-coffee-800 text-cream text-sm px-3 py-2 focus:border-gold-500/50 focus:outline-none" />
            <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
              className="bg-coffee-900 border border-coffee-800 text-cream text-sm px-3 py-2 focus:border-gold-500/50 focus:outline-none" />
          </div>

          {movLoading ? (
            <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" /></div>
          ) : (
            <>
              <div className="text-coffee-500 text-xs mb-3">{movTotal} movimientos</div>
              <div className="bg-coffee-900 border border-coffee-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-coffee-800">
                        {['Fecha', 'Producto', 'Tipo', 'Cantidad', 'Antes → Después', 'Notas'].map((h) => (
                          <th key={h} className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((m) => {
                        const mt = MOVEMENT_TYPES[m.type] ?? MOVEMENT_TYPES.ADJUSTMENT;
                        const Icon = mt.icon;
                        return (
                          <tr key={m.id} className="border-b border-coffee-800/50 hover:bg-coffee-800/20 transition-colors">
                            <td className="px-4 py-3 text-coffee-400 text-xs whitespace-nowrap">
                              {new Date(m.createdAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-3">
                              {m.product && (
                                <div className="flex items-center gap-2">
                                  <img src={m.product.imageUrl} className="w-7 h-7 object-cover shrink-0" alt="" />
                                  <span className="text-cream text-xs truncate max-w-[120px]">{m.product.name}</span>
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
                              <span className={`text-sm font-bold ${m.quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-coffee-400 text-xs">
                              {m.previousStock} → <span className="text-cream font-medium">{m.newStock}</span>
                            </td>
                            <td className="px-4 py-3 text-coffee-500 text-xs max-w-[180px] truncate">
                              {m.notes ?? '—'}
                            </td>
                          </tr>
                        );
                      })}
                      {movements.length === 0 && (
                        <tr><td colSpan={6} className="text-center py-12 text-coffee-500">Sin movimientos</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {movTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button onClick={() => loadMovements(movPage - 1)} disabled={movPage === 1}
                    className="p-2 border border-coffee-700 text-coffee-400 hover:border-coffee-500 disabled:opacity-40 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-coffee-400 text-sm">Página {movPage} de {movTotalPages}</span>
                  <button onClick={() => loadMovements(movPage + 1)} disabled={movPage === movTotalPages}
                    className="p-2 border border-coffee-700 text-coffee-400 hover:border-coffee-500 disabled:opacity-40 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Adjust tab ── */}
      {tab === 'adjust' && (
        <div className="max-w-xl">
          <p className="text-coffee-400 text-sm mb-6">
            Registra ingresos, mermas, devoluciones o ajustes manuales. Cada cambio queda en el historial de movimientos.
          </p>
          <form onSubmit={handleAdjust} className="bg-coffee-900 border border-coffee-800 p-6 space-y-5">
            <div>
              <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Producto *</label>
              <select value={adjProduct} onChange={(e) => setAdjProduct(e.target.value)} required
                className="w-full bg-coffee-800 border border-coffee-700 text-cream px-3 py-2.5 text-sm focus:border-gold-500/60 focus:outline-none">
                <option value="">Seleccionar producto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (stock: {p.stock})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Tipo de movimiento *</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: 'RESTOCK',    label: 'Reabasto',   desc: 'Entrada de mercancía',  color: 'text-green-400', icon: ArrowUpCircle },
                  { value: 'LOSS',       label: 'Merma',      desc: 'Pérdida / vencimiento', color: 'text-orange-400', icon: TrendingDown },
                  { value: 'RETURN',     label: 'Devolución', desc: 'Regreso de cliente',    color: 'text-purple-400', icon: TrendingUp },
                  { value: 'ADJUSTMENT', label: 'Ajuste',     desc: 'Corrección de conteo',  color: 'text-blue-400', icon: SlidersHorizontal },
                ] as const).map(({ value, label, desc, color, icon: Icon }) => (
                  <button key={value} type="button"
                    onClick={() => setAdjType(value)}
                    className={`flex items-start gap-2.5 p-3 border text-left transition-all ${
                      adjType === value ? 'border-gold-500/60 bg-gold-500/5' : 'border-coffee-700 hover:border-coffee-600'
                    }`}>
                    <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${color}`} />
                    <div>
                      <p className="text-cream text-xs font-medium">{label}</p>
                      <p className="text-coffee-500 text-[10px]">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">
                Cantidad *
                <span className="text-coffee-600 ml-2 normal-case tracking-normal">
                  {adjType === 'ADJUSTMENT' ? '(+ para agregar, − para quitar)' : '(número positivo)'}
                </span>
              </label>
              <input type="number" value={adjQty} onChange={(e) => setAdjQty(e.target.value)} required
                min={adjType === 'ADJUSTMENT' ? undefined : 1}
                placeholder={adjType === 'ADJUSTMENT' ? 'ej: -5 o 10' : 'ej: 50'}
                className="w-full bg-coffee-800 border border-coffee-700 text-cream px-3 py-2.5 text-sm focus:border-gold-500/60 focus:outline-none" />
              {adjProduct && adjQty && (() => {
                const p = products.find((x) => x.id === adjProduct);
                if (!p) return null;
                const delta = adjType === 'RESTOCK' || adjType === 'RETURN' ? Math.abs(parseInt(adjQty)) :
                              adjType === 'LOSS' ? -Math.abs(parseInt(adjQty)) : parseInt(adjQty);
                const newStock = p.stock + (isNaN(delta) ? 0 : delta);
                return (
                  <p className={`text-xs mt-1 ${newStock < 0 ? 'text-red-400' : 'text-coffee-400'}`}>
                    Stock actual: {p.stock} → resultado: <strong>{newStock < 0 ? 'insuficiente' : newStock}</strong>
                  </p>
                );
              })()}
            </div>

            <div>
              <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Notas / razón</label>
              <textarea value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)} rows={2}
                placeholder="Ej: Llegó pedido proveedor, mercancía dañada en transporte..."
                className="w-full bg-coffee-800 border border-coffee-700 text-cream px-3 py-2.5 text-sm focus:border-gold-500/60 focus:outline-none resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Costo unitario (MXN)</label>
                <input type="number" step="0.01" value={adjUnitCost} onChange={(e) => setAdjUnitCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-coffee-800 border border-coffee-700 text-cream px-3 py-2.5 text-sm focus:border-gold-500/60 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Número de lote</label>
                <input value={adjBatchNumber} onChange={(e) => setAdjBatchNumber(e.target.value)}
                  placeholder="LOT-2026-001"
                  className="w-full bg-coffee-800 border border-coffee-700 text-cream px-3 py-2.5 text-sm focus:border-gold-500/60 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Fecha de caducidad</label>
                <input type="date" value={adjExpiryDate} onChange={(e) => setAdjExpiryDate(e.target.value)}
                  className="w-full bg-coffee-800 border border-coffee-700 text-cream px-3 py-2.5 text-sm focus:border-gold-500/60 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Proveedor</label>
                <input value={adjSupplier} onChange={(e) => setAdjSupplier(e.target.value)}
                  placeholder="Nombre del proveedor"
                  className="w-full bg-coffee-800 border border-coffee-700 text-cream px-3 py-2.5 text-sm focus:border-gold-500/60 focus:outline-none" />
              </div>
            </div>

            <button type="submit" disabled={adjSaving || !adjProduct || !adjQty}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
              {adjSaving ? 'Registrando...' : 'Registrar movimiento'}
            </button>
          </form>
        </div>
      )}

      {/* ── Alerts tab ── */}
      {tab === 'alerts' && (
        !alerts ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            {alerts.outOfStock.length > 0 && (
              <div>
                <h3 className="text-xs text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> Agotados ({alerts.outOfStock.length})
                </h3>
                <div className="space-y-2">
                  {alerts.outOfStock.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between bg-red-900/10 border border-red-500/20 p-3">
                      <div className="flex items-center gap-3">
                        <img src={p.imageUrl} alt={p.name} className="w-8 h-8 object-cover" />
                        <div>
                          <p className="text-cream text-sm">{p.name}</p>
                          {p.sku && <p className="text-coffee-500 text-xs">SKU: {p.sku}</p>}
                        </div>
                      </div>
                      <span className="text-red-400 text-xs font-medium">Stock: 0</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alerts.lowStock.length > 0 && (
              <div>
                <h3 className="text-xs text-yellow-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Stock bajo ({alerts.lowStock.length})
                </h3>
                <div className="space-y-2">
                  {alerts.lowStock.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between bg-yellow-900/10 border border-yellow-500/20 p-3">
                      <div className="flex items-center gap-3">
                        <img src={p.imageUrl} alt={p.name} className="w-8 h-8 object-cover" />
                        <div>
                          <p className="text-cream text-sm">{p.name}</p>
                          {p.supplier && <p className="text-coffee-500 text-xs">Proveedor: {p.supplier}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 text-xs font-medium">Stock: {p.stock}</p>
                        <p className="text-coffee-500 text-xs">Umbral: {p.lowStockThreshold}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alerts.expiringBatches.length > 0 && (
              <div>
                <h3 className="text-xs text-orange-400 uppercase tracking-widest mb-3">
                  Lotes por vencer (próximos 30 días) ({alerts.expiringBatches.length})
                </h3>
                <div className="space-y-2">
                  {alerts.expiringBatches.map((b: any, i: number) => (
                    <div key={`${b.productId}-${b.batchNumber ?? i}`} className="flex items-center justify-between bg-orange-900/10 border border-orange-500/20 p-3">
                      <p className="text-cream text-sm">{b.productName}</p>
                      <div className="text-right">
                        {b.batchNumber && <p className="text-coffee-400 text-xs">Lote: {b.batchNumber}</p>}
                        <p className="text-orange-400 text-xs">{new Date(b.expiryDate).toLocaleDateString('es-MX')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alerts.summary.outOfStockCount === 0 && alerts.summary.lowStockCount === 0 && alerts.expiringBatches.length === 0 && (
              <p className="text-center text-coffee-500 text-sm py-12">Sin alertas activas ✓</p>
            )}
          </div>
        )
      )}
    </div>
  );
}

// ── Inline threshold editor ───────────────────────────────────────────────
function ThresholdEditor({ productId, current, onSaved }: { productId: string; current: number; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(current));
  const { add } = useToast();

  const save = async () => {
    const n = parseInt(val);
    if (isNaN(n) || n < 0) return;
    await api.put(`/inventory/products/${productId}/threshold`, { threshold: n }).catch(() => {});
    add('Umbral actualizado', 'success');
    setEditing(false);
    onSaved();
  };

  if (!editing) return (
    <button onClick={() => setEditing(true)} className="text-coffee-400 hover:text-gold-500 text-xs transition-colors">
      {current} uds.
    </button>
  );

  return (
    <div className="flex items-center gap-1">
      <input type="number" value={val} onChange={(e) => setVal(e.target.value)}
        className="w-14 bg-coffee-800 border border-gold-500/40 text-cream text-xs px-2 py-1 focus:outline-none"
        min={0} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} />
      <button onClick={save} className="text-[10px] text-gold-500 hover:text-gold-400">✓</button>
      <button onClick={() => setEditing(false)} className="text-[10px] text-coffee-600">✕</button>
    </div>
  );
}
