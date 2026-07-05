import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { wishlistApi } from '../api';
import { idbStorage } from '../lib/idb-storage';
import { useToast } from './ToastContext';
import type { Product } from '../types';

export interface WishlistItem {
  id: string;
  product: Product;
  wishlistId: string;
}

interface WishlistStore {
  items: WishlistItem[];
  loading: boolean;
  error: string;
  isOffline: boolean;
  fetchItems: () => Promise<void>;
  addItem: (productId: string) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
}

export const useWishlist = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      loading: false,
      error: '',
      isOffline: false,

      fetchItems: async () => {
        set({ loading: true, error: '' });
        try {
          const res = await wishlistApi.list();
          const items: WishlistItem[] = res.data.data.map((item) => ({
            id: item.id,
            product: item.product,
            wishlistId: item.id,
          }));
          set({ items, isOffline: false, loading: false });
        } catch {
          // Network error — use cached items
          set({
            error: 'Sin conexión — mostrando datos guardados.',
            isOffline: true,
            loading: false,
          });
        }
      },

      addItem: async (productId: string) => {
        try {
          await wishlistApi.add(productId);
          // Optimistically add via re-fetch
          await get().fetchItems();
        } catch {
          useToast
            .getState()
            .add(
              navigator.onLine
                ? 'No se pudo guardar en favoritos. Intenta de nuevo.'
                : 'Sin conexión — no se pudo guardar en favoritos.',
              'error',
            );
        }
      },

      removeItem: async (productId: string) => {
        const prev = get().items;
        // Optimistic remove
        set({ items: get().items.filter((i) => i.product.id !== productId) });
        try {
          await wishlistApi.remove(productId);
        } catch {
          // Restore on failure
          set({ items: prev });
          useToast
            .getState()
            .add(
              navigator.onLine
                ? 'No se pudo eliminar de favoritos. Intenta de nuevo.'
                : 'Sin conexión — no se pudo eliminar de favoritos.',
              'error',
            );
        }
      },

      isInWishlist: (productId: string) => get().items.some((i) => i.product.id === productId),
    }),
    {
      name: 'wishlist-store',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
