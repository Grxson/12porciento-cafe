#!/usr/bin/env -S npx tsx
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');
const validateOnly = process.argv.includes('--validate-only');
const DEMO =
  'Datos demostrativos de 12% Cafe; origen, productor y trazabilidad no constituyen certificacion comercial.';

type ProductSeed = {
  name: string;
  slug: string;
  sku: string;
  category: string;
  price: number;
  costPrice: number;
  description: string;
  imageUrl: string;
  images: string;
  stock: number;
  weight?: number;
  origin?: string;
  region?: string;
  altitude?: number;
  variety?: string;
  process?: string;
  scaScore?: number;
  roastLevel?: string;
  flavors?: string;
  producer?: string;
  farmName?: string;
  harvestYear?: number;
  certifications?: string;
  body?: string;
  acidity?: string;
  processingDescription?: string;
  recommendedBrewMethod?: string;
  brewTemperature?: number;
  brewRatio?: string;
  grindSize?: string;
  tastingNotes?: string;
  pairingSuggestions?: string;
  farmerSlug?: string;
  locationSlug?: string;
};

const esc = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' })[c]!,
  );
const svg = (label: string, variant = 0) => {
  const colors = [
    ['#24150f', '#c7923e'],
    ['#3b2117', '#e8d8bd'],
    ['#172b24', '#d4a44d'],
  ][variant % 3];
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><rect width="640" height="640" fill="${colors[0]}"/><circle cx="320" cy="245" r="125" fill="none" stroke="${colors[1]}" stroke-width="14"/><path d="M270 300c35-105 135-100 100 15-30 95-130 90-100-15Z" fill="${colors[1]}"/><text x="320" y="455" fill="${colors[1]}" text-anchor="middle" font-family="sans-serif" font-size="34" font-weight="700">12% CAFE</text><text x="320" y="505" fill="#fff" text-anchor="middle" font-family="sans-serif" font-size="22">${esc(label)}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(xml)}`;
};
const art = (name: string) => ({
  imageUrl: svg(name),
  images: JSON.stringify([svg(name, 0), svg(`${name} detalle`, 1), svg(`${name} empaque`, 2)]),
});
const money = (n: number) => Math.round(n * 100) / 100;

const locations = [
  ['chiapas-soconusco', 'Soconusco', 'Chiapas'],
  ['chiapas-altos', 'Los Altos', 'Chiapas'],
  ['oaxaca-pluma', 'Pluma Hidalgo', 'Oaxaca'],
  ['oaxaca-mixe', 'Sierra Mixe', 'Oaxaca'],
  ['veracruz-coatepec', 'Coatepec', 'Veracruz'],
  ['veracruz-huatusco', 'Huatusco', 'Veracruz'],
  ['puebla-cuetzalan', 'Cuetzalan', 'Puebla'],
  ['guerrero-atoyac', 'Atoyac', 'Guerrero'],
  ['nayarit-tepic', 'Tepic', 'Nayarit'],
  ['jalisco-talpa', 'Talpa', 'Jalisco'],
  ['colima-comala', 'Comala', 'Colima'],
  ['estado-mexico-amatl', 'Amatepec', 'Estado de Mexico'],
] as const;

const farmers = [
  ['lucia-mendez', 'Lucia Mendez', 'Soconusco', 1450, 'Bourbon, Caturra'],
  ['colectivo-tseltal', 'Colectivo Tseltal', 'Los Altos', 1700, 'Typica, Bourbon'],
  ['mateo-cruz', 'Mateo Cruz', 'Pluma Hidalgo', 1550, 'Pluma Hidalgo'],
  ['familia-vasquez', 'Familia Vasquez', 'Sierra Mixe', 1800, 'Typica'],
  ['ana-hernandez', 'Ana Hernandez', 'Coatepec', 1350, 'Caturra'],
  ['cooperativa-huatusco', 'Cooperativa Huatusco', 'Huatusco', 1400, 'Bourbon'],
  ['rosa-torres', 'Rosa Torres', 'Cuetzalan', 1500, 'Garnica'],
  ['javier-salgado', 'Javier Salgado', 'Atoyac', 1250, 'Mundo Novo'],
  ['elena-ramos', 'Elena Ramos', 'Tepic', 1200, 'Catuai'],
  ['familia-navarro', 'Familia Navarro', 'Talpa', 1600, 'Typica, Caturra'],
] as const;

const coffeeRows = [
  [
    'Soconusco Cacao',
    'chiapas-soconusco',
    'lucia-mendez',
    'Bourbon',
    'Lavado',
    86.5,
    'cacao, panela, naranja',
  ],
  [
    'Altos Florales',
    'chiapas-altos',
    'colectivo-tseltal',
    'Typica',
    'Lavado',
    87.2,
    'jazmin, miel, mandarina',
  ],
  [
    'Pluma Dulce',
    'oaxaca-pluma',
    'mateo-cruz',
    'Pluma Hidalgo',
    'Lavado',
    86.8,
    'chocolate, ciruela, piloncillo',
  ],
  [
    'Mixe Niebla',
    'oaxaca-mixe',
    'familia-vasquez',
    'Typica',
    'Natural',
    87.6,
    'fresa, cacao, especias',
  ],
  [
    'Coatepec Clasico',
    'veracruz-coatepec',
    'ana-hernandez',
    'Caturra',
    'Lavado',
    85.8,
    'avellana, caramelo, manzana',
  ],
  [
    'Huatusco Miel',
    'veracruz-huatusco',
    'cooperativa-huatusco',
    'Bourbon',
    'Honey',
    86.3,
    'miel, pera, almendra',
  ],
  [
    'Cuetzalan Bruma',
    'puebla-cuetzalan',
    'rosa-torres',
    'Garnica',
    'Lavado',
    86.9,
    'limon, cacao, panela',
  ],
  [
    'Atoyac Intenso',
    'guerrero-atoyac',
    'javier-salgado',
    'Mundo Novo',
    'Natural',
    85.9,
    'chocolate oscuro, cereza, nuez',
  ],
  ['Tepic Solar', 'nayarit-tepic', 'elena-ramos', 'Catuai', 'Honey', 86.1, 'durazno, miel, cacao'],
  [
    'Talpa Bosque',
    'jalisco-talpa',
    'familia-navarro',
    'Typica',
    'Lavado',
    87.0,
    'manzana roja, caramelo, canela',
  ],
  [
    'Comala Volcan',
    'colima-comala',
    'lucia-mendez',
    'Caturra',
    'Natural',
    86.4,
    'guayaba, chocolate, especias',
  ],
  [
    'Amatepec Reserva',
    'estado-mexico-amatl',
    'mateo-cruz',
    'Bourbon',
    'Lavado',
    86.0,
    'nuez, naranja, piloncillo',
  ],
  [
    'Soconusco Geisha Demo',
    'chiapas-soconusco',
    'lucia-mendez',
    'Geisha',
    'Lavado',
    89.1,
    'jazmin, bergamota, miel',
  ],
  [
    'Pluma Natural',
    'oaxaca-pluma',
    'mateo-cruz',
    'Pluma Hidalgo',
    'Natural',
    88.0,
    'frutos rojos, cacao, ron',
  ],
  [
    'Mixe Anaerobico Demo',
    'oaxaca-mixe',
    'familia-vasquez',
    'Typica',
    'Anaerobico',
    88.4,
    'uva, canela, chocolate',
  ],
  [
    'Coatepec Espresso',
    'veracruz-coatepec',
    'ana-hernandez',
    'Caturra',
    'Lavado',
    85.7,
    'cacao, caramelo, nuez',
  ],
  [
    'Cuetzalan Honey',
    'puebla-cuetzalan',
    'rosa-torres',
    'Garnica',
    'Honey',
    87.3,
    'miel, naranja, te negro',
  ],
  [
    'Talpa Microlote',
    'jalisco-talpa',
    'familia-navarro',
    'Bourbon',
    'Lavado',
    88.2,
    'ciruela, panela, flores',
  ],
] as const;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const coffees: ProductSeed[] = coffeeRows.map((r, i) => {
  const [name, locationSlug, farmerSlug, variety, process, scaScore, notes] = r;
  const loc = locations.find((x) => x[0] === locationSlug)!;
  const farmer = farmers.find((x) => x[0] === farmerSlug)!;
  const slug = `cafe-${slugify(name)}`;
  const brewMethods = ['V60', 'AeroPress', 'Espresso', 'Chemex', 'French Press', 'Moka'];
  const bodies = ['Ligero', 'Medio', 'Completo'];
  const acidities = ['Alta', 'Media', 'Baja'];
  const roastLevels = ['Ligero', 'Medio-Ligero', 'Medio'];
  return {
    name,
    slug,
    sku: `12C-GR-${String(i + 1).padStart(3, '0')}`,
    category: 'CAFÉ',
    price: 285 + i * 12,
    costPrice: 125 + i * 5,
    stock: 36,
    weight: 250,
    origin: 'Mexico',
    region: `${loc[1]}, ${loc[2]}`,
    altitude: farmer[3],
    variety,
    process,
    scaScore,
    roastLevel: roastLevels[i % roastLevels.length],
    flavors: JSON.stringify(notes.split(', ')),
    producer: farmer[1],
    farmName: `Finca demo ${farmer[1]}`,
    harvestYear: 2026,
    certifications: '[]',
    body: bodies[i % bodies.length],
    acidity: acidities[i % acidities.length],
    processingDescription: `${process}; ficha de proceso demostrativa y trazable por lote.`,
    recommendedBrewMethod: brewMethods[i % brewMethods.length],
    brewTemperature: 92,
    brewRatio: '1:16',
    grindSize: 'Medio; ajustar al metodo',
    tastingNotes: notes,
    pairingSuggestions: 'Pan dulce, chocolate mexicano o fruta fresca.',
    farmerSlug,
    locationSlug,
    description: `Cafe de especialidad mexicano, exclusivamente café en grano; nunca se vende molido. ${DEMO}`,
    ...art(name),
  };
});

const accessoryNames = [
  'Molino Manual Bronce',
  'Molino Electrico Estudio',
  'Dripper Conico Ceramico',
  'Dripper Conico Cobre',
  'Prensa Francesa',
  'Cafetera de Inmersion',
  'Cafetera de Vertido 6 Tazas',
  'Moka 6 Tazas',
  'Bascula Barista',
  'Tetera Cuello Ganso',
  'Termometro Digital',
  'Servidor Cristal',
  'Jarra Lechera',
  'Tamper 58 mm',
  'Distribuidor Espresso',
  'Caja Knock Box',
  'Filtros Conicos 100',
  'Filtros Vertido 100',
  'Cepillo Molino',
  'Cuchara Cata',
  'Taza Cata',
  'Contenedor Hermetico',
];
const merchNames = [
  'Playera Doce Porciento',
  'Sudadera Tueste',
  'Gorra Origen',
  'Mandil Barista',
  'Tote Bag Cosecha',
  'Pin Grano Dorado',
  'Calcetines Cafe',
  'Termo Ruta',
];
const simpleProducts = (
  names: string[],
  category: string,
  prefix: string,
  start: number,
): ProductSeed[] =>
  names.map((name, i) => ({
    name,
    slug: `${prefix}-${slugify(name)}`,
    sku: `12C-${prefix.toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
    category,
    price: start + i * 35,
    costPrice: money((start + i * 35) * 0.48),
    stock: 40,
    description: `${name}, seleccion 12% Cafe. Materiales y uso detallados en empaque; producto demostrativo para catalogo.`,
    ...art(name),
  }));
