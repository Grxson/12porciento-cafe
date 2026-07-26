import { useEffect, useState } from 'react';

function getStandaloneState() {
  const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const androidStandalone = document.referrer.startsWith('android-app://');
  return Boolean(mediaQuery?.matches || iosStandalone || androidStandalone);
}

export function useIsStandalonePWA() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
    const sync = () => setIsStandalone(getStandaloneState());
    sync();
    mediaQuery?.addEventListener?.('change', sync);
    return () => mediaQuery?.removeEventListener?.('change', sync);
  }, []);

  return isStandalone;
}
