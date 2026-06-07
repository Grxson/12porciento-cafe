// Resolve a stored image path to a loadable URL.
// Absolute URLs (http/https/data/blob) returned as-is; relative /api/uploads paths
// prefixed with the API origin in dev, left relative in prod (same origin via nginx).
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function resolveImageUrl(src?: string | null): string {
  if (!src) return '';
  if (/^(https?:|data:|blob:)/.test(src)) return src;
  if (src.startsWith('/api/uploads')) {
    if (API_BASE === '/api') return src;
    return API_BASE.replace(/\/api$/, '') + src;
  }
  return src;
}