const products = [
  ...coffees,
  ...simpleProducts(accessoryNames, 'ACCESORIOS', 'acc', 180),
  ...simpleProducts(merchNames, 'MERCH', 'merch', 220),
];
if (products.length !== 48 || coffees.length !== 18) throw new Error('Catalog invariant failed');

const bundleSeeds = [
  [
    'Inicio Vertido',
    10,
    [
      ['cafe-soconusco-cacao', 1],
      ['acc-dripper-conico-ceramico', 1],
      ['acc-filtros-conicos-100', 1],
    ],
  ],
  [
    'Prensa en Casa',
    12,
    [
      ['cafe-coatepec-clasico', 1],
      ['acc-prensa-francesa', 1],
      ['acc-bascula-barista', 1],
    ],
  ],
  [
    'Espresso Preciso',
    15,
    [
      ['cafe-coatepec-espresso', 2],
      ['acc-tamper-58-mm', 1],
      ['acc-distribuidor-espresso', 1],
    ],
  ],
  [
    'Exploracion del Sur',
    8,
    [
      ['cafe-altos-florales', 1],
      ['cafe-pluma-dulce', 1],
      ['cafe-mixe-niebla', 1],
    ],
  ],
  [
    'Barista Completo',
    14,
    [
      ['acc-tetera-cuello-ganso', 1],
      ['acc-bascula-barista', 1],
      ['acc-servidor-cristal', 1],
    ],
  ],
  [
    'Ruta 12%',
    10,
    [
      ['cafe-talpa-bosque', 1],
      ['merch-termo-ruta', 1],
      ['merch-tote-bag-cosecha', 1],
    ],
  ],
] as const;

