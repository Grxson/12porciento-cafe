/// <reference types="vitest/globals" />
import { describe, it, expect, vi, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';

// ── Setup ──────────────────────────────────────────────────────────────
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-for-brew-routes';
});

// ── Prisma mocks ────────────────────────────────────────────────────────
// vi.hoisted: vi.mock factories are hoisted above top-level consts, so the
// mocks must be created inside the hoisted block and destructured back out.
const {
  mockBrewSession,
  mockBrewSessionFavorite,
  mockRecipe,
  mockBaristaEquipment,
  mockWaterProfile,
} = vi.hoisted(() => ({
  mockBrewSession: {
    create: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  mockBrewSessionFavorite: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
  },
  mockRecipe: { findUnique: vi.fn() },
  mockBaristaEquipment: {
    findMany: vi.fn(),
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  mockWaterProfile: {
    findMany: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../db', () => ({
  prisma: {
    brewSession: mockBrewSession,
    brewSessionFavorite: mockBrewSessionFavorite,
    recipe: mockRecipe,
    baristaEquipment: mockBaristaEquipment,
    waterProfile: mockWaterProfile,
  },
}));

import request from 'supertest';
import express from 'express';
import brewRouter from '../brew';

const app = express();
app.use(express.json());
app.use('/api/brew', brewRouter);

// uidjwt.sign below needs the secret at module scope, before beforeAll runs.
process.env.JWT_SECRET = 'test-secret-for-brew-routes';

const USER_JWT = jwt.sign(
  { id: 'user-1', email: 'u@x.com', name: 'User', role: 'USER' },
  process.env.JWT_SECRET!,
);
const authHeader = { Authorization: `Bearer ${USER_JWT}` };

function resetAll() {
  for (const fn of [
    ...Object.values(mockBrewSession),
    ...Object.values(mockBrewSessionFavorite),
    ...Object.values(mockRecipe),
    ...Object.values(mockBaristaEquipment),
    ...Object.values(mockWaterProfile),
  ]) {
    (fn as { mockReset: () => void }).mockReset();
  }
}

// ── /sessions ──────────────────────────────────────────────────────────

describe('POST /api/brew/sessions', () => {
  it('rejects unauthenticated requests with 401', async () => {
    resetAll();
    const res = await request(app).post('/api/brew/sessions').send({});
    expect(res.status).toBe(401);
  });

  it('creates a session with valid payload', async () => {
    resetAll();
    const created = {
      id: 'session-1',
      userId: 'user-1',
      status: 'PREPARING',
      coffeeDoseGrams: 17,
      waterGrams: 255,
      ratio: 15,
      startedAt: new Date(),
    };
    mockRecipe.findUnique.mockResolvedValueOnce({
      coffeeDoseGrams: 20,
      waterGrams: 300,
      ratio: '15',
      waterTemperatureCelsius: 92,
      grindTargetMicrons: 700,
      steps: [{ order: 1, title: 'Bloom', description: 'x', type: 'BLOOM', duration: 45 }],
    });
    mockBrewSession.create.mockResolvedValueOnce(created);

    const res = await request(app)
      .post('/api/brew/sessions')
      .set(authHeader)
      .send({ recipeId: 'recipe-1', coffeeDoseGrams: 17, waterGrams: 255, ratio: 15 });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('session-1');
    expect(mockBrewSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          recipeId: 'recipe-1',
          coffeeDoseGrams: 17,
          waterGrams: 255,
          status: 'PREPARING',
        }),
      }),
    );
  });

  it('snapshots the recipe when recipeId is given', async () => {
    resetAll();
    mockRecipe.findUnique.mockResolvedValueOnce({
      coffeeDoseGrams: 20,
      waterGrams: 300,
      ratio: '15',
      waterTemperatureCelsius: 92,
      grindTargetMicrons: 700,
      steps: [{ order: 1, title: 'Bloom', description: 'x', type: 'BLOOM', duration: 45 }],
    });
    mockBrewSession.create.mockResolvedValueOnce({ id: 's1', status: 'PREPARING' });

    const res = await request(app)
      .post('/api/brew/sessions')
      .set(authHeader)
      .send({ recipeId: 'recipe-1' });
    expect(res.status).toBe(201);
    expect(mockBrewSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipeSnapshot: expect.objectContaining({
            coffeeDoseGrams: 20,
            waterGrams: 300,
            ratio: 15,
          }),
        }),
      }),
    );
  });

  it('returns 404 if recipeId points to a missing recipe', async () => {
    resetAll();
    mockRecipe.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .post('/api/brew/sessions')
      .set(authHeader)
      .send({ recipeId: 'missing' });
    expect(res.status).toBe(404);
  });

  it('coerces non-numeric numerics to null', async () => {
    resetAll();
    mockBrewSession.create.mockResolvedValueOnce({ id: 's1' });
    await request(app)
      .post('/api/brew/sessions')
      .set(authHeader)
      .send({ coffeeDoseGrams: 'not-a-number' });
    expect(mockBrewSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          coffeeDoseGrams: null,
        }),
      }),
    );
  });
});

