import { describe, expect, it } from 'vitest';
import {
  calculateInquiryEstimate,
  canTransitionInquiry,
  createB2BFolio,
  selectTier,
  validateTierCandidate,
} from '../b2b-domain';

const tiers = [
  { id: 't1', minQty: 1, maxQty: 9, pricePerUnit: 120 },
  { id: 't2', minQty: 10, maxQty: 24, pricePerUnit: 108.5 },
  { id: 't3', minQty: 25, maxQty: null, pricePerUnit: 96.25 },
];

describe('selectTier', () => {
  it('selects exact boundaries and an open-ended tier', () => {
    expect(selectTier(tiers, 1)?.id).toBe('t1');
    expect(selectTier(tiers, 10)?.id).toBe('t2');
    expect(selectTier(tiers, 24)?.id).toBe('t2');
    expect(selectTier(tiers, 25)?.id).toBe('t3');
    expect(selectTier(tiers, 250)?.id).toBe('t3');
  });

  it('returns null when no tier covers the quantity', () => {
    expect(selectTier(tiers, 0)).toBeNull();
  });
});

describe('validateTierCandidate', () => {
  it('rejects overlapping and malformed ranges', () => {
    expect(validateTierCandidate(tiers, { minQty: 8, maxQty: 12, pricePerUnit: 99 })).toContain(
      'se cruza',
    );
    expect(validateTierCandidate(tiers, { minQty: 30, maxQty: 20, pricePerUnit: 99 })).toContain(
      'mayor o igual',
    );
    expect(validateTierCandidate(tiers, { minQty: 30, maxQty: 39, pricePerUnit: 0 })).toContain(
      'mayor que cero',
    );
  });

  it('allows replacing the same tier without colliding with itself', () => {
    expect(
      validateTierCandidate(tiers, { id: 't2', minQty: 10, maxQty: 24, pricePerUnit: 105 }, 't2'),
    ).toBeNull();
  });
});

describe('calculateInquiryEstimate', () => {
  it('uses server tiers and ignores any client price', () => {
    const result = calculateInquiryEstimate(
      [
        {
          id: 'p1',
          name: 'Coatepec',
          sku: 'CAF-001',
          isB2BEnabled: true,
          tiers,
        },
      ],
      [{ productId: 'p1', quantity: 10, frequency: 'MONTHLY', clientUnitPrice: 1 }],
    );

    expect(result.subtotal).toBe(1085);
    expect(result.items).toEqual([
      expect.objectContaining({
        productId: 'p1',
        tierId: 't2',
        unitPrice: 108.5,
        subtotal: 1085,
      }),
    ]);
  });

  it('rejects disabled products and quantities without a tier', () => {
    expect(() =>
      calculateInquiryEstimate(
        [
          {
            id: 'p1',
            name: 'Coatepec',
            sku: null,
            isB2BEnabled: false,
            tiers,
          },
        ],
        [{ productId: 'p1', quantity: 10, frequency: 'MONTHLY' }],
      ),
    ).toThrow('no está disponible');

    expect(() =>
      calculateInquiryEstimate(
        [
          {
            id: 'p1',
            name: 'Coatepec',
            sku: null,
            isB2BEnabled: true,
            tiers,
          },
        ],
        [{ productId: 'p1', quantity: 0, frequency: 'MONTHLY' }],
      ),
    ).toThrow('cantidad');
  });
});

describe('inquiry workflow', () => {
  it('only permits forward commercial transitions and explicit loss', () => {
    expect(canTransitionInquiry('NEW', 'REVIEWING')).toBe(true);
    expect(canTransitionInquiry('REVIEWING', 'QUOTED')).toBe(true);
    expect(canTransitionInquiry('QUOTED', 'NEGOTIATING')).toBe(true);
    expect(canTransitionInquiry('NEGOTIATING', 'WON')).toBe(true);
    expect(canTransitionInquiry('REVIEWING', 'LOST')).toBe(true);
    expect(canTransitionInquiry('WON', 'NEW')).toBe(false);
    expect(canTransitionInquiry('NEW', 'WON')).toBe(false);
  });

  it('creates a human-readable yearly folio', () => {
    expect(createB2BFolio(123, new Date('2026-07-26T12:00:00Z'))).toBe('B2B-2026-000123');
  });
});