const recipeSeeds = [
  ['V60 Brillante', 'V60', 'cafe-altos-florales'],
  ['Prensa Dulce', 'PRENSA', 'cafe-pluma-dulce'],
  ['Espresso Balanceado', 'ESPRESSO', 'cafe-coatepec-espresso'],
  ['Aeropress de Viaje', 'AEROPRESS', 'cafe-tepic-solar'],
  ['Chemex Floral', 'CHEMEX', 'cafe-soconusco-geisha-demo'],
  ['Moka Intensa', 'MOKA', 'cafe-atoyac-intenso'],
  ['Origami Honey', 'POUR_OVER', 'cafe-cuetzalan-honey'],
  ['Cold Brew Cacao', 'COLD_BREW', 'cafe-soconusco-cacao'],
] as const;
const achievements = [
  ['first_brew', 'Primer Brew', 'Registra tu primer brew', 'coffee', 'COMMON', 10],
  ['five_brews', 'Cinco Brews', 'Registra cinco brews', 'target', 'UNCOMMON', 25],
  ['ten_brews', 'Diez Brews', 'Registra diez brews', 'zap', 'UNCOMMON', 40],
  ['perfect_brew', 'Brew Perfecto', 'Califica un brew con 10/10', 'star', 'RARE', 50],
  ['v60_5', 'V60 Experto', 'Prepara cinco brews con V60', 'triangle', 'UNCOMMON', 30],
  [
    'aeropress_5',
    'AeroPress Experto',
    'Prepara cinco brews con AeroPress',
    'circle-plus',
    'UNCOMMON',
    30,
  ],
  ['espresso_5', 'Espresso Experto', 'Prepara cinco brews con espresso', 'coffee', 'UNCOMMON', 30],
  ['streak_3', 'Racha de 3', 'Prepara cafe tres dias consecutivos', 'flame', 'COMMON', 15],
  ['streak_7', 'Racha de 7', 'Prepara cafe siete dias consecutivos', 'flame', 'UNCOMMON', 30],
  [
    'coffee_connoisseur',
    'Cafe Connoisseur',
    'Registra cincuenta brews',
    'graduation-cap',
    'UNCOMMON',
    50,
  ],
  [
    'perfect_streak_30',
    'Racha Perfecta 30',
    'Prepara cafe treinta dias consecutivos',
    'flame',
    'RARE',
    75,
  ],
  [
    'method_collector',
    'Coleccionista de Metodos',
    'Domina tres metodos diferentes',
    'target',
    'UNCOMMON',
    40,
  ],
  ['master_taster', 'Maestro Catador', 'Mantiene promedio de ocho o mas', 'star', 'RARE', 60],
  ['early_bird', 'Madrugador', 'Registra cinco brews antes de las ocho', 'sunrise', 'UNCOMMON', 30],
  [
    'night_owl',
    'Buho Nocturno',
    'Registra cinco brews despues de las nueve',
    'moon',
    'UNCOMMON',
    30,
  ],
  [
    'weekend_warrior',
    'Guerrero del Fin de Semana',
    'Registra diez brews en fin de semana',
    'shield',
    'UNCOMMON',
    45,
  ],
] as const;
const titles = [
  ['v60_master', 'Maestro V60', 'Cinco brews con V60', 'triangle', 'v60_5'],
  [
    'aeropress_master',
    'Maestro AeroPress',
    'Cinco brews con AeroPress',
    'circle-plus',
    'aeropress_5',
  ],
  ['espresso_master', 'Maestro Espresso', 'Cinco brews con espresso', 'coffee', 'espresso_5'],
  ['early_riser', 'Madrugador', 'Cinco brews antes de las ocho', 'sunrise', 'early_bird'],
  ['night_owl_title', 'Buho Nocturno', 'Cinco brews despues de las nueve', 'moon', 'night_owl'],
  [
    'weekend_warrior_title',
    'Guerrero Fin de Semana',
    'Diez brews en fin de semana',
    'shield',
    'weekend_warrior',
  ],
  ['method_collector_title', 'Coleccionista', 'Domina tres metodos', 'target', 'method_collector'],
  [
    'coffee_connoisseur_title',
    'Connoisseur',
    'Cincuenta brews registrados',
    'graduation-cap',
    'coffee_connoisseur',
  ],
  ['perfect_streak_title', 'Imparable', 'Treinta dias seguidos', 'flame', 'perfect_streak_30'],
  ['brew_perfect_title', 'Perfeccionista', 'Un brew calificado 10/10', 'star', 'perfect_brew'],
] as const;
const rewards = [
  ['Descuento aprendiz', '5% en una compra', 'ticket', 100, 5, 1, null],
  ['Descuento barista', '10% en una compra', 'badge', 250, 10, 1, null],
  ['Envio recompensa', '15% equivalente para tu siguiente pedido', 'truck', 450, 15, 1, 100],
  ['Reserva maestra', '20% en una compra de cafe', 'award', 800, 20, 1, 50],
  ['Acceso a microlote', '25% para descubrir un microlote', 'gem', 1200, 25, 1, 25],
  ['Leyenda 12%', '30% en una compra especial', 'crown', 1800, 30, 1, 12],
] as const;
const promos = [
  ['BIENVENIDA12', 12, 'PERCENT', 500, new Date('2027-12-31T23:59:59Z')],
  ['CAFE2026', 10, 'PERCENT', 300, new Date('2026-12-31T23:59:59Z')],
  ['ENVIO120', 120, 'FIXED', 200, new Date('2027-06-30T23:59:59Z')],
] as const;

