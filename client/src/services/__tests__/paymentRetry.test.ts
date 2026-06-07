import { describe, it, expect, vi, afterEach } from 'vitest';
import { retryWithBackoff, friendlyStripeError } from '../paymentRetry';

describe('retryWithBackoff', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('resolves immediately when fn succeeds (fn called once)', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retryWithBackoff(fn);
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on a transient error then succeeds (fn called twice)', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fn = vi.fn().mockImplementation(async () => {
      calls++;
      if (calls === 1) {
        const err: any = new Error('transient');
        err.code = 'processing_error';
        throw err;
      }
      return 'success';
    });

    const resultPromise = retryWithBackoff(fn, 3);
    // Advance timers to drain the 600ms backoff delay
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry a card decline (fn called exactly once)', async () => {
    const err: any = new Error('card declined');
    err.code = 'card_declined';
    const fn = vi.fn().mockRejectedValue(err);

    await expect(retryWithBackoff(fn, 3)).rejects.toMatchObject({ code: 'card_declined' });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('friendlyStripeError', () => {
  it('maps card_declined to Spanish string', () => {
    const msg = friendlyStripeError({ code: 'card_declined' });
    expect(msg).toBe('Tu tarjeta fue declinada. Intenta con otro método de pago.');
  });

  it('maps expired_card to Spanish string', () => {
    const msg = friendlyStripeError({ code: 'expired_card' });
    expect(msg).toBe('Tu tarjeta expiró. Usa otra tarjeta.');
  });

  it('maps processing_error to Spanish string', () => {
    const msg = friendlyStripeError({ code: 'processing_error' });
    expect(msg).toBe('Hubo un error al procesar tu pago. Intenta de nuevo en unos momentos.');
  });

  it('maps authentication_required to Spanish string', () => {
    const msg = friendlyStripeError({ code: 'authentication_required' });
    expect(msg).toBe('Se requiere autenticación adicional. Sigue los pasos que muestra tu banco.');
  });

  it('returns raw .message for unknown codes', () => {
    const msg = friendlyStripeError({ code: 'unknown_code', message: 'Custom error message' });
    expect(msg).toBe('Custom error message');
  });

  it('returns generic fallback when given null', () => {
    const msg = friendlyStripeError(null);
    expect(msg).toBe('No se pudo procesar el pago. Intenta de nuevo.');
  });

  it('returns generic fallback when given undefined', () => {
    const msg = friendlyStripeError(undefined);
    expect(msg).toBe('No se pudo procesar el pago. Intenta de nuevo.');
  });
});
