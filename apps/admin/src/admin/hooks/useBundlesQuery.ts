import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bundlesApi } from '../../api';
import type { Bundle } from '../../types';

const QUERY_KEY = ['admin-bundles'];

interface CreateBundleBody {
  name: string;
  description: string;
  basePrice: number;
  discountPct: number;
  imageUrl?: string;
  items: { productId: string; quantity: number }[];
}

interface UpdateBundleBody {
  name: string;
  description: string;
  basePrice: number;
  discountPct: number;
  imageUrl?: string;
  isActive: boolean;
}

export function useBundlesQuery() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => bundlesApi.list().then((r) => r.data.data as Bundle[]),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: (data: CreateBundleBody) =>
      bundlesApi.create(data as unknown as Parameters<typeof bundlesApi.create>[0]),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBundleBody }) =>
      bundlesApi.update(id, data as Parameters<typeof bundlesApi.update>[1]),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => bundlesApi.delete(id),
    onSuccess: invalidate,
  });

  return {
    bundles: data ?? [],
    loading: isLoading,
    error: isError,
    refetch,
    create: (data: CreateBundleBody) => createMutation.mutateAsync(data),
    update: (id: string, data: UpdateBundleBody) => updateMutation.mutateAsync({ id, data }),
    delete: (id: string) => deleteMutation.mutateAsync(id),
  };
}
