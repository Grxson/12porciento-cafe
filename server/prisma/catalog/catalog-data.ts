export type CatalogProduct = {
  slug: string;
  name: string;
  category: 'CAFÉ' | 'ACCESORIOS' | 'MERCH';
  price: number;
  costPrice: number;
  stock: number;
  imageKey: string;
  description: string;
  originCountry?: 'México' | 'Colombia';
  state?: string;
  region?: string;
  producerSlug?: string;
  altitude?: number;
  variety?: string;
  process?: string;
  scaScore?: number;
  roastLevel?: string;
  flavors?: string[];
  body?: string;
  acidity?: string;
  recommendedBrewMethod?: string;
  brewTemperature?: number;
  brewRatio?: string;
  grindSize?: string;
  tastingNotes?: string;
  pairingSuggestions?: string;
  bundleOnly?: boolean;
  isLimited?: boolean;
  isB2BEnabled?: boolean;
};

export type CatalogBundle = {
  slug: string;
  name: string;
  description: string;
  discountPct: number;
  imageKey: string;
  items: Array<{ productSlug: string; quantity: number }>;
};

export type CatalogRecipe = {
  slug: string;
  title: string;
  method: string;
  description: string;
  difficulty: 'FÁCIL' | 'MEDIA' | 'DIFÍCIL';
  prepTime: number;
  yield: string;
  temp: string;
  grind: string;
  ratio: string;
  imageKey: string;
  productSlug: string;
  isPremium: boolean;
  steps: Array<{ title: string; description: string; duration: number }>;
  ingredients: Array<{ name: string; amount?: number; unit?: string; note?: string }>;
  equipment: string[];
};

const coffee = (product: Omit<CatalogProduct, 'category' | 'originCountry' | 'state'>) => ({
  ...product,
  category: 'CAFÉ' as const,
  originCountry: 'México' as const,
  state: 'Jalisco',
});

export const LOCATIONS = [
  { slug: 'jalisco-talpa-de-allende', nombre: 'Talpa de Allende', estado: 'Jalisco' },
  { slug: 'jalisco-san-sebastian-del-oeste', nombre: 'San Sebastián del Oeste', estado: 'Jalisco' },
  {
    slug: 'jalisco-cuautitlan-de-garcia-barragan',
    nombre: 'Cuautitlán de García Barragán',
    estado: 'Jalisco',
  },
  { slug: 'jalisco-zapotitlan-de-vadillo', nombre: 'Zapotitlán de Vadillo', estado: 'Jalisco' },
  { slug: 'jalisco-cabo-corrientes', nombre: 'Cabo Corrientes', estado: 'Jalisco' },
  { slug: 'jalisco-tuxpan', nombre: 'Tuxpan', estado: 'Jalisco' },
  { slug: 'colombia-huila', nombre: 'Huila', estado: 'Huila' },
] as const;

export const PRODUCERS = [
  {
    slug: 'colectivo-talpa',
    nombre: 'Colectivo Cafetalero de Talpa',
    region: 'Talpa de Allende',
    altitud: 1500,
    variedad: 'Typica, Bourbon',
  },
  {
    slug: 'colectivo-sierra-occidental',
    nombre: 'Colectivo Sierra Occidental',
    region: 'San Sebastián del Oeste',
    altitud: 1450,
    variedad: 'Bourbon, Caturra',
  },
  {
    slug: 'colectivo-costa-sur',
    nombre: 'Colectivo Costa Sur',
    region: 'Cuautitlán de García Barragán',
    altitud: 1250,
    variedad: 'Mundo Novo, Caturra',
  },
  {
    slug: 'colectivo-sur-jalisco',
    nombre: 'Colectivo Sur de Jalisco',
    region: 'Zapotitlán de Vadillo',
    altitud: 1350,
    variedad: 'Typica, Garnica',
  },
  {
    slug: 'colectivo-costa-jalisco',
    nombre: 'Colectivo Costa de Jalisco',
    region: 'Cabo Corrientes',
    altitud: 950,
    variedad: 'Caturra',
  },
  {
    slug: 'colectivo-tuxpan',
    nombre: 'Colectivo Cafetalero de Tuxpan',
    region: 'Tuxpan',
    altitud: 1200,
    variedad: 'Bourbon, Typica',
  },
  {
    slug: 'colectivo-huila',
    nombre: 'Colectivo Huila',
    region: 'Huila, Colombia',
    altitud: 1750,
    variedad: 'Caturra, Colombia',
  },
] as const;

