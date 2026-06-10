import { useEffect, useState } from 'react';
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
    photoUrl?: string;
  }) => Promise<{ newAchievements: { id: string; name: string; icon: string; xpReward: number }[] }>;
}

export function useBarista(userId?: string): UseBaristaResult {
  const [profile, setProfile] = useState<BaristaProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
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
  };

  const submitBrewLog = async (data: {
    recipeId: string;
    rating: number;
    notes?: string;
    photoUrl?: string;
  }): Promise<{ newAchievements: { id: string; name: string; icon: string; xpReward: number }[] }> => {
    setError(null);
    try {
      const res = await baristaApi.submitBrewLog(data);
      setProfile(res.data.data.profile);
      return { newAchievements: res.data.data.newAchievements ?? [] };
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar brew');
      throw err;
    }
  };

  useEffect(() => {
    if (userId) refetch();
  }, [userId]);

  return { profile, loading, error, refetch, submitBrewLog };
}
