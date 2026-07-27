import { beforeEach, describe, expect, it, vi } from 'vitest';

const mailMocks = vi.hoisted(() => ({
  createTransport: vi.fn(() => ({ sendMail: vi.fn() })),
  resolve4: vi.fn(),
  setDefaultResultOrder: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: mailMocks.createTransport,
  },
}));

vi.mock('dns', () => ({
  default: {
    promises: {
      resolve4: mailMocks.resolve4,
    },
    setDefaultResultOrder: mailMocks.setDefaultResultOrder,
  },
}));

describe('SMTP initialization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'mailer@example.com';
    process.env.SMTP_PASS = 'secret';
    process.env.SMTP_SECURE = 'false';
  });

  it('connects through an IPv4 address while preserving the TLS server name', async () => {
    mailMocks.resolve4.mockResolvedValue(['192.0.2.25']);

    const { initMail } = await import('../mail');

    expect(await initMail()).toBe(true);
    expect(mailMocks.resolve4).toHaveBeenCalledWith('smtp.example.com');
    expect(mailMocks.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: '192.0.2.25',
        tls: {
          servername: 'smtp.example.com',
        },
      }),
    );
  });
});