export const PRODUCTS: CatalogProduct[] = [
  coffee({
    slug: 'talpa-cosecha',
    name: 'Talpa Cosecha',
    price: 270,
    costPrice: 132,
    stock: 60,
    imageKey: 'talpa-cosecha',
    description:
      'Café de Jalisco de perfil cotidiano, dulce y redondo. Tueste fresco para filtro o prensa.',
    region: 'Talpa de Allende',
    producerSlug: 'colectivo-talpa',
    altitude: 1500,
    variety: 'Typica, Bourbon',
    process: 'Lavado',
    scaScore: 85.5,
    roastLevel: 'Medio',
    flavors: ['Caramelo', 'Manzana roja', 'Cacao'],
    body: 'Medio',
    acidity: 'Media',
    recommendedBrewMethod: 'V60',
    brewTemperature: 92,
    brewRatio: '1:16',
    grindSize: 'Medio-fino',
    tastingNotes: 'Caramelo, manzana roja y cacao.',
    pairingSuggestions: 'Pan dulce, nuez pecana o chocolate con leche.',
    isB2BEnabled: true,
  }),
  coffee({
    slug: 'talpa-miel',
    name: 'Talpa Miel',
    price: 300,
    costPrice: 148,
    stock: 42,
    imageKey: 'talpa-miel',
    description: 'Lote honey de Talpa con dulzor de miel, fruta amarilla y final cremoso.',
    region: 'Talpa de Allende',
    producerSlug: 'colectivo-talpa',
    altitude: 1550,
    variety: 'Bourbon Amarillo',
    process: 'Honey',
    scaScore: 87,
    roastLevel: 'Medio-ligero',
    flavors: ['Miel', 'Durazno', 'Almendra'],
    body: 'Sedoso',
    acidity: 'Media-alta',
    recommendedBrewMethod: 'Origami',
    brewTemperature: 91,
    brewRatio: '1:16',
    grindSize: 'Medio-fino',
    tastingNotes: 'Miel de azahar, durazno y almendra.',
    pairingSuggestions: 'Yogur natural, croissant o queso fresco.',
    isLimited: true,
  }),
  coffee({
    slug: 'sierra-occidental-floral',
    name: 'Sierra Occidental Floral',
    price: 320,
    costPrice: 156,
    stock: 36,
    imageKey: 'sierra-occidental-floral',
    description: 'Café lavado de altura de la Sierra Occidental, de taza limpia y aromática.',
    region: 'San Sebastián del Oeste',
    producerSlug: 'colectivo-sierra-occidental',
    altitude: 1450,
    variety: 'Bourbon, Caturra',
    process: 'Lavado',
    scaScore: 86.5,
    roastLevel: 'Ligero',
    flavors: ['Flor blanca', 'Mandarina', 'Panela'],
    body: 'Ligero',
    acidity: 'Brillante',
    recommendedBrewMethod: 'Chemex',
    brewTemperature: 93,
    brewRatio: '1:17',
    grindSize: 'Medio',
    tastingNotes: 'Flor blanca, mandarina y panela.',
    pairingSuggestions: 'Fruta cítrica, pan de elote o chocolate blanco.',
  }),
  coffee({
    slug: 'san-sebastian-niebla',
    name: 'San Sebastián Niebla',
    price: 290,
    costPrice: 141,
    stock: 48,
    imageKey: 'san-sebastian-niebla',
    description:
      'Perfil balanceado de San Sebastián del Oeste, pensado para una taza larga y suave.',
    region: 'San Sebastián del Oeste',
    producerSlug: 'colectivo-sierra-occidental',
    altitude: 1400,
    variety: 'Caturra',
    process: 'Lavado',
    scaScore: 85.8,
    roastLevel: 'Medio',
    flavors: ['Avellana', 'Piloncillo', 'Ciruela'],
    body: 'Medio',
    acidity: 'Suave',
    recommendedBrewMethod: 'Prensa Francesa',
    brewTemperature: 94,
    brewRatio: '1:15',
    grindSize: 'Grueso',
    tastingNotes: 'Avellana, piloncillo y ciruela.',
    pairingSuggestions: 'Concha, mantequilla o dátil.',
    isB2BEnabled: true,
  }),
  coffee({
    slug: 'cuautitlan-cacao',
    name: 'Cuautitlán Cacao',
    price: 280,
    costPrice: 136,
    stock: 54,
    imageKey: 'cuautitlan-cacao',
    description: 'Tueste medio con cuerpo envolvente, ideal para espresso y bebidas con leche.',
    region: 'Cuautitlán de García Barragán',
    producerSlug: 'colectivo-costa-sur',
    altitude: 1250,
    variety: 'Mundo Novo, Caturra',
    process: 'Natural',
    scaScore: 85.2,
    roastLevel: 'Medio-oscuro',
    flavors: ['Cacao', 'Cereza', 'Nuez'],
    body: 'Completo',
    acidity: 'Baja',
    recommendedBrewMethod: 'Espresso',
    brewTemperature: 93,
    brewRatio: '1:2',
    grindSize: 'Fino',
    tastingNotes: 'Cacao oscuro, cereza madura y nuez.',
    pairingSuggestions: 'Leche, brownie o queso semicurado.',
    isB2BEnabled: true,
  }),
  coffee({
    slug: 'zapotitlan-citrico',
    name: 'Zapotitlán Cítrico',
    price: 310,
    costPrice: 151,
    stock: 38,
    imageKey: 'zapotitlan-citrico',
    description: 'Lote lavado de Jalisco con acidez jugosa y final largo para preparar en V60.',
    region: 'Zapotitlán de Vadillo',
    producerSlug: 'colectivo-sur-jalisco',
    altitude: 1350,
    variety: 'Typica, Garnica',
    process: 'Lavado',
    scaScore: 86.8,
    roastLevel: 'Ligero',
    flavors: ['Toronja', 'Miel', 'Té negro'],
    body: 'Ligero',
    acidity: 'Alta',
    recommendedBrewMethod: 'V60',
    brewTemperature: 92,
    brewRatio: '1:16',
    grindSize: 'Medio-fino',
    tastingNotes: 'Toronja, miel y té negro.',
    pairingSuggestions: 'Mandarina, financier o chocolate blanco.',
  }),
  coffee({
    slug: 'cabo-corrientes-natural',
    name: 'Cabo Corrientes Natural',
    price: 305,
    costPrice: 149,
    stock: 30,
    imageKey: 'cabo-corrientes-natural',
    description: 'Proceso natural de la costa de Jalisco, dulce, frutal y expresivo en inmersión.',
    region: 'Cabo Corrientes',
    producerSlug: 'colectivo-costa-jalisco',
    altitude: 950,
    variety: 'Caturra',
    process: 'Natural',
    scaScore: 86.2,
    roastLevel: 'Medio-ligero',
    flavors: ['Fresa', 'Cacao', 'Canela'],
    body: 'Cremoso',
    acidity: 'Media',
    recommendedBrewMethod: 'AeroPress',
    brewTemperature: 90,
    brewRatio: '1:14',
    grindSize: 'Medio',
    tastingNotes: 'Fresa madura, cacao y canela.',
    pairingSuggestions: 'Granola, chocolate oscuro o queso de cabra.',
    isLimited: true,
  }),
  coffee({
    slug: 'tuxpan-espresso',
    name: 'Tuxpan Espresso',
    price: 285,
    costPrice: 138,
    stock: 56,
    imageKey: 'tuxpan-espresso',
    description: 'Perfil clásico para espresso: dulce, denso y consistente en máquinas domésticas.',
    region: 'Tuxpan',
    producerSlug: 'colectivo-tuxpan',
    altitude: 1200,
    variety: 'Bourbon, Typica',
    process: 'Lavado',
    scaScore: 85.4,
    roastLevel: 'Medio-oscuro',
    flavors: ['Caramelo', 'Chocolate', 'Naranja'],
    body: 'Completo',
    acidity: 'Media-baja',
    recommendedBrewMethod: 'Espresso',
    brewTemperature: 93,
    brewRatio: '1:2',
    grindSize: 'Fino',
    tastingNotes: 'Caramelo, chocolate y naranja.',
    pairingSuggestions: 'Leche, pan de chocolate o avellana.',
    isB2BEnabled: true,
  }),
  {
    slug: 'cafe-colombia-huila-reserva',
    name: 'Colombia Huila Reserva',
    category: 'CAFÉ',
    price: 360,
    costPrice: 178,
    stock: 20,
    imageKey: 'colombia-huila-reserva',
    description:
      'Excepción de origen: café de Huila, Colombia, disponible exclusivamente dentro del paquete Colombia–Jalisco.',
    originCountry: 'Colombia',
    region: 'Huila',
    producerSlug: 'colectivo-huila',
    altitude: 1750,
    variety: 'Caturra, Colombia',
    process: 'Lavado',
    scaScore: 87.5,
    roastLevel: 'Ligero',
    flavors: ['Panela', 'Frutos rojos', 'Cítrico'],
    body: 'Sedoso',
    acidity: 'Media-alta',
    recommendedBrewMethod: 'V60',
    brewTemperature: 92,
    brewRatio: '1:16',
    grindSize: 'Medio-fino',
    tastingNotes: 'Panela, frutos rojos y cítrico.',
    pairingSuggestions: 'Fruta fresca, pan de mantequilla o chocolate blanco.',
    bundleOnly: true,
    isLimited: true,
  },
  {
    slug: 'accesorio-v60-ceramica',
    name: 'Dripper V60 Cerámica',
    category: 'ACCESORIOS',
    price: 320,
    costPrice: 162,
    stock: 28,
    imageKey: 'v60-ceramica',
    description: 'Dripper cónico de cerámica para preparaciones de una a dos tazas.',
  },
  {
    slug: 'accesorio-filtros-v60-100',
    name: 'Filtros V60 100',
    category: 'ACCESORIOS',
    price: 155,
    costPrice: 62,
    stock: 80,
    imageKey: 'filtros-v60-100',
    description: 'Filtros de papel para dripper cónico, paquete de 100 piezas.',
  },
  {
    slug: 'accesorio-prensa-600',
    name: 'Prensa Francesa 600 ml',
    category: 'ACCESORIOS',
    price: 440,
    costPrice: 220,
    stock: 26,
    imageKey: 'prensa-600',
    description: 'Prensa francesa de 600 ml para café de inmersión y servicio compartido.',
  },
  {
    slug: 'accesorio-molino-manual',
    name: 'Molino Manual Barista',
    category: 'ACCESORIOS',
    price: 890,
    costPrice: 445,
    stock: 18,
    imageKey: 'molino-manual',
    description: 'Molino manual de muelas para molienda consistente en métodos filtrados.',
  },
  {
    slug: 'accesorio-bascula-barista',
    name: 'Báscula Barista',
    category: 'ACCESORIOS',
    price: 560,
    costPrice: 280,
    stock: 24,
    imageKey: 'bascula-barista',
    description: 'Báscula con temporizador para dosis y extracción reproducibles.',
  },
  {
    slug: 'accesorio-kettle-cuello-ganso',
    name: 'Kettle Cuello de Ganso',
    category: 'ACCESORIOS',
    price: 980,
    costPrice: 490,
    stock: 16,
    imageKey: 'kettle-cuello-ganso',
    description: 'Kettle de vertido controlado para preparar V60, Origami y Chemex.',
  },
  {
    slug: 'merch-taza-talpa',
    name: 'Taza Talpa 12 oz',
    category: 'MERCH',
    price: 240,
    costPrice: 110,
    stock: 45,
    imageKey: 'taza-talpa',
    description: 'Taza de cerámica de 12 oz para café filtrado o bebidas con leche.',
  },
  {
    slug: 'merch-tote-ruta-12',
    name: 'Tote Ruta 12%',
    category: 'MERCH',
    price: 220,
    costPrice: 92,
    stock: 36,
    imageKey: 'tote-ruta-12',
    description: 'Bolsa de tela para llevar café, filtros y herramientas de preparación.',
  },
];

