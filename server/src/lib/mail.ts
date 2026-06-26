import nodemailer from 'nodemailer';
import { Resend } from 'resend';

let resend: Resend | null = null;
let smtpTransport: nodemailer.Transporter | null = null;
let activeProvider: 'resend' | 'smtp' | null = null;

function getSender(): string {
  return process.env.SMTP_FROM || process.env.RESEND_FROM || 'onboarding@resend.dev';
}

function initResend(): boolean {
  if (resend) return true;
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    resend = new Resend(key);
    activeProvider = 'resend';
    console.log('[mail] Using Resend provider');
    return true;
  } catch (err) {
    console.error('[mail] Failed to init Resend:', err);
    return false;
  }
}

function initSmtp(): boolean {
  if (smtpTransport) return true;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return false;
  try {
    smtpTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      } : undefined,
    });
    activeProvider = 'smtp';
    console.log('[mail] Using SMTP provider (fallback)');
    return true;
  } catch (err) {
    console.error('[mail] Failed to init SMTP transport:', err);
    return false;
  }
}

export function initMail(): boolean {
  return initResend() || initSmtp();
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  if (!activeProvider && !initMail()) {
    console.error('[mail] No mail provider available — cannot send email');
    return false;
  }
  const from = getSender();
  const { to, subject, html, text } = options;

  try {
    if (activeProvider === 'resend') {
      const { error } = await resend!.emails.send({
        from: `"12% Café" <${from}>`,
        to: [to],
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, ''),
      });
      if (error) {
        console.error('[mail] Resend send error:', error);
        throw error;
      }
      console.log(`[mail] Sent via Resend to ${to}: "${subject}"`);
      return true;
    }
    if (activeProvider === 'smtp') {
      await smtpTransport!.sendMail({
        from: `"12% Café" <${from}>`,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, ''),
      });
      console.log(`[mail] Sent via SMTP to ${to}: "${subject}"`);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`[mail] Failed to send to ${to}:`, err);
    if (activeProvider === 'resend' && initSmtp()) {
      console.log('[mail] Falling back to SMTP...');
      try {
        await smtpTransport!.sendMail({
          from: `"12% Café" <${from}>`,
          to,
          subject,
          html,
          text: text || html.replace(/<[^>]+>/g, ''),
        });
        console.log(`[mail] Sent via SMTP (fallback) to ${to}: "${subject}"`);
        return true;
      } catch (fallbackErr) {
        console.error('[mail] SMTP fallback also failed:', fallbackErr);
      }
    }
    return false;
  }
}