function validateCatalog() {
  const unique = (values: string[], label: string) => {
    if (new Set(values).size !== values.length) throw new Error(`Duplicate ${label}`);
  };
  unique(
    products.map((product) => product.slug),
    'product slug',
  );
  unique(
    products.map((product) => product.sku),
    'product SKU',
  );
  unique(
    locations.map(([slug]) => slug),
    'location slug',
  );
  unique(
    farmers.map(([slug]) => slug),
    'farmer slug',
  );
  unique(
    bundleSeeds.map(([name]) => name),
    'bundle name',
  );
  unique(
    recipeSeeds.map(([title]) => slugify(title)),
    'recipe slug',
  );
  unique(
    achievements.map(([slug]) => slug),
    'achievement slug',
  );
  unique(
    titles.map(([slug]) => slug),
    'title slug',
  );
  unique(
    promos.map(([code]) => code),
    'promo code',
  );

  const productSlugs = new Set(products.map((product) => product.slug));
  const locationSlugs = new Set(locations.map(([slug]) => slug));
  const farmerSlugs = new Set(farmers.map(([slug]) => slug));
  for (const coffee of coffees) {
    if (!coffee.description.toLowerCase().includes('café en grano'))
      throw new Error(`${coffee.slug} is not explicitly whole bean`);
    if (
      !coffee.locationSlug ||
      !locationSlugs.has(coffee.locationSlug as (typeof locations)[number][0])
    )
      throw new Error(`${coffee.slug} has invalid location`);
    if (!coffee.farmerSlug || !farmerSlugs.has(coffee.farmerSlug as (typeof farmers)[number][0]))
      throw new Error(`${coffee.slug} has invalid farmer`);
    if (coffee.certifications !== '[]')
      throw new Error(`${coffee.slug} declares unverified certifications`);
  }
  for (const [name, , items] of bundleSeeds) {
    for (const [slug, quantity] of items) {
      if (!productSlugs.has(slug)) throw new Error(`${name} references missing product ${slug}`);
      if (quantity < 1) throw new Error(`${name} has invalid quantity`);
    }
  }
  for (const [title, , productSlug] of recipeSeeds) {
    if (!productSlugs.has(productSlug))
      throw new Error(`${title} references missing product ${productSlug}`);
  }
  for (const product of products) {
    if (product.price <= 0 || product.costPrice < 0 || product.stock < 0)
      throw new Error(`${product.slug} has invalid commercial values`);
    if (!product.imageUrl.startsWith('data:image/svg+xml,'))
      throw new Error(`${product.slug} has invalid image`);
  }
  console.log(
    `Catalog valid: ${products.length} products, ${bundleSeeds.length} bundles, ${recipeSeeds.length} recipes`,
  );
}

