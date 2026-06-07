import '@testing-library/jest-dom';

// Node 26 defines its own experimental localStorage/sessionStorage on globalThis
// (returns undefined without --localstorage-file), overwriting jsdom's getter.
// Re-bind globalThis storage to the jsdom internal storage objects so that
// tests can call localStorage.clear(), setItem(), etc. without errors.
if (typeof window !== 'undefined') {
  const w = window as any;
  if (w._localStorage !== undefined) {
    Object.defineProperty(globalThis, 'localStorage', {
      get: () => w._localStorage,
      configurable: true,
    });
  }
  if (w._sessionStorage !== undefined) {
    Object.defineProperty(globalThis, 'sessionStorage', {
      get: () => w._sessionStorage,
      configurable: true,
    });
  }
}
