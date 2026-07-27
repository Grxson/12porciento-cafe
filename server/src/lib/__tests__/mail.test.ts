import { beforeEach, describe, expect, it, vi } from 'vitest';

const mailMocks = vi.hoisted(() => ({
  createTransport: vi.fn(() => ({ sendMail: vi.fn() })),
  resendSend: vi.fn(),
  Resend: vi.fn(),
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

vi.mock('resend', () => ({
  Resend: mailMocks.Resend,
}));

describe('SMTP initialization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mailMocks.Resend.mockImplementation(() => ({
      emails: {
        send: mailMocks.resendSend,
      },
    }));
    delete process.env.RESEND_API_KEY;
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

  it('prefers the Resend HTTPS API when its key is configured', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.SMTP_FROM = 'noreply@example.com';
    mailMocks.resendSend.mockResolvedValue({
      data: { id: 'email_123' },
      error: null,
    });

    const { initMail, sendMail } = await import('../mail');

    expect(await initMail()).toBe(true);
    expect(
      await sendMail({ to: 'buyer@example.com', subject: 'Cotización', html: '<p>Lista</p>' }),
    ).toBe(true);
    expect(mailMocks.Resend).toHaveBeenCalledWith('re_test');
    expect(mailMocks.resolve4).not.toHaveBeenCalled();
    expect(mailMocks.resendSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"12% Café" <noreply@example.com>',
        to: 'buyer@example.com',
        subject: 'Cotización',
      }),
    );
  });
});
