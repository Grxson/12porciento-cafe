import { useQuery } from '@tanstack/react-query';
import { baristaApi } from '../api';

export interface MonthlyData {
  totalBrews: number;
  avgRating: number;
  favoriteMethod: string;
  totalXp: number;
  topFlavorTag: string;
  daysBrewed: number;
  month: string;
}

interface StatsRaw {
  favoriteMethod: string | null;
  avgRating: number;
  totalBrews: number;
  totalXp: number;
  daysBrewed: number;
  flavorTags: Record<string, number>;
  xpPerWeek: { week: string; xp: number }[];
}

interface UseMonthlyWrapResult {
  monthlyData: MonthlyData | null;
  loading: boolean;
  error: boolean;
  month: string;
}

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildMonthlyData(raw: StatsRaw, month: string): MonthlyData | null {
  if (!raw.totalBrews) return null;

  const flavorEntries = Object.entries(raw.flavorTags);
  const topFlavorTag = flavorEntries.length > 0 ? flavorEntries[0][0] : '';

  return {
    totalBrews: raw.totalBrews,
    avgRating: raw.avgRating,
    favoriteMethod: raw.favoriteMethod ?? '—',
    totalXp: raw.totalXp,
    topFlavorTag,
    daysBrewed: raw.daysBrewed,
    month,
  };
}

export function useMonthlyWrap(userId: string): UseMonthlyWrapResult {
  const month = getCurrentMonth();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['barista-stats', userId, month],
    queryFn: () => baristaApi.getStats(userId, { month }).then((r) => r.data.data as StatsRaw),
    enabled: !!userId,
  });

  const monthlyData = data ? buildMonthlyData(data, month) : null;

  return {
    monthlyData,
    loading: isLoading,
    error: isError,
    month,
  };
}
