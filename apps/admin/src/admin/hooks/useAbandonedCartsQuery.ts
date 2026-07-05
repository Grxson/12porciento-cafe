import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { abandonedCartApi } from '../../api';

const QUERY_KEY = 'admin-abandoned-carts';

interface Filters {
  email?: string;
  from?: string;
  to?: string;
  recovered?: string;
}

export function useAbandonedCartsQuery(page: number, filters: Filters) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [QUERY_KEY, page, filters],
    queryFn: () =>
      abandonedCartApi.list({ page, ...filters }).then((r) => ({
        carts: r.data.data,
        total: r.data.total,
        totalPages: r.data.totalPages,
      })),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });

  const sendReminderMutation = useMutation({
    mutationFn: (id: string) => abandonedCartApi.sendReminder(id),
    onSuccess: invalidate,
  });

  const recoverMutation = useMutation({
    mutationFn: (id: string) => abandonedCartApi.recover(id),
    onSuccess: invalidate,
  });

  return {
    carts: data?.carts ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    loading: isLoading,
    error: isError,
    refetch,
    sendReminder: (id: string) => sendReminderMutation.mutateAsync(id),
    recover: (id: string) => recoverMutation.mutateAsync(id),
  };
}
