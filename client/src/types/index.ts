export interface Recipe {
  title: string;
  method: string;
  temp: string;
  grind: string;
  ratio: string;
  steps: string[];
}

export interface Review {
  id: string;
  productId: string;
  name: string;
  email: string;
  rating: number;
  comment: string;
  isApproved: boolean;
  createdAt: string;
  product?: { name: string; slug: string };
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  origin?: string;
  region?: string;
  altitude?: number;
  variety?: string;
  process?: string;
  scaScore?: number;
  roastLevel?: string;
  flavors: string[];
  recipes: Recipe[];
  price: number;
  weight?: number;
  stock: number;
  imageUrl: string;
  description: string;
  isLimited: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  email: string;
  phone?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  total: number;
  status: OrderStatus;
  notes?: string;
  items: OrderItemFull[];
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface OrderItemFull {
  id: string;
  quantity: number;
  price: number;
  product: Product;
}

export interface Bundle {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  discountPct: number;
  finalPrice: number;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: BundleItem[];
}

export interface BundleItem {
  id: string;
  quantity: number;
  product: Product;
}

export interface Subscription {
  id: string;
  name: string;
  email: string;
  phone?: string;
  plan: SubscriptionPlan;
  bundleId?: string;
  frequency: string;
  status: SubscriptionStatus;
  nextBilling: string;
  createdAt: string;
}

export type SubscriptionPlan = 'FUNDADOR' | 'EXPLORADOR' | 'CONNOISSEUR';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export interface DashboardStats {
  totalOrders: number;
  ordersThisMonth: number;
  ordersThisWeek: number;
  totalRevenue: number;
  revenueThisMonth: number;
  activeSubscriptions: number;
  totalProducts: number;
  pendingReviews: number;
  lowStockProducts: { name: string; stock: number }[];
  recentOrders: Order[];
}
