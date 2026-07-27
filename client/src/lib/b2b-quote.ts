import type {
  B2BFrequency,
  B2BPriceTier,
  B2BProduct,
  B2BQuoteDraft,
  B2BQuoteDraftItem,
} from '../types';

export const B2B_DRAFT_KEY = '12pct:b2b-quote:v1';

const createRequestId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `b2b-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createEmptyB2BDraft = (): B2BQuoteDraft => ({
  version: 1,
  requestId: createRequestId(),
  items: [],
  businessType: '',
  frequency: 'monthly',
  updatedAt: new Date().toISOString(),
});

export function selectB2BTier(tiers: B2BPriceTier[], quantity: number): B2BPriceTier | null {
  if (!Number.isInteger(quantity) || quantity <= 0) return null;
  return (
    [...tiers]
      .sort((a, b) => a.minQty - b.minQty)
      .find(
        (tier) => quantity >= tier.minQty && (tier.maxQty === null || quantity <= tier.maxQty),
      ) ?? null
  );
}

export function calculateDraftEstimate(items: B2BQuoteDraftItem[], products: B2BProduct[]) {
  const productMap = new Map(products.map((product) => [product.id, product]));
  let subtotal = 0;
  let itemCount = 0;
  let pricedItems = 0;
  const unpricedItems: string[] = [];

  items.forEach((item) => {
    const product = productMap.get(item.productId);
    const tier = product ? selectB2BTier(product.b2bPriceTiers, item.quantity) : null;
    itemCount += item.quantity;
    if (!product || !tier) {
      unpricedItems.push(item.productId);
      return;
    }
    subtotal += tier.pricePerUnit * item.quantity;
    pricedItems += 1;
  });

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    itemCount,
    pricedItems,
    unpricedItems,
  };
}

const frequencies = new Set<B2BFrequency>(['one-time', 'weekly', 'biweekly', 'monthly']);

export function parseStoredB2BDraft(value: string | null): B2BQuoteDraft | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<B2BQuoteDraft>;
    if (
      parsed.version !== 1 ||
      typeof parsed.requestId !== 'string' ||
      parsed.requestId.length < 8 ||
      !Array.isArray(parsed.items) ||
      typeof parsed.businessType !== 'string' ||
      !parsed.frequency ||
      !frequencies.has(parsed.frequency)
    ) {
      return null;
    }
    const validItems = parsed.items.every(
      (item) =>
        typeof item.productId === 'string' &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        frequencies.has(item.frequency),
    );
    return validItems ? (parsed as B2BQuoteDraft) : null;
  } catch {
    return null;
  }
}
