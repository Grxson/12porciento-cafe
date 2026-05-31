export interface Recipe {
  title: string;
  method: string;
  temp: string;
  grind: string;
  ratio: string;
  steps: string[];
  videoUrl?: string;
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
  userId?: string;
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

export interface SubscriptionItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string;
    price: number;
    scaScore?: number;
  };
}

export interface Subscription {
  id: string;
  name: string;
  email: string;
  phone?: string;
  plan: SubscriptionPlan | 'EMPRESARIAL';
  grindPreference: 'MOLIDO' | 'GRANO';
  fulfillmentStatus: 'PENDIENTE' | 'PREPARANDO' | 'ENVIADO' | 'ENTREGADO';
  frequency: string;
  status: SubscriptionStatus;
  nextBilling: string;
  createdAt: string;
  items: SubscriptionItem[];
}

export type SubscriptionPlan = 'FUNDADOR' | 'EXPLORADOR' | 'CONNOISSEUR' | 'EMPRESARIAL';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export const PLAN_SLOTS: Record<SubscriptionPlan, { min: number; max: number; price: number; allowLimited: boolean }> = {
  FUNDADOR:    { min: 2, max: 2,  price: 350,  allowLimited: false },
  EXPLORADOR:  { min: 2, max: 3,  price: 650,  allowLimited: true },
  CONNOISSEUR: { min: 3, max: 3,  price: 890,  allowLimited: true },
  EMPRESARIAL: { min: 10, max: 99, price: 0,   allowLimited: true },
};

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  createdAt: string;
}

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