describe('GET /api/brew/sessions (list)', () => {
  it('returns paginated user sessions', async () => {
    resetAll();
    const sessions = [
      { id: 's1', coffee: null, recipe: null, brewMethod: null, favorites: [] },
      {
        id: 's2',
        coffee: { id: 'c1', slug: 'c', name: 'C', imageUrl: '' },
        recipe: null,
        brewMethod: null,
        favorites: [{ id: 'fav1' }],
      },
    ];
    mockBrewSession.findMany.mockResolvedValueOnce(sessions);
    mockBrewSession.count.mockResolvedValueOnce(2);

    const res = await request(app).get('/api/brew/sessions').set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(2);
    // annotated with favorited:boolean
    expect(res.body.data[0].favorited).toBe(false);
    expect(res.body.data[1].favorited).toBe(true);
  });

  it('filters by favorites=true using sub-select', async () => {
    resetAll();
    mockBrewSessionFavorite.findMany.mockResolvedValueOnce([
      { sessionId: 'fav-1' },
      { sessionId: 'fav-2' },
    ]);
    mockBrewSession.findMany.mockResolvedValueOnce([]);
    mockBrewSession.count.mockResolvedValueOnce(0);

    const res = await request(app).get('/api/brew/sessions?favorites=true').set(authHeader);
    expect(res.status).toBe(200);
    expect(mockBrewSessionFavorite.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { sessionId: true },
    });
    expect(mockBrewSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['fav-1', 'fav-2'] } }),
      }),
    );
  });

  it('respects minRating filter', async () => {
    resetAll();
    mockBrewSession.findMany.mockResolvedValueOnce([]);
    mockBrewSession.count.mockResolvedValueOnce(0);
    await request(app).get('/api/brew/sessions?minRating=4').set(authHeader);
    expect(mockBrewSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ rating: { gte: 4 } }),
      }),
    );
  });
});

describe('GET /api/brew/sessions/:id', () => {
  it('returns 404 when session not found for user', async () => {
    resetAll();
    mockBrewSession.findFirst.mockResolvedValueOnce(null);
    const res = await request(app).get('/api/brew/sessions/missing').set(authHeader);
    expect(res.status).toBe(404);
  });

  it('returns the session with favorited flag', async () => {
    resetAll();
    mockBrewSession.findFirst.mockResolvedValueOnce({
      id: 's1',
      coffee: null,
      recipe: null,
      brewMethod: null,
      favorites: [{ id: 'fav-1' }],
    });
    const res = await request(app).get('/api/brew/sessions/s1').set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body.data.favorited).toBe(true);
  });
});

describe('PUT /api/brew/sessions/:id', () => {
  it('returns 404 when not owner', async () => {
    resetAll();
    mockBrewSession.findFirst.mockResolvedValueOnce(null);
    const res = await request(app)
      .put('/api/brew/sessions/s1')
      .set(authHeader)
      .send({ notes: 'new' });
    expect(res.status).toBe(404);
  });

  it('updates fields with whitelist', async () => {
    resetAll();
    mockBrewSession.findFirst.mockResolvedValueOnce({ id: 's1' });
    mockBrewSession.update.mockResolvedValueOnce({ id: 's1', notes: 'updated' });
    const res = await request(app)
      .put('/api/brew/sessions/s1')
      .set(authHeader)
      .send({ notes: 'updated', garbageField: 'should be ignored' });
    expect(res.status).toBe(200);
    expect(mockBrewSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's1' },
        data: expect.objectContaining({ notes: 'updated' }),
      }),
    );
    const callArgs = mockBrewSession.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(callArgs.data.garbageField).toBeUndefined();
  });
});

