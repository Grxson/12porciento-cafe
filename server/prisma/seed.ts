import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Unsplash URL builder (consistent sizing/quality across the gallery).
const u = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;

// Reusable coffee gallery shots: roasted beans, pour-over, brewed cup, scoop, bag, latte.
const BEANS_CLOSE = u('1559056199-641a0ac8b55e');
const POUR_OVER   = u('1463797221720-6b07e6426c24');
const CUP_TOP     = u('1461023058943-07fcbe16d735');
const BEANS_SCOOP = u('1514432324607-a09d9b4aefdd');
const COFFEE_BAG  = u('1610889556528-9a770e32642f');
const LATTE_ART   = u('1510707577719-ae7c14805e3a');
const ESPRESSO    = u('1497935586351-b67a49e012bf');
const BEANS_HAND  = u('1442512595331-e89e73853f31');

const products = [
  {
    name: 'Coatepec Lavado',
    slug: 'coatepec-lavado',
    category: 'CAFÉ',
    origin: 'México',
    region: 'Coatepec, Veracruz',
    altitude: 1400,
    variety: 'Typica, Bourbon',
    process: 'Lavado',
    scaScore: 86.0,
    roastLevel: 'Medio-Ligero',
    flavors: JSON.stringify(['Chocolate amargo', 'Durazno', 'Miel de abeja', 'Frambuesa']),
    price: 280,
    weight: 250,
    stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1610889556528-9a770e32642f?auto=format&fit=crop&w=800&q=80',
    images: JSON.stringify([POUR_OVER, BEANS_CLOSE, CUP_TOP, BEANS_SCOOP]),
    description: 'Lote de origen único proveniente de las faldas del Cofre de Perote. Perfil dulce y balanceado ideal para consumo diario. Producido por la familia Méndez en su tercera generación cafetalera.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Huatusco Natural',
    slug: 'huatusco-natural',
    category: 'CAFÉ',
    origin: 'México',
    region: 'Huatusco, Veracruz',
    altitude: 1200,
    variety: 'Caturra',
    process: 'Natural',
    scaScore: 84.5,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Frutos rojos', 'Caramelo', 'Cacao', 'Canela']),
    price: 260,
    weight: 250,
    stock: 35,
    imageUrl: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=800&q=80',
    images: JSON.stringify([BEANS_CLOSE, COFFEE_BAG, LATTE_ART, POUR_OVER]),
    description: 'Proceso natural que resalta la dulzura frutal del grano. Notas intensas a frutos rojos con un finish a cacao oscuro. Perfecto para método de filtro.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Jaltenango Honey',
    slug: 'jaltenango-honey',
    category: 'CAFÉ',
    origin: 'México',
    region: 'Jaltenango, Chiapas',
    altitude: 1600,
    variety: 'Bourbon Amarillo',
    process: 'Honey',
    scaScore: 87.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Mango', 'Maracuyá', 'Miel', 'Flor de azahar']),
    price: 320,
    weight: 250,
    stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
    images: JSON.stringify([BEANS_HAND, CUP_TOP, BEANS_SCOOP, ESPRESSO]),
    description: 'Proceso honey que preserva la mucilago del grano, otorgando dulzura tropical y cuerpo cremoso. Uno de nuestros lotes más complejos del año.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Tapachula Geisha',
    slug: 'tapachula-geisha',
    category: 'CAFÉ',
    origin: 'México',
    region: 'Tapachula, Chiapas',
    altitude: 1800,
    variety: 'Geisha',
    process: 'Lavado',
    scaScore: 89.5,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Jazmín', 'Bergamota', 'Melocotón blanco', 'Té negro']),
    price: 680,
    weight: 100,
    stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80',
    images: JSON.stringify([BEANS_CLOSE, POUR_OVER, LATTE_ART, CUP_TOP]),
    description: 'Microlote de variedad Geisha cultivada a 1800 metros. Perfil floral excepcional con acidez cítrica brillante. Edición limitada de temporada — solo 10 bolsas disponibles.',
    isLimited: true,
    isActive: true,
  },
  {
    name: 'Pink Bourbon Anaeróbico',
    slug: 'pink-bourbon-anaerobico',
    category: 'CAFÉ',
    origin: 'México',
    region: 'Soconusco, Chiapas',
    altitude: 1750,
    variety: 'Pink Bourbon',
    process: 'Anaeróbico Natural',
    scaScore: 88.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Fresa', 'Ron', 'Hibisco', 'Mora azul']),
    price: 540,
    weight: 150,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1580933073521-dc49ac0d4e6a?auto=format&fit=crop&w=800&q=80',
    images: JSON.stringify([BEANS_HAND, BEANS_SCOOP, POUR_OVER, CUP_TOP]),
    description: 'Proceso experimental anaeróbico de 72 horas en tanques sellados. Perfil intensamente frutal con notas a fermentación controlada. Para el explorador de sabores.',
    isLimited: true,
    isActive: true,
  },
  {
    name: 'Blend 12%',
    slug: 'blend-12',
    category: 'CAFÉ',
    origin: 'México',
    region: 'Veracruz / Chiapas',
    altitude: 1300,
    variety: 'Typica, Caturra, Bourbon',
    process: 'Lavado / Natural',
    scaScore: 84.0,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Chocolate con leche', 'Almendra', 'Panela', 'Vainilla']),
    price: 240,
    weight: 250,
    stock: 80,
    imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=800&q=80',
    images: JSON.stringify([BEANS_CLOSE, CUP_TOP, ESPRESSO, COFFEE_BAG]),
    description: 'Nuestro blend emblema. Selección curada de los mejores lotes del año para ofrecer un perfil balanceado, consistente y accesible. Perfecto para espresso y métodos de filtro.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Comandante Grinder',
    slug: 'comandante-grinder',
    category: 'ACCESORIOS',
    price: 95,
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1530968033775-2c92736b131e?auto=format&fit=crop&w=800&q=80',
    images: JSON.stringify([BEANS_SCOOP, BEANS_CLOSE]),
    description: 'Molino de mano manual con ajuste infinito. Diseño compacto, perfecto para viajes. Utilizado por campeones de cupping.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'V60 Chemex Set',
    slug: 'v60-chemex-set',
    category: 'ACCESORIOS',
    price: 85,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?auto=format&fit=crop&w=800&q=80',
    images: JSON.stringify([POUR_OVER, CUP_TOP]),
    description: 'Kit completo con drippers V60 y Chemex 3-cup. Incluye filtros de papel. Inicio perfecto en métodos de filtro.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Filtros Japoneses (100 unidades)',
    slug: 'filtros-japoneses',
    category: 'ACCESORIOS',
    price: 45,
    stock: 40,
    imageUrl: 'https://images.unsplash.com/photo-1521302080334-4bebac2763a6?auto=format&fit=crop&w=800&q=80',
    images: JSON.stringify([POUR_OVER, LATTE_ART]),
    description: 'Paquete de 100 filtros de papel premium. Compatibles con V60, Kalita, Melitta. Mejora la claridad del café.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Taza Café 12% - Cerámica',
    slug: 'taza-ceramic-12',
    category: 'MERCH',
    price: 25,
    stock: 60,
    imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=800&q=80',
    images: JSON.stringify([CUP_TOP, ESPRESSO]),
    description: 'Taza de cerámica con diseño de Café 12%. 12oz, apta para lavar en lavavajillas. Edición limitada.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Hoodie Café 12% - Logo Minimalista',
    slug: 'hoodie-cafe-12',
    category: 'MERCH',
    price: 55,
    stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80',
    images: JSON.stringify([u('1620799140408-edc6dcb6d633')]),
    description: 'Sudadera con capucha 100% algodón. Logo minimalista de Café 12% impreso. Unisex, tallas S-XL.',
    isLimited: false,
    isActive: true,
  },
];

