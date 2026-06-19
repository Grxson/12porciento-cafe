/// <reference types="vitest/globals" />
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Set env vars before imports
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.JWT_SECRET = 'test_jwt_secret';

// vi.hoisted runs before vi.mock factories, allowing shared mock refs
const { mockUserFindUnique, mockUserFindFirst, mockUserUpdate, mockSendMail } = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockUserFindFirst: vi.fn(),
  mockUserUpdate: vi.fn(),
  mockSendMail: vi.fn(),
}));

vi.mock('../../db', () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      findFirst: mockUserFindFirst,
      update: mockUserUpdate,
    },
  },
}));

vi.mock('stripe', () => {
  const MockStripe = vi.fn().mockImplementation(() => ({
    paymentIntents: { retrieve: vi.fn() },
    paymentMethods: { retrieve: vi.fn(), detach: vi.fn() },
    customers: { list: vi.fn() },
  }));
  return { default: MockStripe };
});

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: mockSendMail,
    }),
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
  },
}));

vi.mock('../../socket', () => ({
  emitEvent: vi.fn(),
}));

vi.mock('../../email', () => ({
  sendOrderConfirmation: vi.fn().mockResolvedValue(undefined),
  sendOrderStatusUpdate: vi.fn().mockResolvedValue(undefined),
}));

import express from 'express';
import request from 'supertest';
import usersRouter from '../users';

const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);

describe('POST /api/users/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLIENT_URL = 'http://localhost:5173';
  });

  it('returns 200 if email exists', async () => {
    const mockUser = { id: '1', email: 'test@example.com', name: 'Test' };
    mockUserFindUnique.mockResolvedValue(mockUser);
    mockUserUpdate.mockResolvedValue({ ...mockUser, resetToken: 'token123', resetTokenExpires: new Date() });
    mockSendMail.mockResolvedValue({});

    const res = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(mockUserFindUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
    expect(mockUserUpdate).toHaveBeenCalled();
    expect(mockSendMail).toHaveBeenCalled();
  });

  it('returns 200 even if email does not exist (no enumeration)', async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 'nonexistent@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(mockUserFindUnique).toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('returns 400 if email not provided', async () => {
    const res = await request(app)
      .post('/api/users/forgot-password')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email requerido');
  });

  it('returns 400 if email is not a string', async () => {
    const res = await request(app)
      .post('/api/users/forgot-password')
      .send({ email: 123 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Email requerido');
  });
});

describe('POST /api/users/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with valid token and password', async () => {
    const mockUser = { id: '1', resetToken: 'valid_token', resetTokenExpires: new Date(Date.now() + 3600000) };
    mockUserFindFirst.mockResolvedValue(mockUser);
    mockUserUpdate.mockResolvedValue({ ...mockUser, password: 'hashed_password', resetToken: null, resetTokenExpires: null });

    const res = await request(app)
      .post('/api/users/reset-password')
      .send({ token: 'valid_token', password: 'new_password_123' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(mockUserFindFirst).toHaveBeenCalledWith({
      where: { resetToken: 'valid_token', resetTokenExpires: { gt: expect.any(Date) } },
    });
  });

  it('returns 400 with invalid token', async () => {
    mockUserFindFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/users/reset-password')
      .send({ token: 'invalid_token', password: 'new_password_123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Token inválido');
  });

  it('returns 400 with expired token', async () => {
    mockUserFindFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/users/reset-password')
      .send({ token: 'expired_token', password: 'new_password_123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Token inválido');
  });

  it('returns 400 if password is too short', async () => {
    const res = await request(app)
      .post('/api/users/reset-password')
      .send({ token: 'some_token', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('6');
  });

  it('returns 400 if token is missing', async () => {
    const res = await request(app)
      .post('/api/users/reset-password')
      .send({ password: 'new_password_123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Token requerido');
  });

  it('returns 400 if password is missing', async () => {
    const res = await request(app)
      .post('/api/users/reset-password')
      .send({ token: 'some_token' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('6');
  });
});
