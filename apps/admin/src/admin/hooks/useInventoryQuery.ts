import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { inventoryApi } from '../../api';
import api from '../../api';

export interface InventoryProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  imageUrl: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
  sku?: string;
  supplier?: string;
  status: 'OK' | 'LOW' | 'OUT';
  inventoryValue: number;
  costValue?: number;
  margin?: number;
}

export interface InventorySummary {
  totalSKUs: number;
  activeSKUs: number;
  totalUnits: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface Movement {
  id: string;
  productId: string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  notes?: string;
  orderId?: string;
  createdAt: string;
  unitCost?: number;
  batchNumber?: string;
  expiryDate?: string;
  supplier?: string;
  product?: { id: string; name: string; imageUrl: string; category: string };
}

export interface InventoryAlerts {
  outOfStock: { id: string; name: string; imageUrl: string; sku?: string }[];
  lowStock: {
    id: string;
    name: string;
    imageUrl: string;
    supplier?: string;
    stock: number;
    lowStockThreshold: number;
  }[];
  overstock: {
    id: string;
    name: string;
    imageUrl: string;
    stock: number;
    lowStockThreshold: number;
  }[];
  expiringBatches: {
    productId: string;
    productName: string;
    batchNumber?: string;
    expiryDate: string;
  }[];
  summary: { outOfStockCount: number; lowStockCount: number };
}

interface OverviewResponse {
  summary: InventorySummary;
  products: InventoryProduct[];
}

export function useInventoryOverviewQuery() {
  const queryClient = useQueryClient();
  const queryKey = ['admin-inventory-overview'];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => inventoryApi.overview().then((r) => r.data as OverviewResponse),
  });

  const patchProductStock = (productId: string, newStock: number) => {
    queryClient.setQueryData<OverviewResponse>(queryKey, (old) =>
      old
        ? {
            ...old,
            products: old.products.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)),
          }
        : old,
    );
  };

  return {
    summary: data?.summary,
    products: data?.products ?? [],
    loading: isLoading,
    error: isError,
    refetch,
    patchProductStock,
  };
}

interface MovementsListParams {
  page: number;
  filterType: string;
  filterProduct: string;
  filterFrom: string;
  filterTo: string;
}

interface MovementsResponse {
  data: Movement[];
  total: number;
  page: number;
  totalPages: number;
}

function buildMovementsParams({
  page,
  filterType,
  filterProduct,
  filterFrom,
  filterTo,
}: MovementsListParams) {
  const params: Record<string, string> = { page: String(page) };
  if (filterType) params.type = filterType;
  if (filterProduct) params.productId = filterProduct;
  if (filterFrom) params.dateFrom = filterFrom;
  if (filterTo) params.dateTo = filterTo;
  return params;
}

export function useInventoryMovementsQuery(listParams: MovementsListParams, enabled = true) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-inventory-movements', listParams],
    queryFn: () =>
      inventoryApi
        .movements(buildMovementsParams(listParams))
        .then((r) => r.data as MovementsResponse),
    placeholderData: keepPreviousData,
    enabled,
  });

  return {
    movements: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    loading: isLoading,
    error: isError,
    refetch,
  };
}

export function useInventoryAlertsQuery(enabled: boolean) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-inventory-alerts'],
    queryFn: () => inventoryApi.alerts().then((r) => r.data as InventoryAlerts),
    enabled,
  });

  return { alerts: data, loading: isLoading, error: isError };
}

export function useProductMovementsQuery(productId: string | null) {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-inventory-product-movements', productId],
    queryFn: () =>
      api.get(`/inventory/products/${productId}/movements`).then((r) => r.data as Movement[]),
    enabled: !!productId,
  });

  return { movements: data ?? [], loading: isLoading };
}

export function useAdjustStockMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      productId: string;
      type: string;
      quantity: number;
      notes?: string;
      unitCost?: number;
      batchNumber?: string;
      expiryDate?: string;
      supplier?: string;
    }) => inventoryApi.adjust(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-movements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-alerts'] });
    },
  });
}

export function useUpdateThresholdMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, threshold }: { productId: string; threshold: number }) =>
      inventoryApi.updateThreshold(productId, threshold),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-alerts'] });
    },
  });
}
