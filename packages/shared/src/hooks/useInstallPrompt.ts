import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function getIsStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as unknown as Record<string, unknown>).standalone === true
  );
}

function getIsIOS(): boolean {
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && !(window as unknown as Record<string, unknown>).MSStream;
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(getIsStandalone());

  useEffect(() => {
    const DISMISS_KEY = 'pwa-install-dismissed';
    const DISMISS_DAYS = 14;
    const wasDismissed = () => {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      const ts = parseInt(raw, 10);
      if (Number.isNaN(ts)) return false;
      return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
    };

    const onBeforeInstall = (e: Event) => {
      // Only intercept if user hasn't dismissed and isn't standalone
      if (wasDismissed() || getIsStandalone()) return;
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setIsStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }, [deferred]);

  return {
    canInstall: deferred !== null,
    isStandalone,
    isIOS: getIsIOS(),
    promptInstall,
  };
}
