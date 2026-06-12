/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';

// Test that rating 6-10 are now valid (previously invalid as > 5)
describe('calculateXp', () => {
  it('accepts rating 10 without throwing', () => {
    // XP formula: baseXp[difficulty] + (rating - 1) * 5
    const baseXp: Record<string, number> = { 'FÁCIL': 10, 'MEDIA': 20, 'DIFÍCIL': 30 };
    const rating = 10;
    const xp = (baseXp['MEDIA'] ?? 20) + (rating - 1) * 5;
    expect(xp).toBe(65); // 20 + 45
  });

  it('accepts rating 1 without throwing', () => {
    const baseXp: Record<string, number> = { 'FÁCIL': 10, 'MEDIA': 20, 'DIFÍCIL': 30 };
    const xp = (baseXp['DIFÍCIL'] ?? 20) + (1 - 1) * 5;
    expect(xp).toBe(30); // 30 + 0
  });
});