export const BUNDLES: CatalogBundle[] = [
  {
    slug: 'inicio-v60-jalisco',
    name: 'Inicio V60 Jalisco',
    description: 'Todo lo necesario para descubrir el vertido con café de Talpa.',
    discountPct: 12,
    imageKey: 'inicio-v60-jalisco',
    items: [
      { productSlug: 'talpa-cosecha', quantity: 1 },
      { productSlug: 'accesorio-v60-ceramica', quantity: 1 },
      { productSlug: 'accesorio-filtros-v60-100', quantity: 1 },
    ],
  },
  {
    slug: 'prensa-en-casa-jalisco',
    name: 'Prensa en Casa Jalisco',
    description: 'Café de San Sebastián, prensa francesa y báscula para una taza redonda.',
    discountPct: 10,
    imageKey: 'prensa-en-casa-jalisco',
    items: [
      { productSlug: 'san-sebastian-niebla', quantity: 1 },
      { productSlug: 'accesorio-prensa-600', quantity: 1 },
      { productSlug: 'accesorio-bascula-barista', quantity: 1 },
    ],
  },
  {
    slug: 'espresso-jalisco',
    name: 'Espresso Jalisco',
    description: 'Kit para espresso doméstico con el perfil intenso de Tuxpan.',
    discountPct: 8,
    imageKey: 'espresso-jalisco',
    items: [
      { productSlug: 'tuxpan-espresso', quantity: 2 },
      { productSlug: 'accesorio-molino-manual', quantity: 1 },
      { productSlug: 'merch-taza-talpa', quantity: 2 },
    ],
  },
  {
    slug: 'explora-jalisco',
    name: 'Explora Jalisco',
    description:
      'Cuatro perfiles de Jalisco para recorrer la Sierra Occidental, Costa Sur y sur del estado.',
    discountPct: 10,
    imageKey: 'explora-jalisco',
    items: [
      { productSlug: 'talpa-miel', quantity: 1 },
      { productSlug: 'sierra-occidental-floral', quantity: 1 },
      { productSlug: 'cuautitlan-cacao', quantity: 1 },
      { productSlug: 'zapotitlan-citrico', quantity: 1 },
    ],
  },
  {
    slug: 'barista-jalisco',
    name: 'Barista Jalisco',
    description: 'Herramientas de precisión para café filtrado de Jalisco.',
    discountPct: 12,
    imageKey: 'barista-jalisco',
    items: [
      { productSlug: 'accesorio-molino-manual', quantity: 1 },
      { productSlug: 'accesorio-kettle-cuello-ganso', quantity: 1 },
      { productSlug: 'accesorio-bascula-barista', quantity: 1 },
      { productSlug: 'cabo-corrientes-natural', quantity: 1 },
    ],
  },
  {
    slug: 'ruta-colombia-jalisco',
    name: 'Ruta Colombia–Jalisco',
    description: 'Paquete especial de comparación: un café de Talpa y un café de Huila, Colombia.',
    discountPct: 10,
    imageKey: 'ruta-colombia-jalisco',
    items: [
      { productSlug: 'talpa-cosecha', quantity: 1 },
      { productSlug: 'cafe-colombia-huila-reserva', quantity: 1 },
    ],
  },
];

