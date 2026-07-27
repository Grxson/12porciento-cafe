import { Check, Minus, Plus, Scale } from 'lucide-react';
import type { B2BFrequency, B2BProduct, B2BQuoteDraftItem } from '../../types';
import { selectB2BTier } from '../../lib/b2b-quote';

interface Props {
  product: B2BProduct;
  item?: B2BQuoteDraftItem;
  frequency: B2BFrequency;
  onChange: (item: B2BQuoteDraftItem) => void;
  onRemove: () => void;
}

const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

export default function B2BProductCard({ product, item, frequency, onChange, onRemove }: Props) {
  const minimum = product.b2bPriceTiers[0]?.minQty ?? 1;
  const quantity = item?.quantity ?? minimum;
  const selectedTier = selectB2BTier(product.b2bPriceTiers, quantity);
  const nextTier = product.b2bPriceTiers.find((tier) => tier.minQty > quantity);
  const selected = Boolean(item);

  const updateQuantity = (next: number) => {
    onChange({ productId: product.id, quantity: Math.max(minimum, next), frequency });
  };

  return (
    <article
      className={`group overflow-hidden border bg-[#fffdf8] transition-all duration-300 dark:bg-coffee-900 ${
        selected
          ? 'border-[#D0A45D] shadow-[0_18px_44px_rgba(39,23,15,0.12)]'
          : 'border-[#dfd1bf] hover:-translate-y-1 hover:border-[#D0A45D]/70 dark:border-coffee-700'
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#e8ddce]">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(circle_at_30%_20%,#d0a45d_0,transparent_28%),linear-gradient(145deg,#27170f,#7d4d1f)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#27170f]/65 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#efd9ae]">
              {product.region || product.origin || 'Origen mexicano'}
            </p>
            <h3 className="mt-1 font-serif text-2xl leading-none">{product.name}</h3>
          </div>
          {selected && (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#D0A45D] text-[#27170F]">
              <Check className="h-4 w-4" strokeWidth={2.5} />
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 p-5">
        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-[#725F50] dark:text-coffee-300">
          {product.description}
        </p>

        <div className="flex flex-wrap items-center gap-2 text-xs text-[#725F50] dark:text-coffee-300">
          {product.weight && (
            <span className="inline-flex items-center gap-1 border border-[#dfd1bf] px-2.5 py-1 dark:border-coffee-700">
              <Scale className="h-3 w-3" /> {product.weight} g
            </span>
          )}
          <span className="border border-[#dfd1bf] px-2.5 py-1 dark:border-coffee-700">
            Desde{' '}
            {money.format(Math.min(...product.b2bPriceTiers.map((tier) => tier.pricePerUnit)))}
          </span>
        </div>

        {!selected ? (
          <button
            type="button"
            onClick={() => onChange({ productId: product.id, quantity: minimum, frequency })}
            className="action-focus flex w-full items-center justify-between bg-[#27170F] px-4 py-3 text-xs uppercase tracking-[0.2em] text-[#F4EFE5] transition-colors hover:bg-[#7D4D1F]"
          >
            Agregar a selección
            <Plus className="h-4 w-4" />
          </button>
        ) : (
          <div className="space-y-3 border-t border-[#e7dccd] pt-4 dark:border-coffee-700">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#7D4D1F] dark:text-gold-400">
                  Cantidad por entrega
                </p>
                <p className="mt-1 text-sm font-semibold text-[#27170F] dark:text-cream">
                  {selectedTier
                    ? `${money.format(selectedTier.pricePerUnit)} por unidad`
                    : 'Cantidad sin precio disponible'}
                </p>
              </div>
              <div className="flex items-center border border-[#d7c4aa] dark:border-coffee-600">
                <button
                  type="button"
                  aria-label="Restar unidad"
                  onClick={() => (quantity <= minimum ? onRemove() : updateQuantity(quantity - 1))}
                  className="action-focus grid h-10 w-10 place-items-center text-[#7D4D1F] hover:bg-[#F4EFE5] dark:hover:bg-coffee-800"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  aria-label={`Cantidad de ${product.name}`}
                  type="number"
                  min={minimum}
                  value={quantity}
                  onChange={(event) => updateQuantity(Number(event.target.value) || minimum)}
                  className="h-10 w-16 border-x border-[#d7c4aa] bg-transparent text-center font-semibold text-[#27170F] outline-none dark:border-coffee-600 dark:text-cream"
                />
                <button
                  type="button"
                  aria-label="Sumar unidad"
                  onClick={() => updateQuantity(quantity + 1)}
                  className="action-focus grid h-10 w-10 place-items-center text-[#7D4D1F] hover:bg-[#F4EFE5] dark:hover:bg-coffee-800"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            {nextTier && (
              <p className="text-xs text-[#725F50] dark:text-coffee-300">
                Agrega {nextTier.minQty - quantity} para llegar a{' '}
                <strong>{money.format(nextTier.pricePerUnit)} por unidad</strong>.
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
