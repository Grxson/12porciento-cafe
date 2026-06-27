import { listQueue, removeBrew, updateBrewStatus } from '../hooks/useBrewQueue';
import { uploadsApi, baristaApi } from '../api';
import { useToast } from '../context/ToastContext';

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

      const res = await baristaApi.submitBrewLog({
        recipeId: brew.recipeId,
        rating: brew.rating,
        notes: brew.notes,
        photoUrl: photoUrl ?? undefined,
        clientBrewId: brew.id,
      } as any);

      await removeBrew(brew.id);

      // Surface XP and achievement toasts
      const { add } = useToast.getState();
      const newAchievements: { id: string; name: string; icon: string; xpReward: number }[] =
        res.data?.data?.newAchievements ?? [];
      const profile = res.data?.data?.profile;

      if (profile) {
        const baseXp: Record<string, number> = { 'FÁCIL': 10, 'MEDIA': 20, 'DIFÍCIL': 30 };
        const xp = (baseXp[brew.difficulty ?? 'MEDIA'] ?? 20) + (brew.rating - 1) * 5;
        add(`☕ Brew sincronizado — +${xp} XP`, 'success');
      }

      newAchievements.forEach((a, i) => {
        setTimeout(() => {
          add(`🏆 Logro desbloqueado: ${a.icon} ${a.name} (+${a.xpReward} XP)`, 'success');
        }, 400 * (i + 1));
      });

    } catch {
      await updateBrewStatus(brew.id, 'failed').catch(() => {});
    }
  }
}

export async function initBrewSync(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Sync on app load
  syncBrews().catch(console.error);

  // Sync when connectivity returns
  window.addEventListener('online', () => {
    syncBrews().catch(console.error);
  });

  // Register Background Sync (Chromium only; gracefully ignored elsewhere)
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then((reg) => (reg as any).sync.register('brew-sync'))
      .catch(console.error);
  }

  // Listen for sync events forwarded from SW
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'BREW_SYNC') {
      syncBrews().catch(console.error);
    }
  });
}