// ─── Recipes ──────────────────────────────────────────────────────────────────
const recipes: Array<{
  slug: string;
  title: string;
  description: string;
  method: string;
  difficulty: 'FÁCIL' | 'MEDIA' | 'DIFÍCIL';
  prepTime: number;
  yield: string;
  temp?: string;
  grind?: string;
  ratio?: string;
  isPremium: boolean;
  isPublished: boolean;
  productSlug?: string;
  steps: Array<{ order: number; title: string; description: string; duration?: number }>;
}> = [
  // ── POUR OVER / V60 ───────────────────────────────────────────────────────
  {
    slug: 'v60-clasico',
    title: 'V60 Clásico',
    description: 'La base de todo barista: extracción limpia y brillante que resalta la acidez y dulzura del café de especialidad.',
    method: 'V60',
    difficulty: 'MEDIA',
    prepTime: 5,
    yield: '250 ml',
    temp: '93°C',
    grind: 'Medio-fino',
    ratio: '1:15 (15g / 225ml)',
    isPremium: false,
    isPublished: true,
    productSlug: 'coatepec-lavado',
    steps: [
      { order: 1, title: 'Pesa y muele', description: 'Pesa 15g de café y muele a punto medio-fino, similar a azúcar morena.', duration: 30 },
      { order: 2, title: 'Pre-infusión', description: 'Vierte 30ml de agua a 93°C en movimientos circulares. Espera 30 segundos para que el café libere CO₂ (bloom).', duration: 30 },
      { order: 3, title: 'Primera vertida', description: 'Vierte lentamente hasta 150ml en espiral hacia adentro, sin mojar el filtro. Tarda ~45 segundos.', duration: 45 },
      { order: 4, title: 'Segunda vertida', description: 'Cuando el nivel baje a la mitad, vierte hasta completar 225ml. Mantén movimientos circulares suaves.', duration: 40 },
      { order: 5, title: 'Extracción final', description: 'Espera que drene completamente. Total de 3:00–3:30 min desde la primera vertida. Sirve inmediatamente.' },
    ],
  },
  {
    slug: 'v60-4-6-method',
    title: 'Método 4:6 de Tetsu Kasuya',
    description: 'Técnica ganadora del Campeonato Mundial de Brewer\'s Cup 2016. Controlas acidez y dulzura con las primeras dos vertidas.',
    method: 'V60',
    difficulty: 'DIFÍCIL',
    prepTime: 5,
    yield: '300 ml',
    temp: '92°C',
    grind: 'Grueso-medio',
    ratio: '1:15 (20g / 300ml)',
    isPremium: true,
    isPublished: true,
    productSlug: 'jaltenango-honey',
    steps: [
      { order: 1, title: 'Setup', description: 'Pesa 20g molidos grueso-medio. Precalienta el V60 y la taza con agua caliente. Desecha el agua.', duration: 20 },
      { order: 2, title: 'Primera vertida (40%)', description: 'Vierte 60ml (40% de 150ml de "control"). Espera 45 seg. Esta vertida controla acidez — más agua = más acidez.', duration: 45 },
      { order: 3, title: 'Segunda vertida (60%)', description: 'Vierte 90ml hasta completar 150ml. Espera 45 seg. Esta vertida controla dulzura — más agua = más dulce.', duration: 45 },
      { order: 4, title: 'Tres vertidas iguales', description: 'Divide los 150ml restantes en 3 vertidas de 50ml cada una, cada 45 seg. Estas controlan la fortaleza.', duration: 135 },
      { order: 5, title: 'Drenado', description: 'Deja drenar completamente. Tiempo total: ~5 min. Ajusta las primeras dos vertidas en futuras preparaciones.' },
    ],
  },

  // ── AEROPRESS ─────────────────────────────────────────────────────────────
  {
    slug: 'aeropress-estandar',
    title: 'AeroPress Estándar',
    description: 'Rápido, limpio y versátil. El método favorito de viajeros y entusiastas por su consistencia y facilidad.',
    method: 'AeroPress',
    difficulty: 'FÁCIL',
    prepTime: 3,
    yield: '200 ml',
    temp: '85°C',
    grind: 'Medio',
    ratio: '1:13 (15g / 195ml)',
    isPremium: false,
    isPublished: true,
    steps: [
      { order: 1, title: 'Prepara el AeroPress', description: 'Coloca el filtro de papel en la tapa metálica, enjuágalo con agua caliente. Ensambla el AeroPress en posición normal sobre tu taza.', duration: 20 },
      { order: 2, title: 'Agrega el café', description: 'Vierte 15g de café molido medio en el AeroPress. Nivela suavemente.', duration: 10 },
      { order: 3, title: 'Pre-infusión', description: 'Añade 30ml de agua a 85°C. Revuelve rápidamente con la paleta durante 10 segundos para humedecer todo el café.', duration: 15 },
      { order: 4, title: 'Vertida principal', description: 'Vierte los 165ml restantes en ~10 segundos. Coloca el émbolo para crear vacío — no lo empujes aún.', duration: 30 },
      { order: 5, title: 'Presiona', description: 'A los 60 seg totales, presiona el émbolo lentamente durante 20–30 segundos hasta escuchar un ligero silbido. No fuerces hasta el fondo.', duration: 30 },
    ],
  },
  {
    slug: 'aeropress-invertido',
    title: 'AeroPress Invertido',
    description: 'La técnica "inverted" favorita de campeones. Control total del tiempo de contacto sin goteo prematuro.',
    method: 'AeroPress',
    difficulty: 'MEDIA',
    prepTime: 4,
    yield: '200 ml',
    temp: '88°C',
    grind: 'Medio-fino',
    ratio: '1:12 (17g / 200ml)',
    isPremium: false,
    isPublished: true,
    productSlug: 'huatusco-natural',
    steps: [
      { order: 1, title: 'Posición invertida', description: 'Inserta el émbolo ~1cm en el cuerpo del AeroPress. Colócalo boca abajo sobre una superficie estable.', duration: 15 },
      { order: 2, title: 'Café y agua', description: 'Agrega 17g molidos medio-fino. Vierte 200ml de agua a 88°C. Revuelve 10 segundos con la paleta.', duration: 20 },
      { order: 3, title: 'Infusión', description: 'Espera 1 minuto con el émbolo puesto (sin apretar) para mantener el calor. Mientras tanto, coloca el filtro enjuagado en la tapa.', duration: 60 },
      { order: 4, title: 'Tapa y gira', description: 'Coloca la tapa con filtro y enrosca firmemente. Con un movimiento seguro y rápido, gira el AeroPress sobre tu taza.', duration: 10 },
      { order: 5, title: 'Presiona', description: 'Presiona el émbolo en ~20 segundos con presión uniforme. Detén al escuchar el silbido. Resultado: taza limpia y compleja.', duration: 25 },
    ],
  },

  // ── ESPRESSO ──────────────────────────────────────────────────────────────
  {
    slug: 'espresso-doble',
    title: 'Espresso Doble',
    description: 'La base de toda la barra. Dos shots perfectos con crema dorada y sabor concentrado e intenso.',
    method: 'Espresso',
    difficulty: 'DIFÍCIL',
    prepTime: 2,
    yield: '60 ml',
    temp: '94°C',
    grind: 'Fino',
    ratio: '1:2 (18g / 36ml)',
    isPremium: false,
    isPublished: true,
    steps: [
      { order: 1, title: 'Purga y temperatura', description: 'Purga el grupo de la máquina 2-3 segundos para estabilizar la temperatura. Seca el portafiltro.', duration: 10 },
      { order: 2, title: 'Dosis y distribución', description: 'Dosa 18g en el portafiltro. Usa el Weiss Distribution Technique (WDT): un palillo o herramienta distribuye el café uniformemente para eliminar canales.', duration: 20 },
      { order: 3, title: 'Tampar', description: 'Tampa con 15–20 kg de presión de forma nivelada y perpendicular. Un buen tamp es silencioso y firme.', duration: 10 },
      { order: 4, title: 'Extracción', description: 'Inserta el portafiltro y activa inmediatamente. El flujo debe comenzar en 5–8 seg. Objetivo: 36ml en 25–30 seg. Crema color avellana.', duration: 30 },
      { order: 5, title: 'Evalúa', description: 'Prueba el shot solo: debe tener dulzura, cuerpo y acidez balanceados. Si es amargo, muele más grueso. Si es ácido y aguado, muele más fino.' },
    ],
  },
  {
    slug: 'cortado',
    title: 'Cortado',
    description: 'El equilibrio perfecto entre espresso y leche. 1:1 de café y leche vaporizada, sin espuma densa.',
    method: 'Espresso',
    difficulty: 'MEDIA',
    prepTime: 3,
    yield: '120 ml',
    temp: '94°C',
    grind: 'Fino',
    ratio: '1:1 espresso/leche',
    isPremium: false,
    isPublished: true,
    steps: [
      { order: 1, title: 'Extrae el espresso doble', description: 'Sigue la receta de espresso doble (18g → 36ml en 25-30 seg). Coloca el shot en el vaso cortado de 120ml.', duration: 35 },
      { order: 2, title: 'Vaporiza la leche', description: 'Usa 80ml de leche entera fría. Sumerge la lanza en ángulo, crea microespuma (textura sedosa, no burbujas grandes). Temperatura: 60-65°C.', duration: 20 },
      { order: 3, title: 'Mezcla', description: 'Vierte la leche texturizada sobre el espresso en un movimiento continuo. La leche "corta" la acidez del café. Sin latte art requerido — es función, no forma.', duration: 10 },
    ],
  },

  // ── CHEMEX ────────────────────────────────────────────────────────────────
  {
    slug: 'chemex-clasico',
    title: 'Chemex Clásico',
    description: 'Extracción limpia y cristalina con el filtro más grueso del mercado. Resalta la claridad y los matices florales.',
    method: 'Chemex',
    difficulty: 'MEDIA',
    prepTime: 6,
    yield: '500 ml',
    temp: '94°C',
    grind: 'Grueso',
    ratio: '1:15 (33g / 500ml)',
    isPremium: false,
    isPublished: true,
    productSlug: 'jaltenango-honey',
    steps: [
      { order: 1, title: 'Coloca y enjuaga el filtro', description: 'Dobla el filtro cuadrado de Chemex en forma de cono (3 capas al frente). Enjuaga abundantemente con agua caliente para eliminar sabor a papel y precalentar.', duration: 20 },
      { order: 2, title: 'Pesa el café', description: 'Agrega 33g molidos grueso — como sal de mar gruesa. El Chemex requiere molienda más gruesa por el filtro denso.', duration: 15 },
      { order: 3, title: 'Bloom (pre-infusión)', description: 'Vierte 66ml de agua a 94°C de forma circular. Espera 45 segundos hasta que el café deje de crecer.', duration: 45 },
      { order: 4, title: 'Vertida continua', description: 'Vierte el agua restante en 3 pulsos de ~145ml cada 45 seg, siempre en espiral. Mantén el nivel de agua por encima del café.', duration: 180 },
      { order: 5, title: 'Drenado', description: 'Retira el filtro al terminar de drenar (~5-6 min totales). El café Chemex se puede servir directamente o guardar en la jarra a temperatura ambiente por hasta 1 hora.', duration: 30 },
    ],
  },

  // ── FRENCH PRESS ──────────────────────────────────────────────────────────
  {
    slug: 'french-press-clasico',
    title: 'French Press Clásico',
    description: 'El método de inmersión por excelencia. Cuerpo pesado, aceites esenciales intactos y sabor robusto.',
    method: 'French Press',
    difficulty: 'FÁCIL',
    prepTime: 4,
    yield: '400 ml',
    temp: '93°C',
    grind: 'Grueso',
    ratio: '1:12 (33g / 400ml)',
    isPremium: false,
    isPublished: true,
    productSlug: 'huatusco-natural',
    steps: [
      { order: 1, title: 'Precalienta la prensa', description: 'Llena la French Press con agua caliente, espera 30 seg y desecha. Esto estabiliza la temperatura durante la extracción.', duration: 30 },
      { order: 2, title: 'Café molido grueso', description: 'Agrega 33g molidos muy grueso — como sal kosher. La molienda fina tapará el émbolo y producirá sabor amargo.', duration: 15 },
      { order: 3, title: 'Vertida y revuelta', description: 'Vierte 400ml de agua a 93°C de una sola vez. Revuelve 3–4 veces con cuchara de madera para asegurar saturación completa.', duration: 20 },
      { order: 4, title: 'Infusión 4 minutos', description: 'Coloca la tapa sin presionar. Espera exactamente 4 minutos. Este tiempo produce extracción completa sin sobre-extracción.', duration: 240 },
      { order: 5, title: 'Presiona y sirve', description: 'Presiona el émbolo lentamente en ~30 seg. Sirve INMEDIATAMENTE — no dejes el café en la prensa o seguirá extrayendo y se volverá amargo.', duration: 30 },
    ],
  },

  // ── COLD BREW ─────────────────────────────────────────────────────────────
  {
    slug: 'cold-brew-concentrado',
    title: 'Cold Brew Concentrado',
    description: 'Infusión en frío de 12–18 horas. Sin acidez, suave y naturalmente dulce. Perfecto para dilutir o tomar solo.',
    method: 'Cold Brew',
    difficulty: 'FÁCIL',
    prepTime: 720,
    yield: '500 ml concentrado',
    temp: 'Frío (4°C)',
    grind: 'Extra grueso',
    ratio: '1:5 concentrado (100g / 500ml)',
    isPremium: false,
    isPublished: true,
    steps: [
      { order: 1, title: 'Muele grueso', description: 'Muele 100g de café muy grueso — como chips de chocolate. La molienda gruesa extrae lento y evita amargor.', duration: 60 },
      { order: 2, title: 'Mezcla con agua fría', description: 'En un frasco de vidrio de 1L, combina el café molido con 500ml de agua filtrada fría. Revuelve bien para saturar todo el café.', duration: 10 },
      { order: 3, title: 'Refrigeración', description: 'Cubre el frasco y refrigera entre 12 y 18 horas. 12h = suave, 18h = intenso. No lo dejes más tiempo o desarrolla sabores amargos.', duration: 900 },
      { order: 4, title: 'Filtra', description: 'Pasa el concentrado por un filtro de papel (Chemex o V60), un filtro de tela o una bolsa de cold brew. Filtra lentamente sin presionar.', duration: 30 },
      { order: 5, title: 'Sirve', description: 'Para tomar solo: mezcla 1 parte concentrado + 1 parte agua o leche con hielo. Guarda el concentrado hasta 2 semanas refrigerado.' },
    ],
  },
  {
    slug: 'cold-brew-nitro',
    title: 'Cold Brew Nitro en Casa',
    description: 'Transforma tu cold brew en una experiencia cremosa con textura tipo cerveza oscura usando un sifón de cocina.',
    method: 'Cold Brew',
    difficulty: 'DIFÍCIL',
    prepTime: 750,
    yield: '300 ml',
    temp: 'Frío (2°C)',
    grind: 'Extra grueso',
    ratio: '1:4 (75g / 300ml)',
    isPremium: true,
    isPublished: true,
    steps: [
      { order: 1, title: 'Prepara el cold brew base', description: 'Sigue la receta Cold Brew Concentrado con 75g de café y 300ml de agua. Refrigera 16 horas para mayor intensidad.', duration: 960 },
      { order: 2, title: 'Filtra muy bien', description: 'Filtra 2 veces: primero con filtro grueso para remover sólidos, luego con filtro de papel fino. Cualquier sedimento tapará el sifón.', duration: 20 },
      { order: 3, title: 'Llena el sifón ISI', description: 'Vierte el cold brew filtrado en el sifón. No llenes más del 75% de capacidad. Cierra la tapa firmemente.', duration: 10 },
      { order: 4, title: 'Carga con N₂O', description: 'Inserta 1 cápsula de N₂O en el soporte y enrosca. Agita vigorosamente 10 veces. Refrigera el sifón cargado 30 min adicionales.', duration: 1800 },
      { order: 5, title: 'Sirve en vaso frío', description: 'Enfría el vaso con hielo, desecha el hielo. Sostén el sifón boca abajo e inclínalo 45°. Dispensa lentamente para crear cascada de espuma cremosa.' },
    ],
  },

  // ── MOKA POT ──────────────────────────────────────────────────────────────
  {
    slug: 'moka-pot-italiano',
    title: 'Moka Pot Italiano',
    description: 'El ritual matutino de millones de hogares. Concentrado, con cuerpo y con ese aroma único que llena la cocina.',
    method: 'Moka Pot',
    difficulty: 'FÁCIL',
    prepTime: 5,
    yield: '60 ml',
    temp: '100°C (ebullición)',
    grind: 'Fino-medio',
    ratio: '1:7 (10g / 70ml)',
    isPremium: false,
    isPublished: true,
    steps: [
      { order: 1, title: 'Agua prekalentada', description: 'Llena el depósito inferior HASTA la válvula de seguridad con agua ya caliente (de hervidor). Esto acorta el tiempo de extracción y evita sobre-cocinar el café.', duration: 30 },
      { order: 2, title: 'Llena el filtro', description: 'Llena el filtro con café molido fino-medio (entre V60 y espresso). No compactes ni golpees — solo nivela con el dedo.', duration: 15 },
      { order: 3, title: 'Enrosca y calienta', description: 'Enrosca la parte superior firmemente. Coloca en fuego medio. Deja la tapa abierta para monitorear el flujo.', duration: 10 },
      { order: 4, title: 'Escucha el burbujeo', description: 'En ~3–4 min comenzará a salir café color chocolate oscuro. Cuando el flujo se vuelva esputante y claro/amarillento, retira inmediatamente del fuego.', duration: 180 },
      { order: 5, title: 'Enfría el fondo', description: 'Envuelve el fondo con un trapo húmedo o pásalo bajo agua fría para detener la extracción. Sirve de inmediato. Añade agua caliente para un lungo si lo prefieres.', duration: 15 },
    ],
  },

  // ── SIPHON ────────────────────────────────────────────────────────────────
  {
    slug: 'sifon-japones',
    title: 'Sifón Japonés',
    description: 'El método más teatral del café. Vacío, temperatura controlada y claridad cristalina en taza.',
    method: 'Sifón',
    difficulty: 'DIFÍCIL',
    prepTime: 8,
    yield: '300 ml',
    temp: '92°C',
    grind: 'Medio',
    ratio: '1:12 (25g / 300ml)',
    isPremium: true,
    isPublished: true,
    steps: [
      { order: 1, title: 'Prepara el filtro', description: 'Remoja el filtro de tela en agua tibia 10 min. Colócalo en el tubo superior con el gancho centrado. Asegúralo firmemente desde abajo.', duration: 600 },
      { order: 2, title: 'Agua en cámara inferior', description: 'Vierte 350ml de agua en la cámara inferior. Limpia el exterior del globo con un trapo seco — la humedad puede romper el vidrio con el calor.', duration: 20 },
      { order: 3, title: 'Encaja la cámara superior', description: 'Cuando el agua esté a 70°C (~2 min en butano), inserta el tubo superior sin enroscar completamente. Al llegar a 92°C, enrosca para crear el sello hermético.', duration: 120 },
      { order: 4, title: 'Café y extracción', description: 'El agua sube por presión al tubo superior. Agrega 25g de café y revuelve suavemente en figura de 8 durante 10 seg. Mantén fuego medio 1:30 min.', duration: 100 },
      { order: 5, title: 'Retira y observa', description: 'Apaga el calor. El vacío jalará el café filtrado hacia abajo. La "torta" de café en el filtro debe quedar seca y cóncava. Sirve en tazas pre-calentadas.' },
    ],
  },

  // ── TURCO ─────────────────────────────────────────────────────────────────
  {
    slug: 'cafe-turco',
    title: 'Café Turco (Cezve)',
    description: 'El método más antiguo documentado. Sin filtro, con cuerpo denso y sabor profundo. Bebe sin agitar la última fracción.',
    method: 'Turco',
    difficulty: 'MEDIA',
    prepTime: 5,
    yield: '60 ml',
    grind: 'Ultrafino (polvo)',
    ratio: '1:8 (8g / 65ml)',
    isPremium: false,
    isPublished: true,
    steps: [
      { order: 1, title: 'Muele ultrafino', description: 'Muele 8g más fino que el espresso — casi polvo. Este café no se filtra, así que la molienda determina el cuerpo y sedimento.', duration: 30 },
      { order: 2, title: 'Agua fría en el cezve', description: 'Pon 65ml de agua FRÍA en el cezve (cazuela pequeña de cobre o acero). Agrega el café y opcionalmente 1 cucharadita de azúcar. No revuelvas aún.', duration: 15 },
      { order: 3, title: 'Calentamiento lento', description: 'Coloca en fuego muy bajo. Cuando el café empiece a disolverse (1–2 min), revuelve suavemente una sola vez y ya no toques más.', duration: 120 },
      { order: 4, title: 'Primera espuma', description: 'A ~70°C formará una espuma cremosa (kaimak) en el borde. Con una cuchara, transfiere esa espuma con cuidado a la taza — es el mejor parte.', duration: 60 },
      { order: 5, title: 'Segunda subida', description: 'Cuando casi hierva de nuevo y la espuma suba, retira del fuego ANTES de que hierva completamente. Vierte lentamente sobre la espuma en la taza. Espera 2 min para que los sedimentos asienten antes de beber.', duration: 120 },
    ],
  },

  // ── DRIPPER KALITA ────────────────────────────────────────────────────────
  {
    slug: 'kalita-wave',
    title: 'Kalita Wave',
    description: 'Fondo plano, tres agujeros. Más forgiving que el V60, produce extracción uniforme y cuerpo equilibrado.',
    method: 'Kalita Wave',
    difficulty: 'MEDIA',
    prepTime: 5,
    yield: '250 ml',
    temp: '93°C',
    grind: 'Medio',
    ratio: '1:15 (17g / 250ml)',
    isPremium: false,
    isPublished: true,
    steps: [
      { order: 1, title: 'Enjuaga el filtro ondulado', description: 'El filtro wave de Kalita tiene ondas que crean separación con el dripper. Enjuágalo bien — retiene más papel que filtros planos.', duration: 15 },
      { order: 2, title: 'Bloom', description: 'Vierte 34ml de agua a 93°C. El fondo plano hace que el bloom sea más uniforme que en el V60. Espera 40 segundos.', duration: 40 },
      { order: 3, title: 'Vertida en pulsos', description: 'Vierte en 3 pulsos de ~70ml cada 40 seg, siempre en espiral. El fondo plano distribuye el flujo entre los 3 agujeros automáticamente.', duration: 120 },
      { order: 4, title: 'Drenado', description: 'Tiempo total: ~3:30 min. La Kalita Wave es más tolerante a variaciones de vertida que el V60, produciendo resultados consistentes.', duration: 30 },
    ],
  },

  // ── LATTE ─────────────────────────────────────────────────────────────────
  {
    slug: 'latte-art-tulip',
    title: 'Latte con Arte: Tulipán',
    description: 'El arte en la taza: técnica de pour para crear un tulipán de 3 capas sobre tu latte. Requiere práctica pero impresiona.',
    method: 'Espresso',
    difficulty: 'DIFÍCIL',
    prepTime: 5,
    yield: '240 ml',
    temp: '65°C (leche)',
    grind: 'Fino',
    ratio: '1:2 espresso base',
    isPremium: true,
    isPublished: true,
    steps: [
      { order: 1, title: 'Extrae espresso doble', description: 'Extrae 36ml de espresso en una taza de 240ml tipo "latte bowl" con paredes anchas. Asegúrate que la crema esté intacta.', duration: 35 },
      { order: 2, title: 'Texturiza la leche', description: 'Vaporiza 180ml de leche entera hasta 65°C. La textura debe ser sedosa, sin burbujas visibles — como pintura. Gira la jarra para homogenizar.', duration: 25 },
      { order: 3, title: 'Primera capa del tulipán', description: 'Inclina la taza 45°. Vierte desde altura (~10cm) en el centro del espresso para crear la base oscura. Luego baja la jarra y vierte una "gota" de leche apretando hacia atrás.', duration: 15 },
      { order: 4, title: 'Segunda y tercera capa', description: 'Repite el movimiento de "gota" dos veces más, cada vez un poco adelante de la anterior. Cada capa empuja la anterior hacia atrás formando los pétalos.', duration: 15 },
      { order: 5, title: 'El tallo', description: 'Para cerrar el tulipán, tira una línea recta de leche desde la última gota hacia el borde de la taza. Sirve inmediatamente.' },
    ],
  },

  // ── DALGONA / ESPECIALES ──────────────────────────────────────────────────
  {
    slug: 'dalgona-coffee',
    title: 'Dalgona Coffee',
    description: 'La sensación viral. Espuma cremosa de café instantáneo montada sobre leche fría. Fácil, impresionante y delicioso.',
    method: 'Frío',
    difficulty: 'FÁCIL',
    prepTime: 10,
    yield: '350 ml',
    temp: 'Frío',
    ratio: '1:1:1 (café:azúcar:agua)',
    isPremium: false,
    isPublished: true,
    steps: [
      { order: 1, title: 'Mezcla los sólidos', description: 'En un bowl, combina 2 cucharadas de café instantáneo, 2 cucharadas de azúcar y 2 cucharadas de agua caliente.', duration: 10 },
      { order: 2, title: 'Bate hasta espuma', description: 'Con batidor eléctrico o manual, bate la mezcla 2–5 min hasta que se vuelva espuma color caramelo que mantiene picos firmes.', duration: 180 },
      { order: 3, title: 'Prepara la base', description: 'Llena un vaso alto con hielo y 250ml de leche entera o vegetal.', duration: 10 },
      { order: 4, title: 'Vierte la espuma', description: 'Coloca una cucharada generosa de espuma de café sobre la leche. Para un efecto visual, no mezcles inmediatamente — muéstraselo primero.', duration: 10 },
      { order: 5, title: 'Mezcla y bebe', description: 'Revuelve con popote antes de beber para integrar la espuma con la leche. La proporción espuma:leche se ajusta al gusto.' },
    ],
  },
  {
    slug: 'cafe-de-olla',
    title: 'Café de Olla',
    description: 'Receta tradicional mexicana con piloncillo, canela y anís. El café de la abuela, profundo y especiado.',
    method: 'Tradicional',
    difficulty: 'FÁCIL',
    prepTime: 15,
    yield: '4 tazas',
    temp: '100°C (hervor)',
    ratio: '1L agua / 4 cdas café / 60g piloncillo',
    isPremium: false,
    isPublished: true,
    steps: [
      { order: 1, title: 'Hierve agua con especias', description: 'En una olla de barro (o acero), hierve 1L de agua con 1 raja de canela, 2 estrellas de anís y 60g de piloncillo troceado. Deja hervir 5 min hasta disolver el piloncillo.', duration: 300 },
      { order: 2, title: 'Agrega el café', description: 'Cuando el agua esté aromática y el piloncillo disuelto, agrega 4 cucharadas colmadas de café molido medio-grueso. Revuelve suavemente.', duration: 15 },
      { order: 3, title: 'Infusión sin hervir', description: 'Baja el fuego a mínimo. NO permitas que hierva con el café adentro — esto amarga la infusión. Mantén 5 min tapado.', duration: 300 },
      { order: 4, title: 'Reposa', description: 'Apaga el fuego. Deja reposar 3 minutos sin destape para que los sedimentos asienten al fondo.', duration: 180 },
      { order: 5, title: 'Cuela y sirve', description: 'Cuela con colador fino o manta de cielo directo a las tazas. Sirve bien caliente. Opcional: añade un chorrito de leche caliente para un "café con leche de olla".', duration: 15 },
    ],
  },
  {
    slug: 'flat-white',
    title: 'Flat White',
    description: 'El favorito australiano. Más intenso que un latte, más pequeño, microespuma integrada que intensifica el sabor del espresso.',
    method: 'Espresso',
    difficulty: 'MEDIA',
    prepTime: 4,
    yield: '160 ml',
    temp: '65°C (leche)',
    grind: 'Fino',
    ratio: '1:3 ristretto/leche',
    isPremium: false,
    isPublished: true,
    steps: [
      { order: 1, title: 'Ristretto doble', description: 'Extrae un ristretto doble: 18g de café → 30ml (ratio 1:1.6) en 20–25 seg. Más concentrado que espresso estándar — la base del flat white.', duration: 30 },
      { order: 2, title: 'Leche texturizada fina', description: 'Vaporiza 120ml de leche entera a 65°C con microespuma muy fina, casi sin volumen. La espuma debe integrarse con la leche, no flotar encima.', duration: 20 },
      { order: 3, title: 'Vierte rápido', description: 'Inclina la taza y vierte desde cerca (5cm). En el flat white la leche y el espresso se integran desde el primer segundo — no buscas capas, buscas unidad.', duration: 15 },
    ],
  },
  {
    slug: 'espresso-tonic',
    title: 'Espresso Tonic',
    description: 'La tendencia de las cafeterías nórdicas. Espresso sobre agua tónica con hielo: burbujas, acidez y amargor en perfecta tensión.',
    method: 'Espresso',
    difficulty: 'FÁCIL',
    prepTime: 3,
    yield: '200 ml',
    temp: 'Frío',
    grind: 'Fino',
    ratio: 'doble espresso + 120ml tónica',
    isPremium: false,
    isPublished: true,
    productSlug: 'coatepec-lavado',
    steps: [
      { order: 1, title: 'Vaso frío con hielo', description: 'Llena un vaso de vidrio alto con hielo hasta el borde. Un vaso frío es crucial — si el vidrio está caliente, la tónica perderá sus burbujas al instante.', duration: 10 },
      { order: 2, title: 'Vierte la tónica', description: 'Añade 120ml de agua tónica premium (Fever-Tree o similar) inclinando el vaso. Hazlo lentamente para preservar las burbujas.', duration: 15 },
      { order: 3, title: 'Extrae el espresso', description: 'Extrae un doble espresso (18g → 36ml). Usa un café con notas cítricas o frutales — el Coatepec Lavado funciona perfectamente.', duration: 30 },
      { order: 4, title: 'Vierte sobre la tónica', description: 'Vierte el espresso caliente LENTAMENTE sobre el dorso de una cuchara para que flote sobre la tónica. La colisión visual de los líquidos es parte de la experiencia.', duration: 10 },
      { order: 5, title: 'Sirve sin mezclar', description: 'Entrega al cliente sin revolver. Ellos mezclan al gusto con el popote. El primer sorbo de cada capa es intencionalmente diferente.' },
    ],
  },
  {
    slug: 'pour-over-woodneck',
    title: 'Nel Drip / Woodneck',
    description: 'Filtro de tela japonés que preserva aceites del café sin papel. Resultado intermedio entre French Press y V60: cuerpo con claridad.',
    method: 'Nel Drip',
    difficulty: 'MEDIA',
    prepTime: 6,
    yield: '300 ml',
    temp: '88°C',
    grind: 'Medio-grueso',
    ratio: '1:14 (21g / 300ml)',
    isPremium: true,
    isPublished: true,
    productSlug: 'jaltenango-honey',
    steps: [
      { order: 1, title: 'Acondiciona el filtro', description: 'El filtro de flanela nel drip debe guardarse SIEMPRE húmedo en el refrigerador. Antes de usar, enjuágalo con agua caliente y exprime suavemente.', duration: 20 },
      { order: 2, title: 'Calienta el servidor', description: 'Llena el servidor de vidrio con agua caliente, espera 30 seg. Desecha. La flanela y el vidrio frío bajarán la temperatura del café.', duration: 30 },
      { order: 3, title: 'Café y bloom', description: 'Agrega 21g molidos medio-grueso. Vierte 42ml a 88°C en espiral. Espera 40 seg — la flanela absorbe parte del agua, así que el bloom es menos visible que en papel.', duration: 40 },
      { order: 4, title: 'Vertida lenta continua', description: 'Vierte los 258ml restantes en un flujo constante y suave, siempre en espiral. La flanela fluye más lento que el papel, permite un flujo más continuo. Total: ~5 min.', duration: 240 },
      { order: 5, title: 'Limpia y guarda el filtro', description: 'Retira el filtro, enjuaga con agua FRÍA (el agua caliente deteriora la tela), exprime y guarda sumergido en agua fría en el refrigerador. Dura meses con buen cuidado.' },
    ],
  },
];

