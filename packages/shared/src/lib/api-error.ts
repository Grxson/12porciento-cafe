import { isAxiosError } from 'axios';

/** Extract error message from unknown catch value. Prefer Axios response error, fallback to Error.message, then fallback string. */
export function getApiError(err: unknown, fallback: string): string {
  if (isAxiosError(err) && err.response?.data?.error) {
    return err.response.data.error;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

/** Extract numeric status from unknown error — Axios response.status or Express statusCode. */
export function getErrorStatus(err: unknown): number | undefined {
  if (isAxiosError(err) && err.response?.status) {
    return err.response.status;
  }
  if (typeof err === 'object' && err !== null && 'statusCode' in err) {
    const v = (err as Record<string, unknown>).statusCode;
    return typeof v === 'number' ? v : undefined;
  }
  return undefined;
}
