/// <reference types="vitest/globals" />
import { vi, describe, it, expect, beforeEach } from 'vitest';

// vi.hoisted runs before vi.mock factories, allowing shared mock refs
const { mockRetrieve, mockOrderFindUnique, mockOrderCreate, mockPromoCodeFindUnique, mockTransaction, mockEmitEvent, mockSendOrderConfirmation } = vi.hoisted(() => ({
  mockRetrieve: vi.fn(),
  mockOrderFindUnique: vi.fn(),
  mockOrderCreate: vi.fn(),
  mockPromoCodeFindUnique: vi.fn().mockResolvedValue(null),
  mockTransaction: vi.fn(),
  mockEmitEvent: vi.fn(),
  mockSendOrderConfirmation: vi.fn().mockResolvedValue(undefined),
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
    mockRetrieve.mockResolvedValue({ status: 'succeeded' });
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
        customerName: 'Test',
        email: 't@t.com',
        address: 'x',
        city: 'y',
        state: 'z',
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
      customerName: 'Test',
      total: 100,
      items: [{ product: { name: 'Coffee' }, quantity: 1, price: 100 }],
    };

    // $transaction creates the order via the callback
    mockTransaction.mockImplementation(async (fn: (tx: any) => Promise<any>) =>
      fn({
        order: {
          create: vi.fn().mockResolvedValue(newOrder),
        },
        product: {
          findUnique: vi.fn().mockResolvedValue({ stock: 100, name: 'Coffee', isActive: true }),
          update: vi.fn(),
        },
        stockMovement: { create: vi.fn() },
      }),
    );

    const res = await request(app)
      .post('/orders')
      .send({
        paymentIntentId: 'pi_456',
        items: [{ productId: 'p1', quantity: 1, price: 100 }],
        customerName: 'Test',
        email: 't@t.com',
        address: 'x',
        city: 'y',
        state: 'z',
        zipCode: '00000',
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('o2');
  });
});