async function main() {
  console.log('Seeding database...');

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      // Refresh the visual fields so existing rows pick up cover + gallery on re-seed.
      update: { imageUrl: product.imageUrl, images: product.images },
      create: product,
    });
  }

  const hashedPassword = await bcrypt.hash('admin123', 12);
  await prisma.adminUser.upsert({
    where: { email: 'admin@12porciento.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@12porciento.com',
      password: hashedPassword,
    },
  });

  const blendId = (await prisma.product.findUnique({ where: { slug: 'blend-12' } }))?.id;
  const comandanteId = (await prisma.product.findUnique({ where: { slug: 'comandante-grinder' } }))?.id;
  const filtrosId = (await prisma.product.findUnique({ where: { slug: 'filtros-japoneses' } }))?.id;
  const tazaId = (await prisma.product.findUnique({ where: { slug: 'taza-ceramic-12' } }))?.id;

  if (blendId && comandanteId && filtrosId && tazaId) {
    await prisma.bundle.upsert({
      where: { id: 'bundle-explorador-plus' },
      update: {},
      create: {
        id: 'bundle-explorador-plus',
        name: 'Explorador+',
        description: 'Kit completo para iniciarte en la aventura del café especial. Incluye café curado, molino manual y accesorios.',
        basePrice: 500,
        discountPct: 15,
        finalPrice: 425,
        imageUrl: 'https://images.unsplash.com/photo-1559056169-641e0ac8618e?auto=format&fit=crop&w=800&q=80',
        isActive: true,
        items: {
          create: [
            { productId: blendId, quantity: 1 },
            { productId: comandanteId, quantity: 1 },
            { productId: filtrosId, quantity: 1 },
            { productId: tazaId, quantity: 1 },
          ],
        },
      },
    });
  }

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const subs = [
    { name: 'Carlos Ruiz', email: 'carlos@example.com', plan: 'EXPLORADOR', phone: '5512345678', nextBilling: nextMonth },
    { name: 'Ana García', email: 'ana@example.com', plan: 'CONNOISSEUR', phone: '5598765432', nextBilling: nextMonth },
    { name: 'Luis Torres', email: 'luis@example.com', plan: 'FUNDADOR', nextBilling: nextMonth },
  ];

  for (const sub of subs) {
    await prisma.subscription.upsert({
      where: { email: sub.email },
      update: {},
      create: sub,
    });
  }

  // ── Seed recipes ──────────────────────────────────────────────────────────
  for (const r of recipes) {
    const productId = r.productSlug
      ? (await prisma.product.findUnique({ where: { slug: r.productSlug } }))?.id ?? null
      : null;

    const existing = await prisma.recipe.findUnique({ where: { slug: r.slug } });
    if (existing) {
      // Update metadata but leave steps untouched (may have been edited in admin)
      await prisma.recipe.update({
        where: { slug: r.slug },
        data: {
          title: r.title,
          description: r.description,
          method: r.method,
          difficulty: r.difficulty,
          prepTime: r.prepTime,
          yield: r.yield,
          temp: r.temp ?? null,
          grind: r.grind ?? null,
          ratio: r.ratio ?? null,
          isPremium: r.isPremium,
          isPublished: r.isPublished,
          productId,
        },
      });
      continue;
    }

    await prisma.recipe.create({
      data: {
        slug: r.slug,
        title: r.title,
        description: r.description,
        method: r.method,
        difficulty: r.difficulty,
        prepTime: r.prepTime,
        yield: r.yield,
        temp: r.temp ?? null,
        grind: r.grind ?? null,
        ratio: r.ratio ?? null,
        isPremium: r.isPremium,
        isPublished: r.isPublished,
        productId,
        steps: {
          create: r.steps.map((s) => ({
            order: s.order,
            title: s.title,
            description: s.description,
            duration: s.duration ?? null,
          })),
        },
      },
    });
  }

  console.log(`Seeded ${recipes.length} recipes.`);

  // Achievements
  const achievements = [
    { slug: 'first_brew', name: 'Primer Brew', description: 'Registra tu primer café preparado', icon: '☕', rarity: 'COMMON', xpReward: 10 },
    { slug: 'five_brews', name: 'Cinco Brews', description: 'Registra 5 cafés preparados', icon: '🎯', rarity: 'COMMON', xpReward: 25 },
    { slug: 'ten_brews', name: 'Diez Brews', description: 'Registra 10 cafés preparados', icon: '⚡', rarity: 'RARE', xpReward: 50 },
    { slug: 'perfect_brew', name: 'Brew Perfecto', description: 'Califica un brew con 10 puntos', icon: '⭐', rarity: 'EPIC', xpReward: 100 },
    { slug: 'v60_5',       name: 'Maestro del V60',  description: 'Registra 5 cafés con V60',        icon: '☕', rarity: 'RARE', xpReward: 40 },
    { slug: 'aeropress_5', name: 'As del AeroPress',  description: 'Registra 5 cafés con AeroPress',  icon: '🔌', rarity: 'RARE', xpReward: 40 },
    { slug: 'espresso_5',  name: 'Espresso Pro',      description: 'Registra 5 espressos',            icon: '⚡', rarity: 'RARE', xpReward: 40 },
    { slug: 'streak_3',    name: 'Racha de 3 días',   description: 'Prepara café 3 días seguidos',    icon: '🔥', rarity: 'RARE', xpReward: 50 },
    { slug: 'streak_7',    name: 'Racha de 7 días',   description: 'Prepara café 7 días seguidos',    icon: '🏆', rarity: 'EPIC', xpReward: 120 },
  ];

  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { slug: a.slug },
      update: {},
      create: a,
    });
  }

  console.log(`Seeded ${achievements.length} achievements.`);
  console.log('Seed complete. Admin: admin@12porciento.com / admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
