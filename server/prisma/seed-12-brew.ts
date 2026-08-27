/**
 * 12% Brew — seed script
 *
 * Idempotent seed for:
 *   - 8 official brew methods (V60, Chemex, AeroPress, French Press, Moka, Espresso,
 *     Cold Brew, Japanese Iced)
 *   - 6 official recipes (12% Sweet, 12% Balance, 12% Bright, 12% Moka, V60 Japanese
 *     Iced, AeroPress Classic) with structured steps
 *
 * Run: pnpm --filter ./server db:brew-seed
 *      or: npx tsx prisma/seed-12-brew.ts
 *
 * Re-runnable. Existing rows are updated in place by slug; new rows are inserted.
 */

import { PrismaClient, type BrewMethodCategory } from '@prisma/client';

const prisma = new PrismaClient();

interface MethodSeed {
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  category: BrewMethodCategory;
  icon: string;
  difficulty: 'FÁCIL' | 'MEDIA' | 'DIFÍCIL';
  defaultRatioMin: number;
  defaultRatioMax: number;
  defaultTemperatureMin: number;
  defaultTemperatureMax: number;
}

const METHODS: MethodSeed[] = [
  {
    slug: 'v60',
    name: 'V60',
    shortDescription: 'Vertido en cono, control fino.',
    description:
      'Método de vertido por goteo con filtro cónico. Permite control fino del caudal, agitación y tiempos.',
    category: 'POUR_OVER',
    icon: '☕',
    difficulty: 'MEDIA',
    defaultRatioMin: 14,
    defaultRatioMax: 17,
    defaultTemperatureMin: 90,
    defaultTemperatureMax: 94,
  },
  {
    slug: 'chemex',
    name: 'Chemex',
    shortDescription: 'Vertido en filtro grueso, taza limpia.',
    description:
      'Cafetera de vidrio con filtro grueso. Produce tazas muy limpias con cuerpo medio, ideal para 3+ tazas.',
    category: 'POUR_OVER',
    icon: '🧪',
    difficulty: 'MEDIA',
    defaultRatioMin: 15,
    defaultRatioMax: 17,
    defaultTemperatureMin: 92,
    defaultTemperatureMax: 95,
  },
  {
    slug: 'aeropress',
    name: 'AeroPress',
    shortDescription: 'Inmersión + presión, rápido y portable.',
    description:
      'Combina inmersión corta con presión manual. Repetible, portable, fácil de limpiar.',
    category: 'IMMERSION',
    icon: '💨',
    difficulty: 'FÁCIL',
    defaultRatioMin: 14,
    defaultRatioMax: 18,
    defaultTemperatureMin: 85,
    defaultTemperatureMax: 92,
  },
  {
    slug: 'french-press',
    name: 'French Press',
    shortDescription: 'Inmersión total, cuerpo completo.',
    description:
      'Inmersión completa de 4 minutos con filtro de malla. Cuerpo alto, aceites preservados.',
    category: 'IMMERSION',
    icon: '🫖',
    difficulty: 'FÁCIL',
    defaultRatioMin: 14,
    defaultRatioMax: 16,
    defaultTemperatureMin: 92,
    defaultTemperatureMax: 95,
  },
  {
    slug: 'moka',
    name: 'Moka / Italiana',
    shortDescription: 'Presión por vapor en estufa.',
    description:
      'Cafetera italiana de estufa. Genera presión por vapor. Cuerpo alto, sabor robusto.',
    category: 'STOVETOP',
    icon: '🔥',
    difficulty: 'MEDIA',
    defaultRatioMin: 10,
    defaultRatioMax: 13,
    defaultTemperatureMin: 70,
    defaultTemperatureMax: 85,
  },
  {
    slug: 'espresso',
    name: 'Espresso',
    shortDescription: '9 bares, 25-30 s.',
    description:
      'Extracción con 9 bares de presión. Concentrado, cuerpo alto, crema dorada.',
    category: 'PRESSURE',
    icon: '⚡',
    difficulty: 'DIFÍCIL',
    defaultRatioMin: 1.8,
    defaultRatioMax: 2.4,
    defaultTemperatureMin: 92,
    defaultTemperatureMax: 95,
  },
  {
    slug: 'cold-brew',
    name: 'Cold Brew',
    shortDescription: 'Inmersión en frío 12-18 h.',
    description:
      'Inmersión prolongada en agua fría. Bajo amargor, alta dulzura, suave al paladar.',
    category: 'COLD',
    icon: '🧊',
    difficulty: 'FÁCIL',
    defaultRatioMin: 4,
    defaultRatioMax: 8,
    defaultTemperatureMin: 4,
    defaultTemperatureMax: 22,
  },
  {
    slug: 'japanese-iced',
    name: 'Japanese Iced',
    shortDescription: 'V60 directo sobre hielo.',
    description:
      'V60 preparado con agua caliente vertida directamente sobre hielo. Brillante y dulce.',
    category: 'COLD',
    icon: '🧊',
    difficulty: 'MEDIA',
    defaultRatioMin: 15,
    defaultRatioMax: 17,
    defaultTemperatureMin: 90,
    defaultTemperatureMax: 94,
  },
];

