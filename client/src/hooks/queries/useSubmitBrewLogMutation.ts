import { useMutation } from '@tanstack/react-query';
import { baristaApi } from '../../api';
import { queryClient } from '../../lib/queryClient';
import { getApiError, getErrorStatus } from '../../lib/api-error';
import { useToast } from '../../context/ToastContext';
import { enqueueBrew } from '../useBrewQueue';
import type { BaristaProfile } from '../../types';

export interface SubmitBrewLogInput {
  recipeId: string;
  rating: number;
  notes?: string;
  difficulty?: string;
  photoUrl?: string;
  photoBlob?: Blob;
  clientBrewId?: string;
  grindSize?: string;
  waterTemp?: number;
  brewTime?: number;
  coffeeWeight?: number;
  waterVolume?: number;
  beanId?: string;
  equipmentIds?: string[];
  tags?: string[];
}

export function useSubmitBrewLogMutation(userId?: string) {
  const mutation = useMutation({
    mutationFn: async (
      data: SubmitBrewLogInput,
    ): Promise<{
      newAchievements: { id: string; name: string; icon: string; xpReward: number }[];
    }> => {
      const clientBrewId = data.clientBrewId ?? crypto.randomUUID();

      if (!navigator.onLine) {
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

      let photoUrl = data.photoUrl;
      if (data.photoBlob && !photoUrl) {
        const { uploadsApi } = await import('../../api');
        const file = new File([data.photoBlob], 'brew.jpg', { type: 'image/jpeg' });
        const uploadRes = await uploadsApi.upload(file);
        photoUrl = uploadRes.data.data.url;
      }

      const oldLevel =
        queryClient.getQueryData<BaristaProfile>(['barista-profile', userId])?.level ?? 1;

      try {
        const res = await baristaApi.submitBrewLog({
          recipeId: data.recipeId,
          rating: data.rating,
          notes: data.notes,
          photoUrl,
          clientBrewId,
          grindSize: data.grindSize,
          waterTemp: data.waterTemp,
          brewTime: data.brewTime,
          coffeeWeight: data.coffeeWeight,
          waterVolume: data.waterVolume,
          beanId: data.beanId,
          equipmentIds: data.equipmentIds,
          tags: data.tags,
        });

        const { profile: newProfile, newAchievements } = res.data.data as {
          profile: BaristaProfile;
          newAchievements: { id: string; name: string; icon: string; xpReward: number }[];
        };

        if (newProfile && userId) {
          queryClient.setQueryData(['barista-profile', userId], newProfile);
        }

        if (newProfile) {
          const newLevel = newProfile.level;
          if (newLevel > oldLevel && (newLevel % 10 === 0 || newLevel === 25 || newLevel === 50)) {
            setTimeout(
              () =>
                useToast
                  .getState()
                  .add(`🎉 ¡Felicitaciones! Alcanzaste Nivel ${newLevel}!`, 'success'),
              500,
            );
          }
        }

        return { newAchievements: newAchievements ?? [] };
      } catch (err: unknown) {
        if (getErrorStatus(err) === 409) return { newAchievements: [] };
        throw err;
      }
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['barista-profile', userId] });
      }
    },
  });

  return {
    submitBrewLog: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error ? getApiError(mutation.error, 'Error al registrar brew') : null,
  };
}
