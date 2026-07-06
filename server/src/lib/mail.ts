import nodemailer from 'nodemailer';
import dns from 'dns';

// Railway lacks IPv6 routing, force IPv4 for SMTP connections
dns.setDefaultResultOrder('ipv4first');

let smtpTransport: nodemailer.Transporter | null = null;

function getSender(): string {
  return process.env.SMTP_FROM || 'noreply@12porciento.cafe';
}

export function initMail(): boolean {
  if (smtpTransport) return true;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return false;
  try {
    smtpTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
    });
    console.log('[mail] Using SMTP provider');
    return true;
  } catch (err) {
    console.error('[mail] Failed to init SMTP transport:', err);
    return false;
  }
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  if (!smtpTransport && !initMail()) {
    console.error('[mail] No mail provider available — cannot send email');
    return false;
  }
  const from = getSender();
  const { to, subject, html, text } = options;

  try {
    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      setTimeout(() => resolve('timeout'), 10000);
    });

    const result = await Promise.race([
      smtpTransport!.sendMail({
        from: `"12% Café" <${from}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, ''),
      }),
      timeoutPromise,
    ]);

    if (result === 'timeout') {
      console.warn(`[mail] SMTP timeout after 10s sending to ${to}`);
      return false;
    }
    console.log(`[mail] Sent via SMTP to ${to}: "${subject}"`);
    return true;
  } catch (err) {
    console.error(`[mail] Failed to send to ${to}:`, err);
    return false;
  }
}
