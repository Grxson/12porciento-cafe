import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Star, Lock } from 'lucide-react';
import { productsApi } from '../api';
import type { Product, SubscriptionPlan } from '../types';
import { PLAN_SLOTS } from '../types';

interface Props {
  plan: SubscriptionPlan;
  selected: string[];
  onChange: (ids: string[]) => void;
  grindPreference: 'MOLIDO' | 'GRANO';
  onGrindChange: (g: 'MOLIDO' | 'GRANO') => void;
}

export default function CoffeePicker({ plan, selected, onChange, grindPreference, onGrindChange }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const slots = PLAN_SLOTS[plan];

  useEffect(() => {
    productsApi.list({ category: 'CAFÉ' }).then((r) => {
      setProducts(r.data.filter((p: Product) => p.isActive));
      setLoading(false);
    });
  }, []);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
      return;
    }
    const product = products.find((p) => p.id === id);
    if (!slots.allowLimited && product?.isLimited) return;
    if (selected.length >= slots.max) return;
    onChange([...selected, id]);
  };

  const isDisabled = (product: Product) => {
    if (!slots.allowLimited && product.isLimited) return true;
    if (!selected.includes(product.id) && selected.length >= slots.max) return true;
    return false;
  };

  const isReady = selected.length >= slots.min;

  return (
    <div>
      {/* Grind preference toggle */}
      <div className="mb-8">
        <p className="text-xs text-coffee-500 uppercase tracking-widest mb-3">
          Preferencia de molido — aplica a todos tus cafés
        </p>
        <div className="inline-flex border border-coffee-700">
          {(['GRANO', 'MOLIDO'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onGrindChange(g)}
              className={`px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] transition-all ${
                grindPreference === g ? 'bg-gold-500 text-coffee-950' : 'text-coffee-400 hover:text-cream'
              }`}
            >
              {g === 'GRANO' ? 'Grano entero' : 'Molido'}
            </button>
          ))}
        </div>
      </div>

      {/* Slot counter */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-coffee-500 uppercase tracking-widest">Selecciona tus cafés</p>
        <div className={`text-xs font-semibold px-3 py-1 ${isReady ? 'bg-green-900/30 text-green-400' : 'bg-coffee-800 text-coffee-300'}`}>
          {selected.length}/{slots.max} seleccionados
          {slots.min !== slots.max && ` (mín. ${slots.min})`}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: Math.min(slots.max, 10) }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 max-w-[60px] transition-all duration-300 ${i < selected.length ? 'bg-gold-500' : 'bg-coffee-800'}`} />
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[3/4] shimmer" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((product) => {
            const isSelected = selected.includes(product.id);
            const disabled = isDisabled(product);
            const locked = !slots.allowLimited && product.isLimited;

            return (
              <motion.button
                key={product.id}
                type="button"
                onClick={() => !disabled && toggle(product.id)}
                whileHover={disabled ? {} : { y: -2 }}
                className={`relative group text-left transition-all duration-200 ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className={`relative aspect-[3/4] overflow-hidden border-2 transition-all ${isSelected ? 'border-gold-500' : 'border-transparent'}`}>
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className={`w-full h-full object-cover transition-transform duration-500 ${!disabled ? 'group-hover:scale-105' : ''}`}
                  />
                  <div className={`absolute inset-0 transition-opacity duration-200 ${isSelected ? 'bg-coffee-950/30' : 'bg-gradient-to-t from-coffee-950/70 via-transparent to-transparent'}`} />

                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute top-3 right-3 w-8 h-8 bg-gold-500 flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-coffee-950" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {locked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-coffee-950/60">
                      <div className="text-center">
                        <Lock className="w-5 h-5 text-coffee-400 mx-auto mb-1" />
                        <p className="text-coffee-400 text-[10px]">Plan Connoisseur</p>
                      </div>
                    </div>
                  )}

                  {product.isLimited && !locked && (
                    <span className="absolute top-3 left-3 text-[9px] bg-gold-500/20 border border-gold-500/40 text-gold-400 px-1.5 py-0.5 uppercase tracking-widest">
                      Limitado
                    </span>
                  )}
                </div>

                <div className="pt-2.5 pb-1">
                  <p className="text-[10px] text-gold-600 uppercase tracking-widest mb-0.5 truncate">{product.region}</p>
                  <p className={`font-serif text-sm leading-tight transition-colors ${isSelected ? 'text-gold-500' : 'text-coffee-900'}`}>
                    {product.name}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-coffee-500 text-xs">${product.price} MXN</p>
                    {product.scaScore && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-gold-500 text-gold-500" />
                        <span className="text-[10px] text-gold-600">{product.scaScore}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {!isReady && selected.length > 0 && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-coffee-400 text-xs mt-6"
        >
          Selecciona {slots.min - selected.length} café{slots.min - selected.length !== 1 ? 's' : ''} más para continuar
        </motion.p>
      )}
    </div>
  );
}
