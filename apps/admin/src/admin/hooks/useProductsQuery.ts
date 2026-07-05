import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { productsApi } from '../../api';
import type { Product } from '../../types';

interface ProductsListParams {
  page: number;
  search: string;
  category: string;
  caficultorId: string;
}

interface ProductsListResponse {
  data: Product[];
  total?: number;
  totalPages?: number;
}

const PAGE_SIZE = '50';

function buildParams({ page, search, category, caficultorId }: ProductsListParams) {
  const params: Record<string, string> = { page: String(page), pageSize: PAGE_SIZE };
  if (search) params.search = search;
  if (category && category !== 'TODOS') params.category = category;
  if (caficultorId) params.caficultorId = caficultorId;
  return params;
}

export function useProductsQuery(listParams: ProductsListParams) {
  const queryClient = useQueryClient();
  const queryKey = ['admin-products', listParams];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () =>
      productsApi.adminList(buildParams(listParams)).then((r) => r.data as ProductsListResponse),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-products'] });

  const createMutation = useMutation({
    mutationFn: (payload: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) =>
      productsApi.create(payload),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Product> }) =>
      productsApi.update(id, payload),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: invalidate,
  });

  const bulkUpdateActiveMutation = useMutation({
    mutationFn: async ({ ids, isActive }: { ids: string[]; isActive: boolean }) => {
      const results = await Promise.allSettled(
        ids.map((id) => productsApi.update(id, { isActive })),
      );
      const success = results.filter((r) => r.status === 'fulfilled').length;
      const fail = results.length - success;
      return { success, fail };
    },
    onSuccess: invalidate,
  });

  return {
    products: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    loading: isLoading,
    error: isError,
    refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    bulkUpdateActive: bulkUpdateActiveMutation.mutateAsync,
    saving: createMutation.isPending || updateMutation.isPending,
    deleting: deleteMutation.isPending,
    bulkBusy: bulkUpdateActiveMutation.isPending,
  };
}
