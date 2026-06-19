import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { usersApi } from '../api';
import type { UserProfile } from '../types';

interface UserStore {
  user: UserProfile | null;
  token: string | null;
  hasSubscription: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  updateProfile: (data: Partial<Omit<UserProfile, 'id' | 'email' | 'createdAt'>>) => Promise<void>;
  setHasSubscription: (v: boolean) => void;
}

export const useUser = create<UserStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      hasSubscription: false,

      login: async (email, password) => {
        const res = await usersApi.login(email, password);
        const { token, user } = res.data;
        localStorage.setItem('user_token', token);
        set({ user, token });
        const apiBase = import.meta.env.VITE_API_URL || '/api';
        fetch(`${apiBase}/products?category=${encodeURIComponent('CAFÉ')}&limit=100`).catch(console.error);
        try {
          const sub = await usersApi.mySubscription();
          set({ hasSubscription: sub.data !== null });
        } catch {
          set({ hasSubscription: false });
        }
      },

      register: async (name, email, password) => {
        const res = await usersApi.register({ name, email, password });
        const { token, user } = res.data;
        localStorage.setItem('user_token', token);
        set({ user, token });
        const apiBase = import.meta.env.VITE_API_URL || '/api';
        fetch(`${apiBase}/products?category=${encodeURIComponent('CAFÉ')}&limit=100`).catch(console.error);
      },

      logout: () => {
        localStorage.removeItem('user_token');
        set({ user: null, token: null, hasSubscription: false });
      },

      refresh: async () => {
        try {
          const res = await usersApi.me();
          set({ user: res.data });
          const sub = await usersApi.mySubscription();
          set({ hasSubscription: sub.data !== null });
        } catch {
          get().logout();
        }
      },

      updateProfile: async (data) => {
        const res = await usersApi.update(data);
        set({ user: res.data });
      },

      setHasSubscription: (v) => set({ hasSubscription: v }),
    }),
    {
      name: 'cafe-12-user',
      partialize: (s) => ({ user: s.user, token: s.token, hasSubscription: s.hasSubscription }),
    },
  ),
);
