const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function resolveImageUrl(src?: string | null): string {
  if (!src) return '';
  if (/^(https?:|data:|blob:)/.test(src)) return src;
  const unsplashMatch = src.match(/^\/?photo-([a-zA-Z0-9_-]{10,})$/);
  if (unsplashMatch) {
    return `https://images.unsplash.com/photo-${unsplashMatch[1]}?auto=format&fit=crop&w=900&q=80`;
  }
  if (src.startsWith('/api/uploads')) {
    if (API_BASE === '/api') return src;
    return API_BASE.replace(/\/api$/, '') + src;
  }
  return src;
}
