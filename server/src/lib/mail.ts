import nodemailer from 'nodemailer';
import dns from 'dns';
import net from 'net';

let smtpTransport: nodemailer.Transporter | null = null;
let smtpInitPromise: Promise<boolean> | null = null;

function getSender(): string {
  return process.env.SMTP_FROM || 'noreply@12porciento.cafe';
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
  if (smtpTransport) return true;
  if (smtpInitPromise) return smtpInitPromise;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return false;

  smtpInitPromise = (async () => {
    try {
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
    return await smtpInitPromise;
  } finally {
    smtpInitPromise = null;
  }
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  if (!smtpTransport && !(await initMail())) {
    console.error('[mail] No mail provider available — cannot send email');
    return false;
  }
  const from = getSender();
  const { to, subject, html, text } = options;

  try {
    const sendMailPromise = smtpTransport!.sendMail({
      from: `"12% Café" <${from}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
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
