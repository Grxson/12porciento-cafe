import type { RecipeDraft } from '../types';

const DB_NAME = 'cafe12_pwa';
const DB_VERSION = 1;
const STORE_NAME = 'recipe_drafts';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDraft(draft: RecipeDraft): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(draft);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadDraft(userId: string, recipeId: string): Promise<RecipeDraft | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(`${userId}:${recipeId}`);
    req.onsuccess = () => resolve((req.result as RecipeDraft) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearDraft(userId: string, recipeId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(`${userId}:${recipeId}`);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
