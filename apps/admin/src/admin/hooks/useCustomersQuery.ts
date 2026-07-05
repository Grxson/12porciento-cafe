import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { customersApi } from '../../api';

export interface CustomerSummary {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  state?: string;
  createdAt: string;
  _count: { orders: number; subscriptions: number };
}

export interface CustomerDetail extends CustomerSummary {
  orders: {
    id: string;
    items: { product?: { name: string } }[];
    createdAt: string;
    total: number;
    status: string;
  }[];
  subscriptions: { id: string }[];
  reviews: {
    id: string;
    product?: { name: string };
    createdAt: string;
    rating: number;
    comment?: string;
    content?: string;
  }[];
}

interface CustomersListParams {
  page: number;
  search: string;
}

interface CustomersListResponse {
  data: CustomerSummary[];
  total?: number;
  totalPages?: number;
}

function buildParams({ page, search }: CustomersListParams) {
  const params: Record<string, string> = { page: String(page) };
  if (search) params.search = search;
  return params;
}

export function useCustomersQuery(listParams: CustomersListParams) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-customers', listParams],
    queryFn: () =>
      customersApi.list(buildParams(listParams)).then((r) => r.data as CustomersListResponse),
    placeholderData: keepPreviousData,
  });

  return {
    customers: data?.data ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    loading: isLoading,
    error: isError,
    refetch,
  };
}

export function useCustomerDetailQuery(id: string | null) {
  const { data, isError, refetch } = useQuery({
    queryKey: ['admin-customer', id],
    queryFn: () => customersApi.getById(id as string).then((r) => r.data.data as CustomerDetail),
    enabled: !!id,
  });

  return { customer: data, error: isError && !!id, refetch };
}
