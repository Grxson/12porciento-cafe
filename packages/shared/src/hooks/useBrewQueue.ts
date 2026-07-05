export interface QueuedBrew {
  id: string;           // uuid
  recipeId: string;
  rating: number;
  notes?: string;
  difficulty?: string;
  photoBlob?: Blob;
  photoUrl?: string;
  createdAt: string;    // ISO timestamp
  status: 'pending' | 'syncing' | 'failed';
}

const DB_NAME = 'cafe12_pwa';
const DB_VERSION = 1;
const STORE_NAME = 'brew_queue';

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

export async function enqueueBrew(brew: QueuedBrew): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(brew);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function listQueue(): Promise<QueuedBrew[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as QueuedBrew[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeBrew(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function updateBrewStatus(id: string, status: QueuedBrew['status']): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const brew = getReq.result as QueuedBrew;
      if (!brew) {
        reject(new Error(`Brew with id "${id}" not found`));
        return;
      }
      const putReq = store.put({ ...brew, status });
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}
