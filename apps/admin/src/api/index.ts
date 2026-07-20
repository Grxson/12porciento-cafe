import axios from 'axios';
import type {
  UserProfile,
  Order,
  Review,
  Subscription,
  PaymentMethod,
  Recipe,
  RecipeStep,
  WishlistItem,
  Product,
  RecipeRating,
  GiftCard,
  AbandonedCart,
  Bundle,
  Achievement,
  LoteFormData,
  Caficultor,
  PricingConfig,
  ProductVersion,
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
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

export interface Reward {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpCost: number;
  discountPct: number;
  maxUses: number;
  stock: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const productsApi = {
  list: (params?: Record<string, string>) => api.get<ProductsListResponse>('/products', { params }),
  adminList: (params?: Record<string, string>) => api.get('/products/admin/all', { params }),
  getBySlug: (slug: string) => api.get(`/products/${slug}`),
  create: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => api.post('/products', data),
  update: (id: string, data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  priceHistory: (id: string) =>
    api.get<{ data: { id: string; price: number; createdAt: string }[] }>(
      `/products/${id}/price-history`,
    ),
};

export const ordersApi = {
  create: (data: {
    customerName: string;
    email: string;
    phone?: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    notes?: string;
    userId?: string;
    paymentIntentId?: string;
    promoCode?: string;
    items: { productId: string; quantity: number }[];
  }) => api.post('/orders', data),
  list: (params?: Record<string, string>) => api.get('/orders', { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
  updateStatus: (id: string, status: string) => api.put(`/orders/${id}/status`, { status }),
};

export const subscriptionsApi = {
  create: (data: {
    name: string;
    email: string;
    phone?: string;
    plan: string;
    frequency: string;
    grindPreference: string;
    items: string[];
    userId?: string;
    paymentMethodId?: string;
  }) => api.post('/subscriptions', data),
  createSetupIntent: () => api.post<{ clientSecret: string }>('/subscriptions/setup-intent'),
  list: (params?: Record<string, string>) => api.get('/subscriptions', { params }),
  updateStatus: (id: string, status: string) => api.put(`/subscriptions/${id}/status`, { status }),
  updateItems: (id: string, items: string[], grindPreference?: string) =>
    api.put(`/subscriptions/${id}/items`, { items, grindPreference }),
  updateFulfillment: (id: string, fulfillmentStatus: string) =>
    api.put(`/subscriptions/${id}/fulfillment`, { fulfillmentStatus }),
  adminUpdate: (
    id: string,
    data: { plan?: string; frequency?: string; grindPreference?: string; items?: string[] },
  ) => api.put(`/subscriptions/${id}/admin`, data),
  b2bInquiry: (data: {
    empresa: string;
    rfc: string;
    contactoNombre: string;
    contactoEmail?: string;
    contactoTelefono?: string;
    volumenEstimado?: string;
    giroNegocio?: string;
  }) => api.post('/subscriptions/b2b-inquiry', data),
  b2bList: (params?: Record<string, string>) => api.get('/subscriptions/b2b-inquiries', { params }),
  b2bGet: (id: string) => api.get(`/subscriptions/b2b-inquiries/${id}`),
  b2bUpdateStatus: (id: string, status: string) =>
    api.put(`/subscriptions/b2b-inquiries/${id}/status`, { status }),
  summary: () =>
    api.get<{ statusCounts: Record<string, number>; planCounts: Record<string, number> }>(
      '/subscriptions/summary',
    ),
};

export const recipesApi = {
  list: (params?: {
    method?: string;
    productId?: string;
    premium?: boolean;
    difficulty?: string;
    sortBy?: string;
    sortOrder?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) =>
    api.get<{ data: Recipe[]; total: number; page: number; pageSize: number; totalPages: number }>(
      '/recipes',
      { params },
    ),
  getById: (id: string) => api.get<{ data: Recipe }>(`/recipes/${id}`),
  getBySlug: (slug: string) => api.get<{ data: Recipe }>(`/recipes/by-slug/${slug}`),
  getRelated: (id: string) => api.get<{ data: Recipe[] }>(`/recipes/${id}/related`),
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
    productId: string;
    type: string;
    quantity: number;
    notes?: string;
    unitCost?: number;
    batchNumber?: string;
    expiryDate?: string;
    supplier?: string;
  }) => api.post('/inventory/adjust', data),
  updateThreshold: (productId: string, threshold: number) =>
    api.put(`/inventory/products/${productId}/threshold`, { threshold }),
};

export const subscriptionPauseApi = {
  pause: (data?: { reason?: string; until?: string }) => api.patch('/subscriptions/pause', data),
  resume: () => api.patch('/subscriptions/resume'),
  pauseInfo: () =>
    api.get<{
      data: {
        id: string;
        status: string;
        pausedAt: string | null;
        pausedUntil: string | null;
        pausedReason: string | null;
        skipCount: number;
        maxSkips: number;
      };
    }>('/subscriptions/pause-info'),
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
  list: (params?: { page?: string; limit?: string; search?: string }) =>
    api.get<{
      data: Array<{
        id: string;
        status: string;
        amount: number;
        billingDate: string;
        stripeInvoiceId: string;
        subscription: { name: string; email: string; plan: string };
      }>;
      pagination: { page: number; limit: number; total: number; pages: number };
    }>('/subscription-payments/admin/all', { params }),
};

export const bundlesApi = {
  list: () => api.get<{ data: Bundle[] }>('/bundles'),
  getById: (id: string) => api.get<{ data: Bundle }>(`/bundles/${id}`),
  create: (data: Omit<Bundle, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<{ data: Bundle }>('/bundles', data),
  update: (id: string, data: Partial<Omit<Bundle, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api.put<{ data: Bundle }>(`/bundles/${id}`, data),
  delete: (id: string) => api.delete(`/bundles/${id}`),
};

export const reviewsApi = {
  listByProduct: (productId: string) =>
    api.get<{ data: Review[] }>(`/reviews/product/${productId}`),
  create: (
    productId: string,
    data: { rating: number; comment?: string; name?: string; email?: string; userId?: string },
  ) => api.post<{ data: Review }>(`/reviews/product/${productId}`, data),
  adminList: (params?: Record<string, string>) =>
    api.get<{ data: Review[]; totalPages?: number; total?: number }>('/reviews/admin/all', {
      params,
    }),
  approve: (id: string) => api.put(`/reviews/${id}/approve`),
  respond: (id: string, adminResponse: string) =>
    api.put(`/reviews/${id}/respond`, { adminResponse }),
  delete: (id: string) => api.delete(`/reviews/${id}`),
  listReplies: (reviewId: string) => api.get(`/reviews/${reviewId}/replies`),
  createReply: (reviewId: string, data: { name?: string; content: string }) =>
    api.post(`/reviews/${reviewId}/reply`, data),
  approveReply: (replyId: string) => api.put(`/reviews/reply/${replyId}/approve`),
  deleteReply: (replyId: string) => api.delete(`/reviews/reply/${replyId}`),
  summary: () =>
    api.get<{
      total: number;
      pending: number;
      approved: number;
      ratingDistribution: Record<number, number>;
    }>('/reviews/admin/summary'),
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
  myOrder: (id: string) => api.get<Order>(`/users/me/orders/${id}`),
  myReviews: () => api.get<Review[]>('/users/me/reviews'),
  mySubscription: () => api.get<Subscription | null>('/users/me/subscription'),
  cancelSubscription: (id: string) =>
    api.put(`/users/me/subscription/${id}/status`, { status: 'CANCELLED' }),
  pauseSubscription: (id: string) =>
    api.put(`/users/me/subscription/${id}/status`, { status: 'PAUSED' }),
  resumeSubscription: (id: string) =>
    api.put(`/users/me/subscription/${id}/status`, { status: 'ACTIVE' }),
  setupPaymentMethod: () => api.post<{ clientSecret: string }>('/users/me/payment-methods/setup'),
  listPaymentMethods: () =>
    api.get<{ methods: PaymentMethod[]; defaultId: string | null }>('/users/me/payment-methods'),
  setDefaultPaymentMethod: (paymentMethodId: string) =>
    api.post('/users/me/payment-methods/default', { paymentMethodId }),
  deletePaymentMethod: (pmId: string) => api.delete(`/users/me/payment-methods/${pmId}`),
  forgotPassword: (email: string) =>
    api.post<{ ok: boolean; message: string }>('/users/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post<{ ok: boolean; message: string }>('/users/reset-password', { token, password }),
  verifyEmail: (token: string) =>
    api.post<{ ok: boolean; message: string }>(`/users/verify-email/${token}`),
  resendVerification: () =>
    api.post<{ ok: boolean; message: string }>('/users/resend-verification'),
};

export const giftCardsApi = {
  purchase: (data: {
    amount: number;
    recipientName?: string;
    recipientEmail: string;
    senderName?: string;
    message?: string;
    paymentIntentId: string;
  }) => api.post('/gift-cards/purchase', data),
  my: () => api.get<{ data: { sent: GiftCard[]; received: GiftCard[] } }>('/gift-cards/my'),
  redeem: (code: string) => api.post('/gift-cards/redeem', { code }),
  list: (params?: { page?: number; search?: string }) =>
    api.get<{ data: GiftCard[]; total: number; totalPages: number }>('/gift-cards', { params }),
  toggle: (id: string, isActive: boolean) => api.patch(`/gift-cards/${id}/toggle`, { isActive }),
};

export const paymentsApi = {
  createGiftIntent: (amount: number) =>
    api.post<{ clientSecret: string; paymentIntentId: string }>('/payments/create-gift-intent', {
      amount,
    }),
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
    api.post<{
      clientSecret: string;
      paymentIntentId: string;
      amount: number;
      subtotal: number;
      discountAmount: number;
    }>(
      '/payments/create-intent',
      data,
      idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined,
    ),
};

export const promoCodesApi = {
  list: () => api.get('/promo-codes'),
  create: (data: {
    code: string;
    discount: number;
    type: string;
    maxUses?: number;
    expiresAt?: string;
  }) => api.post('/promo-codes', data),
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
    return api.post<{ data: { url: string; thumbUrl: string } }>('/uploads', fd);
  },
  uploadBanner: (file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post<{ data: { url: string } }>('/uploads/banner', fd);
  },
};

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export const adminUsersApi = {
  list: () => api.get<AdminUser[]>('/admin-users'),
  create: (data: { name: string; email: string; password: string }) =>
    api.post<AdminUser>('/admin-users', data),
  delete: (id: string) => api.delete(`/admin-users/${id}`),
};

export const achievementsApi = {
  list: () => api.get<{ achievements: Achievement[] }>('/barista/achievements'),
  create: (data: {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    rarity?: string;
    xpReward?: number;
  }) => api.post<{ data: Achievement }>('/barista/admin-achievements', data),
  update: (
    id: string,
    data: {
      name: string;
      slug: string;
      description?: string;
      icon?: string;
      rarity?: string;
      xpReward?: number;
    },
  ) => api.put<{ data: Achievement }>(`/barista/admin-achievements/${id}`, data),
  delete: (id: string) => api.delete(`/barista/admin-achievements/${id}`),
};

export const rewardsAdminApi = {
  list: () => api.get<{ data: Reward[] }>('/admin/rewards'),
  create: (data: Omit<Reward, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>) =>
    api.post<{ data: Reward }>('/admin/rewards', data),
  update: (id: string, data: Partial<Omit<Reward, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api.put<{ data: Reward }>(`/admin/rewards/${id}`, data),
  delete: (id: string) => api.delete<{ data: Reward }>(`/admin/rewards/${id}`),
};

export const wishlistApi = {
  list: () => api.get<{ data: (WishlistItem & { product: Product })[] }>('/wishlist'),
  add: (productId: string) => api.post('/wishlist', { productId }),
  remove: (productId: string) => api.delete(`/wishlist/${productId}`),
  check: (productId: string) => api.get<{ inWishlist: boolean }>(`/wishlist/check/${productId}`),
};

export const recipeRatingsApi = {
  get: (recipeId: string) =>
    api.get<{ data: RecipeRating[]; average: number; count: number }>(
      `/recipe-ratings/${recipeId}`,
    ),
  upsert: (recipeId: string, data: { rating: number; comment?: string }) =>
    api.post(`/recipe-ratings/${recipeId}`, data),
  remove: (recipeId: string) => api.delete(`/recipe-ratings/${recipeId}`),
};

export const recipeFavoritesApi = {
  list: () => api.get<{ data: { recipeId: string }[] }>('/recipe-favorites'),
  add: (recipeId: string) => api.post(`/recipe-favorites/${recipeId}`),
  remove: (recipeId: string) => api.delete(`/recipe-favorites/${recipeId}`),
};

export const abandonedCartApi = {
  track: (data: {
    items: { productId: string; name: string; quantity: number; price: number }[];
    email: string;
    couponCode?: string;
  }) => api.post('/abandoned-cart/track', data),
  sendReminder: (id: string) => api.post('/abandoned-cart/send-reminder', { id }),
  recover: (id: string) => api.patch(`/abandoned-cart/${id}/recover`),
  list: (params?: {
    page?: number;
    email?: string;
    from?: string;
    to?: string;
    recovered?: string;
  }) => {
    const p = new URLSearchParams();
    p.set('page', String(params?.page || 1));
    if (params?.email) p.set('email', params.email);
    if (params?.from) p.set('from', params.from);
    if (params?.to) p.set('to', params.to);
    if (params?.recovered) p.set('recovered', params.recovered);
    return api.get<{ data: AbandonedCart[]; total: number; page: number; totalPages: number }>(
      `/abandoned-cart?${p.toString()}`,
    );
  },
  summary: () =>
    api.get<{ total: number; recovered: number; abandoned: number }>('/abandoned-cart/summary'),
};

export default api;
export const adminApi = {
  logistics: (params?: { status?: string; page?: number }) =>
    api.get<{
      data: Order[];
      total: number;
      page: number;
      totalPages: number;
      statusCounts: Record<string, number>;
    }>('/admin/orders/logistics', { params }),
  updateOrderStatus: (id: string, status: string) =>
    api.patch(`/admin/orders/${id}/status`, { status }),
  updateOrderTracking: (
    id: string,
    data: { trackingNumber?: string; carrier?: string; estimatedDelivery?: string | null },
  ) => api.patch(`/admin/orders/${id}/tracking`, data),
  logs: (params?: Record<string, string>) => api.get('/admin/logs', { params }),
  financial: () => api.get('/dashboard/financial'),
  ordersSummary: () => api.get<{ statusCounts: Record<string, number> }>('/admin/orders/summary'),
};

export const pricingApi = {
  list: () => api.get('/pricing'),
  calculate: (inputs: Record<string, number>) => api.post('/pricing/calculate', inputs),
  save: (productId: string, config: Partial<PricingConfig>) =>
    api.put(`/pricing/${productId}`, config),
};

export { baristaApi } from './barista';

export const lotesApi = {
  list: (params?: Record<string, unknown>) => api.get('/lotes', { params }),
  get: (id: string) => api.get(`/lotes/${id}`),
  create: (data: LoteFormData) => api.post('/lotes', data),
  update: (
    id: string,
    data: Partial<LoteFormData> & {
      humedad?: number;
      defectos?: number;
      scoreAroma?: number;
      scoreSabor?: number;
      scoreAcidez?: number;
      scoreBody?: number;
      scoreFinal?: number;
    },
  ) => api.put(`/lotes/${id}`, data),
  aprobar: (id: string, notes?: string) => api.patch(`/lotes/${id}/aprobar`, { notes }),
  rechazar: (id: string, rejectionReason: string) =>
    api.patch(`/lotes/${id}/rechazar`, { rejectionReason }),
  delete: (id: string) => api.delete(`/lotes/${id}`),
};

export const caficultoresApi = {
  list: (params?: Record<string, unknown>) => api.get('/caficultores', { params }),
  get: (id: string) => api.get(`/caficultores/${id}`),
  create: (data: Partial<Caficultor>) => api.post('/caficultores', data),
  update: (id: string, data: Partial<Caficultor>) => api.put(`/caficultores/${id}`, data),
  delete: (id: string) => api.delete(`/caficultores/${id}`),
};

export const productVersionsApi = {
  list: (productId: string) => api.get(`/product-versions/${productId}`),
  create: (productId: string, data: Partial<ProductVersion>) =>
    api.post(`/product-versions/${productId}`, data),
};

export const b2bApi = {
  catalog: () => api.get('/b2b/catalog'),
  getTiers: (productId: string) => api.get(`/b2b/tiers/${productId}`),
  createTier: (
    productId: string,
    data: { minQty: number; maxQty?: number; pricePerUnit: number },
  ) => api.post(`/b2b/tiers/${productId}`, data),
  deleteTier: (tierId: string) => api.delete(`/b2b/tiers/item/${tierId}`),
  orders: (params?: Record<string, unknown>) => api.get('/b2b/orders', { params }),
  inquiry: (data: Record<string, string>) => api.post('/b2b/inquiry', data),
};

export const ubicacionesApi = {
  list: (params?: Record<string, unknown>) => api.get('/ubicaciones', { params }),
  get: (id: string) => api.get(`/ubicaciones/${id}`),
  create: (data: { nombre: string; pais?: string; tipo?: string }) =>
    api.post('/ubicaciones', data),
  update: (id: string, data: { nombre?: string; pais?: string; tipo?: string }) =>
    api.put(`/ubicaciones/${id}`, data),
  delete: (id: string) => api.delete(`/ubicaciones/${id}`),
};

export const tiposCataApi = {
  list: (params?: Record<string, unknown>) => api.get('/tipos-cata', { params }),
  get: (id: string) => api.get(`/tipos-cata/${id}`),
  create: (data: { nombre: string; categoria?: string }) => api.post('/tipos-cata', data),
  update: (id: string, data: { nombre?: string; categoria?: string; isActive?: boolean }) =>
    api.put(`/tipos-cata/${id}`, data),
  delete: (id: string) => api.delete(`/tipos-cata/${id}`),
};
