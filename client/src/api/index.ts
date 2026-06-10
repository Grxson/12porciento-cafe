import axios from 'axios';
import type { UserProfile, Order, Review, Subscription, PaymentMethod, Recipe, RecipeStep } from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const isAdminContext = window.location.pathname.startsWith('/admin');
  const token = isAdminContext
    ? localStorage.getItem('admin_token')
    : localStorage.getItem('user_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      if (window.location.pathname.startsWith('/admin')) {
        localStorage.removeItem('admin_token');
        if (window.location.pathname !== '/admin/login') {
          window.location.href = '/admin/login';
        }
      } else {
        localStorage.removeItem('user_token');
        if (window.location.pathname !== '/login') {
          window.location.href = `/login?return=${encodeURIComponent(window.location.pathname)}`;
        }
      }
    }
    return Promise.reject(err);
  },
);

export interface ProductsListResponse {
  data: import('../types').Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const productsApi = {
  list: (params?: Record<string, string>) => api.get<ProductsListResponse>('/products', { params }),
  adminList: () => api.get('/products/admin/all'),
  getBySlug: (slug: string) => api.get(`/products/${slug}`),
  create: (data: any) => api.post('/products', data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
};

export const ordersApi = {
  create: (data: any) => api.post('/orders', data),
  list: (params?: Record<string, string>) => api.get('/orders', { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
  updateStatus: (id: string, status: string) => api.put(`/orders/${id}/status`, { status }),
};

export const subscriptionsApi = {
  create: (data: {
    name: string; email: string; phone?: string; plan: string;
    frequency: string; grindPreference: string; items: string[];
    userId?: string;
  }) => api.post('/subscriptions', data),
  list: (params?: Record<string, string>) => api.get('/subscriptions', { params }),
  updateStatus: (id: string, status: string) => api.put(`/subscriptions/${id}/status`, { status }),
  updateItems: (id: string, items: string[], grindPreference?: string) =>
    api.put(`/subscriptions/${id}/items`, { items, grindPreference }),
  updateFulfillment: (id: string, fulfillmentStatus: string) =>
    api.put(`/subscriptions/${id}/fulfillment`, { fulfillmentStatus }),
  adminUpdate: (id: string, data: { plan?: string; frequency?: string; grindPreference?: string; items?: string[] }) =>
    api.put(`/subscriptions/${id}/admin`, data),
};

export const recipesApi = {
  list: (params?: { method?: string; productId?: string; premium?: boolean }) =>
    api.get<{ data: Recipe[] }>('/recipes', { params }),
  getById: (id: string) => api.get<{ data: Recipe }>(`/recipes/${id}`),
  getBySlug: (slug: string) => api.get<{ data: Recipe }>(`/recipes/by-slug/${slug}`),
  adminList: () => api.get<{ data: Recipe[] }>('/recipes/admin/all'),
  create: (data: Partial<Recipe> & { title: string; slug: string; method: string }) =>
    api.post<{ data: Recipe }>('/recipes/admin', data),
  update: (id: string, data: Partial<Recipe>) =>
    api.put<{ data: Recipe }>(`/recipes/admin/${id}`, data),
  delete: (id: string) => api.delete(`/recipes/admin/${id}`),
  addStep: (recipeId: string, data: Partial<RecipeStep> & { title: string; description: string }) =>
    api.post<{ data: RecipeStep }>(`/recipes/admin/${recipeId}/steps`, data),
  updateStep: (recipeId: string, stepId: string, data: Partial<RecipeStep>) =>
    api.put<{ data: RecipeStep }>(`/recipes/admin/${recipeId}/steps/${stepId}`, data),
  deleteStep: (recipeId: string, stepId: string) =>
    api.delete(`/recipes/admin/${recipeId}/steps/${stepId}`),
  reorderSteps: (recipeId: string, stepIds: string[]) =>
    api.put<{ data: RecipeStep[] }>(`/recipes/admin/${recipeId}/steps/reorder`, { stepIds }),
};

export const inventoryApi = {
  overview: () => api.get('/inventory'),
  movements: (params?: Record<string, string>) => api.get('/inventory/movements', { params }),
  alerts: () => api.get('/inventory/alerts'),
  adjust: (data: {
    productId: string; type: string; quantity: number; notes?: string;
    unitCost?: number; batchNumber?: string; expiryDate?: string; supplier?: string;
  }) => api.post('/inventory/adjust', data),
  updateThreshold: (productId: string, threshold: number) =>
    api.put(`/inventory/products/${productId}/threshold`, { threshold }),
};

export const subscriptionPaymentsApi = {
  getNextBilling: (subscriptionId: string) =>
    api.get<{
      nextBilling: string;
      status: string;
      frequency: string;
      daysUntilBilling: number;
    }>(`/subscription-payments/user/${subscriptionId}/next-billing`),
  getPaymentHistory: (subscriptionId: string) =>
    api.get<{
      subscriptionId: string;
      plan: string;
      nextBilling: string;
      payments: Array<{
        id: string;
        amount: number;
        status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
        billingDate: string;
        errorMessage?: string | null;
      }>;
    }>(`/subscription-payments/user/${subscriptionId}/payments`),
};

export const bundlesApi = {
  list: () => api.get('/bundles'),
  getById: (id: string) => api.get(`/bundles/${id}`),
  create: (data: any) => api.post('/bundles', data),
  update: (id: string, data: any) => api.put(`/bundles/${id}`, data),
  delete: (id: string) => api.delete(`/bundles/${id}`),
};

export const reviewsApi = {
  listByProduct: (productId: string) => api.get(`/reviews/product/${productId}`),
  create: (productId: string, data: any) => api.post(`/reviews/product/${productId}`, data),
  adminList: () => api.get('/reviews/admin/all'),
  approve: (id: string) => api.put(`/reviews/${id}/approve`),
  respond: (id: string, adminResponse: string) => api.put(`/reviews/${id}/respond`, { adminResponse }),
  delete: (id: string) => api.delete(`/reviews/${id}`),
  listReplies: (reviewId: string) => api.get(`/reviews/${reviewId}/replies`),
  createReply: (reviewId: string, data: { name?: string; content: string }) =>
    api.post(`/reviews/${reviewId}/reply`, data),
  approveReply: (replyId: string) => api.put(`/reviews/reply/${replyId}/approve`),
  deleteReply: (replyId: string) => api.delete(`/reviews/reply/${replyId}`),
};

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

export const usersApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post<{ token: string; user: UserProfile }>('/users/register', data),
  login: (email: string, password: string) =>
    api.post<{ token: string; user: UserProfile }>('/users/login', { email, password }),
  me: () => api.get<UserProfile>('/users/me'),
  update: (data: Partial<Omit<UserProfile, 'id' | 'email' | 'createdAt'>>) =>
    api.put<UserProfile>('/users/me', data),
  myOrders: () => api.get<Order[]>('/users/me/orders'),
  myReviews: () => api.get<Review[]>('/users/me/reviews'),
  mySubscription: () => api.get<Subscription | null>('/users/me/subscription'),
  cancelSubscription: (id: string) =>
    api.put(`/users/me/subscription/${id}/status`, { status: 'CANCELLED' }),
  pauseSubscription: (id: string) =>
    api.put(`/users/me/subscription/${id}/status`, { status: 'PAUSED' }),
  setupPaymentMethod: () =>
    api.post<{ clientSecret: string }>('/users/me/payment-methods/setup'),
  listPaymentMethods: () =>
    api.get<{ methods: PaymentMethod[]; defaultId: string | null }>('/users/me/payment-methods'),
  setDefaultPaymentMethod: (paymentMethodId: string) =>
    api.post('/users/me/payment-methods/default', { paymentMethodId }),
  deletePaymentMethod: (pmId: string) =>
    api.delete(`/users/me/payment-methods/${pmId}`),
};

export const paymentsApi = {
  createIntent: (
    data: {
      items: { productId: string; quantity: number }[];
      promoCode?: string;
      stripeCustomerId?: string;
      paymentMethodId?: string;
      customerName?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      notes?: string;
      userId?: string;
    },
    idempotencyKey?: string,
  ) =>
    api.post<{ clientSecret: string; paymentIntentId: string; amount: number; subtotal: number; discountAmount: number }>(
      '/payments/create-intent',
      data,
      idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined,
    ),
};

export const promoCodesApi = {
  list: () => api.get('/promo-codes'),
  create: (data: { code: string; discount: number; type: string; maxUses?: number; expiresAt?: string }) =>
    api.post('/promo-codes', data),
  toggle: (id: string) => api.put(`/promo-codes/${id}/toggle`),
  delete: (id: string) => api.delete(`/promo-codes/${id}`),
  validate: (code: string) => api.post('/promo-codes/validate', { code }),
};

export const customersApi = {
  list: (params?: Record<string, string>) => api.get('/customers', { params }),
  getById: (id: string) => api.get(`/customers/${id}`),
};

export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
};

export const uploadsApi = {
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    // Let axios set Content-Type with the multipart boundary (do not set it manually).
    return api.post<{ data: { url: string; thumbUrl: string } }>('/uploads', fd);
  },
};

export default api;
export { baristaApi } from './barista';
