import { useQuery } from '@tanstack/react-query';
import { baristaApi } from '../../api';
import type { BaristaProfile } from '../../types';

export function useBaristaProfileQuery(userId?: string) {
  return useQuery<BaristaProfile | null, Error>({
    queryKey: ['barista-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await baristaApi.getProfile(userId);
      return (res.data.data as BaristaProfile) ?? null;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}
