import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect } from 'react';

interface ThemeStore {
  dark: boolean;
  toggle: () => void;
}

export const useTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      dark: true,
      toggle: () => set((s) => ({ dark: !s.dark })),
    }),
    { name: 'cafe-12-theme' },
  ),
);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const dark = useTheme((s) => s.dark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return <>{children}</>;
}