describe('POST /api/brew/sessions/:id/complete', () => {
  it('rejects rating < 1', async () => {
    resetAll();
    mockBrewSession.findFirst.mockResolvedValueOnce({ id: 's1' });
    const res = await request(app)
      .post('/api/brew/sessions/s1/complete')
      .set(authHeader)
      .send({ rating: 0 });
    expect(res.status).toBe(400);
  });

  it('rejects rating > 5', async () => {
    resetAll();
    mockBrewSession.findFirst.mockResolvedValueOnce({ id: 's1' });
    const res = await request(app)
      .post('/api/brew/sessions/s1/complete')
      .set(authHeader)
      .send({ rating: 6 });
    expect(res.status).toBe(400);
  });

  it('rejects invalid result', async () => {
    resetAll();
    mockBrewSession.findFirst.mockResolvedValueOnce({ id: 's1' });
    const res = await request(app)
      .post('/api/brew/sessions/s1/complete')
      .set(authHeader)
      .send({ rating: 4, result: 'BOGUS_RESULT' });
    expect(res.status).toBe(400);
  });

  it('completes with valid rating + result', async () => {
    resetAll();
    mockBrewSession.findFirst.mockResolvedValueOnce({ id: 's1' });
    mockBrewSession.update.mockResolvedValueOnce({ id: 's1', status: 'COMPLETED' });
    const res = await request(app)
      .post('/api/brew/sessions/s1/complete')
      .set(authHeader)
      .send({ rating: 4, result: 'SOUR', notes: 'un poco ácido' });
    expect(res.status).toBe(200);
    expect(mockBrewSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rating: 4,
          result: 'SOUR',
          status: 'COMPLETED',
          completedAt: expect.any(Date),
        }),
      }),
    );
  });
});

describe('POST /api/brew/sessions/:id/favorite (toggle)', () => {
  it('creates a favorite when none exists', async () => {
    resetAll();
    mockBrewSessionFavorite.findUnique.mockResolvedValueOnce(null);
    mockBrewSessionFavorite.create.mockResolvedValueOnce({ id: 'fav-1' });
    const res = await request(app).post('/api/brew/sessions/s1/favorite').set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body.data.favorited).toBe(true);
    expect(mockBrewSessionFavorite.create).toHaveBeenCalled();
  });

  it('removes the favorite when one already exists', async () => {
    resetAll();
    mockBrewSessionFavorite.findUnique.mockResolvedValueOnce({ id: 'fav-1' });
    mockBrewSessionFavorite.delete.mockResolvedValueOnce({});
    const res = await request(app).post('/api/brew/sessions/s1/favorite').set(authHeader);
    expect(res.status).toBe(200);
    expect(res.body.data.favorited).toBe(false);
    expect(mockBrewSessionFavorite.delete).toHaveBeenCalled();
  });
});

// ── /equipment ─────────────────────────────────────────────────────────

describe('POST /api/brew/equipment', () => {
  it('requires name', async () => {
    resetAll();
    const res = await request(app).post('/api/brew/equipment').set(authHeader).send({});
    expect(res.status).toBe(400);
  });

  it('rejects invalid category', async () => {
    resetAll();
    const res = await request(app)
      .post('/api/brew/equipment')
      .set(authHeader)
      .send({ name: 'My Grinder', category: 'BOGUS' });
    expect(res.status).toBe(400);
  });

  it('creates with valid payload', async () => {
    resetAll();
    mockBaristaEquipment.create.mockResolvedValueOnce({
      id: 'eq-1',
      name: 'Timemore C3',
      category: 'GRINDER',
    });
    const res = await request(app)
      .post('/api/brew/equipment')
      .set(authHeader)
      .send({ name: 'Timemore C3', brand: 'Timemore', category: 'GRINDER' });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe('eq-1');
  });
});

describe('PUT /api/brew/equipment/:id', () => {
  it('returns 404 when not owner', async () => {
    resetAll();
    mockBaristaEquipment.findFirst.mockResolvedValueOnce(null);
    const res = await request(app)
      .put('/api/brew/equipment/eq-1')
      .set(authHeader)
      .send({ name: 'X' });
    expect(res.status).toBe(404);
  });
});

// ── /water-profiles ────────────────────────────────────────────────────

describe('POST /api/brew/water-profiles', () => {
  it('requires name', async () => {
    resetAll();
    const res = await request(app).post('/api/brew/water-profiles').set(authHeader).send({});
    expect(res.status).toBe(400);
  });

  it('creates with valid name', async () => {
    resetAll();
    mockWaterProfile.create.mockResolvedValueOnce({
      id: 'wp-1',
      name: 'Mi agua',
      official: false,
    });
    const res = await request(app)
      .post('/api/brew/water-profiles')
      .set(authHeader)
      .send({ name: 'Mi agua', tds: 120, gh: 80 });
    expect(res.status).toBe(201);
    expect(mockWaterProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Mi agua',
          official: false,
          userId: 'user-1',
        }),
      }),
    );
  });
});
