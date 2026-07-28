import { prisma } from '../db';

const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

// Checkout's `state` field is free text (not a fixed dropdown), so normalize
// before lookup: trim, uppercase, strip accents. Still won't catch every typo
// or abbreviation — that's a known limitation until the field is a dropdown.
export function normalizeState(state: string): string {
  return state.trim().toUpperCase().normalize('NFD').replace(DIACRITICS, '');
}

export interface ShippingQuote {
  cost: number;
  estimatedDays: string;
  matchedState: string;
}

export async function calculateShipping(state: string): Promise<ShippingQuote> {
  const normalized = normalizeState(state || '');

  const rate = normalized
    ? await prisma.shippingRate.findFirst({
        where: { state: normalized, isActive: true },
      })
    : null;

  if (rate) {
    return { cost: rate.cost, estimatedDays: rate.estimatedDays, matchedState: rate.state };
  }

  const fallback = await prisma.shippingRate.findFirst({
    where: { state: 'DEFAULT', isActive: true },
  });

  if (!fallback) {
    throw new Error('No hay tarifa de envío configurada (falta tarifa DEFAULT)');
  }

  return { cost: fallback.cost, estimatedDays: fallback.estimatedDays, matchedState: 'DEFAULT' };
}
