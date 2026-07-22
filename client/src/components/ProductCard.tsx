import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Star, ArrowRight, Coffee } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useCart } from '../context/CartContext';
import { resolveImageUrl } from '../utils/imageUrl';
import type { Product } from '../types';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default memo(function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { addItem, items } = useCart(useShallow((s) => ({ addItem: s.addItem, items: s.items })));
  const [added, setAdded] = useState(false);
  const isCafe = product.category === 'CAFÉ';
  const inCart = items.some((i) => i.itemType === 'product' && i.product.id === product.id);
  const [imgError, setImgError] = useState(false);

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
      transition={{ duration: 0.4, delay: Math.min(index, 4) * 0.04 }}
      className="group bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 hover:border-gold-500/50 dark:hover:border-gold-500/70 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* Image container */}
      <Link
        to={`/tienda/${product.slug}`}
        className="relative block aspect-[4/3] shrink-0 overflow-hidden sm:aspect-[3/4]"
      >
        {imgError ? (
          <div className="w-full h-full flex items-center justify-center bg-coffee-100 dark:bg-coffee-800">
            <Coffee className="w-10 h-10 text-coffee-400" />
          </div>
        ) : (
          <img
            src={resolveImageUrl(product.imageUrl)}
            alt={product.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        )}

        {/* Gradient overlay — always present, stronger on hover */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-coffee-950/70 via-coffee-950/10 to-transparent
                        opacity-60 group-hover:opacity-90 transition-opacity duration-500"
        />

        {/* Top badges */}
        <div className="absolute left-3 top-3 flex max-w-[65%] flex-col gap-1.5">
          {product.isLimited && <span className="limited-badge">Edición limitada</span>}
          {!isCafe && (
            <span className="bg-coffee-100/80 dark:bg-coffee-900/80 text-coffee-700 dark:text-coffee-300 text-xs uppercase tracking-wider px-2 py-0.5 backdrop-blur-sm">
              {product.category === 'ACCESORIOS' ? 'Accesorio' : product.category}
            </span>
          )}
          {inCart && (
            <span className="bg-blue-600/90 text-white text-xs uppercase tracking-wider px-2 py-0.5 backdrop-blur-sm font-semibold">
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
        <div
          className="absolute inset-x-0 bottom-0 p-2.5 sm:p-4 translate-y-0 opacity-100
                        sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100
                        transition-all duration-300 ease-out"
        >
          <button
            onClick={handleAdd}
            disabled={product.stock === 0}
            className={`w-full flex items-center justify-center gap-2 py-2.5 min-h-[44px] text-xs font-semibold tracking-[0.15em] uppercase
                        transition-all duration-200 cursor-pointer
                        ${
                          added
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
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Origin / category label */}
        <p className="text-xs text-gold-500 uppercase tracking-[0.25em] mb-1.5 font-medium">
          {isCafe
            ? (product.region ?? product.origin ?? 'México')
            : product.category === 'MERCH'
              ? 'Merch'
              : 'Accesorio'}
        </p>

        {/* Name + price row */}
        <div className="mb-3 flex items-start justify-between gap-4">
          <Link to={`/tienda/${product.slug}`} className="flex-1 min-w-0">
            <h3
              className="font-serif text-xl text-coffee-900 dark:text-cream leading-snug
                           group-hover:text-gold-600 transition-colors duration-200 line-clamp-2"
            >
              {product.name}
            </h3>
          </Link>
          <div className="text-right shrink-0">
            <p className="text-lg font-semibold leading-none text-coffee-900 dark:text-cream">
              ${product.price}
            </p>
            {product.weight && (
              <p className="text-coffee-600 dark:text-coffee-400 text-xs mt-1">{product.weight}g</p>
            )}
          </div>
        </div>

        {/* Flavor tags */}
        {isCafe && product.flavors.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3 sm:mb-4">
            {product.flavors.slice(0, 3).map((f) => (
              <span
                key={f}
                className="text-xs text-coffee-600 dark:text-coffee-400 bg-coffee-100 dark:bg-coffee-800 px-2 py-0.5 leading-5"
              >
                {f}
              </span>
            ))}
          </div>
        )}

        {/* Footer row */}
        <div className="mt-auto pt-3 border-t border-coffee-100 dark:border-coffee-800 flex items-center justify-between">
          <span className="text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-wider">
            {isCafe ? (product.process ?? '') : ''}
          </span>
          <Link
            to={`/tienda/${product.slug}`}
            className="flex items-center gap-1 text-xs text-coffee-500 dark:text-coffee-400 hover:text-gold-500 transition-colors duration-200 font-medium"
          >
            Ver más <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
});
