import api from '../api';

/**
 * Reads a Workbox-cached API response directly from the Cache Storage,
 * bypassing the network. Used as a fallback when a fetch fails offline
 * but the SW already cached this exact endpoint (e.g. recipe detail).
 */
export async function getCachedResponse<T>(path: string): Promise<T | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const baseURL = api.defaults.baseURL ?? '/api';
    const url = new URL(baseURL.replace(/\/$/, '') + path, window.location.origin).toString();
    const match = await caches.match(url, { ignoreSearch: true, ignoreVary: true });
    if (!match) return null;
    return (await match.json()) as T;
  } catch {
    return null;
  }
}
