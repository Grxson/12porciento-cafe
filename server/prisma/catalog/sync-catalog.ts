import { Prisma, PrismaClient } from '@prisma/client';
import { CATALOG, getBundlePricing, normalizeCatalogIcon, validateCatalog } from './catalog-core';

export type CatalogSyncMode = 'validate' | 'dry-run' | 'apply';

export function parseCatalogSyncArgs(argv: string[]): {
  mode: CatalogSyncMode;
  deactivateLegacy: boolean;
} {
  const modes = argv.filter((arg) => ['--validate-only', '--dry-run', '--apply'].includes(arg));
  if (modes.length > 1)
    throw new Error('Elige solo un modo: --validate-only, --dry-run o --apply.');
  return {
    mode: modes[0] === '--apply' ? 'apply' : modes[0] === '--dry-run' ? 'dry-run' : 'validate',
    deactivateLegacy: argv.includes('--deactivate-legacy'),
  };
}

export const CATALOG_WRITE_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 120_000,
};

const ASSET_ROOT = '/api/catalog/products';
const ASSET_ALIASES: Record<string, string> = {
  'san-sebastian-niebla': 'talpa-cosecha',
  'zapotitlan-citrico': 'sierra-occidental-floral',
  'cabo-corrientes-natural': 'cuautitlan-cacao',
  'tuxpan-espresso': 'cuautitlan-cacao',
  'v60-ceramica': 'coffee-equipment',
  'filtros-v60-100': 'coffee-equipment',
  'prensa-600': 'coffee-equipment',
  'molino-manual': 'coffee-equipment',
  'bascula-barista': 'coffee-equipment',
  'kettle-cuello-ganso': 'coffee-equipment',
  'taza-talpa': 'merch-catalog',
  'tote-ruta-12': 'merch-catalog',
  'inicio-v60-jalisco': 'bundles-catalog',
  'prensa-en-casa-jalisco': 'bundles-catalog',
  'espresso-jalisco': 'bundles-catalog',
  'explora-jalisco': 'bundles-catalog',
  'barista-jalisco': 'bundles-catalog',
  'ruta-colombia-jalisco': 'bundles-catalog',
  'v60-talpa': 'talpa-cosecha',
  'prensa-san-sebastian': 'talpa-cosecha',
  'espresso-tuxpan': 'cuautitlan-cacao',
  'aeropress-cabo-corrientes': 'cuautitlan-cacao',
  'chemex-sierra-occidental': 'sierra-occidental-floral',
};
const imageUrl = (key: string) => `${ASSET_ROOT}/${ASSET_ALIASES[key] ?? key}.png`;
const gallery = (key: string) => JSON.stringify([imageUrl(key)]);
const catalogNote =
  'Datos de catálogo demostrativos; verificar trazabilidad comercial antes de publicación.';

const productPayload = (
  product: (typeof CATALOG.products)[number],
  includeStock: boolean,
  caficultorId?: string,
) => ({
  name: product.name,
  category: product.category,
  origin: product.originCountry,
  region: product.region,
  altitude: product.altitude,
  variety: product.variety,
  process: product.process,
  scaScore: product.scaScore,
  roastLevel: product.roastLevel,
  flavors: product.flavors ? JSON.stringify(product.flavors) : undefined,
  images: gallery(product.imageKey),
  imageUrl: imageUrl(product.imageKey),
  description: product.description,
  isLimited: product.isLimited ?? false,
  isActive: product.bundleOnly ? false : true,
  producer: product.producerSlug
    ? CATALOG.producers.find((producer) => producer.slug === product.producerSlug)?.nombre
    : undefined,
  farmName: product.producerSlug
    ? CATALOG.producers.find((producer) => producer.slug === product.producerSlug)?.region
    : undefined,
  harvestYear: product.category === 'CAFÉ' ? 2026 : undefined,
  certifications: product.category === 'CAFÉ' ? '[]' : undefined,
  body: product.body,
  acidity: product.acidity,
  processingDescription: product.process ? `${product.process}. ${catalogNote}` : undefined,
  recommendedBrewMethod: product.recommendedBrewMethod,
  brewTemperature: product.brewTemperature,
  brewRatio: product.brewRatio,
  grindSize: product.grindSize,
  tastingNotes: product.tastingNotes,
  pairingSuggestions: product.pairingSuggestions,
  isMemberExclusive: product.isLimited ?? false,
  isB2BEnabled: product.isB2BEnabled ?? false,
  b2bPriority: product.isB2BEnabled ? 10 : 0,
  sku: `12C-2026-${product.slug.toUpperCase()}`.slice(0, 50),
  costPrice: product.costPrice,
  supplier: '12% Café · Catálogo Jalisco 2026',
  minOrderQty: 1,
  lowStockThreshold: product.isLimited ? 5 : 10,
  caficultorId,
  ...(includeStock ? { price: product.price, stock: product.stock } : { price: product.price }),
});

