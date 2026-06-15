import { useEffect, useState, useCallback } from 'react';
import { baristaApi } from '../api';
import type { BaristaProfile } from '../types';

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
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar perfil');
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
      const { useToast } = await import('../context/ToastContext');
      const addToast = useToast.getState().add;
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
      addToast('☕ Brew guardado — se sincronizará al reconectar', 'info');
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
      const res = await baristaApi.submitBrewLog({
        recipeId: data.recipeId,
        rating: data.rating,
        notes: data.notes,
        photoUrl,
        clientBrewId,
      });
      setProfile(res.data.data.profile);
      return { newAchievements: res.data.data.newAchievements ?? [] };
    } catch (err: any) {
      if (err.response?.status === 409) return { newAchievements: [] }; // duplicate, already synced
      setError(err.response?.data?.error || 'Error al registrar brew');
      throw err;
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { profile, loading, error, refetch, submitBrewLog };
}
