// Retryable only for transient/network errors — never for card declines.
const RETRYABLE = ['api_connection_error', 'api_error', 'rate_limit', 'processing_error', 'timeout'];

export async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  const delays = [600, 1500, 3000];
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const e = err as { code?: string; type?: string; message?: string };
      const code: string | undefined = e.code || e.type;
      const isNetwork: boolean = e.code === 'ERR_NETWORK' || e.message === 'Network Error';
      const retryable = isNetwork || (code !== undefined && RETRYABLE.includes(code));
      if (!retryable || attempt === maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, delays[attempt] ?? 3000));
    }
  }
  throw lastErr;
}

export function friendlyStripeError(
  error: { code?: string; message?: string } | null | undefined,
): string {
  const map: Record<string, string> = {
    card_declined: 'Tu tarjeta fue declinada. Intenta con otro método de pago.',
    expired_card: 'Tu tarjeta expiró. Usa otra tarjeta.',
    incorrect_cvc: 'El código de seguridad (CVC) es incorrecto.',
    incorrect_number: 'El número de tarjeta es incorrecto.',
    insufficient_funds: 'Fondos insuficientes. Intenta con otra tarjeta.',
    processing_error: 'Hubo un error al procesar tu pago. Intenta de nuevo en unos momentos.',
    authentication_required: 'Se requiere autenticación adicional. Sigue los pasos que muestra tu banco.',
    rate_limit: 'Demasiados intentos. Espera un momento e intenta de nuevo.',
  };
  if (error?.code && map[error.code]) return map[error.code];
  return error?.message || 'No se pudo procesar el pago. Intenta de nuevo.';
}
