import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '../../api';
import type { Review } from '../../types';

type ReviewWithResponse = Review & { adminResponse?: string };
type Filter = 'all' | 'pending' | 'approved';

const QUERY_KEY = 'admin-reviews';

export function useReviewsQuery(page: number, filter: Filter) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [QUERY_KEY, page, filter],
    queryFn: () => {
      const params: Record<string, string> = { page: String(page), pageSize: '50' };
      if (filter !== 'all') params.filter = filter;
      return reviewsApi.adminList(params).then((r) => ({
        reviews: r.data.data as ReviewWithResponse[],
        totalPages: r.data.totalPages ?? 1,
        total: r.data.total ?? 0,
      }));
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

  const approveMutation = useMutation({
    mutationFn: (id: string) => reviewsApi.approve(id),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reviewsApi.delete(id),
    onSuccess: invalidate,
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => reviewsApi.respond(id, text),
    onSuccess: invalidate,
  });

  return {
    reviews: data?.reviews ?? [],
    totalPages: data?.totalPages ?? 1,
    total: data?.total ?? 0,
    loading: isLoading,
    error: isError,
    refetch,
    approve: (id: string) => approveMutation.mutateAsync(id),
    delete: (id: string) => deleteMutation.mutateAsync(id),
    respond: (id: string, text: string) => respondMutation.mutateAsync({ id, text }),
  };
}
