import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { usersApi } from '../api';
import { idbStorage } from '../lib/idb-storage';
import type { Order } from '../types';

interface OrderHistoryStore {
  orders: Order[];
  loading: boolean;
  error: string;
  isOffline: boolean;
  lastSyncAt: string | null;
  fetchOrders: () => Promise<void>;
}

export const useOrderHistory = create<OrderHistoryStore>()(
  persist(
    (set) => ({
      orders: [],
      loading: false,
      error: '',
      isOffline: false,
      lastSyncAt: null,

      fetchOrders: async () => {
        set({ loading: true, error: '' });
        try {
          const res = await usersApi.myOrders();
          set({
            orders: res.data,
            isOffline: false,
            loading: false,
            lastSyncAt: new Date().toISOString(),
          });
        } catch {
          set({
            error: 'Sin conexión — mostrando pedidos guardados.',
            isOffline: true,
            loading: false,
          });
        }
      },
    }),
    {
      name: 'order-history-store',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({ orders: state.orders, lastSyncAt: state.lastSyncAt }),
    },
  ),
);
