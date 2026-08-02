import {
  ACHIEVEMENTS,
  BUNDLES,
  LOCATIONS,
  PRODUCTS,
  PRODUCERS,
  RECIPES,
  REWARDS,
  TITLES,
  type CatalogBundle,
  type CatalogProduct,
} from './catalog-data';

export const CATALOG = {
  locations: LOCATIONS,
  producers: PRODUCERS,
  products: PRODUCTS,
  bundles: BUNDLES,
  recipes: RECIPES,
  achievements: ACHIEVEMENTS,
  titles: TITLES,
  rewards: REWARDS,
} as const;

const LEGACY_ICON_MAP: Record<string, string> = {
  coffee: '☕',
  target: '🎯',
  zap: '⚡',
  star: '⭐',
  flame: '🔥',
  fire: '🔥',
  graduate: '🎓',
  sunrise: '🌅',
  moon: '🌙',
  trophy: '🏆',
  gift: '🎁',
  medal: '🏅',
  triangle: '🔺',
  'circle-plus': '➕',
  circle_plus: '➕',
  sword: '⚔️',
  swords: '⚔️',
};

const isEmoji = (value: string) => /\p{Extended_Pictographic}/u.test(value);

export function normalizeCatalogIcon(icon: string): string {
  const trimmed = icon.trim();
  if (!trimmed) return '🏆';
  if (isEmoji(trimmed)) return trimmed;
  const normalized = trimmed.toLowerCase().replace(/[\s_]+/g, '-');
  return LEGACY_ICON_MAP[normalized] ?? '🏆';
}

const duplicates = (values: string[]) =>
  values.filter((value, index) => values.indexOf(value) !== index);

const findProduct = (products: readonly CatalogProduct[], slug: string) =>
  products.find((product) => product.slug === slug);

export function getBundlePricing(
  catalog: Pick<typeof CATALOG, 'products' | 'bundles'>,
  bundleSlug: string,
): { basePrice: number; finalPrice: number } {
  const bundle = catalog.bundles.find((entry) => entry.slug === bundleSlug);
  if (!bundle) throw new Error(`Bundle desconocido: ${bundleSlug}`);
  const basePrice = bundle.items.reduce((total, item) => {
    const product = findProduct(catalog.products, item.productSlug);
    if (!product) throw new Error(`Producto faltante en bundle: ${item.productSlug}`);
    return total + product.price * item.quantity;
  }, 0);
  return {
    basePrice,
    finalPrice: Math.round(basePrice * (1 - bundle.discountPct / 100) * 100) / 100,
  };
}

export function findObsoleteSlugs(
  existingSlugs: string[],
  catalog: Pick<typeof CATALOG, 'products'>,
) {
  const activeSlugs = new Set(catalog.products.map((product) => product.slug));
  return existingSlugs.filter((slug) => !activeSlugs.has(slug));
}

export function validateCatalog(catalog: typeof CATALOG): string[] {
  const errors: string[] = [];
  const productSlugs = catalog.products.map((product) => product.slug);
  const duplicateProducts = duplicates(productSlugs);
  if (duplicateProducts.length)
    errors.push(`Slugs de producto duplicados: ${duplicateProducts.join(', ')}`);

  const producerSlugs = new Set<string>(catalog.producers.map((producer) => producer.slug));
  const colombiaProducts = catalog.products.filter(
    (product) => product.category === 'CAFÉ' && product.originCountry !== 'México',
  );
  if (
    colombiaProducts.length !== 1 ||
    colombiaProducts[0]?.slug !== 'cafe-colombia-huila-reserva' ||
    !colombiaProducts[0]?.bundleOnly
  ) {
    errors.push(
      'El catálogo debe tener únicamente la excepción Colombia Huila y debe ser bundleOnly.',
    );
  }

  for (const product of catalog.products) {
    if (product.price <= 0 || product.costPrice <= 0 || product.stock < 0)
      errors.push(`Precio, costo o stock inválido: ${product.slug}`);
    if (product.category === 'CAFÉ') {
      if (!product.producerSlug || !producerSlugs.has(product.producerSlug))
        errors.push(`Productor faltante: ${product.slug}`);
      if (product.originCountry === 'México' && product.state !== 'Jalisco')
        errors.push(`Café fuera de Jalisco: ${product.slug}`);
    }
  }

  for (const bundle of catalog.bundles) {
    if (bundle.discountPct < 0 || bundle.discountPct > 100)
      errors.push(`Descuento inválido: ${bundle.slug}`);
    const containsColombia = bundle.items.some(
      (item) => item.productSlug === 'cafe-colombia-huila-reserva',
    );
    if (containsColombia && bundle.slug !== 'ruta-colombia-jalisco')
      errors.push(`Colombia solo puede estar en Ruta Colombia–Jalisco.`);
    for (const item of bundle.items) {
      const product = findProduct(catalog.products, item.productSlug);
      if (!product || item.quantity < 1)
        errors.push(`Item de bundle inválido: ${bundle.slug}/${item.productSlug}`);
      if (product?.bundleOnly && !containsColombia)
        errors.push(`Producto exclusivo de bundle inválido: ${item.productSlug}`);
    }
  }

  for (const recipe of catalog.recipes) {
    if (!findProduct(catalog.products, recipe.productSlug))
      errors.push(`Producto faltante en receta: ${recipe.slug}`);
    if (!recipe.steps.length || !recipe.ingredients.length || !recipe.equipment.length)
      errors.push(`Receta incompleta: ${recipe.slug}`);
  }

  const achievementSlugs = new Set(catalog.achievements.map((achievement) => achievement.slug));
  for (const achievement of catalog.achievements) {
    if (!isEmoji(achievement.icon)) errors.push(`Icono no visible de logro: ${achievement.slug}`);
  }
  for (const title of catalog.titles) {
    if (!isEmoji(title.icon) || !achievementSlugs.has(title.requirement))
      errors.push(`Título inválido: ${title.slug}`);
  }
  for (const reward of catalog.rewards) {
    if (!isEmoji(reward.icon)) errors.push(`Icono no visible de recompensa: ${reward.name}`);
  }

  return errors;
}

export function bundleProducts(bundle: CatalogBundle, products: readonly CatalogProduct[]) {
  return bundle.items.map((item) => ({
    ...item,
    product: findProduct(products, item.productSlug),
  }));
}
