import { listQueue, removeBrew, updateBrewStatus } from '../hooks/useBrewQueue';
import { uploadsApi, baristaApi } from '../api';

async function syncBrews(): Promise<void> {
  let queue;
  try {
    queue = await listQueue();
  } catch {
    return; // IndexedDB not available
  }

  const pending = queue.filter((b) => b.status === 'pending' || b.status === 'failed');

  for (const brew of pending) {
    try {
      await updateBrewStatus(brew.id, 'syncing');

      let photoUrl = brew.photoUrl;
      if (brew.photoBlob && !photoUrl) {
        const file = new File([brew.photoBlob], 'brew.jpg', { type: 'image/jpeg' });
        const uploadRes = await uploadsApi.upload(file);
        photoUrl = uploadRes.data.data.url;
      }

      await baristaApi.submitBrewLog({
        recipeId: brew.recipeId,
        rating: brew.rating,
        notes: brew.notes,
        photoUrl: photoUrl ?? undefined,
        clientBrewId: brew.id,
      } as any);

      await removeBrew(brew.id);

      window.dispatchEvent(new CustomEvent('brew-synced', { detail: { id: brew.id } }));
    } catch {
      await updateBrewStatus(brew.id, 'failed').catch(() => {});
    }
  }
}

export async function initBrewSync(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Sync on app load
  syncBrews().catch(() => {});

  // Sync when connectivity returns
  window.addEventListener('online', () => {
    syncBrews().catch(() => {});
  });

  // Register Background Sync (Chromium only; gracefully ignored elsewhere)
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then((reg) => (reg as any).sync.register('brew-sync'))
      .catch(() => {});
  }
}