const recipe = (
  data: Omit<CatalogRecipe, 'steps'> & { steps: CatalogRecipe['steps'] },
): CatalogRecipe => data;

export const RECIPES: CatalogRecipe[] = [
  recipe({
    slug: 'v60-talpa-cosecha',
    title: 'V60: Talpa Cosecha',
    method: 'V60',
    description: 'Una receta clara y dulce para expresar el caramelo y cacao de Talpa.',
    difficulty: 'MEDIA',
    prepTime: 4,
    yield: '1 taza · 240 g',
    temp: '92 °C',
    grind: 'Medio-fino',
    ratio: '1:16',
    imageKey: 'v60-talpa',
    productSlug: 'talpa-cosecha',
    isPremium: false,
    ingredients: [
      { name: 'Talpa Cosecha', amount: 15, unit: 'g' },
      { name: 'Agua filtrada', amount: 240, unit: 'ml', note: 'a 92 °C' },
      { name: 'Filtro cónico V60' },
    ],
    equipment: ['Dripper V60', 'Báscula', 'Kettle cuello de ganso', 'Servidor'],
    steps: [
      {
        title: 'Enjuaga el filtro',
        description:
          'Coloca el filtro, enjuágalo con agua caliente y desecha el agua del servidor.',
        duration: 30,
      },
      {
        title: 'Muele y florece',
        description: 'Agrega 15 g de café, vierte 45 g de agua y espera 30 segundos.',
        duration: 45,
      },
      {
        title: 'Vierte en pulsos',
        description: 'Completa hasta 240 g con vertidos suaves y circulares.',
        duration: 120,
      },
      {
        title: 'Sirve y evalúa',
        description: 'Cuando termine el goteo, gira el servidor y prueba al enfriar.',
        duration: 45,
      },
    ],
  }),
  recipe({
    slug: 'prensa-san-sebastian',
    title: 'Prensa: San Sebastián Niebla',
    method: 'PRENSA',
    description: 'Receta de inmersión para cuerpo redondo, avellana y piloncillo.',
    difficulty: 'FÁCIL',
    prepTime: 5,
    yield: '2 tazas · 500 ml',
    temp: '94 °C',
    grind: 'Grueso',
    ratio: '1:15',
    imageKey: 'prensa-san-sebastian',
    productSlug: 'san-sebastian-niebla',
    isPremium: false,
    ingredients: [
      { name: 'San Sebastián Niebla', amount: 33, unit: 'g' },
      { name: 'Agua filtrada', amount: 500, unit: 'ml', note: 'a 94 °C' },
    ],
    equipment: ['Prensa francesa 600 ml', 'Báscula', 'Temporizador', 'Cuchara'],
    steps: [
      {
        title: 'Precalienta',
        description: 'Calienta la prensa y desecha el agua antes de añadir el café.',
        duration: 30,
      },
      {
        title: 'Infusiona',
        description: 'Agrega café y agua, remueve suavemente y coloca la tapa.',
        duration: 240,
      },
      {
        title: 'Rompe la costra',
        description: 'Retira la espuma superficial con una cuchara y vuelve a tapar.',
        duration: 30,
      },
      {
        title: 'Presiona y sirve',
        description: 'Baja el émbolo lentamente y sirve de inmediato.',
        duration: 30,
      },
    ],
  }),
  recipe({
    slug: 'espresso-tuxpan',
    title: 'Espresso: Tuxpan',
    method: 'ESPRESSO',
    description: 'Extracción corta y dulce para resaltar chocolate, caramelo y naranja.',
    difficulty: 'MEDIA',
    prepTime: 3,
    yield: '1 espresso · 36 g',
    temp: '93 °C',
    grind: 'Fino',
    ratio: '1:2',
    imageKey: 'espresso-tuxpan',
    productSlug: 'tuxpan-espresso',
    isPremium: false,
    ingredients: [
      { name: 'Tuxpan Espresso', amount: 18, unit: 'g' },
      { name: 'Agua filtrada', amount: 36, unit: 'g' },
    ],
    equipment: ['Máquina de espresso', 'Molino', 'Báscula', 'Tamper'],
    steps: [
      {
        title: 'Prepara el portafiltro',
        description: 'Muele 18 g de café, distribuye y tampea de forma nivelada.',
        duration: 45,
      },
      {
        title: 'Extrae',
        description: 'Inicia la extracción y busca 36 g de bebida en 28 a 32 segundos.',
        duration: 35,
      },
      {
        title: 'Ajusta y sirve',
        description: 'Prueba; ajusta molienda si el tiempo sale del rango.',
        duration: 30,
      },
    ],
  }),
  recipe({
    slug: 'aeropress-cabo-corrientes',
    title: 'AeroPress: Cabo Corrientes',
    method: 'AEROPRESS',
    description: 'Método de viaje para el perfil frutal y dulce del natural de Cabo Corrientes.',
    difficulty: 'MEDIA',
    prepTime: 4,
    yield: '1 taza · 220 ml',
    temp: '90 °C',
    grind: 'Medio',
    ratio: '1:14',
    imageKey: 'aeropress-cabo-corrientes',
    productSlug: 'cabo-corrientes-natural',
    isPremium: true,
    ingredients: [
      { name: 'Cabo Corrientes Natural', amount: 16, unit: 'g' },
      { name: 'Agua filtrada', amount: 220, unit: 'ml', note: 'a 90 °C' },
      { name: 'Filtro AeroPress' },
    ],
    equipment: ['AeroPress', 'Báscula', 'Molinillo', 'Kettle'],
    steps: [
      {
        title: 'Monta y enjuaga',
        description: 'Coloca y enjuaga el filtro; agrega el café al cilindro.',
        duration: 30,
      },
      {
        title: 'Añade agua',
        description: 'Vierte 220 ml de agua y remueve durante 10 segundos.',
        duration: 30,
      },
      {
        title: 'Infusiona',
        description: 'Coloca la tapa y espera hasta 1 minuto 30 segundos.',
        duration: 60,
      },
      {
        title: 'Presiona',
        description: 'Invierte sobre la taza y presiona con suavidad durante 30 segundos.',
        duration: 45,
      },
    ],
  }),
  recipe({
    slug: 'chemex-sierra-occidental',
    title: 'Chemex: Sierra Occidental',
    method: 'CHEMEX',
    description: 'Preparación limpia para las notas florales y cítricas de la Sierra Occidental.',
    difficulty: 'DIFÍCIL',
    prepTime: 6,
    yield: '2 tazas · 500 ml',
    temp: '93 °C',
    grind: 'Medio',
    ratio: '1:16',
    imageKey: 'chemex-sierra-occidental',
    productSlug: 'sierra-occidental-floral',
    isPremium: true,
    ingredients: [
      { name: 'Sierra Occidental Floral', amount: 31, unit: 'g' },
      { name: 'Agua filtrada', amount: 500, unit: 'ml', note: 'a 93 °C' },
      { name: 'Filtro Chemex' },
    ],
    equipment: ['Chemex', 'Báscula', 'Kettle cuello de ganso', 'Molinillo'],
    steps: [
      {
        title: 'Enjuaga el filtro',
        description: 'Coloca el filtro con la capa gruesa hacia el pico y enjuaga.',
        duration: 45,
      },
      { title: 'Florece', description: 'Agrega 60 g de agua y espera 45 segundos.', duration: 60 },
      {
        title: 'Vierte en tres pulsos',
        description: 'Completa hasta 500 g manteniendo el nivel de agua estable.',
        duration: 210,
      },
      {
        title: 'Sirve',
        description: 'Retira el filtro al terminar y gira la Chemex antes de servir.',
        duration: 45,
      },
    ],
  }),
];

