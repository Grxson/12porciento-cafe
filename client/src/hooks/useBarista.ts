import { useEffect, useState, useCallback } from 'react';
import { baristaApi } from '../api';
import { useToast } from '../context/ToastContext';
import type { BaristaProfile } from '../types';
import { getApiError, getErrorStatus } from '../lib/api-error';

interface UseBaristaResult {
  profile: BaristaProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  submitBrewLog: (data: {
    recipeId: string;
    rating: number;
    notes?: string;
    difficulty?: string;
    photoUrl?: string;
    photoBlob?: Blob;
    clientBrewId?: string;
  }) => Promise<{ newAchievements: { id: string; name: string; icon: string; xpReward: number }[] }>;
}

export function useBarista(userId?: string): UseBaristaResult {
  const [profile, setProfile] = useState<BaristaProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await baristaApi.getProfile(userId);
      setProfile(res.data.data);
    } catch (err: unknown) {
      setError(getApiError(err, 'Error al cargar perfil'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const submitBrewLog = useCallback(async (data: {
    recipeId: string;
    rating: number;
    notes?: string;
    difficulty?: string;
    photoUrl?: string;
    photoBlob?: Blob;
    clientBrewId?: string;
  }): Promise<{ newAchievements: { id: string; name: string; icon: string; xpReward: number }[] }> => {
    setError(null);

    const clientBrewId = data.clientBrewId ?? crypto.randomUUID();

    if (!navigator.onLine) {
      const { enqueueBrew } = await import('../hooks/useBrewQueue');
      await enqueueBrew({
        id: clientBrewId,
        recipeId: data.recipeId,
        rating: data.rating,
        notes: data.notes,
        difficulty: data.difficulty,
        photoBlob: data.photoBlob,
        photoUrl: data.photoUrl,
        createdAt: new Date().toISOString(),
        status: 'pending',
      });
      useToast.getState().add('☕ Brew guardado — se sincronizará al reconectar', 'info');
      return { newAchievements: [] };
    }

    try {
      let photoUrl = data.photoUrl;
      if (data.photoBlob && !photoUrl) {
        const { uploadsApi } = await import('../api');
        const file = new File([data.photoBlob], 'brew.jpg', { type: 'image/jpeg' });
        const uploadRes = await uploadsApi.upload(file);
        photoUrl = uploadRes.data.data.url;
      }
      const oldLevel = profile?.level ?? 1;
      const res = await baristaApi.submitBrewLog({
        recipeId: data.recipeId,
        rating: data.rating,
        notes: data.notes,
        photoUrl,
        clientBrewId,
      });
      const newProfile = res.data.data.profile;
      setProfile(newProfile);

      // G7: Milestone celebrations
      if (newProfile) {
        const newLevel = newProfile.level;
        if (newLevel > oldLevel && (newLevel % 10 === 0 || newLevel === 25 || newLevel === 50)) {
          const toastModule = await import('../context/ToastContext');
          setTimeout(
            () =>
              toastModule.useToast
                .getState()
                .add(`🎉 ¡Felicitaciones! Alcanzaste Nivel ${newLevel}!`, 'success'),
            500
          );
        }
      }

      return { newAchievements: res.data.data.newAchievements ?? [] };
    } catch (err: unknown) {
      if (getErrorStatus(err) === 409) return { newAchievements: [] }; // duplicate, already synced
      setError(getApiError(err, 'Error al registrar brew'));
      throw err;
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { profile, loading, error, refetch, submitBrewLog };
}
