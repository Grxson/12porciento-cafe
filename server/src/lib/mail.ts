import nodemailer from 'nodemailer';
import dns from 'dns';
import net from 'net';
import { Resend } from 'resend';

let smtpTransport: nodemailer.Transporter | null = null;
let resendClient: Resend | null = null;
let mailInitPromise: Promise<boolean> | null = null;

function getSender(): string {
  return (
    process.env.MAIL_FROM ||
    process.env.RESEND_FROM ||
    process.env.SMTP_FROM ||
    'noreply@12porciento.cafe'
  );
}

async function resolveSmtpEndpoint(hostname: string): Promise<{
  host: string;
  tls?: { servername: string };
}> {
  if (net.isIP(hostname)) return { host: hostname };

  const addresses = await dns.promises.resolve4(hostname);
  if (!addresses.length) {
    throw new Error(`No IPv4 address found for ${hostname}`);
  }

  return {
    host: addresses[0],
    tls: { servername: hostname },
  };
}

export async function initMail(): Promise<boolean> {
  if (resendClient || smtpTransport) return true;
  if (mailInitPromise) return mailInitPromise;
  if (!process.env.RESEND_API_KEY && (!process.env.SMTP_HOST || !process.env.SMTP_USER)) {
    return false;
  }

  mailInitPromise = (async () => {
    try {
      if (process.env.RESEND_API_KEY) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
        console.log('[mail] Using Resend HTTPS API');
        return true;
      }

      const endpoint = await resolveSmtpEndpoint(process.env.SMTP_HOST!);
      smtpTransport = nodemailer.createTransport({
        host: endpoint.host,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        tls: endpoint.tls,
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
  })();

  try {
    return await mailInitPromise;
  } finally {
    mailInitPromise = null;
  }
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  if (!resendClient && !smtpTransport && !(await initMail())) {
    console.error('[mail] No mail provider available — cannot send email');
    return false;
  }
  const from = getSender();
  const { to, subject, html, text } = options;
  const plainText = text || html.replace(/<[^>]+>/g, '');

  try {
    if (resendClient) {
      const response = await resendClient.emails.send({
        from: `"12% Café" <${from}>`,
        to,
        subject,
        html,
        text: plainText,
      });
      if (response.error) {
        console.error(`[mail] Resend rejected email to ${to}:`, response.error);
        return false;
      }
      console.log(`[mail] Sent via Resend to ${to}: "${subject}" (${response.data?.id})`);
      return true;
    }

    const sendMailPromise = smtpTransport!.sendMail({
      from: `"12% Café" <${from}>`,
      to,
      subject,
      html,
      text: plainText,
    });

    let timeoutHandle: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      timeoutHandle = setTimeout(() => resolve('timeout'), 10000);
    });

    let settledByTimeout = false;

    // Observe late settlement (after the race already resolved via timeout) without
    // affecting the value already returned to the caller. On-time outcomes are handled
    // below and by the outer catch — this only logs when settledByTimeout is true.
    sendMailPromise.then(
      () => {
        if (settledByTimeout) {
          console.warn(`[mail] Late SMTP success for ${to} (after timeout already returned false)`);
        }
      },
      (err) => {
        if (settledByTimeout) {
          console.warn(
            `[mail] Late SMTP failure for ${to} (after timeout already returned false):`,
            err,
          );
        }
      },
    );

    const result = await Promise.race([sendMailPromise, timeoutPromise]);

    if (timeoutHandle !== null) {
      clearTimeout(timeoutHandle);
    }

    if (result === 'timeout') {
      settledByTimeout = true;
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
