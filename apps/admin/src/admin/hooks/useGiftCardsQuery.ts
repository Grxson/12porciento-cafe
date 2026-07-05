import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { giftCardsApi } from '../../api';
import type { GiftCard } from '../../types';

const QUERY_KEY = 'admin-gift-cards';

export function useGiftCardsQuery(page: number, search?: string) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [QUERY_KEY, page, search],
    queryFn: () =>
      giftCardsApi.list({ page, search }).then((r) => ({
        items: r.data.data,
        total: r.data.total,
        totalPages: r.data.totalPages,
      })),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      giftCardsApi.toggle(id, isActive),
    onSuccess: invalidate,
  });

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    loading: isLoading,
    error: isError,
    refetch,
    toggle: (id: string, isActive: boolean) => toggleMutation.mutateAsync({ id, isActive }),
  };
}
