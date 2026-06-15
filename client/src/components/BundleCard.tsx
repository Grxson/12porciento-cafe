import { ShoppingCart, Zap } from 'lucide-react';

interface BundleItem {
  product: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
}

interface BundleCardProps {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  discountPct: number;
  finalPrice: number;
  imageUrl?: string;
  items: BundleItem[];
  onSelect: (bundleId: string) => void;
}

export default function BundleCard({
  id,
  name,
  description,
  basePrice,
  discountPct,
  finalPrice,
  imageUrl,
  items,
  onSelect,
}: BundleCardProps) {
  const savings = basePrice - finalPrice;

  return (
    <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 hover:border-gold-500/50 transition-all duration-300 overflow-hidden group">
      {imageUrl && (
        <div className="h-44 bg-coffee-200 dark:bg-coffee-950 overflow-hidden">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-serif text-lg text-coffee-900 dark:text-cream">{name}</h3>
          {discountPct > 0 && (
            <span className="flex items-center gap-1 bg-gold-500/20 text-gold-400 text-xs font-bold px-2 py-1">
              <Zap size={12} />
              {discountPct}% OFF
            </span>
          )}
        </div>

        <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-4 line-clamp-2">{description}</p>

        <div className="space-y-2 mb-4">
          <div className="text-xs text-coffee-500 uppercase tracking-widest font-medium">Incluye:</div>
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.product.id} className="text-xs text-coffee-700 dark:text-coffee-300 flex items-center gap-2">
                <span className="text-gold-500">•</span>
                {item.quantity > 1 ? `${item.quantity}x ` : ''}{item.product.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-end justify-between mb-4 pb-4 border-t border-coffee-200 dark:border-coffee-800">
          <div className="mt-3">
            <div className="text-xs text-coffee-500 mb-1">Valor original:</div>
            <div className="text-sm text-coffee-600 dark:text-coffee-400 line-through">${basePrice.toLocaleString()}</div>
            {discountPct > 0 && (
              <div className="text-xs text-green-400 mt-1">Ahorras ${savings.toLocaleString()}</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-coffee-500 mb-1">Precio bundle:</div>
            <div className="text-2xl font-serif text-gold-500">${finalPrice.toLocaleString()}</div>
          </div>
        </div>

        <button
          onClick={() => onSelect(id)}
          className="w-full bg-gold-500 hover:bg-gold-400 text-coffee-950 font-bold py-2.5 px-3 flex items-center justify-center gap-2 transition-colors uppercase text-sm tracking-wide"
        >
          <ShoppingCart size={16} />
          Seleccionar
        </button>
      </div>
    </div>
  );
}
