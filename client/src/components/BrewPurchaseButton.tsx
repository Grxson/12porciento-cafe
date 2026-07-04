import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { productsApi } from '../api';
import type { Product } from '../types';

interface BrewPurchaseButtonProps {
  beanId?: string | null;
  className?: string;
}

export default function BrewPurchaseButton({ beanId, className = '' }: BrewPurchaseButtonProps) {
  const { data: product } = useQuery({
    queryKey: ['product-by-bean', beanId],
    queryFn: async (): Promise<Product | null> => {
      if (!beanId) return null;
      try {
        const res = await productsApi.getBySlug(beanId);
        return res.data as unknown as Product;
      } catch {
        return null;
      }
    },
    enabled: !!beanId,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  if (!beanId || !product) return null;

  return (
    <Link
      to={`/tienda/${product.slug}`}
      className={`flex items-center gap-2 text-xs px-3 py-1.5 bg-gold-500/10 border border-gold-500/30 hover:bg-gold-500/20 text-gold-500 transition-colors ${className}`}
    >
      <ShoppingCart className="w-3.5 h-3.5" />
      Comprar este café
    </Link>
  );
}
