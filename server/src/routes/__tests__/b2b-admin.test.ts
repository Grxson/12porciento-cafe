import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  quoteFindUnique,
  quoteUpdate,
  quoteUpdateMany,
  quoteFindUniqueOrThrow,
  inquiryUpdateMany,
  activityCreate,
  transaction,
  sendMail,
} = vi.hoisted(() => {
  const quoteUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
  const quoteFindUniqueOrThrow = vi.fn().mockResolvedValue({ id: 'quote-1', status: 'ACCEPTED' });
  const inquiryUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
  const activityCreate = vi.fn().mockResolvedValue({ id: 'activity-1' });
  return {
    quoteFindUnique: vi.fn(),
    quoteUpdate: vi.fn(),
    quoteUpdateMany,
    quoteFindUniqueOrThrow,
    inquiryUpdateMany,
    activityCreate,
    transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
      callback({
        b2BQuote: {
          updateMany: quoteUpdateMany,
          findUniqueOrThrow: quoteFindUniqueOrThrow,
        },
        b2BInquiry: { updateMany: inquiryUpdateMany },
        b2BActivity: { create: activityCreate },
      }),
    ),
    sendMail: vi.fn().mockResolvedValue(true),
  };
});

vi.mock('../../db', () => ({
  prisma: {
    b2BQuote: {
      findUnique: quoteFindUnique,
      update: quoteUpdate,
    },
    b2BInquiry: { findUnique: vi.fn() },
    b2BPriceTier: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    product: { findMany: vi.fn() },
    order: { findMany: vi.fn(), count: vi.fn() },
    $transaction: transaction,
  },
}));

vi.mock('../../middleware/auth', () => ({
  requireAuth: (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.admin = { id: 'admin-1' };
    next();
  },
}));
vi.mock('../../lib/adminLog', () => ({ logAdminAction: vi.fn() }));
vi.mock('../../lib/mail', () => ({ sendMail }));

import b2bRouter from '../b2b';

const app = express();
app.use(express.json());
app.use('/api/b2b', b2bRouter);

const sentQuote = (overrides: Record<string, unknown> = {}) => ({
  id: 'quote-1',
  inquiryId: 'inquiry-1',
  version: 1,
  status: 'SENT',
  subtotal: 1000,
  taxAmount: 160,
  total: 1160,
  paymentTerms: null,
  notes: null,
  validUntil: new Date(Date.now() + 86_400_000),
  items: [],
  inquiry: {
    status: 'QUOTED',
    folio: 'B2B-2026-000001',
    empresa: 'Café Central',
    contactoNombre: 'Ana',
    contactoEmail: 'ana@example.com',
  },
  ...overrides,
});

describe('B2B admin quote lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    quoteUpdateMany.mockResolvedValue({ count: 1 });
    inquiryUpdateMany.mockResolvedValue({ count: 1 });
    quoteFindUniqueOrThrow.mockResolvedValue({ id: 'quote-1', status: 'ACCEPTED' });
    sendMail.mockResolvedValue(true);
  });

  it('rejects negative tax before creating a quote', async () => {
    const response = await request(app)
      .post('/api/b2b/inquiries/inquiry-1/quotes')
      .send({
        items: [
          {
            productId: 'coffee-1',
            productName: 'Sierra Norte',
            quantity: 10,
            unitPrice: 100,
          },
        ],
        taxAmount: -1,
        validUntil: new Date(Date.now() + 86_400_000).toISOString(),
      });

    expect(response.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('expires a sent quote instead of accepting it after validUntil', async () => {
    quoteFindUnique.mockResolvedValue(sentQuote({ validUntil: new Date(Date.now() - 86_400_000) }));
    quoteUpdate.mockResolvedValue({ id: 'quote-1', status: 'EXPIRED' });

    const response = await request(app).post('/api/b2b/quotes/quote-1/accept');

    expect(response.status).toBe(409);
    expect(quoteUpdate).toHaveBeenCalledWith({
      where: { id: 'quote-1' },
      data: { status: 'EXPIRED' },
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it('moves an accepted quote to negotiation and reserves WON for conversion', async () => {
    quoteFindUnique.mockResolvedValue(sentQuote());

    const response = await request(app).post('/api/b2b/quotes/quote-1/accept');

    expect(response.status).toBe(200);
    expect(inquiryUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'NEGOTIATING', assignedAdminId: 'admin-1' },
      }),
    );
  });

  it('keeps existing sent versions active when email delivery fails', async () => {
    quoteFindUnique.mockResolvedValue(sentQuote({ status: 'DRAFT' }));
    sendMail.mockResolvedValue(false);

    const response = await request(app).post('/api/b2b/quotes/quote-1/send');

    expect(response.status).toBe(502);
    expect(transaction).not.toHaveBeenCalled();
  });
});
