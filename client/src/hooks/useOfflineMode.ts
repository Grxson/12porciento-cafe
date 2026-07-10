import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStorage } from '../lib/idb-storage';

interface OfflineModeState {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (v: boolean) => void;
}

export const offlineModeStore = create<OfflineModeState>()(
  persist(
    (set) => ({
      enabled: true,
      toggle: () => set((state) => ({ enabled: !state.enabled })),
      setEnabled: (v: boolean) => set({ enabled: v }),
    }),
    {
      name: 'cafe-12-offline',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({ enabled: state.enabled }),
    },
  ),
);

function sendMessageToSW(enabled: boolean): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'OFFLINE_MODE_CHANGED',
      enabled,
    });
  }
}

// Subscribe to changes and notify service worker on every enabled change
offlineModeStore.subscribe((state, prevState) => {
  if (state.enabled !== prevState.enabled) {
    sendMessageToSW(state.enabled);
  }
});

// Bound hook with Zustand selector support
export const useOfflineMode = offlineModeStore;
