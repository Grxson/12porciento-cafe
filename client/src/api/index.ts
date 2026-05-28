import axios from 'axios';

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
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(err);
  },
);

export const productsApi = {
  list: (params?: Record<string, string>) => api.get('/products', { params }),
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
  create: (data: any) => api.post('/subscriptions', data),
  list: (params?: Record<string, string>) => api.get('/subscriptions', { params }),
  updateStatus: (id: string, status: string) => api.put(`/subscriptions/${id}/status`, { status }),
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
  delete: (id: string) => api.delete(`/reviews/${id}`),
};

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
};

export default api;
