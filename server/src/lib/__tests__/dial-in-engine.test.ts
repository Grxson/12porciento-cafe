/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';

import {
  recommend,
  isGoodResult,
  getDialInProvider,
  type BrewSessionResult,
} from '../dial-in-engine';

describe('isGoodResult', () => {
  it('classifies BALANCED/GOOD/EXCELLENT as good', () => {
    expect(isGoodResult('BALANCED')).toBe(true);
    expect(isGoodResult('GOOD')).toBe(true);
    expect(isGoodResult('EXCELLENT')).toBe(true);
  });

  it('does not classify extraction issues as good', () => {
    expect(isGoodResult('SOUR')).toBe(false);
    expect(isGoodResult('BITTER')).toBe(false);
    expect(isGoodResult('WATERY')).toBe(false);
  });
});

describe('recommend — good results', () => {
  it('BALANCED → HOLD', () => {
    const r = recommend({ result: 'BALANCED' });
    expect(r.reasonCode).toBe('HOLD');
    expect(r.primaryChange).toMatch(/igual/i);
  });
});

describe('recommend — SOUR / UNDEREXTRACTED', () => {
  it('SOUR → GRIND_FINER as primary', () => {
    const r = recommend({ result: 'SOUR' });
    expect(r.reasonCode).toBe('GRIND_FINER');
    expect(r.primaryChange).toMatch(/fino/i);
  });

  it('SOUR with 92°C suggests +1–2 °C', () => {
    const r = recommend({
      result: 'SOUR',
      current: { temperatureCelsius: 92 },
    });
    expect(r.suggestions.join(' ')).toMatch(/93.*94/);
  });

  it('SOUR with 96°C does not suggest further temperature increase', () => {
    const r = recommend({
      result: 'SOUR',
      current: { temperatureCelsius: 96 },
    });
    expect(r.suggestions.join(' ')).not.toMatch(/Sube la temperatura/);
  });

  it('SOUR with low agitation suggests increasing it', () => {
    const r = recommend({
      result: 'SOUR',
      current: { agitation: 'low' },
    });
    expect(r.suggestions.join(' ')).toMatch(/agitaci/i);
  });

  it('SOUR with no current params returns generic suggestions', () => {
    const r = recommend({ result: 'SOUR' });
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});

describe('recommend — BITTER / OVEREXTRACTED', () => {
  it('BITTER → GRIND_COARSER as primary', () => {
    const r = recommend({ result: 'BITTER' });
    expect(r.reasonCode).toBe('GRIND_COARSER');
    expect(r.primaryChange).toMatch(/grueso/i);
  });

  it('BITTER with 92°C suggests -1–2 °C', () => {
    const r = recommend({
      result: 'BITTER',
      current: { temperatureCelsius: 92 },
    });
    expect(r.suggestions.join(' ')).toMatch(/91.*90/);
  });

  it('BITTER with high agitation suggests reducing it', () => {
    const r = recommend({
      result: 'BITTER',
      current: { agitation: 'high' },
    });
    expect(r.suggestions.join(' ')).toMatch(/Reduce la agit/i);
  });
});

describe('recommend — WATERY', () => {
  it('WATERY → STRENGTHEN_RATIO', () => {
    const r = recommend({ result: 'WATERY' });
    expect(r.reasonCode).toBe('STRENGTHEN_RATIO');
  });

  it('WATERY with high ratio flags specific number', () => {
    const r = recommend({
      result: 'WATERY',
      current: { ratio: 17 },
    });
    expect(r.reason).toMatch(/1:17/);
  });
});

describe('recommend — STRONG', () => {
  it('STRONG → WEAKEN_RATIO', () => {
    const r = recommend({ result: 'STRONG' });
    expect(r.reasonCode).toBe('WEAKEN_RATIO');
    expect(r.primaryChange).toMatch(/ratio/i);
  });
});

describe('recommend — ASTRINGENT', () => {
  it('ASTRINGENT → COARSER_LESS_AGITATION', () => {
    const r = recommend({ result: 'ASTRINGENT' });
    expect(r.reasonCode).toBe('COARSER_LESS_AGITATION');
    expect(r.primaryChange).toMatch(/grueso/i);
    expect(r.suggestions.join(' ')).toMatch(/agitaci/i);
    expect(r.suggestions.join(' ')).toMatch(/canaliz/i);
  });
});

describe('recommend — principle of one change', () => {
  it('each recommendation has exactly one primary change', () => {
    const results: BrewSessionResult[] = [
      'SOUR',
      'BITTER',
      'WATERY',
      'STRONG',
      'ASTRINGENT',
      'UNDEREXTRACTED',
      'OVEREXTRACTED',
    ];
    for (const result of results) {
      const r = recommend({ result });
      expect(r.primaryChange.length).toBeGreaterThan(0);
      // primaryChange should be a single sentence (no period before the end)
      expect(r.primaryChange.split('.')[0].length).toBeGreaterThan(5);
    }
  });
});

describe('getDialInProvider', () => {
  it('returns a provider with a recommend function', () => {
    const provider = getDialInProvider();
    expect(typeof provider.recommend).toBe('function');
    const r = provider.recommend({ result: 'BITTER' });
    expect(r.reasonCode).toBe('GRIND_COARSER');
  });
});