export const ACHIEVEMENTS = [
  {
    slug: 'first_brew',
    name: 'Primer Brew',
    description: 'Registra tu primer café preparado.',
    icon: '☕',
    rarity: 'COMMON',
    xpReward: 10,
  },
  {
    slug: 'five_brews',
    name: 'Cinco Brews',
    description: 'Registra cinco cafés preparados.',
    icon: '🎯',
    rarity: 'COMMON',
    xpReward: 25,
  },
  {
    slug: 'v60_5',
    name: 'V60 Experto',
    description: 'Prepara cinco recetas V60.',
    icon: '🔺',
    rarity: 'RARE',
    xpReward: 30,
  },
  {
    slug: 'aeropress_5',
    name: 'AeroPress Experto',
    description: 'Prepara cinco recetas con AeroPress.',
    icon: '➕',
    rarity: 'RARE',
    xpReward: 30,
  },
  {
    slug: 'perfect_brew',
    name: 'Brew Perfecto',
    description: 'Califica un brew con 10 de 10.',
    icon: '⭐',
    rarity: 'EPIC',
    xpReward: 50,
  },
  {
    slug: 'jalisco_explorer',
    name: 'Explorador de Jalisco',
    description: 'Prepara café de cuatro regiones de Jalisco.',
    icon: '🗺️',
    rarity: 'EPIC',
    xpReward: 60,
  },
  {
    slug: 'perfect_streak_30',
    name: 'Racha Perfecta',
    description: 'Registra actividad durante 30 días consecutivos.',
    icon: '🔥',
    rarity: 'LEGENDARY',
    xpReward: 100,
  },
] as const;

