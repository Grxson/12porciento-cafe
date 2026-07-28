/// <reference types="vitest/globals" />
import { vi, describe, it, expect, beforeEach } from 'vitest';

// vi.hoisted runs before vi.mock factories, allowing shared mock refs
const {
  mockRetrieve,
  mockOrderFindUnique,
  mockOrderCreate,
  mockPromoCodeFindUnique,
  mockTransaction,
  mockEmitEvent,
  mockSendOrderConfirmation,
  mockAbandonedCartUpdateMany,
} = vi.hoisted(() => ({
  mockRetrieve: vi.fn(),
  mockOrderFindUnique: vi.fn(),
  mockOrderCreate: vi.fn(),
  mockPromoCodeFindUnique: vi.fn().mockResolvedValue(null),
  mockTransaction: vi.fn(),
  mockEmitEvent: vi.fn(),
  mockSendOrderConfirmation: vi.fn().mockResolvedValue(undefined),
  mockAbandonedCartUpdateMany: vi.fn().mockResolvedValue({ count: 0 }),
}));

vi.mock('stripe', () => {
  const MockStripe = vi.fn().mockImplementation(() => ({
    paymentIntents: {
      retrieve: mockRetrieve,
    },
  }));
  return { default: MockStripe };
});

vi.mock('../../db', () => ({
  prisma: {
    order: {
      findUnique: mockOrderFindUnique,
      create: mockOrderCreate,
    },
    promoCode: {
      findUnique: mockPromoCodeFindUnique,
    },
    abandonedCart: {
      updateMany: mockAbandonedCartUpdateMany,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock('../../email', () => ({
  sendOrderConfirmation: mockSendOrderConfirmation,
  sendOrderStatusUpdate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../socket', () => ({
  emitEvent: mockEmitEvent,
}));

import express from 'express';
import request from 'supertest';
import ordersRouter from '../orders';

const app = express();
app.use(express.json());
app.use('/orders', ordersRouter);

describe('POST /orders — idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRetrieve.mockResolvedValue({
      status: 'succeeded',
      amount: 10000,
      metadata: {
        items: JSON.stringify([{ productId: 'p1', quantity: 1 }]),
      },
    });
    mockPromoCodeFindUnique.mockResolvedValue(null);
    mockSendOrderConfirmation.mockResolvedValue(undefined);
  });

  it('returns existing order without creating a duplicate when paymentIntentId already exists', async () => {
    const existingOrder = { id: 'o1', paymentIntentId: 'pi_123', items: [] };

    // findUnique returns an existing order on the idempotency check
    mockOrderFindUnique.mockResolvedValue(existingOrder);

    const res = await request(app)
      .post('/orders')
      .send({
        paymentIntentId: 'pi_123',
        items: [{ productId: 'p1', quantity: 1, price: 100 }],
        customerName: 'Test User',
        email: 't@t.com',
        address: 'Calle Test 123',
        city: 'CDMX',
        state: 'CDMX',
        zipCode: '00000',
      });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('o1');

    // Should NOT have tried to create a new order
    expect(mockOrderCreate).not.toHaveBeenCalled();
  });

  it('creates a new order when paymentIntentId has no existing order', async () => {
    // No existing order found on idempotency check
    mockOrderFindUnique.mockResolvedValue(null);

    const newOrder = {
      id: 'o2',
      paymentIntentId: 'pi_456',
      email: 't@t.com',
      customerName: 'Test User',
      total: 100,
      items: [{ product: { name: 'Coffee' }, quantity: 1, price: 100 }],
    };

    // $transaction creates the order via the callback
    mockTransaction.mockImplementation(
      async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
        fn({
          order: {
            create: vi.fn().mockResolvedValue(newOrder),
          },
          product: {
            findUnique: vi
              .fn()
              .mockResolvedValue({ stock: 100, price: 100, name: 'Coffee', isActive: true }),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          orderItem: { update: vi.fn() },
          stockMovement: { create: vi.fn() },
        }),
    );

    const res = await request(app)
      .post('/orders')
      .send({
        paymentIntentId: 'pi_456',
        items: [{ productId: 'p1', quantity: 1, price: 100 }],
        customerName: 'Test User',
        email: 't@t.com',
        address: 'Calle Test 123',
        city: 'CDMX',
        state: 'CDMX',
        zipCode: '00000',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('o2');
  });

  it('last unit in stock: one racer succeeds, the other gets a clean 400 (no oversell)', async () => {
    mockOrderFindUnique.mockResolvedValue(null);

    // Shared mutable stock — simulates the real row both requests would race on.
    let stock = 1;

    mockTransaction.mockImplementation(
      async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
        fn({
          product: {
            findUnique: vi.fn().mockImplementation(async () => ({
              price: 100,
              stock,
              isActive: true,
              name: 'Última pieza',
            })),
            updateMany: vi
              .fn()
              .mockImplementation(async ({ where }: { where: { stock: { gte: number } } }) => {
                if (stock >= where.stock.gte) {
                  stock -= where.stock.gte;
                  return { count: 1 };
                }
                return { count: 0 };
              }),
          },
          order: {
            create: vi.fn().mockResolvedValue({
              id: 'o-winner',
              email: 't@t.com',
              customerName: 'Test User',
              total: 100,
              items: [{ product: { name: 'Última pieza' }, quantity: 1, price: 100 }],
            }),
          },
          promoCode: { update: vi.fn() },
          stockMovement: { create: vi.fn() },
        }),
    );

    const basePayload = {
      items: [{ productId: 'p1', quantity: 1, price: 100 }],
      customerName: 'Test User',
      email: 't@t.com',
      address: 'Calle Test 123',
      city: 'CDMX',
      state: 'CDMX',
      zipCode: '00000',
    };

    const first = await request(app)
      .post('/orders')
      .send({ ...basePayload, paymentIntentId: 'pi_racer_a' });
    const second = await request(app)
      .post('/orders')
      .send({ ...basePayload, paymentIntentId: 'pi_racer_b' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(400);
    expect(second.body.error).not.toContain('VALIDATION:');
    expect(second.body.error).toMatch(/stock insuficiente/i);
    expect(stock).toBe(0); // exactly one unit sold, never oversold
  });
});
