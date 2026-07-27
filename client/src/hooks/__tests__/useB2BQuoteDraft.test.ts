import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { B2BProduct, B2BQuoteDraft } from '../../types';
import { B2B_DRAFT_KEY } from '../../lib/b2b-quote';
import { useB2BQuoteDraft } from '../useB2BQuoteDraft';

const storedDraft: B2BQuoteDraft = {
  version: 1,
  requestId: 'request-12345678',
  items: [
    { productId: 'valid', quantity: 10, frequency: 'monthly' },
    { productId: 'missing', quantity: 10, frequency: 'monthly' },
    { productId: 'without-tier', quantity: 10, frequency: 'monthly' },
  ],
  businessType: 'CAFETERIA',
  frequency: 'monthly',
  updatedAt: '2026-07-26T00:00:00.000Z',
};

const product = (id: string, minQty: number): B2BProduct => ({
  id,
  name: id,
  slug: id,
  imageUrl: '/coffee.jpg',
  description: 'Café',
  origin: 'México',
  region: null,
  weight: 1000,
  sku: id,
  isB2BEnabled: true,
  b2bPriority: 1,
  b2bPriceTiers: [
    {
      id: `tier-${id}`,
      productId: id,
      minQty,
      maxQty: null,
      pricePerUnit: 200,
      createdAt: '2026-07-26T00:00:00.000Z',
    },
  ],
});

describe('useB2BQuoteDraft', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(B2B_DRAFT_KEY, JSON.stringify(storedDraft));
  });

  it('reconcilia el borrador con productos existentes que conservan un tier válido', async () => {
    const { result } = renderHook(() => useB2BQuoteDraft());

    act(() => {
      result.current.reconcileItems([product('valid', 1), product('without-tier', 20)]);
    });

    expect(result.current.draft.items).toEqual([
      { productId: 'valid', quantity: 10, frequency: 'monthly' },
    ]);
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(B2B_DRAFT_KEY) || '{}').items).toEqual([
        { productId: 'valid', quantity: 10, frequency: 'monthly' },
      ]),
    );
  });
});
