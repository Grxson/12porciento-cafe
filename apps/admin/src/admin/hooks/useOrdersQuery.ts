import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { ordersApi } from '../../api';
import type { Order } from '../../types';

interface OrdersListParams {
  page: number;
  status: string;
  search: string;
  dateFrom: string;
  dateTo: string;
}

interface OrdersListResponse {
  data: Order[];
  total?: number;
  totalPages?: number;
}

const PAGE_SIZE = '50';

function buildParams({ page, status, search, dateFrom, dateTo }: OrdersListParams) {
  const params: Record<string, string> = { page: String(page), pageSize: PAGE_SIZE };
  if (status) params.status = status;
  if (search) params.search = search;
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;
  return params;
}

export function useOrdersQuery(listParams: OrdersListParams) {
  const queryClient = useQueryClient();
  const queryKey = ['admin-orders', listParams];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      ordersApi.list(buildParams(listParams)).then((r) => r.data as OrdersListResponse),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<OrdersListResponse>(queryKey);
      queryClient.setQueryData<OrdersListResponse>(queryKey, (old) =>
        old
          ? {
              ...old,
              data: old.data.map((o) =>
                o.id === id ? { ...o, status: status as Order['status'] } : o,
              ),
            }
          : old,
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: invalidate,
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const results = await Promise.allSettled(ids.map((id) => ordersApi.updateStatus(id, status)));
      const success = results.filter((r) => r.status === 'fulfilled').length;
      const fail = results.length - success;
      return { success, fail };
    },
    onSuccess: invalidate,
  });

  return {
    orders: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    loading: isLoading,
    error: isError,
    refetch,
    updateStatus: updateStatusMutation.mutateAsync,
    bulkUpdateStatus: bulkUpdateStatusMutation.mutateAsync,
    bulkBusy: bulkUpdateStatusMutation.isPending,
  };
}
