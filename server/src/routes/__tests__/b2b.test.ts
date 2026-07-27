import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { productFindMany, inquiryFindUnique, inquiryCreate, activityCreate, transaction } =
  vi.hoisted(() => {
    const inquiryCreate = vi.fn();
    const activityCreate = vi.fn();
    return {
      productFindMany: vi.fn(),
      inquiryFindUnique: vi.fn(),
      inquiryCreate,
      activityCreate,
      transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
        callback({
          b2BInquiry: { create: inquiryCreate },
          b2BActivity: { create: activityCreate },
        }),
      ),
    };
  });

vi.mock('../../db', () => ({
  prisma: {
    product: { findMany: productFindMany },
    b2BInquiry: { findUnique: inquiryFindUnique },
    b2BPriceTier: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    order: { findMany: vi.fn(), count: vi.fn() },
    $transaction: transaction,
  },
}));

vi.mock('../../lib/adminLog', () => ({ logAdminAction: vi.fn() }));
vi.mock('../../lib/mail', () => ({ sendMail: vi.fn().mockResolvedValue(true) }));

import b2bRouter from '../b2b';

const app = express();
app.use(express.json());
app.use('/api/b2b', b2bRouter);

const catalogProduct = {
  id: 'coffee-1',
  name: 'Sierra Norte',
  slug: 'sierra-norte',
  imageUrl: '/coffee.webp',
  description: 'Chocolate, panela y naranja.',
  origin: 'Oaxaca',
  region: 'Sierra Norte',
  weight: 1000,
  sku: 'B2B-SIERRA',
  isB2BEnabled: true,
  b2bPriority: 10,
  b2bPriceTiers: [
    { id: 'tier-1', productId: 'coffee-1', minQty: 10, maxQty: 24, pricePerUnit: 280 },
    { id: 'tier-2', productId: 'coffee-1', minQty: 25, maxQty: null, pricePerUnit: 250 },
  ],
};

describe('B2B API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productFindMany.mockResolvedValue([catalogProduct]);
    inquiryFindUnique.mockResolvedValue(null);
    inquiryCreate.mockResolvedValue({
      id: 'inquiry-1',
      folio: 'B2B-20260726-AB12',
      estimatedSubtotal: 7000,
      currency: 'MXN',
    });
    activityCreate.mockResolvedValue({ id: 'activity-1' });
  });

  it('publishes only enabled B2B products with tiered prices', async () => {
    const response = await request(app).get('/api/b2b/catalog');

    expect(response.status).toBe(200);
    expect(productFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          isB2BEnabled: true,
          b2bPriceTiers: { some: {} },
        },
      }),
    );
    expect(response.body.data[0].b2bPriceTiers).toHaveLength(2);
  });

  it('creates an idempotent inquiry using server-side tier prices', async () => {
    const response = await request(app)
      .post('/api/b2b/inquiries')
      .send({
        requestId: 'request-12345678',
        businessName: 'Café Oficinas SA de CV',
        rfc: 'COF210101AA1',
        contactName: 'Ana Torres',
        contactEmail: 'ANA@EXAMPLE.COM',
        contactPhone: '5555555555',
        businessType: 'OFICINAS',
        frequency: 'monthly',
        items: [{ productId: 'coffee-1', quantity: 28, frequency: 'monthly', unitPrice: 1 }],
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      inquiryId: 'inquiry-1',
      folio: 'B2B-20260726-AB12',
      estimatedSubtotal: 7000,
      currency: 'MXN',
    });
    expect(inquiryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requestId: 'request-12345678',
        contactoEmail: 'ana@example.com',
        estimatedSubtotal: 7000,
        items: {
          create: [
            expect.objectContaining({
              productId: 'coffee-1',
              quantity: 28,
              tierId: 'tier-2',
              unitPrice: 250,
              subtotal: 7000,
            }),
          ],
        },
      }),
    });
  });

  it('returns the original result when the same requestId is retried', async () => {
    inquiryFindUnique.mockResolvedValue({
      id: 'existing-1',
      folio: 'B2B-20260726-EXIST',
      estimatedSubtotal: 5600,
      currency: 'MXN',
    });

    const response = await request(app)
      .post('/api/b2b/inquiries')
      .send({
        requestId: 'request-12345678',
        businessName: 'Café Oficinas',
        rfc: 'COF210101AA1',
        contactName: 'Ana',
        contactEmail: 'ana@example.com',
        contactPhone: '5555555555',
        businessType: 'OFICINAS',
        frequency: 'monthly',
        items: [{ productId: 'coffee-1', quantity: 20, frequency: 'monthly' }],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.inquiryId).toBe('existing-1');
    expect(inquiryCreate).not.toHaveBeenCalled();
  });

  it('rejects malformed or empty quote requests', async () => {
    const response = await request(app)
      .post('/api/b2b/inquiries')
      .send({ requestId: 'short', businessName: '', items: [] });

    expect(response.status).toBe(400);
    expect(response.body.error).toBeTruthy();
    expect(transaction).not.toHaveBeenCalled();
  });
});
