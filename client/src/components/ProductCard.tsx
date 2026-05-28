import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingBag, Star, Tag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import type { Product } from '../types';

const categoryLabel: Record<string, string> = {
  CAFÉ: '',
  ACCESORIOS: 'Accesorio',
  MERCH: 'Merch',
};

interface ProductCardProps {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: ProductCardProps) {
  const addItem = useCart((s) => s.addItem);
  const isCafe = product.category === 'CAFÉ';

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group card-light overflow-hidden"
    >
      <Link to={`/tienda/${product.slug}`} className="block relative overflow-hidden aspect-[4/3]">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-coffee-900/80 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 flex gap-2">
          {product.isLimited && (
            <span className="limited-badge uppercase tracking-wider">Limitado</span>
          )}
          {!isCafe && (
            <span className="bg-coffee-800/90 text-coffee-300 text-[10px] uppercase tracking-widest px-2 py-0.5 flex items-center gap-1">
              <Tag size={9} /> {categoryLabel[product.category] ?? product.category}
            </span>
          )}
        </div>
        {isCafe && product.scaScore && (
          <div className="absolute bottom-3 left-3">
            <span className="sca-badge">
              <Star className="w-3 h-3 fill-gold-500 text-gold-500" />
              SCA {product.scaScore}
            </span>
          </div>
        )}
      </Link>

      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <Link to={`/tienda/${product.slug}`}>
              <h3 className="font-serif text-lg text-coffee-900 group-hover:text-gold-600 transition-colors">
                {product.name}
              </h3>
            </Link>
            <p className="text-coffee-600 text-sm mt-0.5">
              {isCafe ? product.region : product.description?.slice(0, 60) + '…'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-gold-500 font-semibold text-lg">${product.price}</p>
            {product.weight && <p className="text-coffee-500 text-xs">{product.weight}g</p>}
          </div>
        </div>

        {isCafe && product.flavors.length > 0 && (
          <div className="flex flex-wrap gap-1.5 my-3">
            {product.flavors.slice(0, 3).map((f) => (
              <span key={f} className="text-xs text-coffee-700 bg-coffee-100 px-2 py-0.5 rounded-sm">
                {f}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-coffee-200 mt-3">
          <span className="text-xs text-coffee-500 uppercase tracking-widest">
            {isCafe ? (product.process ?? '') : (product.category === 'MERCH' ? 'Merch' : 'Accesorio')}
          </span>
          <button
            onClick={() => addItem(product)}
            disabled={product.stock === 0}
            className="flex items-center gap-2 text-sm text-gold-500 hover:text-gold-400 disabled:text-coffee-500 transition-colors font-medium"
          >
            <ShoppingBag className="w-4 h-4" />
            {product.stock === 0 ? 'Agotado' : 'Agregar'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
