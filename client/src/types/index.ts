export interface RecipeStep {
  id: string;
  recipeId: string;
  order: number;
  title: string;
  description: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  duration?: number | null;
}

export interface Recipe {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  method: string;
  difficulty: 'FÁCIL' | 'MEDIA' | 'DIFÍCIL';
  prepTime?: number | null;
  yield?: string | null;
  temp?: string | null;
  grind?: string | null;
  ratio?: string | null;
  isPremium: boolean;
  isPublished: boolean;
  productId?: string | null;
  product?: { id: string; name: string; slug: string; imageUrl: string } | null;
  steps: RecipeStep[];
  locked?: boolean;
  createdAt: string;
  updatedAt: string;
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
  images?: string[];
  price: number;
  weight?: number;
  stock: number;
  sku?: string | null;
  costPrice?: number | null;
  supplier?: string | null;
  minOrderQty?: number | null;
  imageUrl: string;
  description: string;
  isLimited: boolean;
  isActive: boolean;
  producer?: string;
  farmName?: string;
  harvestYear?: number;
  certifications?: string;
  body?: string;
  acidity?: string;
  processingDescription?: string;
  recommendedBrewMethod?: string;
  brewTemperature?: number;
  brewRatio?: string;
  grindSize?: string;
  tastingNotes?: string;
  pairingSuggestions?: string;
  isMemberExclusive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  itemType: 'product';
  product: Product;
  quantity: number;
}

export interface BundleCartItem {
  itemType: 'bundle';
  bundleId: string;
  bundle: Bundle;
  quantity: number;
}

export type CartItemFull = CartItem | BundleCartItem;

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
  trackingNumber?: string | null;
  carrier?: string | null;
  estimatedDelivery?: string | null;
  userId?: string;
  user?: { id: string; name: string; email: string; phone?: string };
  items: OrderItemFull[];
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'PREPARING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

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
  pausedAt?: string | null;
  pausedUntil?: string | null;
  pausedReason?: string | null;
  skipCount?: number;
  maxSkips?: number;
}

export type SubscriptionPlan = 'FUNDADOR' | 'EXPLORADOR' | 'CONNOISSEUR' | 'EMPRESARIAL';
export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED';

export const PLAN_SLOTS: Record<
  SubscriptionPlan,
  { min: number; max: number; price: number; allowLimited: boolean }
> = {
  FUNDADOR: { min: 2, max: 2, price: 350, allowLimited: false },
  EXPLORADOR: { min: 2, max: 3, price: 650, allowLimited: true },
  CONNOISSEUR: { min: 3, max: 3, price: 890, allowLimited: true },
  EMPRESARIAL: { min: 10, max: 99, price: 0, allowLimited: true },
};

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  avatarUrl?: string;
  stripeCustomerId?: string;
  stripeDefaultPaymentMethodId?: string;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface DashboardStats {
  totalOrders: number;
  ordersThisMonth: number;
  ordersThisWeek: number;
  totalRevenue: number;
  revenueThisMonth: number;
  activeSubscriptions: number;
  totalProducts: number;
  totalBrews: number;
  pendingReviews: number;
  lowStockProducts: { name: string; stock: number }[];
  recentOrders: Order[];
  revenueByMonth: { month: number; year: number; total: number }[];
  ordersByDay: { date: string; count: number; revenue: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  subscriptionRevenue: number;
  newUsersThisMonth: number;
  conversionRate: number;
}

export interface BaristaProfile {
  id: string;
  userId: string;
  user?: { id: string; name: string };
  level: number;
  totalXp: number;
  totalBrews: number;
  favoriteMethod?: string;
  rankTitle?: string;
  streakData?: { date: string; count: number }[];
  currentStreak?: number;
  brewLogs: BrewLog[];
  achievements: AchievementUnlock[];
  createdAt: string;
  updatedAt: string;
}

export interface BrewLog {
  id: string;
  userId: string;
  recipeId: string;
  recipe: { id: string; title: string; method: string; difficulty?: string };
  rating: number;
  notes?: string;
  photoUrl?: string;
  xpEarned: number;
  createdAt: string;
}

export interface Achievement {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  xpReward: number;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  product: Product;
  notes?: string;
  createdAt: string;
}

export interface AchievementWithUnlock extends Achievement {
  unlockedAt: string | null;
}

export interface AchievementUnlock {
  id: string;
  userId: string;
  achievementId: string;
  achievement: Achievement;
  unlockedAt: string;
}

export interface RecipeRating {
  id: string;
  recipeId: string;
  userId: string;
  user: { id: string; name: string };
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface GiftCard {
  id: string;
  code: string;
  initialAmount: number;
  balance: number;
  senderId?: string;
  sender?: { id: string; name: string };
  recipientId?: string;
  recipient?: { id: string; name: string };
  senderName?: string;
  senderEmail?: string;
  recipientName?: string;
  recipientEmail?: string;
  message?: string;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

export interface AbandonedCart {
  id: string;
  userId?: string;
  email: string;
  items: string;
  couponCode?: string;
  reminderSentAt?: string;
  reminderCount: number;
  recovered: boolean;
  createdAt: string;
}

export interface FinancialData {
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    thisWeek: number;
    lastWeek: number;
  };
  cost: { known: number; coverage: number };
  profit: { known: number; margin: number | null };
  mrr: { current: number; lastMonth: number };
  revenueByMonth: { key: string; month: number; year: number; total: number }[];
  revenueByCategory: { category: string; revenue: number }[];
  topRevenueProducts: { name: string; revenue: number; units: number }[];
  statusBreakdown: Record<string, { count: number; revenue: number }>;
}

export type { RecipeDraft, StepDraft } from './recipeDraft';

export type LoteStatus = 'CUARENTENA' | 'APROBADO' | 'RECHAZADO';

export interface Lote {
  id: string;
  productId: string;
  product: { id: string; name: string; sku: string | null };
  caficultorId?: string | null;
  batchNumber: string;
  quantity: number;
  costPerKg: number | null;
  unitCost: number | null;
  supplier: string | null;
  origin: string | null;
  receivedAt: string;
  expiryDate: string | null;
  status: LoteStatus;
  notes: string | null;
  humedad: number | null;
  defectos: number | null;
  scoreAroma: number | null;
  scoreSabor: number | null;
  scoreAcidez: number | null;
  scoreBody: number | null;
  scoreFinal: number | null;
  evaluadoPor: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  rejectedAt: string | null;
  rejectedBy: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoteFormData {
  productId: string;
  batchNumber: string;
  quantity: number;
  caficultorId?: string;
  costPerKg?: number;
  unitCost?: number;
  supplier?: string;
  origin?: string;
  receivedAt?: string;
  expiryDate?: string;
  notes?: string;
}

export interface Caficultor {
  id: string;
  nombre: string;
  region: string;
  altitud: number | null;
  variedad: string | null;
  foto: string | null;
  contacto: string | null;
  bio: string | null;
  acuerdoPrecioKg: number | null;
  modalidad: 'DIRECTO' | 'COOPERATIVA' | 'INTERMEDIARIO';
  fairTrade: boolean;
  notas: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { lotes: number };
}
