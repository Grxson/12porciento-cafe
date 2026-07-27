import { ArrowRight, PackageOpen, Trash2 } from 'lucide-react';
import type { B2BProduct, B2BQuoteDraftItem } from '../../types';
import { calculateDraftEstimate, selectB2BTier } from '../../lib/b2b-quote';

interface Props {
  items: B2BQuoteDraftItem[];
  products: B2BProduct[];
  onRemove: (productId: string) => void;
  onContinue: () => void;
  compact?: boolean;
}

const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

export default function B2BQuoteSummary({
  items,
  products,
  onRemove,
  onContinue,
  compact = false,
}: Props) {
  const estimate = calculateDraftEstimate(items, products);
  const productMap = new Map(products.map((product) => [product.id, product]));

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#A98852]">
            {items.length} productos · {estimate.itemCount} unidades
          </p>
          <p className="truncate font-serif text-xl text-[#F4EFE5]">
            Estimado {money.format(estimate.subtotal)}
          </p>
        </div>
        <button
          type="button"
          onClick={onContinue}
          disabled={!items.length || estimate.unpricedItems.length > 0}
          className="action-focus shrink-0 bg-[#D0A45D] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#27170F] disabled:opacity-40"
        >
          Continuar
        </button>
      </div>
    );
  }

  return (
    <aside className="border border-[#D0A45D]/45 bg-[#27170F] text-[#F4EFE5] shadow-[0_24px_70px_rgba(39,23,15,0.22)]">
      <div className="border-b border-white/10 px-6 py-5">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#D0A45D]">Tu mesa</p>
        <h2 className="mt-1 font-serif text-2xl">Selección empresarial</h2>
      </div>

      <div className="max-h-[42vh] space-y-1 overflow-y-auto px-6 py-4">
        {!items.length ? (
          <div className="py-8 text-center">
            <PackageOpen className="mx-auto h-8 w-8 text-[#D0A45D]/70" />
            <p className="mt-3 text-sm text-[#d9c8b7]">Agrega cafés para construir tu estimado.</p>
          </div>
        ) : (
          items.map((item) => {
            const product = productMap.get(item.productId);
            const tier = product && selectB2BTier(product.b2bPriceTiers, item.quantity);
            return (
              <div
                key={item.productId}
                className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/10 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{product?.name || 'Producto'}</p>
                  <p className="mt-0.5 text-xs text-[#baa997]">
                    {item.quantity} unidades
                    {tier ? ` · ${money.format(tier.pricePerUnit)} c/u` : ' · Sin precio'}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`Quitar ${product?.name || 'producto'}`}
                  onClick={() => onRemove(item.productId)}
                  className="action-focus grid h-8 w-8 place-items-center text-[#baa997] hover:text-[#F4EFE5]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-4 border-t border-white/10 px-6 py-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#A98852]">
              Estimado por entrega
            </p>
            <p className="mt-1 font-serif text-3xl">{money.format(estimate.subtotal)}</p>
          </div>
          <p className="pb-1 text-xs text-[#baa997]">MXN · antes de IVA</p>
        </div>
        <p className="text-xs leading-5 text-[#baa997]">
          Referencia calculada con precios vigentes. Nuestro equipo valida disponibilidad, logística
          y condiciones comerciales.
        </p>
        <button
          type="button"
          onClick={onContinue}
          disabled={!items.length || estimate.unpricedItems.length > 0}
          className="action-focus flex w-full items-center justify-between bg-[#D0A45D] px-4 py-3.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#27170F] transition-colors hover:bg-[#e0bc7b] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Completar solicitud
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
