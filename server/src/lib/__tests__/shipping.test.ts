/// <reference types="vitest/globals" />
import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockFindFirst } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
}));

vi.mock('../../db', () => ({
  prisma: {
    shippingRate: {
      findFirst: mockFindFirst,
    },
  },
}));

import { normalizeState, calculateShipping } from '../shipping';

describe('normalizeState', () => {
  it('trims, uppercases, and strips accents', () => {
    expect(normalizeState('  jalisco ')).toBe('JALISCO');
    expect(normalizeState('Nuevo León')).toBe('NUEVO LEON');
    expect(normalizeState('Yucatán')).toBe('YUCATAN');
    expect(normalizeState('Querétaro')).toBe('QUERETARO');
  });
});

describe('calculateShipping', () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
  });

  it('returns the matched active rate for a normalized state', async () => {
    mockFindFirst.mockResolvedValueOnce({
      state: 'JALISCO',
      cost: 120,
      estimatedDays: '2-3 días hábiles',
    });

    const quote = await calculateShipping('Jalisco');

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { state: 'JALISCO', isActive: true },
    });
    expect(quote).toEqual({
      cost: 120,
      estimatedDays: '2-3 días hábiles',
      matchedState: 'JALISCO',
    });
  });

  it('falls back to the DEFAULT rate when the state has no match', async () => {
    mockFindFirst
      .mockResolvedValueOnce(null) // state lookup misses
      .mockResolvedValueOnce({ state: 'DEFAULT', cost: 99, estimatedDays: '5-7 días hábiles' });

    const quote = await calculateShipping('Estado Inexistente');

    expect(quote).toEqual({ cost: 99, estimatedDays: '5-7 días hábiles', matchedState: 'DEFAULT' });
  });

  it('falls back to DEFAULT when no state string is given', async () => {
    mockFindFirst.mockResolvedValueOnce({
      state: 'DEFAULT',
      cost: 99,
      estimatedDays: '5-7 días hábiles',
    });

    const quote = await calculateShipping('');

    // Empty input must not hit the state lookup at all — only the DEFAULT query.
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
    expect(quote.matchedState).toBe('DEFAULT');
  });

  it('throws when no DEFAULT rate is configured', async () => {
    mockFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    await expect(calculateShipping('Atlantis')).rejects.toThrow(/DEFAULT/);
  });
});
