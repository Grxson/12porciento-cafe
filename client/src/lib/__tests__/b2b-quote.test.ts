import { describe, expect, it } from 'vitest';
import type { B2BProduct, B2BQuoteDraft } from '../../types';
import {
  B2B_DRAFT_KEY,
  calculateDraftEstimate,
  createEmptyB2BDraft,
  parseStoredB2BDraft,
  selectB2BTier,
} from '../b2b-quote';

const product: B2BProduct = {
  id: 'coffee-1',
  name: 'Sierra Norte',
  slug: 'sierra-norte',
  imageUrl: '/coffee.webp',
  description: 'Chocolate y naranja',
  origin: 'Oaxaca',
  region: 'Sierra Norte',
  weight: 1000,
  sku: 'B2B-SIERRA',
  isB2BEnabled: true,
  b2bPriority: 10,
  b2bPriceTiers: [
    {
      id: 'tier-1',
      productId: 'coffee-1',
      minQty: 10,
      maxQty: 24,
      pricePerUnit: 280,
      createdAt: '',
    },
    {
      id: 'tier-2',
      productId: 'coffee-1',
      minQty: 25,
      maxQty: null,
      pricePerUnit: 250,
      createdAt: '',
    },
  ],
};

describe('B2B quote draft', () => {
  it('uses a stable versioned storage key and request identifier', () => {
    expect(B2B_DRAFT_KEY).toBe('12pct:b2b-quote:v1');
    expect(createEmptyB2BDraft().requestId.length).toBeGreaterThanOrEqual(8);
  });

  it('selects the correct visible price tier', () => {
    expect(selectB2BTier(product.b2bPriceTiers, 10)?.pricePerUnit).toBe(280);
    expect(selectB2BTier(product.b2bPriceTiers, 25)?.pricePerUnit).toBe(250);
    expect(selectB2BTier(product.b2bPriceTiers, 5)).toBeNull();
  });

  it('calculates an estimate from catalog prices', () => {
    const estimate = calculateDraftEstimate(
      [{ productId: 'coffee-1', quantity: 28, frequency: 'monthly' }],
      [product],
    );

    expect(estimate).toEqual({
      subtotal: 7000,
      itemCount: 28,
      pricedItems: 1,
      unpricedItems: [],
    });
  });

  it('rejects corrupted local drafts and preserves valid ones', () => {
    expect(parseStoredB2BDraft('{bad-json')).toBeNull();
    expect(parseStoredB2BDraft(JSON.stringify({ version: 2 }))).toBeNull();

    const draft: B2BQuoteDraft = {
      ...createEmptyB2BDraft(),
      items: [{ productId: 'coffee-1', quantity: 10, frequency: 'monthly' }],
    };
    expect(parseStoredB2BDraft(JSON.stringify(draft))).toEqual(draft);
  });
});
