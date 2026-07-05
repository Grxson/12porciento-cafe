import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { promoCodesApi } from '../../api';

export interface PromoCode {
  id: string;
  code: string;
  discount: number;
  type: string;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

const QUERY_KEY = ['admin-promo-codes'];

export function usePromoCodesQuery() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => promoCodesApi.list().then((r) => (r.data as { data: PromoCode[] }).data),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof promoCodesApi.create>[0]) => promoCodesApi.create(data),
    onSuccess: invalidate,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => promoCodesApi.toggle(id),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => promoCodesApi.delete(id),
    onSuccess: invalidate,
  });

  return {
    codes: data ?? [],
    loading: isLoading,
    error: isError,
    refetch,
    create: (data: Parameters<typeof promoCodesApi.create>[0]) => createMutation.mutateAsync(data),
    toggle: (id: string) => toggleMutation.mutateAsync(id),
    delete: (id: string) => deleteMutation.mutateAsync(id),
  };
}
