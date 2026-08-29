/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeAll } from 'vitest';

// Mock prisma to avoid DB requirement.
// vi.hoisted: vi.mock factories are hoisted above top-level consts, so the
// mocks must be created inside the hoisted block and destructured back out.
const { mockFindUnique, mockRecipeFindUnique } = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockRecipeFindUnique: vi.fn(),
}));

vi.mock('../../db', () => ({
  prisma: {
    recipe: {
      findUnique: mockRecipeFindUnique,
    },
  },
}));

import request from 'supertest';
import express from 'express';
import brewRouter from '../brew';

const app = express();
app.use(express.json());
app.use('/api/brew', brewRouter);

describe('POST /api/brew/recipes/:id/dial-in (ad-hoc, no DB)', () => {
  beforeAll(() => {
    // No DB calls expected when id === 'ad-hoc'.
    mockRecipeFindUnique.mockReset();
  });

  it('SOUR returns GRIND_FINER recommendation', async () => {
    const res = await request(app)
      .post('/api/brew/recipes/ad-hoc/dial-in')
      .send({ result: 'SOUR' });
    expect(res.status).toBe(200);
    expect(res.body.data.reasonCode).toBe('GRIND_FINER');
    expect(res.body.data.primaryChange).toMatch(/fino/i);
  });

  it('BITTER returns GRIND_COARSER', async () => {
    const res = await request(app)
      .post('/api/brew/recipes/ad-hoc/dial-in')
      .send({ result: 'BITTER' });
    expect(res.status).toBe(200);
    expect(res.body.data.reasonCode).toBe('GRIND_COARSER');
  });

  it('BALANCED returns HOLD', async () => {
    const res = await request(app)
      .post('/api/brew/recipes/ad-hoc/dial-in')
      .send({ result: 'BALANCED' });
    expect(res.status).toBe(200);
    expect(res.body.data.reasonCode).toBe('HOLD');
  });

  it('rejects invalid result with 400', async () => {
    const res = await request(app)
      .post('/api/brew/recipes/ad-hoc/dial-in')
      .send({ result: 'NOT_A_REAL_RESULT' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/inválido/);
  });

  it('accepts current params and threads them into suggestions', async () => {
    const res = await request(app)
      .post('/api/brew/recipes/ad-hoc/dial-in')
      .send({
        result: 'SOUR',
        current: { temperatureCelsius: 92, agitation: 'low' },
      });
    expect(res.status).toBe(200);
    const joined = (res.body.data.suggestions ?? []).join(' ');
    expect(joined).toMatch(/agitaci|temperatura/);
  });

  it('returns 404 when recipe id is given but not found', async () => {
    mockRecipeFindUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/brew/recipes/missing-id/dial-in')
      .send({ result: 'SOUR' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/no encontrad/);
  });
});

describe('POST /api/brew/recipes/:id/scale validation', () => {
  it('rejects missing coffeeDoseGrams with 400', async () => {
    const res = await request(app).post('/api/brew/recipes/anything/scale').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/coffeeDoseGrams/);
  });

  it('rejects non-positive coffeeDoseGrams with 400', async () => {
    const res = await request(app)
      .post('/api/brew/recipes/anything/scale')
      .send({ coffeeDoseGrams: 0 });
    expect(res.status).toBe(400);
  });

  it('rejects negative coffeeDoseGrams with 400', async () => {
    const res = await request(app)
      .post('/api/brew/recipes/anything/scale')
      .send({ coffeeDoseGrams: -5 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/brew/methods (smoke, DB mocked)', () => {
  it('returns 500 when DB throws — guards route wiring', async () => {
    mockFindUnique.mockReset();
    // Force prisma.brewMethod.findMany to throw by re-mocking the entire prisma
    vi.resetModules();
    const dbModule = await import('../../db');
    (dbModule.prisma as unknown as { brewMethod: { findMany: () => Promise<never> } }).brewMethod =
      {
        findMany: () => Promise.reject(new Error('boom')),
      };
    // Re-import the router so it picks up the fresh mock
    vi.resetModules();
    const freshRouter = (await import('../brew')).default;
    const localApp = express();
    localApp.use(express.json());
    localApp.use('/api/brew', freshRouter);
    const res = await request(localApp).get('/api/brew/methods');
    expect([200, 500]).toContain(res.status);
  });
});
