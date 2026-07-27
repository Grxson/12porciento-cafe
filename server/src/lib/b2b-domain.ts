export type B2BInquiryStatus = 'NEW' | 'REVIEWING' | 'QUOTED' | 'NEGOTIATING' | 'WON' | 'LOST';

export interface B2BPriceTierLike {
  id?: string;
  minQty: number;
  maxQty: number | null;
  pricePerUnit: number;
}

export interface B2BProductForEstimate {
  id: string;
  name: string;
  sku: string | null;
  isB2BEnabled: boolean;
  tiers: B2BPriceTierLike[];
}

export interface B2BRequestedItem {
  productId: string;
  quantity: number;
  frequency: string;
  clientUnitPrice?: number;
}

export interface B2BEstimatedItem {
  productId: string;
  productName: string;
  sku: string | null;
  quantity: number;
  frequency: string;
  tierId: string | null;
  unitPrice: number;
  subtotal: number;
}

export const MAX_B2B_LINE_QUANTITY = 10_000;
export const MAX_B2B_TOTAL_QUANTITY = 50_000;

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function selectTier<T extends B2BPriceTierLike>(tiers: T[], quantity: number): T | null {
  if (!Number.isInteger(quantity) || quantity <= 0) return null;
  return (
    [...tiers]
      .sort((a, b) => a.minQty - b.minQty)
      .find(
        (tier) => quantity >= tier.minQty && (tier.maxQty === null || quantity <= tier.maxQty),
      ) ?? null
  );
}

export function validateTierCandidate(
  existing: B2BPriceTierLike[],
  candidate: B2BPriceTierLike,
  ignoredId?: string,
): string | null {
  if (!Number.isInteger(candidate.minQty) || candidate.minQty <= 0) {
    return 'La cantidad mínima debe ser un entero mayor que cero.';
  }
  if (
    candidate.maxQty !== null &&
    (!Number.isInteger(candidate.maxQty) || candidate.maxQty < candidate.minQty)
  ) {
    return 'La cantidad máxima debe ser mayor o igual a la mínima.';
  }
  if (!Number.isFinite(candidate.pricePerUnit) || candidate.pricePerUnit <= 0) {
    return 'El precio por unidad debe ser mayor que cero.';
  }

  const candidateEnd = candidate.maxQty ?? Number.POSITIVE_INFINITY;
  const overlaps = existing.some((tier) => {
    if (ignoredId && tier.id === ignoredId) return false;
    const tierEnd = tier.maxQty ?? Number.POSITIVE_INFINITY;
    return candidate.minQty <= tierEnd && tier.minQty <= candidateEnd;
  });

  return overlaps ? 'El rango se cruza con un tier existente.' : null;
}

export function hasValidTierSet(tiers: B2BPriceTierLike[]): boolean {
  if (!tiers.length) return false;
  const accepted: B2BPriceTierLike[] = [];
  for (const tier of [...tiers].sort((a, b) => a.minQty - b.minQty)) {
    if (validateTierCandidate(accepted, tier)) return false;
    accepted.push(tier);
  }
  return true;
}

export function calculateInquiryEstimate(
  products: B2BProductForEstimate[],
  requestedItems: B2BRequestedItem[],
): { items: B2BEstimatedItem[]; subtotal: number } {
  if (!requestedItems.length) throw new Error('Agrega al menos un producto.');
  const productMap = new Map(products.map((product) => [product.id, product]));
  const requestedProductIds = new Set<string>();
  let totalQuantity = 0;

  const items = requestedItems.map((request) => {
    if (requestedProductIds.has(request.productId)) {
      throw new Error('Cada producto debe aparecer una sola vez; elimina el producto repetido.');
    }
    requestedProductIds.add(request.productId);
    const product = productMap.get(request.productId);
    if (!product?.isB2BEnabled) {
      throw new Error('Uno de los productos no está disponible para mayoreo.');
    }
    if (!Number.isInteger(request.quantity) || request.quantity <= 0) {
      throw new Error('La cantidad debe ser un entero mayor que cero.');
    }
    if (request.quantity > MAX_B2B_LINE_QUANTITY) {
      throw new Error(`La cantidad máxima por producto es ${MAX_B2B_LINE_QUANTITY}.`);
    }
    totalQuantity += request.quantity;
    if (totalQuantity > MAX_B2B_TOTAL_QUANTITY) {
      throw new Error(`La cantidad máxima por solicitud es ${MAX_B2B_TOTAL_QUANTITY}.`);
    }
    const tier = selectTier(product.tiers, request.quantity);
    if (!tier) {
      throw new Error(`No existe precio por volumen para ${product.name} en esa cantidad.`);
    }
    const subtotal = roundMoney(tier.pricePerUnit * request.quantity);
    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      quantity: request.quantity,
      frequency: request.frequency,
      tierId: tier.id ?? null,
      unitPrice: roundMoney(tier.pricePerUnit),
      subtotal,
    };
  });

  return {
    items,
    subtotal: roundMoney(items.reduce((sum, item) => sum + item.subtotal, 0)),
  };
}

const INQUIRY_TRANSITIONS: Record<B2BInquiryStatus, B2BInquiryStatus[]> = {
  NEW: ['REVIEWING', 'LOST'],
  REVIEWING: ['QUOTED', 'LOST'],
  QUOTED: ['NEGOTIATING', 'LOST'],
  NEGOTIATING: ['QUOTED', 'LOST'],
  WON: [],
  LOST: [],
};

export function canTransitionInquiry(from: B2BInquiryStatus, to: B2BInquiryStatus): boolean {
  return INQUIRY_TRANSITIONS[from].includes(to);
}

export function createB2BFolio(sequence: number, date = new Date()): string {
  if (!Number.isInteger(sequence) || sequence <= 0) {
    throw new Error('La secuencia del folio debe ser positiva.');
  }
  return `B2B-${date.getUTCFullYear()}-${String(sequence).padStart(6, '0')}`;
}
