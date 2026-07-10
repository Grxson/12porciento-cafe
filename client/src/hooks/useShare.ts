import { useCallback } from 'react';

interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
}

export function useShare() {
  const share = useCallback(async (opts: ShareOptions) => {
    const url = opts.url || window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: opts.title || document.title,
          text: opts.text,
          url,
        });
        return true;
      } catch (err) {
        // User cancelled or error — fall through to clipboard
        if (err instanceof Error && err.name === 'AbortError') return false;
      }
    }

    // Fallback: copy URL to clipboard
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { share };
}