const productLocationSlug = (product: (typeof CATALOG.products)[number]) => {
  if (product.originCountry === 'Colombia') return 'colombia-huila';
  return CATALOG.locations.find((entry) => entry.nombre === product.region)?.slug;
};

async function syncCatalog(prisma: PrismaClient, deactivateLegacy: boolean, dryRun: boolean) {
  const productIds = new Map<string, string>();
  const producerIds = new Map<string, string>();
  const locationIds = new Map<string, string>();
  const report = { created: 0, updated: 0, deactivated: 0, dryRun };
  const record = (created: boolean) => (created ? report.created++ : report.updated++);

  for (const location of CATALOG.locations) {
    const found = await prisma.ubicacion.findUnique({ where: { slug: location.slug } });
    record(!found);
    if (dryRun) continue;
    const row = await prisma.ubicacion.upsert({
      where: { slug: location.slug },
      create: {
        ...location,
        pais: location.slug.startsWith('colombia-') ? 'Colombia' : 'México',
        isActive: true,
      },
      update: {
        nombre: location.nombre,
        estado: location.estado,
        pais: location.slug.startsWith('colombia-') ? 'Colombia' : 'México',
        isActive: true,
      },
    });
    locationIds.set(location.slug, row.id);
  }

  for (const producer of CATALOG.producers) {
    const found = await prisma.caficultor.findUnique({ where: { slug: producer.slug } });
    record(!found);
    if (dryRun) continue;
    const row = await prisma.caficultor.upsert({
      where: { slug: producer.slug },
      create: {
        ...producer,
        bio: catalogNote,
        modalidad: 'COOPERATIVA',
        fairTrade: false,
        isActive: true,
      },
      update: {
        nombre: producer.nombre,
        region: producer.region,
        altitud: producer.altitud,
        variedad: producer.variedad,
        bio: catalogNote,
        modalidad: 'COOPERATIVA',
        fairTrade: false,
        isActive: true,
      },
    });
    producerIds.set(producer.slug, row.id);
  }

  for (const product of CATALOG.products) {
    const found = await prisma.product.findUnique({ where: { slug: product.slug } });
    record(!found);
    if (dryRun) continue;
    const caficultorId = product.producerSlug ? producerIds.get(product.producerSlug) : undefined;
    const row = await prisma.product.upsert({
      where: { slug: product.slug },
      create: {
        slug: product.slug,
        ...productPayload(product, true, caficultorId),
      } as Prisma.ProductUncheckedCreateInput,
      update: productPayload(product, false, caficultorId) as Prisma.ProductUncheckedUpdateInput,
    });
    productIds.set(product.slug, row.id);
    if (!found) {
      await prisma.stockMovement.create({
        data: {
          productId: row.id,
          type: 'INITIAL',
          quantity: product.stock,
          previousStock: 0,
          newStock: product.stock,
          notes: 'Inventario inicial del Catálogo Jalisco 2026.',
          unitCost: product.costPrice,
          supplier: '12% Café · Catálogo Jalisco 2026',
        },
      });
    }
  }

  if (deactivateLegacy) {
    const protectedSlugs = CATALOG.products.map((product) => product.slug);
    const staleCoffees = await prisma.product.findMany({
      where: { category: 'CAFÉ', slug: { notIn: protectedSlugs }, isActive: true },
      select: { id: true },
    });
    report.deactivated += staleCoffees.length;
    if (!dryRun && staleCoffees.length)
      await prisma.product.updateMany({
        where: { id: { in: staleCoffees.map((product) => product.id) } },
        data: { isActive: false },
      });
  }

  for (const product of CATALOG.products.filter((entry) => entry.category === 'CAFÉ')) {
    const productId = productIds.get(product.slug);
    const locationSlug = productLocationSlug(product);
    if (!productId || !locationSlug || dryRun) continue;
    const batchNumber = `12C-2026-${product.slug.toUpperCase()}`.slice(0, 80);
    const lote = await prisma.lote.upsert({
      where: { batchNumber },
      create: {
        productId,
        caficultorId: product.producerSlug ? producerIds.get(product.producerSlug) : undefined,
        ubicacionId: locationIds.get(locationSlug),
        batchNumber,
        quantity: product.stock,
        costPerKg: product.costPrice * 4,
        unitCost: product.costPrice,
        supplier: '12% Café · Catálogo Jalisco 2026',
        origin: product.region,
        status: 'APROBADO',
        notes: catalogNote,
        humedad: 10.5,
        defectos: 2,
        scoreAroma: 8,
        scoreSabor: 8,
        scoreAcidez: 8,
        scoreBody: 8,
        scoreFinal: product.scaScore,
        evaluadoPor: 'Panel 12% Café',
        approvedAt: new Date('2026-08-01T12:00:00Z'),
        approvedBy: 'Sincronizador Catálogo Jalisco',
      },
      update: {
        caficultorId: product.producerSlug ? producerIds.get(product.producerSlug) : undefined,
        ubicacionId: locationIds.get(locationSlug),
        origin: product.region,
        notes: catalogNote,
        scoreFinal: product.scaScore,
      },
    });
    await prisma.productVersion.upsert({
      where: { productId_version: { productId, version: 1 } },
      create: {
        productId,
        version: 1,
        cosecha: '2026',
        caficultorId: product.producerSlug ? producerIds.get(product.producerSlug) : undefined,
        loteId: lote.id,
        scoreFinal: product.scaScore,
        notasSabor: product.tastingNotes,
        isActive: true,
      },
      update: {
        caficultorId: product.producerSlug ? producerIds.get(product.producerSlug) : undefined,
        loteId: lote.id,
        scoreFinal: product.scaScore,
        notasSabor: product.tastingNotes,
        isActive: true,
      },
    });
    await prisma.pricingConfig.upsert({
      where: { productId },
      create: {
        productId,
        roastingCostPerUnit: 28,
        packagingCostPerUnit: 18,
        overheadFixed: 15,
        marginRetailPct: 60,
        marginB2bPct: 32,
        minAlertMarginPct: 20,
      },
      update: {
        roastingCostPerUnit: 28,
        packagingCostPerUnit: 18,
        overheadFixed: 15,
        marginRetailPct: 60,
        marginB2bPct: 32,
        minAlertMarginPct: 20,
      },
    });
    if (product.isB2BEnabled) {
      await prisma.b2BPriceTier.deleteMany({ where: { productId } });
      const tierRules: Array<[number, number | null, number]> = [
        [6, 11, 0.9],
        [12, 23, 0.84],
        [24, null, 0.78],
      ];
      await prisma.b2BPriceTier.createMany({
        data: tierRules.map(([minQty, maxQty, factor]) => ({
          productId,
          minQty,
          maxQty,
          pricePerUnit: Math.round(product.price * factor * 100) / 100,
        })),
      });
    }
    const events = ['Cosecha', 'Selección', 'Proceso', 'Secado', 'Catación', 'Tueste', 'Empaque'];
    for (const [index, title] of events.entries()) {
      const occurredAt = new Date(`2026-${String(index + 1).padStart(2, '0')}-15T12:00:00Z`);
      await prisma.traceabilityEvent.upsert({
        where: {
          loteId_eventType_occurredAt: {
            loteId: lote.id,
            eventType: title.toUpperCase(),
            occurredAt,
          },
        },
        create: {
          loteId: lote.id,
          eventType: title.toUpperCase(),
          title,
          description: catalogNote,
          location: product.region,
          occurredAt,
          source: '12% Café',
          isDemo: true,
          sortOrder: index + 1,
        },
        update: {
          title,
          description: catalogNote,
          location: product.region,
          source: '12% Café',
          isDemo: true,
          sortOrder: index + 1,
        },
      });
    }
  }

  for (const bundle of CATALOG.bundles) {
    const found = await prisma.bundle.findFirst({ where: { name: bundle.name } });
    record(!found);
    if (dryRun) continue;
    const pricing = getBundlePricing(CATALOG, bundle.slug);
    const row = found
      ? await prisma.bundle.update({
          where: { id: found.id },
          data: {
            description: bundle.description,
            basePrice: pricing.basePrice,
            discountPct: bundle.discountPct,
            finalPrice: pricing.finalPrice,
            imageUrl: imageUrl(bundle.imageKey),
            isActive: true,
          },
        })
      : await prisma.bundle.create({
          data: {
            name: bundle.name,
            description: bundle.description,
            basePrice: pricing.basePrice,
            discountPct: bundle.discountPct,
            finalPrice: pricing.finalPrice,
            imageUrl: imageUrl(bundle.imageKey),
            isActive: true,
          },
        });
    await prisma.bundleItem.deleteMany({ where: { bundleId: row.id } });
    await prisma.bundleItem.createMany({
      data: bundle.items.map((item) => ({
        bundleId: row.id,
        productId: productIds.get(item.productSlug)!,
        quantity: item.quantity,
      })),
    });
  }

  for (const recipe of CATALOG.recipes) {
    const found = await prisma.recipe.findUnique({ where: { slug: recipe.slug } });
    record(!found);
    if (dryRun) continue;
    const data = {
      title: recipe.title,
      description: recipe.description,
      method: recipe.method,
      difficulty: recipe.difficulty,
      prepTime: recipe.prepTime,
      yield: recipe.yield,
      temp: recipe.temp,
      grind: recipe.grind,
      ratio: recipe.ratio,
      imageUrl: imageUrl(recipe.imageKey),
      isPremium: recipe.isPremium,
      isPublished: true,
      productId: productIds.get(recipe.productSlug),
    };
    const row = await prisma.recipe.upsert({
      where: { slug: recipe.slug },
      create: { slug: recipe.slug, ...data },
      update: data,
    });
    await prisma.recipeStep.deleteMany({ where: { recipeId: row.id } });
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: row.id } });
    await prisma.recipeEquipment.deleteMany({ where: { recipeId: row.id } });
    await prisma.recipeStep.createMany({
      data: recipe.steps.map((step, index) => ({ recipeId: row.id, order: index + 1, ...step })),
    });
    await prisma.recipeIngredient.createMany({
      data: recipe.ingredients.map((ingredient, index) => ({
        recipeId: row.id,
        order: index + 1,
        ...ingredient,
      })),
    });
    await prisma.recipeEquipment.createMany({
      data: recipe.equipment.map((name, index) => ({ recipeId: row.id, order: index + 1, name })),
    });
  }

  for (const achievement of CATALOG.achievements) {
    const found = await prisma.achievement.findUnique({ where: { slug: achievement.slug } });
    record(!found);
    if (!dryRun)
      await prisma.achievement.upsert({
        where: { slug: achievement.slug },
        create: achievement,
        update: {
          name: achievement.name,
          description: achievement.description,
          icon: normalizeCatalogIcon(achievement.icon),
          rarity: achievement.rarity,
          xpReward: achievement.xpReward,
        },
      });
  }
  for (const title of CATALOG.titles) {
    const found = await prisma.baristaTitle.findUnique({ where: { slug: title.slug } });
    record(!found);
    if (!dryRun)
      await prisma.baristaTitle.upsert({
        where: { slug: title.slug },
        create: title,
        update: {
          name: title.name,
          description: title.description,
          icon: normalizeCatalogIcon(title.icon),
          requirement: title.requirement,
        },
      });
  }
  for (const reward of CATALOG.rewards) {
    const found = await prisma.reward.findFirst({ where: { name: reward.name } });
    record(!found);
    if (!dryRun) {
      if (found)
        await prisma.reward.update({
          where: { id: found.id },
          data: { ...reward, icon: normalizeCatalogIcon(reward.icon), isActive: true },
        });
      else
        await prisma.reward.create({
          data: { ...reward, icon: normalizeCatalogIcon(reward.icon), isActive: true },
        });
    }
  }
  if (!dryRun) {
    const achievements = await prisma.achievement.findMany({ select: { id: true, icon: true } });
    for (const achievement of achievements) {
      const icon = normalizeCatalogIcon(achievement.icon);
      if (icon !== achievement.icon)
        await prisma.achievement.update({ where: { id: achievement.id }, data: { icon } });
    }
    const titles = await prisma.baristaTitle.findMany({ select: { id: true, icon: true } });
    for (const title of titles) {
      const icon = normalizeCatalogIcon(title.icon);
      if (icon !== title.icon)
        await prisma.baristaTitle.update({ where: { id: title.id }, data: { icon } });
    }
    const rewards = await prisma.reward.findMany({ select: { id: true, icon: true } });
    for (const reward of rewards) {
      const icon = normalizeCatalogIcon(reward.icon);
      if (icon !== reward.icon)
        await prisma.reward.update({ where: { id: reward.id }, data: { icon } });
    }
  }

  return report;
}

export function shouldUseInteractiveTransaction(mode: CatalogSyncMode) {
  return mode === 'apply';
}

export async function runCatalogSync(argv = process.argv.slice(2)) {
  const { mode, deactivateLegacy } = parseCatalogSyncArgs(argv);
  const errors = validateCatalog(CATALOG);
  if (errors.length) throw new Error(`Catálogo inválido:\n- ${errors.join('\n- ')}`);
  if (mode === 'validate') return { valid: true, mode };
  if (mode === 'apply' && process.env.CATALOG_SYNC_CONFIRM !== 'JALISCO_CATALOG_2026')
    throw new Error('Para escribir define CATALOG_SYNC_CONFIRM=JALISCO_CATALOG_2026.');
  const prisma = new PrismaClient();
  try {
    if (!shouldUseInteractiveTransaction(mode)) {
      return await syncCatalog(prisma, deactivateLegacy, mode === 'dry-run');
    }
    return await prisma.$transaction(
      (tx) => syncCatalog(tx as PrismaClient, deactivateLegacy, false),
      CATALOG_WRITE_TRANSACTION_OPTIONS,
    );
  } finally {
    await prisma.$disconnect();
  }
}
