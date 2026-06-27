import { Link } from 'react-router-dom';
import { Star, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import type { Product } from '../types';

interface QuizProductCardProps {
  product: Product;
  matchPct: number;
}

function getReason(product: Product, pct: number): string {
  if (pct >= 85) return 'Perfecto para tu perfil';
  if (pct >= 70) return 'Muy compatible con tus gustos';
  if (pct >= 50) return 'Buena opción para explorar';
  return 'Podría gustarte';
}

export default function QuizProductCard({ product, matchPct }: QuizProductCardProps) {
  const addItem = useCart((s) => s.addItem);
  const addToast = useToast((s) => s.add);

  return (
    <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden transition-all hover:border-gold-500/50 hover:shadow-lg group">
      {/* Image */}
      <Link to={`/tienda/${product.slug}`} className="block relative">
        <img
          src={product.imageUrl || '/placeholder.svg'}
          alt={product.name}
          className="w-full h-44 sm:h-52 object-cover"
        />
        {/* Match badge */}
        <div className="absolute top-2 left-2 bg-gold-500 text-coffee-900 text-xs font-bold px-2 py-1 leading-none">
          {matchPct}% match
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 sm:p-5">
        <Link to={`/tienda/${product.slug}`} className="hover:text-gold-500 transition-colors">
          <h3 className="font-serif text-base sm:text-lg text-coffee-900 dark:text-cream line-clamp-2 mb-1">
            {product.name}
          </h3>
        </Link>

        {product.origin && (
          <p className="text-xs text-coffee-500 mb-1">{product.origin}</p>
        )}

        {/* Reason */}
        <p className="text-[11px] text-coffee-400 dark:text-coffee-500 italic mb-3 leading-snug">
          {getReason(product, matchPct)}
        </p>

        {/* Meta row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            {product.scaScore && (
              <span className="flex items-center gap-1 text-coffee-600 dark:text-coffee-400 text-xs" title="Puntaje SCA">
                <Star className="w-3 h-3 text-gold-500" />
                {product.scaScore}
              </span>
            )}
          </div>
          <p className="text-coffee-900 dark:text-cream font-semibold text-sm">
            ${product.price.toFixed(2)}
          </p>
        </div>

        {/* Action */}
          <button
            onClick={() => {
              addItem(product, 1);
              addToast(`${product.name} agregado al carrito`, 'success');
            }}
          className="mt-3 w-full flex items-center justify-center gap-2 border border-gold-500/40 text-coffee-900 dark:text-cream text-xs py-2 px-3 hover:bg-gold-500 hover:text-coffee-900 transition-colors"
          aria-label={`Agregar ${product.name} al carrito`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Agregar
        </button>
      </div>
    </div>
  );
}
