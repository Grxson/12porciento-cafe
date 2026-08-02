/// <reference types="vitest/globals" />
import { describe, expect, it } from 'vitest';
import {
  CATALOG_WRITE_TRANSACTION_OPTIONS,
  parseCatalogSyncArgs,
  shouldUseInteractiveTransaction,
} from '../sync-catalog';

describe('catalog synchronization safety modes', () => {
  it('defaults to validation without writing', () => {
    expect(parseCatalogSyncArgs([])).toEqual({ mode: 'validate', deactivateLegacy: false });
  });

  it('requires explicit flags for dry-run and legacy deactivation', () => {
    expect(parseCatalogSyncArgs(['--dry-run', '--deactivate-legacy'])).toEqual({
      mode: 'dry-run',
      deactivateLegacy: true,
    });
  });

  it('rejects conflicting write modes', () => {
    expect(() => parseCatalogSyncArgs(['--apply', '--dry-run'])).toThrow('Elige solo un modo');
  });

  it('does not hold an interactive transaction open during a dry-run', () => {
    expect(shouldUseInteractiveTransaction('dry-run')).toBe(false);
    expect(shouldUseInteractiveTransaction('validate')).toBe(false);
    expect(shouldUseInteractiveTransaction('apply')).toBe(true);
  });

  it('gives the atomic production write enough time to complete', () => {
    expect(CATALOG_WRITE_TRANSACTION_OPTIONS.timeout).toBeGreaterThan(60_000);
    expect(CATALOG_WRITE_TRANSACTION_OPTIONS.maxWait).toBeGreaterThanOrEqual(10_000);
  });
});
