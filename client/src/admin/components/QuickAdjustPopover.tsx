import { useState } from 'react';
import { Plus, Minus, Loader2 } from 'lucide-react';
import api from '../../api';
import { useModuleToast } from '../context/ModuleContext';

interface QuickAdjustPopoverProps {
  productId: string;
  productName: string;
  currentStock: number;
  onDone: (newStock: number) => void;
  onClose: () => void;
}

type AdjType = 'RESTOCK' | 'LOSS' | 'ADJUSTMENT';

export default function QuickAdjustPopover({
  productId,
  productName,
  currentStock,
  onDone,
  onClose,
}: QuickAdjustPopoverProps) {
  const { addToast } = useModuleToast();
  const [type, setType] = useState<AdjType>('RESTOCK');
  const [qty, setQty] = useState('1');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const n = parseInt(qty, 10);
    if (!n || n <= 0) { addToast('Cantidad inválida', 'error'); return; }
    setSaving(true);
    try {
      const res = await api.post('/inventory/adjust', { productId, type, quantity: n, notes: notes || undefined });
      // /adjust returns { product: { id, name, stock }, movement }
      const newStock = res.data?.product?.stock ??
        (type === 'LOSS' ? currentStock - n : currentStock + n);
      addToast(`Stock actualizado: ${productName}`, 'success');
      onDone(newStock);
      onClose();
    } catch (e: any) {
      addToast(e?.response?.data?.error || 'Error al ajustar stock', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute right-0 top-full mt-1 z-30 w-64 bg-coffee-900 border border-coffee-700 shadow-xl p-3 space-y-3 text-left" onClick={(e) => e.stopPropagation()}>
      <p className="text-xs text-coffee-400">Ajuste rápido — stock actual: <span className="text-cream">{currentStock}</span></p>

      <div className="grid grid-cols-3 gap-1">
        {([['RESTOCK', 'Ingreso'], ['LOSS', 'Merma'], ['ADJUSTMENT', 'Ajuste']] as [AdjType, string][]).map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => setType(v)}
            className={`text-[11px] py-1.5 border transition-colors ${
              type === v ? 'border-gold-500 text-gold-500 bg-gold-500/10' : 'border-coffee-700 text-coffee-400 hover:text-cream'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setQty((q) => String(Math.max(1, (parseInt(q, 10) || 1) - 1)))}
          className="p-1.5 border border-coffee-700 text-coffee-400 hover:text-cream">
          <Minus size={14} />
        </button>
        <input
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="flex-1 bg-coffee-800 border border-coffee-700 text-cream text-sm px-2 py-1.5 text-center focus:outline-none focus:border-gold-500"
        />
        <button type="button" onClick={() => setQty((q) => String((parseInt(q, 10) || 0) + 1))}
          className="p-1.5 border border-coffee-700 text-coffee-400 hover:text-cream">
          <Plus size={14} />
        </button>
      </div>

      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Nota (opcional)"
        className="w-full bg-coffee-800 border border-coffee-700 text-cream text-xs px-2 py-1.5 focus:outline-none focus:border-gold-500"
      />

      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 text-xs py-1.5 border border-coffee-700 text-coffee-400 hover:text-cream">
          Cancelar
        </button>
        <button type="button" onClick={submit} disabled={saving} className="flex-1 text-xs py-1.5 bg-gold-500 text-coffee-950 font-semibold hover:bg-gold-600 disabled:opacity-50 flex items-center justify-center gap-1">
          {saving ? <Loader2 size={12} className="animate-spin" /> : 'Aplicar'}
        </button>
      </div>
    </div>
  );
}
