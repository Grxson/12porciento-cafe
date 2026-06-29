import { get, set, del } from 'idb-keyval';
import { StateStorage } from 'zustand/middleware';

/** IndexedDB-backed storage for Zustand persist. Survives browser restarts and clears. */
export const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await get<string>(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};