interface RecipeSeed {
  slug: string;
  title: string;
  description: string;
  methodSlug: string;
  coffeeDoseGrams: number;
  waterGrams: number;
  ratio: number;
  waterTemperatureCelsius: number;
  grind: string;
  grindTargetMicrons?: number;
  profile: 'BALANCED' | 'SWEET' | 'BRIGHT' | 'FRUITY' | 'FLORAL' | 'FULL_BODY' | 'CLEAN' | 'INTENSE' | 'REFRESHING' | 'EXPERIMENTAL';
  recipeType: 'OFFICIAL_12_PERCENT' | 'CREATOR' | 'BARISTA' | 'COMPETITION' | 'COMMUNITY' | 'PERSONAL';
  difficulty: 'FÁCIL' | 'MEDIA' | 'DIFÍCIL';
  featured: boolean;
  productSlug?: string;
  steps: Array<{
    order: number;
    type:
      | 'PREPARE'
      | 'RINSE'
      | 'ADD_COFFEE'
      | 'BLOOM'
      | 'POUR'
      | 'WAIT'
      | 'STIR'
      | 'SWIRL'
      | 'PRESS'
      | 'REMOVE_HEAT'
      | 'COOL'
      | 'SERVE'
      | 'CUSTOM';
    title: string;
    description: string;
    duration: number;
    waterAmountGrams?: number;
    targetTotalWaterGrams?: number;
    action?: string;
    pourPattern?: string;
    instruction?: string;
  }>;
}