export const TITLES = [
  {
    slug: 'v60_master',
    name: 'Maestro V60',
    description: 'Cinco brews con V60.',
    icon: '🔺',
    requirement: 'v60_5',
  },
  {
    slug: 'aeropress_master',
    name: 'Maestro AeroPress',
    description: 'Cinco brews con AeroPress.',
    icon: '➕',
    requirement: 'aeropress_5',
  },
  {
    slug: 'jalisco_explorer_title',
    name: 'Explorador de Jalisco',
    description: 'Recorre cuatro regiones cafeteras de Jalisco.',
    icon: '🗺️',
    requirement: 'jalisco_explorer',
  },
  {
    slug: 'perfect_streak_title',
    name: 'Imparable',
    description: 'Mantén una racha de 30 días.',
    icon: '🔥',
    requirement: 'perfect_streak_30',
  },
] as const;

export const REWARDS = [
  {
    name: 'Envío Ruta 12%',
    description: 'Envío sin costo en tu siguiente pedido.',
    icon: '🚚',
    xpCost: 120,
    discountPct: 0,
    maxUses: 1,
    stock: null,
  },
  {
    name: '10% Café Jalisco',
    description: 'Descuento para café de especialidad de Jalisco.',
    icon: '☕',
    xpCost: 180,
    discountPct: 10,
    maxUses: 1,
    stock: null,
  },
  {
    name: '15% Explorador',
    description: 'Descuento para explorar nuevos perfiles del catálogo.',
    icon: '🗺️',
    xpCost: 300,
    discountPct: 15,
    maxUses: 1,
    stock: 100,
  },
] as const;
