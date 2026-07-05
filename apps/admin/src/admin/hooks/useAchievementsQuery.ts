import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { achievementsApi } from '../../api';

export interface Achievement {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  rarity: string;
  xpReward: number;
  unlockedAt?: string | null;
}

const QUERY_KEY = ['admin-achievements'];

export function useAchievementsQuery() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () =>
      achievementsApi
        .list()
        .then((r) => (r.data?.achievements ?? []).sort((a, b) => a.xpReward - b.xpReward)),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof achievementsApi.create>[0]) =>
      achievementsApi.create(data),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof achievementsApi.update>[1];
    }) => achievementsApi.update(id, data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => achievementsApi.delete(id),
    onSuccess: invalidate,
  });

  return {
    achievements: data ?? [],
    loading: isLoading,
    error: isError,
    refetch,
    create: (data: Parameters<typeof achievementsApi.create>[0]) =>
      createMutation.mutateAsync(data),
    update: (id: string, data: Parameters<typeof achievementsApi.update>[1]) =>
      updateMutation.mutateAsync({ id, data }),
    delete: (id: string) => deleteMutation.mutateAsync(id),
  };
}
