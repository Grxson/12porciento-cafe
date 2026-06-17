import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Star, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { resolveImageUrl } from '../utils/imageUrl';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { addItem, items } = useCart((s) => ({ addItem: s.addItem, items: s.items }));
  const [added, setAdded] = useState(false);
  const isCafe = product.category === 'CAFÉ';
  const inCart = items.some((i) => i.itemType === 'product' && i.product.id === product.id);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group card-light overflow-hidden flex flex-col"
    >
      {/* Image container */}
      <Link to={`/tienda/${product.slug}`} className="relative block overflow-hidden aspect-[3/4] shrink-0">
        <img
          src={resolveImageUrl(product.imageUrl)}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Gradient overlay — always present, stronger on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-coffee-950/70 via-coffee-950/10 to-transparent
                        opacity-60 group-hover:opacity-90 transition-opacity duration-500" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.isLimited && (
            <span className="limited-badge">Edición limitada</span>
          )}
          {!isCafe && (
            <span className="bg-coffee-100/80 dark:bg-coffee-900/80 text-coffee-700 dark:text-coffee-300 text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 backdrop-blur-sm">
              {product.category === 'ACCESORIOS' ? 'Accesorio' : product.category}
            </span>
          )}
          {inCart && (
            <span className="bg-blue-600/90 text-white text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 backdrop-blur-sm font-semibold">
              En carrito
            </span>
          )}
        </div>

        {/* SCA score badge — top right */}
        {isCafe && product.scaScore && (
          <div className="absolute top-3 right-3">
            <span className="sca-badge backdrop-blur-sm">
              <Star className="w-3 h-3 fill-gold-500 text-gold-500" />
              {product.scaScore}
            </span>
          </div>
        )}

        {/* Quick-add overlay — always visible on mobile, hover on desktop */}
        <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-4 translate-y-0 opacity-100
                        sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100
                        transition-all duration-300 ease-out">
          <button
            onClick={handleAdd}
            disabled={product.stock === 0}
            className={`w-full flex items-center justify-center gap-2 py-2.5 min-h-[44px] text-xs font-semibold tracking-[0.15em] uppercase
                        transition-all duration-200 cursor-pointer
                        ${added
                          ? 'bg-green-600 text-white'
                          : product.stock === 0
                            ? 'bg-coffee-700/80 text-coffee-400 cursor-not-allowed'
                            : 'bg-gold-500 text-coffee-950 hover:bg-gold-400 active:scale-[0.98]'
                        }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            {product.stock === 0 ? 'Agotado' : added ? '¡Agregado!' : 'Agregar'}
          </button>
        </div>
      </Link>

      {/* Content */}
      <div className="p-3 sm:p-5 flex flex-col flex-1">
        {/* Origin / category label */}
        <p className="text-[10px] text-gold-500 uppercase tracking-[0.25em] mb-1.5 font-medium">
          {isCafe ? (product.region ?? product.origin ?? 'México') : (product.category === 'MERCH' ? 'Merch' : 'Accesorio')}
        </p>

        {/* Name + price row */}
        <div className="flex items-start justify-between gap-3 mb-2 sm:mb-3">
          <Link to={`/tienda/${product.slug}`} className="flex-1 min-w-0">
            <h3 className="font-serif text-base sm:text-xl text-coffee-900 dark:text-cream leading-snug
                           group-hover:text-gold-600 transition-colors duration-200 line-clamp-2">
              {product.name}
            </h3>
          </Link>
          <div className="text-right shrink-0">
            <p className="font-semibold text-coffee-900 dark:text-cream text-base sm:text-lg leading-none">${product.price}</p>
            {product.weight && (
              <p className="text-coffee-600 dark:text-coffee-400 text-xs mt-1">{product.weight}g</p>
            )}
          </div>
        </div>

        {/* Flavor tags */}
        {isCafe && product.flavors.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3 sm:mb-4">
            {product.flavors.slice(0, 3).map((f) => (
              <span key={f} className="text-[11px] text-coffee-600 dark:text-coffee-300 bg-coffee-100 dark:bg-coffee-800 px-2 py-0.5 leading-5">
                {f}
              </span>
            ))}
          </div>
        )}

        {/* Footer row */}
        <div className="mt-auto pt-3 border-t border-coffee-100 dark:border-coffee-800 flex items-center justify-between">
          <span className="text-[10px] text-coffee-600 dark:text-coffee-400 uppercase tracking-[0.2em]">
            {isCafe ? (product.process ?? '') : ''}
          </span>
          <Link
            to={`/tienda/${product.slug}`}
            className="flex items-center gap-1 text-xs text-coffee-500 hover:text-gold-500 transition-colors duration-200 font-medium"
          >
            Ver más <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