const RECIPES: RecipeSeed[] = [
  {
    slug: '12-sweet-v60',
    title: '12% Sweet',
    description:
      'Receta insignia V60. 5 vertidos con descansos para extraer dulzor sin astringencia. Inspirada en métodos 4:6.',
    methodSlug: 'v60',
    coffeeDoseGrams: 20,
    waterGrams: 300,
    ratio: 15,
    waterTemperatureCelsius: 92,
    grind: 'Media',
    grindTargetMicrons: 700,
    profile: 'SWEET',
    recipeType: 'OFFICIAL_12_PERCENT',
    difficulty: 'MEDIA',
    featured: true,
    productSlug: 'coatepec-lavado',
    steps: [
      {
        order: 1,
        type: 'PREPARE',
        title: 'Prepara el equipo',
        description: 'V60 con filtro, tetera con 92 °C, báscula, molino a punto.',
        duration: 60,
      },
      {
        order: 2,
        type: 'ADD_COFFEE',
        title: 'Agrega 20 g de café',
        description: 'Muele al momento, vierte en el V60 y nivela el lecho.',
        duration: 10,
      },
      {
        order: 3,
        type: 'BLOOM',
        title: 'Bloom · 50 g',
        description: 'Vierte 50 g de agua en círculos suaves desde el centro. Espera 45 s.',
        duration: 45,
        waterAmountGrams: 50,
        targetTotalWaterGrams: 50,
        action: 'POUR',
        pourPattern: 'CENTER',
        instruction: 'Asegúrate de humedecer todo el café.',
      },
      {
        order: 4,
        type: 'POUR',
        title: 'Vertido 2 · +70 g',
        description: 'Suma 70 g de agua hasta 120 g total. Círculos concéntricos.',
        duration: 20,
        waterAmountGrams: 70,
        targetTotalWaterGrams: 120,
        action: 'POUR',
        pourPattern: 'CIRCULAR',
      },
      {
        order: 5,
        type: 'POUR',
        title: 'Vertido 3 · +60 g',
        description: 'Suma 60 g hasta 180 g total. Espiral suave del centro hacia afuera.',
        duration: 20,
        waterAmountGrams: 60,
        targetTotalWaterGrams: 180,
        action: 'POUR',
        pourPattern: 'SPIRAL_OUT',
      },
      {
        order: 6,
        type: 'POUR',
        title: 'Vertido 4 · +60 g',
        description: 'Suma 60 g hasta 240 g total.',
        duration: 20,
        waterAmountGrams: 60,
        targetTotalWaterGrams: 240,
        action: 'POUR',
        pourPattern: 'SPIRAL_OUT',
      },
      {
        order: 7,
        type: 'POUR',
        title: 'Vertido 5 · +60 g',
        description: 'Suma 60 g hasta 300 g total. Cierra con espiral hacia el centro.',
        duration: 20,
        waterAmountGrams: 60,
        targetTotalWaterGrams: 300,
        action: 'POUR',
        pourPattern: 'SPIRAL_IN',
      },
      {
        order: 8,
        type: 'WAIT',
        title: 'Drawdown',
        description: 'Espera a que el lecho se seque. El total debe quedar en ~3:00.',
        duration: 45,
      },
      {
        order: 9,
        type: 'SWIRL',
        title: 'Mezcla y sirve',
        description: 'Un swirl suave, sirve y disfruta.',
        duration: 10,
      },
    ],
  },
  {
    slug: '12-balance-v60',
    title: '12% Balance',
    description:
      'V60 balanceado y amigable. 3 vertidos, profile dulce-acidez media. Punto de partida para la mayoría de los cafés.',
    methodSlug: 'v60',
    coffeeDoseGrams: 18,
    waterGrams: 288,
    ratio: 16,
    waterTemperatureCelsius: 93,
    grind: 'Media',
    profile: 'BALANCED',
    recipeType: 'OFFICIAL_12_PERCENT',
    difficulty: 'FÁCIL',
    featured: true,
    steps: [
      {
        order: 1,
        type: 'PREPARE',
        title: 'Prepara el equipo',
        description: 'V60 con filtro, 93 °C, 18 g de café medio.',
        duration: 60,
      },
      {
        order: 2,
        type: 'BLOOM',
        title: 'Bloom · 50 g',
        description: 'Vierte 50 g en círculos suaves. Espera 40 s.',
        duration: 40,
        waterAmountGrams: 50,
        targetTotalWaterGrams: 50,
        action: 'POUR',
        pourPattern: 'CENTER',
      },
      {
        order: 3,
        type: 'POUR',
        title: 'Vertido 2 · +120 g',
        description: 'Suma 120 g hasta 170 g. Centro a espiral.',
        duration: 30,
        waterAmountGrams: 120,
        targetTotalWaterGrams: 170,
        action: 'POUR',
        pourPattern: 'SPIRAL_OUT',
      },
      {
        order: 4,
        type: 'POUR',
        title: 'Vertido 3 · +118 g',
        description: 'Suma 118 g hasta 288 g total.',
        duration: 30,
        waterAmountGrams: 118,
        targetTotalWaterGrams: 288,
        action: 'POUR',
        pourPattern: 'SPIRAL_IN',
      },
      {
        order: 5,
        type: 'WAIT',
        title: 'Drawdown',
        description: 'Espera el drawdown. Total ~2:45.',
        duration: 45,
      },
    ],
  },
  {
    slug: '12-bright-v60',
    title: '12% Bright',
    description:
      'V60 más caliente, molienda media-fina, agitación mayor. Pensada para cafés con notas cítricas y florales.',
    methodSlug: 'v60',
    coffeeDoseGrams: 17,
    waterGrams: 255,
    ratio: 15,
    waterTemperatureCelsius: 95,
    grind: 'Media-fina',
    grindTargetMicrons: 600,
    profile: 'BRIGHT',
    recipeType: 'OFFICIAL_12_PERCENT',
    difficulty: 'DIFÍCIL',
    featured: true,
    steps: [
      {
        order: 1,
        type: 'PREPARE',
        title: 'Prepara el equipo',
        description: 'V60, 95 °C, 17 g molido medio-fino.',
        duration: 60,
      },
      {
        order: 2,
        type: 'BLOOM',
        title: 'Bloom · 45 g',
        description: 'Vierte 45 g con agitación fuerte. Espera 30 s.',
        duration: 30,
        waterAmountGrams: 45,
        targetTotalWaterGrams: 45,
        action: 'POUR',
        pourPattern: 'CENTER',
      },
      {
        order: 3,
        type: 'POUR',
        title: 'Vertido 2 · +70 g',
        description: 'Suma 70 g hasta 115 g. Espiral amplio.',
        duration: 20,
        waterAmountGrams: 70,
        targetTotalWaterGrams: 115,
        action: 'POUR',
        pourPattern: 'SPIRAL_OUT',
      },
      {
        order: 4,
        type: 'POUR',
        title: 'Vertido 3 · +70 g',
        description: 'Suma 70 g hasta 185 g.',
        duration: 20,
        waterAmountGrams: 70,
        targetTotalWaterGrams: 185,
        action: 'POUR',
        pourPattern: 'SPIRAL_OUT',
      },
      {
        order: 5,
        type: 'POUR',
        title: 'Vertido 4 · +70 g',
        description: 'Suma 70 g hasta 255 g.',
        duration: 20,
        waterAmountGrams: 70,
        targetTotalWaterGrams: 255,
        action: 'POUR',
        pourPattern: 'SPIRAL_IN',
      },
      {
        order: 6,
        type: 'SWIRL',
        title: 'Swirl final',
        description: 'Swirl enérgico para aplanar el lecho.',
        duration: 5,
      },
    ],
  },
  {
    slug: '12-japanese-iced-v60',
    title: '12% Japanese Iced',
    description:
      'V60 directo sobre hielo. Cafés brillantes y dulces, perfectos para climas cálidos.',
    methodSlug: 'japanese-iced',
    coffeeDoseGrams: 20,
    waterGrams: 150,
    ratio: 7.5,
    waterTemperatureCelsius: 92,
    grind: 'Media',
    profile: 'REFRESHING',
    recipeType: 'OFFICIAL_12_PERCENT',
    difficulty: 'MEDIA',
    featured: false,
    steps: [
      {
        order: 1,
        type: 'PREPARE',
        title: 'Prepara el vaso con hielo',
        description: 'Sirve 100 g de hielo en el vaso final.',
        duration: 30,
      },
      {
        order: 2,
        type: 'ADD_COFFEE',
        title: 'Agrega 20 g',
        description: 'Café medio en el V60 con filtro pre-enjuagado.',
        duration: 10,
      },
      {
        order: 3,
        type: 'BLOOM',
        title: 'Bloom · 40 g',
        description: 'Vierte 40 g. Espera 30 s.',
        duration: 30,
        waterAmountGrams: 40,
        targetTotalWaterGrams: 40,
        action: 'POUR',
        pourPattern: 'CENTER',
      },
      {
        order: 4,
        type: 'POUR',
        title: 'Vertido principal · +110 g',
        description: 'Suma 110 g hasta 150 g. Espiral suave.',
        duration: 30,
        waterAmountGrams: 110,
        targetTotalWaterGrams: 150,
        action: 'POUR',
        pourPattern: 'SPIRAL_OUT',
      },
      {
        order: 5,
        type: 'SWIRL',
        title: 'Swirl del vaso',
        description: 'Mezcla el hielo y el café con un swirl.',
        duration: 5,
      },
    ],
  },
  {
    slug: '12-moka',
    title: '12% Moka',
    description:
      'Receta base para Moka / italiana. Fuego bajo, retirar antes del gorgoteo, sin compactar el café.',
    methodSlug: 'moka',
    coffeeDoseGrams: 18,
    waterGrams: 230,
    ratio: 13,
    waterTemperatureCelsius: 70,
    grind: 'Media-fina',
    profile: 'INTENSE',
    recipeType: 'OFFICIAL_12_PERCENT',
    difficulty: 'MEDIA',
    featured: false,
    steps: [
      {
        order: 1,
        type: 'PREPARE',
        title: 'Llena la base con agua caliente',
        description: 'Agua precalentada a 70 °C, debajo de la válvula de seguridad.',
        duration: 30,
      },
      {
        order: 2,
        type: 'ADD_COFFEE',
        title: 'Agrega café sin compactar',
        description: 'Llena el filtro con 18 g, sin presionar. Nivela.',
        duration: 15,
      },
      {
        order: 3,
        type: 'PREPARE',
        title: 'Cierra y lleva a fuego bajo',
        description: 'Tapa puesta, fuego bajo-medio, tapa abierta.',
        duration: 30,
      },
      {
        order: 4,
        type: 'WAIT',
        title: 'Espera el primer chorro',
        description: 'Cuando suba el primer chorro dorado, empieza a contar.',
        duration: 60,
      },
      {
        order: 5,
        type: 'REMOVE_HEAT',
        title: 'Retira antes del gorgoteo',
        description: 'Cuando el color pase de dorado a claro, retira del fuego.',
        duration: 5,
      },
      {
        order: 6,
        type: 'COOL',
        title: 'Enfría la base',
        description: 'Pasa la base por agua fría para detener la extracción.',
        duration: 10,
      },
      {
        order: 7,
        type: 'SERVE',
        title: 'Sirve y disfruta',
        description: 'Sirve inmediatamente. No dejes que se quede en la cafetera.',
        duration: 10,
      },
    ],
  },
  {
    slug: '12-aeropress-classic',
    title: '12% AeroPress Classic',
    description:
      'AeroPress inverted clásico. 14 g de café, 220 g de agua, press a 30 s. Equilibrado y dulce.',
    methodSlug: 'aeropress',
    coffeeDoseGrams: 14,
    waterGrams: 220,
    ratio: 15.7,
    waterTemperatureCelsius: 88,
    grind: 'Media-fina',
    profile: 'BALANCED',
    recipeType: 'OFFICIAL_12_PERCENT',
    difficulty: 'FÁCIL',
    featured: false,
    steps: [
      {
        order: 1,
        type: 'PREPARE',
        title: 'Invierte el AeroPress',
        description: 'Émbolo abajo, cilindro invertido, sin filtro todavía.',
        duration: 15,
      },
      {
        order: 2,
        type: 'ADD_COFFEE',
        title: 'Agrega 14 g',
        description: 'Café medio-fino en el cilindro.',
        duration: 10,
      },
      {
        order: 3,
        type: 'POUR',
        title: 'Vierte 220 g de agua',
        description: 'A 88 °C, en chorro constante.',
        duration: 15,
        waterAmountGrams: 220,
        targetTotalWaterGrams: 220,
        action: 'POUR',
        pourPattern: 'CENTER',
      },
      {
        order: 4,
        type: 'STIR',
        title: 'Mezcla',
        description: '5 segundos de agitación con la cuchara.',
        duration: 5,
      },
      {
        order: 5,
        type: 'WAIT',
        title: 'Bloom + reposo',
        description: 'Espera 1:30.',
        duration: 90,
      },
      {
        order: 6,
        type: 'PREPARE',
        title: 'Coloca filtro y voltea',
        description: 'Filtro enjuagado puesto, voltea sobre la taza.',
        duration: 10,
      },
      {
        order: 7,
        type: 'PRESS',
        title: 'Press 30 s',
        description: 'Presiona constante durante 30 segundos.',
        duration: 30,
      },
      {
        order: 8,
        type: 'SERVE',
        title: 'Sirve',
        description: 'Retira el émbolo. Listo para beber.',
        duration: 5,
      },
    ],
  },
];

