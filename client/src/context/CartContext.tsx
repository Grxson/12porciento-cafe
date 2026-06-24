import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useToast } from './ToastContext';
import type { CartItem, BundleCartItem, Bundle, Product } from '../types';

export const MAX_QTY_PER_PRODUCT = 10;

type CartItemFull = CartItem | BundleCartItem;

interface CartStore {
  items: CartItemFull[];
  drawerOpen: boolean;
  addItem: (product: Product, quantity?: number) => void;
  addBundle: (bundle: Bundle) => void;
  removeItem: (itemKey: string) => void;
  updateQuantity: (itemKey: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
  count: () => number;
  openDrawer: () => void;
  closeDrawer: () => void;
}

function getItemKey(item: CartItemFull): string {
  return item.itemType === 'product' ? `prod_${item.product.id}` : `bund_${item.bundleId}`;
}

function findItemIndex(items: CartItemFull[], key: string): number {
  return items.findIndex((i) => getItemKey(i) === key);
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      drawerOpen: false,
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),

      addItem: (product, quantity = 1) => {
        if (product.stock <= 0) {
          useToast.getState().add(`"${product.name}" está agotado`, 'warning');
          return;
        }

        const items = get().items;
        const key = `prod_${product.id}`;
        const existing = items.find((i) => i.itemType === 'product' && i.product.id === product.id) as CartItem | undefined;
        const desiredQty = existing ? existing.quantity + quantity : quantity;
        const cappedQty = Math.min(desiredQty, product.stock, MAX_QTY_PER_PRODUCT);

        if (cappedQty < desiredQty) {
          useToast.getState().add(
            `Máximo ${MAX_QTY_PER_PRODUCT} unidades de "${product.name}" por pedido`,
            'warning',
          );
        }

        if (existing) {
          set({ items: items.map((i) => getItemKey(i) === key ? { ...i, quantity: cappedQty } : i) });
        } else {
          set({ items: [...items, { itemType: 'product', product, quantity: cappedQty }] });
        }
        useToast.getState().add(`${product.name} agregado al carrito`, 'success');
      },

      addBundle: (bundle) => {
        const outOfStock = bundle.items.find((bi) => !bi.product || bi.product.stock < bi.quantity);
        if (outOfStock) {
          useToast.getState().add(`El paquete incluye productos agotados`, 'warning');
          return;
        }

        const items = get().items;
        const existing = items.find((i) => i.itemType === 'bundle' && i.bundleId === bundle.id);

        if (existing) {
          useToast.getState().add(`"${bundle.name}" ya está en el carrito`, 'info');
          return;
        }

        set({ items: [...items, { itemType: 'bundle', bundleId: bundle.id, bundle, quantity: 1 }] });
        useToast.getState().add(`"${bundle.name}" agregado al carrito`, 'success');
      },

      removeItem: (itemKey) =>
        set({ items: get().items.filter((i) => getItemKey(i) !== itemKey) }),

      updateQuantity: (itemKey, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemKey);
          return;
        }
        const idx = findItemIndex(get().items, itemKey);
        if (idx === -1) return;
        const item = get().items[idx];

        let cappedQty = quantity;
        if (item.itemType === 'product') {
          cappedQty = Math.min(quantity, item.product.stock, MAX_QTY_PER_PRODUCT);
          if (cappedQty < quantity) {
            useToast.getState().add(
              `Máximo ${MAX_QTY_PER_PRODUCT} unidades de "${item.product.name}" por pedido`,
              'warning',
            );
          }
        }

        set({
          items: get().items.map((i, j) =>
            j === idx ? { ...i, quantity: cappedQty } : i,
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      total: () =>
        get().items.reduce((sum, i) => {
          if (i.itemType === 'product') return sum + Number(i.product.price) * i.quantity;
          return sum + Number(i.bundle?.finalPrice ?? 0) * i.quantity;
        }, 0),

      count: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'cafe-12-cart',
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export const CartProvider = ({ children }: { children: React.ReactNode }) => (
  <>{children}</>
);