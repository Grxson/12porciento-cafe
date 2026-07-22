import { useQuery } from '@tanstack/react-query';
import { baristaApi } from '../../api';

export interface BaristaStats {
  favoriteMethod: string | null;
  favMethodEmoji: string | null;
  avgRating: number;
  totalBrews: number;
  brewsPerMethod: Record<string, number>;
  xpPerWeek: Array<{ week: string; xp: number }>;
  monthlyTrends: Array<{ month: string; count: number }>;
  flavorTags: Record<string, number>;
  timeStats: { earlyBirdCount: number; nightOwlCount: number; weekendCount: number };
  flavorRadar?: {
    user: { flavor: string; value: number }[];
    community: { flavor: string; value: number }[];
  };
}

export function useBaristaStatsQuery(userId?: string) {
  return useQuery<BaristaStats, Error>({
    queryKey: ['barista-stats', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No userId');
      const res = await baristaApi.getStats(userId);
      return res.data.data as BaristaStats;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}
