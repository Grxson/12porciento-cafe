import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect } from 'react';

interface ThemeStore {
  dark: boolean;
  toggle: () => void;
}

/** Client theme store — persisted under 'cafe-12-theme' */
export const useClientTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      dark: true,
      toggle: () => set((s) => ({ dark: !s.dark })),
    }),
    { name: 'cafe-12-theme' },
  ),
);

/** Admin theme store — persisted under 'cafe-12-admin-theme' (independent) */
export const useAdminTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      dark: true,
      toggle: () => set((s) => ({ dark: !s.dark })),
    }),
    { name: 'cafe-12-admin-theme' },
  ),
);

/**
 * Sync component: toggles `.dark` class on document.documentElement
 * based on the provided store. Place one per active layout.
 */
export function ThemeSync({ store }: { store: { dark: boolean } }) {
  useEffect(() => {
    document.documentElement.classList.toggle('dark', store.dark);
  }, [store.dark]);
  return null;
}
