/// <reference types="vitest/globals" />
import { describe, expect, it } from 'vitest';
import {
  CATALOG,
  findObsoleteSlugs,
  getBundlePricing,
  normalizeCatalogIcon,
  validateCatalog,
} from '../catalog-core';

describe('Jalisco catalog manifest', () => {
  it('is internally valid and has one explicit Colombia exception', () => {
    expect(validateCatalog(CATALOG)).toEqual([]);

    const coffeesOutsideJalisco = CATALOG.products.filter(
      (product) => product.category === 'CAFÉ' && product.originCountry !== 'México',
    );

    expect(coffeesOutsideJalisco).toEqual([
      expect.objectContaining({
        slug: 'cafe-colombia-huila-reserva',
        originCountry: 'Colombia',
        bundleOnly: true,
      }),
    ]);
  });

  it('calculates a bundle price from its product quantities', () => {
    expect(getBundlePricing(CATALOG, 'ruta-colombia-jalisco')).toEqual({
      basePrice: 630,
      finalPrice: 567,
    });
  });

  it('normalizes legacy icon names to visible emoji', () => {
    expect(normalizeCatalogIcon('triangle')).toBe('🔺');
    expect(normalizeCatalogIcon('circle-plus')).toBe('➕');
    expect(normalizeCatalogIcon('☕')).toBe('☕');
  });

  it('deactivates obsolete slugs instead of deleting them', () => {
    expect(findObsoleteSlugs(['talpa-cosecha', 'producto-heredado'], CATALOG)).toEqual([
      'producto-heredado',
    ]);
  });
});
