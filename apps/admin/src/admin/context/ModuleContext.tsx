import { createContext, useContext, ReactNode, useState, useCallback, useRef } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface ModuleContextType {
  toasts: Toast[];
  addToast: (message: string, type: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ModuleCtx = createContext<ModuleContextType | null>(null);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Track pending dismiss timers so we can clear them on unmount / manual removal
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (message: string, type: Toast['type'], duration = 3000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, type, duration }]);
      if (duration > 0) {
        const timer = setTimeout(() => removeToast(id), duration);
        timers.current.set(id, timer);
      }
    },
    [removeToast],
  );

  const clearToasts = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current.clear();
    setToasts([]);
  }, []);

  return (
    <ModuleCtx.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
    </ModuleCtx.Provider>
  );
}

export function useModuleToast() {
  const ctx = useContext(ModuleCtx);
  if (!ctx) throw new Error('useModuleToast must be inside ModuleProvider');
  return ctx;
}