type Totals = Record<string, { created: number; existing: number }>;
const totals: Totals = {};
const hit = (key: string, exists: boolean) => {
  totals[key] ??= { created: 0, existing: 0 };
  totals[key][exists ? 'existing' : 'created']++;
};

async function main() {
  validateCatalog();
  if (validateOnly) return;
  let hostname = 'unavailable';
  try {
    hostname = new URL(process.env.DATABASE_URL ?? '').hostname || 'unavailable';
  } catch {
    /* Never print malformed URL. */
  }
  console.log(`Mode: ${dryRun ? 'DRY RUN (zero writes)' : 'WRITE'}; database host: ${hostname}`);
  if (!dryRun && process.env.BOOTSTRAP_PRODUCTION_CONFIRM !== '12PORCIENTO_PRODUCTION')
    throw new Error('Set BOOTSTRAP_PRODUCTION_CONFIRM=12PORCIENTO_PRODUCTION for writes');
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminName = process.env.ADMIN_NAME?.trim();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!dryRun && (!adminEmail || !adminName || !adminPassword))
    throw new Error('ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD are required for writes');
  if (!dryRun && adminPassword!.length < 12)
    throw new Error('ADMIN_PASSWORD must contain at least 12 characters');

  const existingAdmin = adminEmail
    ? await prisma.adminUser.findUnique({ where: { email: adminEmail } })
    : null;
  hit('admins', Boolean(existingAdmin));
  if (!dryRun && !existingAdmin)
    await prisma.adminUser.create({
      data: {
        email: adminEmail!,
        name: adminName!,
        password: await bcrypt.hash(adminPassword!, 12),
      },
    });

  const locationMap = new Map<string, string>();
  for (const [slug, nombre, estado] of locations) {
    const found = await prisma.ubicacion.findUnique({ where: { slug } });
    hit('locations', Boolean(found));
    const row =
      found ??
      (!dryRun
        ? await prisma.ubicacion.create({ data: { slug, nombre, estado, pais: 'Mexico' } })
        : null);
    if (row) locationMap.set(slug, row.id);
  }
  const farmerMap = new Map<string, string>();
  for (const [slug, nombre, region, altitud, variedad] of farmers) {
    const found = await prisma.caficultor.findUnique({ where: { slug } });
    hit('farmers', Boolean(found));
    const row =
      found ??
      (!dryRun
        ? await prisma.caficultor.create({
            data: {
              slug,
              nombre,
              region,
              altitud,
              variedad,
              bio: `${DEMO} Perfil de productor para demostracion de compra directa.`,
              modalidad: 'DIRECTO',
              fairTrade: false,
            },
          })
        : null);
    if (row) farmerMap.set(slug, row.id);
  }

  const productMap = new Map<string, { id: string; price: number }>();
  for (const seed of products) {
    const found = await prisma.product.findUnique({ where: { slug: seed.slug } });
    hit('products', Boolean(found));
    const { farmerSlug, locationSlug: _locationSlug, ...data } = seed;
    const row =
      found ??
      (!dryRun
        ? await prisma.product.create({
            data: { ...data, caficultorId: farmerSlug ? farmerMap.get(farmerSlug) : undefined },
          })
        : null);
    if (row) productMap.set(seed.slug, { id: row.id, price: row.price });
  }

  for (let i = 0; i < coffees.length; i++) {
    const seed = coffees[i];
    const product = productMap.get(seed.slug);
    const batchNumber = `12C-2026-${String(i + 1).padStart(3, '0')}`;
    const lote = await prisma.lote.findUnique({ where: { batchNumber } });
    hit('lots', Boolean(lote));
    const createdLote =
      lote ??
      (!dryRun && product
        ? await prisma.lote.create({
            data: {
              productId: product.id,
              caficultorId: farmerMap.get(seed.farmerSlug!),
              ubicacionId: locationMap.get(seed.locationSlug!),
              batchNumber,
              quantity: 80,
              costPerKg: seed.costPrice * 4,
              unitCost: seed.costPrice,
              supplier: seed.producer,
              origin: seed.region,
              receivedAt: new Date(`2026-${String((i % 6) + 4).padStart(2, '0')}-15T12:00:00Z`),
              status: 'APROBADO',
              notes: DEMO,
              humedad: 10.5,
              defectos: 2,
              scoreAroma: 8.25,
              scoreSabor: 8.25,
              scoreAcidez: 8,
              scoreBody: 8,
              scoreFinal: seed.scaScore,
              evaluadoPor: 'Panel demo 12% Cafe',
              approvedAt: new Date('2026-06-20T12:00:00Z'),
              approvedBy: 'Bootstrap demo',
            },
          })
        : null);
    if (!product) {
      hit('versions', false);
      hit('pricing', false);
      for (let n = 0; n < 3; n++) hit('b2b tiers', false);
      for (let n = 0; n < 8; n++) hit('trace events', false);
      continue;
    }
    const version = await prisma.productVersion.findUnique({
      where: { productId_version: { productId: product.id, version: 1 } },
    });
    hit('versions', Boolean(version));
    if (!dryRun && !version && createdLote)
      await prisma.productVersion.create({
        data: {
          productId: product.id,
          version: 1,
          cosecha: '2026',
          caficultorId: farmerMap.get(seed.farmerSlug!),
          loteId: createdLote.id,
          scoreFinal: seed.scaScore,
          notasSabor: seed.tastingNotes,
        },
      });
    const pricing = await prisma.pricingConfig.findUnique({ where: { productId: product.id } });
    hit('pricing', Boolean(pricing));
    if (!dryRun && !pricing)
      await prisma.pricingConfig.create({
        data: {
          productId: product.id,
          roastingCostPerUnit: 28,
          packagingCostPerUnit: 18,
          overheadFixed: 15,
          marginRetailPct: 60,
          marginB2bPct: 32,
          minAlertMarginPct: 20,
        },
      });
    const tierCount = await prisma.b2BPriceTier.count({ where: { productId: product.id } });
    if (tierCount) {
      for (let n = 0; n < tierCount; n++) hit('b2b tiers', true);
    } else {
      for (const [minQty, maxQty, factor] of [
        [6, 11, 0.9],
        [12, 23, 0.84],
        [24, null, 0.78],
      ] as const) {
        hit('b2b tiers', false);
        if (!dryRun)
          await prisma.b2BPriceTier.create({
            data: {
              productId: product.id,
              minQty,
              maxQty,
              pricePerUnit: money(product.price * factor),
            },
          });
      }
    }
    const events = [
      ['HARVEST', 'Cosecha'],
      ['SORTING', 'Seleccion'],
      ['PROCESSING', 'Proceso'],
      ['DRYING', 'Secado'],
      ['CUPPING', 'Catacion'],
      ['PURCHASE', 'Compra directa'],
      ['ROASTING', 'Tueste'],
      ['PACKING', 'Empaque'],
    ] as const;
    for (let e = 0; e < events.length; e++) {
      const occurredAt = new Date(
        `2026-${String(e + 1).padStart(2, '0')}-${String((i % 20) + 1).padStart(2, '0')}T12:00:00Z`,
      );
      const where = {
        loteId_eventType_occurredAt: {
          loteId: createdLote?.id ?? lote?.id ?? '',
          eventType: events[e][0],
          occurredAt,
        },
      };
      const found =
        createdLote || lote ? await prisma.traceabilityEvent.findUnique({ where }) : null;
      hit('trace events', Boolean(found));
      if (!dryRun && !found && createdLote)
        await prisma.traceabilityEvent.create({
          data: {
            loteId: createdLote.id,
            eventType: events[e][0],
            title: events[e][1],
            description: DEMO,
            location: seed.region,
            occurredAt,
            source: '12% Cafe demo',
            isDemo: true,
            sortOrder: e + 1,
          },
        });
    }
  }

  for (const [name, discountPct, itemSeeds] of bundleSeeds) {
    const found = await prisma.bundle.findFirst({ where: { name } });
    hit('bundles', Boolean(found));
    if (!dryRun && !found) {
      const items: Array<{ product: { id: string; price: number }; quantity: number }> = [];
      for (const [slug, quantity] of itemSeeds) {
        const product = productMap.get(slug);
        if (product) items.push({ product, quantity });
      }
      if (items.length !== itemSeeds.length) throw new Error(`Missing bundle products: ${name}`);
      const basePrice = money(items.reduce((sum, x) => sum + x.product.price * x.quantity, 0));
      await prisma.bundle.create({
        data: {
          name,
          description: `Seleccion demo ${name} por 12% Cafe.`,
          basePrice,
          discountPct,
          finalPrice: money(basePrice * (1 - discountPct / 100)),
          imageUrl: svg(name),
          items: { create: items.map((x) => ({ productId: x.product.id, quantity: x.quantity })) },
        },
      });
    }
  }
  for (const [title, method, productSlug] of recipeSeeds) {
    const slug = `receta-${slugify(title)}`;
    const found = await prisma.recipe.findUnique({ where: { slug } });
    hit('recipes', Boolean(found));
    if (!dryRun && !found) {
      const product = productMap.get(productSlug);
      if (!product) throw new Error(`Missing recipe coffee: ${productSlug}`);
      await prisma.recipe.create({
        data: {
          title,
          slug,
          description: `Guia 12% Cafe para ${title.toLowerCase()}.`,
          method,
          difficulty: 'MEDIA',
          prepTime: method === 'COLD_BREW' ? 720 : 5,
          yield: '1 taza',
          temp: method === 'COLD_BREW' ? 'Ambiente' : '92 C',
          grind: 'Medio',
          ratio: '1:16',
          imageUrl: svg(title),
          isPublished: true,
          productId: product.id,
          steps: {
            create: [
              {
                order: 1,
                title: 'Preparar',
                description: 'Pesa cafe en grano y agua; muele justo antes de preparar.',
              },
              {
                order: 2,
                title: 'Extraer',
                description: 'Agrega agua de forma uniforme y controla tiempo.',
              },
              {
                order: 3,
                title: 'Servir',
                description: 'Mezcla, deja enfriar un minuto y evalua aroma y sabor.',
              },
            ],
          },
        },
      });
    }
  }
  for (const [slug, name, description, icon, rarity, xpReward] of achievements) {
    const found = await prisma.achievement.findUnique({ where: { slug } });
    hit('achievements', Boolean(found));
    if (!dryRun && !found)
      await prisma.achievement.create({
        data: { slug, name, description, icon, rarity, xpReward },
      });
  }
  for (const [slug, name, description, icon, requirement] of titles) {
    const found = await prisma.baristaTitle.findUnique({ where: { slug } });
    hit('titles', Boolean(found));
    if (!dryRun && !found)
      await prisma.baristaTitle.create({ data: { slug, name, description, icon, requirement } });
  }
  for (const [name, description, icon, xpCost, discountPct, maxUses, stock] of rewards) {
    const found = await prisma.reward.findFirst({ where: { name } });
    hit('rewards', Boolean(found));
    if (!dryRun && !found)
      await prisma.reward.create({
        data: { name, description, icon, xpCost, discountPct, maxUses, stock },
      });
  }
  for (const [code, discount, type, maxUses, expiresAt] of promos) {
    const found = await prisma.promoCode.findUnique({ where: { code } });
    hit('promo codes', Boolean(found));
    if (!dryRun && !found)
      await prisma.promoCode.create({ data: { code, discount, type, maxUses, expiresAt } });
  }

  console.table(
    Object.entries(totals).map(([entity, counts]) => ({
      entity,
      ...counts,
      total: counts.created + counts.existing,
    })),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
