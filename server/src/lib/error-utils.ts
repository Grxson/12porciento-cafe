/** Extract error message from unknown catch value. Prefer Error.message, fallback string. */
export function getErrorMessage(err: unknown, fallback = 'Error desconocido'): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
}

/** Get string code property from unknown error (Prisma P2002, Stripe, etc). */
export function getErrorCode(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const v = (err as Record<string, unknown>).code;
    return typeof v === 'string' ? v : undefined;
  }
  return undefined;
}

/** Get numeric statusCode from unknown error (Express). */
export function getErrorStatus(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null && 'statusCode' in err) {
    const v = (err as Record<string, unknown>).statusCode;
    return typeof v === 'number' ? v : undefined;
  }
  return undefined;
}

/** Check if unknown error has a response with numeric status (Axios-like). */
export function getResponseStatus(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const resp = (err as Record<string, unknown>).response;
    if (typeof resp === 'object' && resp !== null && 'status' in resp) {
      const v = (resp as Record<string, unknown>).status;
      return typeof v === 'number' ? v : undefined;
    }
  }
  return undefined;
}