async function main() {
  console.log('🌱 Seeding 12% Brew…\n');

  // ── Methods
  let methodsUpserted = 0;
  for (const m of METHODS) {
    await prisma.brewMethod.upsert({
      where: { slug: m.slug },
      update: {
        name: m.name,
        shortDescription: m.shortDescription,
        description: m.description,
        category: m.category,
        icon: m.icon,
        difficulty: m.difficulty,
        defaultRatioMin: m.defaultRatioMin,
        defaultRatioMax: m.defaultRatioMax,
        defaultTemperatureMin: m.defaultTemperatureMin,
        defaultTemperatureMax: m.defaultTemperatureMax,
        active: true,
      },
      create: {
        slug: m.slug,
        name: m.name,
        shortDescription: m.shortDescription,
        description: m.description,
        category: m.category,
        icon: m.icon,
        difficulty: m.difficulty,
        defaultRatioMin: m.defaultRatioMin,
        defaultRatioMax: m.defaultRatioMax,
        defaultTemperatureMin: m.defaultTemperatureMin,
        defaultTemperatureMax: m.defaultTemperatureMax,
        active: true,
      },
    });
    methodsUpserted += 1;
  }
  console.log(`✓ ${methodsUpserted} métodos sembrados`);

  // ── Recipes (linked to methods + optional product)
  let recipesUpserted = 0;
  for (const r of RECIPES) {
    const method = await prisma.brewMethod.findUnique({ where: { slug: r.methodSlug } });
    if (!method) {
      console.warn(`  ⚠ Method not found for recipe ${r.slug}: ${r.methodSlug}`);
      continue;
    }

    let productId: string | null = null;
    if (r.productSlug) {
      const product = await prisma.product.findUnique({ where: { slug: r.productSlug } });
      if (product) productId = product.id;
    }

    const existing = await prisma.recipe.findUnique({ where: { slug: r.slug } });

    if (existing) {
      await prisma.recipe.update({
        where: { id: existing.id },
        data: {
          title: r.title,
          description: r.description,
          method: method.name,
          brewMethodId: method.id,
          coffeeDoseGrams: r.coffeeDoseGrams,
          waterGrams: r.waterGrams,
          waterTemperatureCelsius: r.waterTemperatureCelsius,
          grind: r.grind,
          grindTargetMicrons: r.grindTargetMicrons ?? null,
          profile: r.profile,
          recipeType: r.recipeType,
          difficulty: r.difficulty,
          featured: r.featured,
          official: true,
          productId,
          // Legacy string mirrors
          ratio: String(r.ratio),
          temp: `${r.waterTemperatureCelsius} °C`,
          isPublished: true,
          isPremium: false,
          prepTime: 4,
          yield: `${Math.round(r.waterGrams / 200)} tazas`,
        },
      });
      // Replace steps to keep them in sync with the seed.
      await prisma.recipeStep.deleteMany({ where: { recipeId: existing.id } });
      await prisma.recipeStep.createMany({
        data: r.steps.map((s) => ({
          recipeId: existing.id,
          order: s.order,
          title: s.title,
          description: s.description,
          duration: s.duration,
          type: s.type as never,
          waterAmountGrams: s.waterAmountGrams ?? null,
          targetTotalWaterGrams: s.targetTotalWaterGrams ?? null,
          action: (s.action as never) ?? null,
          pourPattern: (s.pourPattern as never) ?? null,
          instruction: s.instruction ?? null,
        })),
      });
    } else {
      const created = await prisma.recipe.create({
        data: {
          slug: r.slug,
          title: r.title,
          description: r.description,
          method: method.name,
          difficulty: r.difficulty,
          prepTime: 4,
          yield: `${Math.round(r.waterGrams / 200)} tazas`,
          temp: `${r.waterTemperatureCelsius} °C`,
          grind: r.grind,
          ratio: String(r.ratio),
          isPublished: true,
          isPremium: false,
          brewMethodId: method.id,
          coffeeDoseGrams: r.coffeeDoseGrams,
          waterGrams: r.waterGrams,
          waterTemperatureCelsius: r.waterTemperatureCelsius,
          grindTargetMicrons: r.grindTargetMicrons ?? null,
          profile: r.profile,
          recipeType: r.recipeType,
          featured: r.featured,
          official: true,
          productId,
        },
      });
      await prisma.recipeStep.createMany({
        data: r.steps.map((s) => ({
          recipeId: created.id,
          order: s.order,
          title: s.title,
          description: s.description,
          duration: s.duration,
          type: s.type as never,
          waterAmountGrams: s.waterAmountGrams ?? null,
          targetTotalWaterGrams: s.targetTotalWaterGrams ?? null,
          action: (s.action as never) ?? null,
          pourPattern: (s.pourPattern as never) ?? null,
          instruction: s.instruction ?? null,
        })),
      });
    }

    recipesUpserted += 1;
  }
  console.log(`✓ ${recipesUpserted} recetas sembradas`);

  console.log('\n✅ 12% Brew seed completo.');
}

main()
  .catch((err) => {
    console.error('❌ Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

