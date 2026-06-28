import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Unsplash URL builder (consistent sizing/quality across the gallery).
const u = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&q=80`;

// ─── Image pools by product category ───────────────────────────────────────
const CAFÉ_BOLSA = [
  u('1610889556528-9a770e32642f'), // coffee bag
  u('1559056199-641a0ac8b55e'),     // beans close
  u('1447933601403-0c6688de566e'),  // coffee setup
  u('1447933601769-c00d465a05d3'),  // coffee bag flat lay
  u('1493857671505-72967e2e2760'),  // packaging
  u('1512568400610-62da28bc8f45'),  // craft bag
  u('1559053614-cd4628902d4a'),     // specialty beans
  u('1461023058943-07fcbe16d735'),  // bag content
  u('1442512595331-e89e73853f31'),  // coffee bag lifestyle
  u('1509042239860-f550ce710b93'),  // premium packaging
  u('1515037893594-694267b2e9f1'),  // specialty coffee bag
  u('1447933710033-6461bcad5d65'),  // coffee aesthetic
  u('1543268865-cbdf3ca2ab57'),     // coffee culture
  u('1575652356055-f51a5a8ceb78'),  // artisan coffee
  u('1514432324607-a09d9b4aefdd'),  // coffee presentation
  u('1447932601383-a282e4b40819'),  // craft coffee
];

const CAFÉ_GRANO = [
  u('1559056199-641a0ac8b55e'),     // beans close
  u('1514432324607-a09d9b4aefdd'),  // coffee scoop
  u('1447933710033-6461bcad5d65'),  // roasted beans
  u('1542992019-2c04ae145b47'),     // coffee beans
  u('1509042239860-f550ce710b93'),  // beans texture
  u('1559053614-cd4628902d4a'),     // specialty beans
  u('1515037893594-694267b2e9f1'),  // bean roast
  u('1556821840-3a63f95609a7'),     // coffee detail
  u('1543268865-cbdf3ca2ab57'),     // coffee aroma
  u('1451187580459-43490279c0fa'),  // coffee macro
  u('1497935586351-b67a49e012bf'),  // espresso shot
  u('1510707577719-ae7c14805e3a'),  // coffee extraction
  u('1561590141-3c3f42ba7268'),     // coffee beans roast
  u('1442512595331-e89e73853f31'),  // coffee beans hand
  u('1543268865-cbdf3ca2ab57'),     // coffee beans
  u('1447933601403-0c6688de566e'),  // coffee aesthetic
];

const CAFÉ_BEBIDA = [
  u('1495474472287-4d71bcdd2085'),  // brewed coffee
  u('1510707577719-ae7c14805e3a'),  // coffee cup
  u('1461023058943-07fcbe16d735'),  // espresso
  u('1497935586351-b67a49e012bf'),  // coffee shot
  u('1509042239860-f550ce710b93'),  // coffee drink
  u('1514432324607-a09d9b4aefdd'),  // coffee pour
  u('1447933601769-c00d465a05d3'),  // coffee
  u('1580933073521-dc49ac0d4e6a'),  // coffee aesthetic
  u('1559052534-cc4f6e03ae5e'),     // coffee morning
  u('1461023058943-07fcbe16d735'),  // espresso crema
  u('1542992019-2c04ae145b47'),     // coffee drink
  u('1447933601403-0c6688de566e'),  // pour over
  u('1515037893594-694267b2e9f1'),  // coffee ritual
  u('1561590141-3c3f42ba7268'),     // coffee experience
  u('1543268865-cbdf3ca2ab57'),     // coffee culture
  u('1451187580459-43490279c0fa'),  // latte art
];

const ACCESORIOS_MOLINILLO = [
  u('1530968033775-2c92736b131e'),  // grinder
  u('1554118811-107debc24260'),     // coffee equipment
  u('1447933601403-0c6688de566e'),  // grinder setup
  u('1452865928648-ce14e7995ccf'),  // coffee tools
  u('1559053614-cd4628902d4a'),     // grinding
  u('1512568400610-62da28bc8f45'),  // barista tools
  u('1443512220425-95bc62f2d40b'),  // coffee grinder
  u('1442512595331-e89e73853f31'),  // equipment
  u('1459749411175-04bf5292ceea'),  // coffee gear
  u('1522992719590-544eb2dc4fdf'),  // coffee tools
  u('1509042239860-f550ce710b93'),  // grinder aesthetic
  u('1495474472287-4d71bcdd2085'),  // coffee setup
  u('1514432324607-a09d9b4aefdd'),  // coffee accessories
  u('1447933601769-c00d465a05d3'),  // coffee equipment
  u('1547590694-56f42a68c812'),     // coffee grinder
  u('1557804183-0d5ad5efd765'),     // coffee gear
];

const ACCESORIOS_BREWER = [
  u('1606312619070-d48b4c652a52'),  // V60 setup
  u('1443512220425-95bc62f2d40b'),  // pour over
  u('1461023058943-07fcbe16d735'),  // brewing
  u('1447933601403-0c6688de566e'),  // pour over aesthetic
  u('1509042239860-f550ce710b93'),  // coffee gear
  u('1514432324607-a09d9b4aefdd'),  // brewing setup
  u('1447933710033-6461bcad5d65'),  // coffee ritual
  u('1559053614-cd4628902d4a'),     // brewing method
  u('1461023058943-07fcbe16d735'),  // extraction
  u('1544787219-7f47ccb76574'),     // coffee setup
  u('1452865928648-ce14e7995ccf'),  // brewing equipment
  u('1495474472287-4d71bcdd2085'),  // coffee preparation
  u('1512568400610-62da28bc8f45'),  // barista method
  u('1447933601769-c00d465a05d3'),  // coffee culture
  u('1543268865-cbdf3ca2ab57'),     // brewing ritual
  u('1451187580459-43490279c0fa'),  // pour over detail
];

const ACCESORIOS_MOKA = [
  u('1442512595331-e89e73853f31'),  // moka pot
  u('1447933601403-0c6688de566e'),  // stovetop
  u('1509042239860-f550ce710b93'),  // moka aesthetic
  u('1514432324607-a09d9b4aefdd'),  // coffee extraction
  u('1556821840-3a63f95609a7'),     // coffee tradition
  u('1443512220425-95bc62f2d40b'),  // cooking setup
  u('1461023058943-07fcbe16d735'),  // coffee ritual
  u('1447933710033-6461bcad5d65'),  // moka brewing
  u('1559053614-cd4628902d4a'),     // traditional coffee
  u('1495474472287-4d71bcdd2085'),  // home brewing
  u('1544787219-7f47ccb76574'),     // coffee setup
  u('1452865928648-ce14e7995ccf'),  // kitchen equipment
  u('1512568400610-62da28bc8f45'),  // coffee preparation
  u('1447933601769-c00d465a05d3'),  // traditional method
  u('1543268865-cbdf3ca2ab57'),     // coffee culture
  u('1451187580459-43490279c0fa'),  // home coffee
];

const ACCESORIOS_KETTLE = [
  u('1462299756681-1aed706a36e8'),  // kettle
  u('1447933601403-0c6688de566e'),  // water heating
  u('1509042239860-f550ce710b93'),  // kettle aesthetic
  u('1514432324607-a09d9b4aefdd'),  // pouring
  u('1443512220425-95bc62f2d40b'),  // kitchen tool
  u('1461023058943-07fcbe16d735'),  // brewing preparation
  u('1556821840-3a63f95609a7'),     // coffee setup
  u('1447933710033-6461bcad5d65'),  // water control
  u('1559053614-cd4628902d4a'),     // precision
  u('1495474472287-4d71bcdd2085'),  // coffee ritual
  u('1544787219-7f47ccb76574'),     // home brewing
  u('1452865928648-ce14e7995ccf'),  // equipment
  u('1512568400610-62da28bc8f45'),  // barista tools
  u('1447933601769-c00d465a05d3'),  // coffee tradition
  u('1543268865-cbdf3ca2ab57'),     // coffee culture
  u('1451187580459-43490279c0fa'),  // coffee detail
];

const ACCESORIOS_BASCULA = [
  u('1508230119575-1fbe5f7fa4f6'),  // scale
  u('1514432324607-a09d9b4aefdd'),  // measurement
  u('1447933601403-0c6688de566e'),  // precision
  u('1509042239860-f550ce710b93'),  // coffee precision
  u('1543512220425-95bc62f2d40b'),  // kitchen scale
  u('1461023058943-07fcbe16d735'),  // weighing
  u('1556821840-3a63f95609a7'),     // measurement setup
  u('1447933710033-6461bcad5d65'),  // barista precision
  u('1559053614-cd4628902d4a'),     // coffee measurement
  u('1495474472287-4d71bcdd2085'),  // brewing precision
  u('1544787219-7f47ccb76574'),     // coffee setup detail
  u('1452865928648-ce14e7995ccf'),  // equipment
  u('1512568400610-62da28bc8f45'),  // barista method
  u('1447933601769-c00d465a05d3'),  // coffee ritual precision
  u('1543268865-cbdf3ca2ab57'),     // detail
  u('1451187580459-43490279c0fa'),  // measurement precision
];

const ACCESORIOS_FILTROS = [
  u('1521302080334-4bebac2763a6'),  // filters
  u('1447933601403-0c6688de566e'),  // flat lay
  u('1509042239860-f550ce710b93'),  // consumables
  u('1514432324607-a09d9b4aefdd'),  // paper filters
  u('1443512220425-95bc62f2d40b'),  // coffee supplies
  u('1461023058943-07fcbe16d735'),  // brewing supplies
  u('1556821840-3a63f95609a7'),     // coffee essentials
  u('1447933710033-6461bcad5d65'),  // supplies detail
  u('1559053614-cd4628902d4a'),     // coffee supplies
  u('1495474472287-4d71bcdd2085'),  // brewing components
  u('1544787219-7f47ccb76574'),     // supplies organization
  u('1452865928648-ce14e7995ccf'),  // inventory
  u('1512568400610-62da28bc8f45'),  // essentials
  u('1447933601769-c00d465a05d3'),  // consumable supplies
  u('1543268865-cbdf3ca2ab57'),     // supplies collection
  u('1451187580459-43490279c0fa'),  // detail supplies
];

const MERCH_TAZA = [
  u('1514228742587-6b1558fcca3d'),  // mug
  u('1495474472287-4d71bcdd2085'),  // coffee cup
  u('1510707577719-ae7c14805e3a'),  // mug aesthetic
  u('1461023058943-07fcbe16d735'),  // cup
  u('1514432324607-a09d9b4aefdd'),  // mug flat lay
  u('1447933601403-0c6688de566e'),  // ceramic
  u('1509042239860-f550ce710b93'),  // mug lifestyle
  u('1556821840-3a63f95609a7'),     // coffee mug
  u('1443512220425-95bc62f2d40b'),  // tableware
  u('1459749411175-04bf5292ceea'),  // cup detail
  u('1522992719590-544eb2dc4fdf'),  // mug collection
  u('1447933710033-6461bcad5d65'),  // ceramic mug
  u('1559053614-cd4628902d4a'),     // mug design
  u('1495474472287-4d71bcdd2085'),  // cup lifestyle
  u('1544787219-7f47ccb76574'),     // mug flat lay
  u('1452865928648-ce14e7995ccf'),  // tableware collection
];

const MERCH_ROPA = [
  u('1556821840-3a63f95609a7'),     // hoodie
  u('1489749798305-ed8726f6c180'),  // apparel
  u('1443512220425-95bc62f2d40b'),  // clothing
  u('1462299756681-1aed706a36e8'),  // lifestyle
  u('1447933601403-0c6688de566e'),  // fashion
  u('1509042239860-f550ce710b93'),  // apparel lifestyle
  u('1514432324607-a09d9b4aefdd'),  // style
  u('1461023058943-07fcbe16d735'),  // clothing detail
  u('1556821840-3a63f95609a7'),     // fashion lifestyle
  u('1447933710033-6461bcad5d65'),  // apparel design
  u('1559053614-cd4628902d4a'),     // fashion style
  u('1495474472287-4d71bcdd2085'),  // clothing aesthetic
  u('1544787219-7f47ccb76574'),     // fashion detail
  u('1452865928648-ce14e7995ccf'),  // apparel collection
  u('1512568400610-62da28bc8f45'),  // lifestyle wear
  u('1447933601769-c00d465a05d3'),  // fashion aesthetic
];

const MERCH_ACCESORIOS = [
  u('1543512220425-95bc62f2d40b'),  // accessories
  u('1447933601403-0c6688de566e'),  // merch flat lay
  u('1509042239860-f550ce710b93'),  // lifestyle accessories
  u('1514432324607-a09d9b4aefdd'),  // product display
  u('1461023058943-07fcbe16d735'),  // detail
  u('1556821840-3a63f95609a7'),     // merch lifestyle
  u('1443512220425-95bc62f2d40b'),  // merch collection
  u('1447933710033-6461bcad5d65'),  // product detail
  u('1559053614-cd4628902d4a'),     // merch aesthetic
  u('1495474472287-4d71bcdd2085'),  // accessories lifestyle
  u('1544787219-7f47ccb76574'),     // merch display
  u('1452865928648-ce14e7995ccf'),  // product collection
  u('1512568400610-62da28bc8f45'),  // merch detail
  u('1447933601769-c00d465a05d3'),  // merch aesthetic
  u('1543268865-cbdf3ca2ab57'),     // collection
  u('1451187580459-43490279c0fa'),  // product detail
];

// Helper to pick random image from pool
const pickImage = (pool: string[]) => pool[Math.floor(Math.random() * pool.length)];

// ─── Coffee profile helpers ──────────────────────────────────────────────
const pickFarm = (farms: string[]) => farms[Math.floor(Math.random() * farms.length)];

const producerForOrigin = (origin: string): string => {
  const map: Record<string, string[]> = {
    Veracruz: ['Finca Don Justo', 'Finca San Miguel', 'Finca Santa Cruz'],
    Chiapas: ['Finca La Joya', 'Finca Irlanda', 'Finca Hamburgo'],
    Oaxaca: ['Finca La Gloria', 'Finca El Olivo'],
    Guerrero: ['Finca La Sierpe', 'Finca El Cerrito'],
    Hidalgo: ['Finca Bella Vista', 'Finca La Unión'],
    Puebla: ['Finca Xicotepec', 'Finca La Esperanza'],
    Nayarit: ['Finca San Cristóbal', 'Finca El Molino'],
    'San Luis Potosí': ['Finca La Huasteca', 'Finca Xilitla'],
  };
  const farms = map[origin];
  return farms ? pickFarm(farms) : `Caficultores de ${origin}`;
};

const farmNameForOrigin = (origin: string): string => {
  const map: Record<string, string[]> = {
    Veracruz: ['Santa Cruz', 'San Miguel', 'Don Justo'],
    Chiapas: ['La Joya', 'Irlanda', 'Hamburgo'],
    Oaxaca: ['La Gloria', 'El Olivo'],
    Guerrero: ['La Sierpe', 'El Cerrito'],
    Hidalgo: ['Bella Vista', 'La Unión'],
    Puebla: ['Xicotepec', 'La Esperanza'],
    Nayarit: ['San Cristóbal', 'El Molino'],
    'San Luis Potosí': ['La Huasteca', 'Xilitla'],
  };
  const farms = map[origin];
  return farms ? pickFarm(farms) : 'Los Altos';
};

const certificationsFor = (altitude: number | undefined, scaScore: number | undefined, isLimited: boolean): string => {
  const certs: string[] = [];
  if (altitude && altitude > 1300) certs.push('Orgánico');
  if (scaScore && scaScore > 87) certs.push('Comercio Justo');
  if (scaScore && scaScore > 90) certs.push('Rainforest Alliance');
  if (isLimited) certs.push('Edición Limitada');
  if (certs.length === 0) certs.push('Orgánico');
  return JSON.stringify(certs);
};

const bodyForProcess = (process: string | undefined): string => {
  if (!process) return 'Medio';
  if (process.includes('Lavado')) return 'Medio';
  if (process.includes('Anaeróbico')) return 'Completo';
  if (process.includes('Natural')) return 'Completo';
  if (process.includes('Honey')) return 'Medio';
  return 'Medio';
};

const acidityForAltitude = (altitude: number | undefined): string => {
  if (!altitude) return 'Media';
  if (altitude >= 1300) return 'Alta';
  if (altitude >= 1000) return 'Media';
  return 'Baja';
};

const processingDescForProcess = (process: string | undefined): string => {
  if (!process) return 'Proceso tradicional de la región.';
  if (process.includes('Lavado')) return 'Fermentación húmeda de 24-36 horas. Despulpado, fermentación en tanques, lavado y secado en camas africanas.';
  if (process.includes('Natural')) return 'Cerezas secadas al sol en camas africanas durante 18-25 días. Giro frecuente para fermentación uniforme.';
  if (process.includes('Honey')) return 'Despulpado selectivo conservando capa de mucílago. Secado lento en camas africanas.';
  if (process.includes('Anaeróbico')) return 'Fermentación anaeróbica en tanques sellados con monitoreo de temperatura.';
  return 'Proceso tradicional de la región.';
};

const brewMethodForScore = (scaScore: number | undefined): string => {
  if (scaScore && scaScore >= 89) return 'V60';
  if (scaScore && scaScore >= 86) return 'AeroPress';
  if (scaScore && scaScore >= 80) return 'Chemex';
  return 'V60';
};

const brewTempForRoast = (roastLevel: string | undefined): number => {
  if (roastLevel === 'Ligero') return 92;
  if (roastLevel === 'Medio-Ligero') return 90;
  if (roastLevel === 'Medio') return 88;
  if (roastLevel === 'Oscuro') return 85;
  return 90;
};

const brewRatioForRoast = (roastLevel: string | undefined): string => {
  if (roastLevel === 'Ligero' || roastLevel === 'Medio-Ligero') return '1:16';
  if (roastLevel === 'Oscuro') return '1:14';
  return '1:15';
};

const grindSizeForMethod = (method: string): string => {
  if (method === 'V60') return 'Medio-Fino';
  if (method === 'AeroPress') return 'Medio-Fino';
  if (method === 'Chemex') return 'Medio';
  if (method === 'Espresso') return 'Fino';
  return 'Medio';
};

const parseFlavors = (flavorsJson: string | undefined): string[] => {
  if (!flavorsJson) return [];
  try {
    return JSON.parse(flavorsJson);
  } catch {
    return [];
  }
};

const tastingNotesFor = (flavorsJson: string | undefined, body: string, acidity: string): string => {
  const flavors = parseFlavors(flavorsJson);
  const f1 = flavors[0] || 'chocolate';
  const f2 = flavors[1] || 'caramelo';
  return `Notas de ${f1}, ${f2} con cuerpo ${body.toLowerCase()} y acidez ${acidity.toLowerCase()}. Final largo y dulce.`;
};

const pairingForProcess = (process: string | undefined): string => {
  if (!process) return 'Chocolate, pan dulce';
  if (process.includes('Lavado')) return 'Pastelería fina, ensaladas de frutas';
  if (process.includes('Natural')) return 'Chocolate oscuro, quesos curados';
  if (process.includes('Honey')) return 'Frutos secos, postres cremosos';
  if (process.includes('Anaeróbico')) return 'Mermeladas, chocolate artesanal';
  return 'Chocolate, pan dulce';
};

const products = [
  // ─── CAFÉ: 55 products ─────────────────────────────────────────────────────

  // Veracruz origins
  {
    name: 'Coatepec Lavado',
    slug: 'coatepec-lavado',
    category: 'CAFÉ',
    origin: 'Veracruz',
    region: 'Coatepec',
    altitude: 1400,
    variety: 'Typica, Bourbon',
    process: 'Lavado',
    scaScore: 86.0,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Chocolate amargo', 'Durazno', 'Miel', 'Frambuesa']),
    price: 280,
    weight: 250,
    stock: 120,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Lote de origen único de las faldas del Cofre de Perote. Perfil dulce y balanceado ideal para consumo diario.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Coatepec Natural',
    slug: 'coatepec-natural',
    category: 'CAFÉ',
    origin: 'Veracruz',
    region: 'Coatepec',
    altitude: 1400,
    variety: 'Catuaí',
    process: 'Natural',
    scaScore: 87.0,
    roastLevel: 'Medio-Ligero',
    flavors: JSON.stringify(['Frutos rojos', 'Caramelo', 'Cacao', 'Canela']),
    price: 310,
    weight: 250,
    stock: 100,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Proceso natural que resalta dulzura frutal con finish a cacao oscuro.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Huatusco Honey',
    slug: 'huatusco-honey',
    category: 'CAFÉ',
    origin: 'Veracruz',
    region: 'Huatusco',
    altitude: 1200,
    variety: 'Bourbon Amarillo',
    process: 'Honey',
    scaScore: 88.0,
    roastLevel: 'Medio-Ligero',
    flavors: JSON.stringify(['Mango', 'Maracuyá', 'Miel', 'Flor de azahar']),
    price: 340,
    weight: 250,
    stock: 90,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Proceso honey con dulzura tropical y cuerpo cremoso.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Huatusco Natural',
    slug: 'huatusco-natural',
    category: 'CAFÉ',
    origin: 'Veracruz',
    region: 'Huatusco',
    altitude: 1200,
    variety: 'Bourbon Amarillo',
    process: 'Natural',
    scaScore: 89.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Cereza', 'Vino tinto', 'Frambuesa', 'Pimienta']),
    price: 360,
    weight: 250,
    stock: 80,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Perfil frutal intenso con notas vinosas y complejidad excepcional.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Xico Anaeróbico',
    slug: 'xico-anaerobico',
    category: 'CAFÉ',
    origin: 'Veracruz',
    region: 'Xico',
    altitude: 1350,
    variety: 'Typica',
    process: 'Anaeróbico Natural',
    scaScore: 90.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Blueberry', 'Ron oscuro', 'Chocolate oscuro', 'Vainilla']),
    price: 420,
    weight: 250,
    stock: 60,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Fermentación anaeróbica de 72 horas con perfil intensamente frutal.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Misantla Lavado',
    slug: 'misantla-lavado',
    category: 'CAFÉ',
    origin: 'Veracruz',
    region: 'Misantla',
    altitude: 1100,
    variety: 'Caturra',
    process: 'Lavado',
    scaScore: 85.0,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Avellana', 'Miel de caña', 'Chocolate', 'Naranja']),
    price: 260,
    weight: 250,
    stock: 110,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Café balanceado y limpio, ideal para métodos de filtro.',
    isLimited: false,
    isActive: true,
  },

  // Chiapas origins
  {
    name: 'Jaltenango Honey',
    slug: 'jaltenango-honey',
    category: 'CAFÉ',
    origin: 'Chiapas',
    region: 'Jaltenango',
    altitude: 1600,
    variety: 'Catuaí',
    process: 'Honey',
    scaScore: 87.0,
    roastLevel: 'Medio-Ligero',
    flavors: JSON.stringify(['Mango', 'Maracuyá', 'Miel', 'Flor de azahar']),
    price: 320,
    weight: 250,
    stock: 100,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Proceso honey preservando la mucilago con dulzura tropical.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Jaltenango Natural',
    slug: 'jaltenango-natural',
    category: 'CAFÉ',
    origin: 'Chiapas',
    region: 'Jaltenango',
    altitude: 1600,
    variety: 'Bourbon Rosado',
    process: 'Natural',
    scaScore: 88.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Fresa', 'Piña', 'Floral', 'Cítrico']),
    price: 350,
    weight: 250,
    stock: 85,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Variedad Pink Bourbon con proceso natural para máxima complejidad frutal.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'El Triunfo Lavado',
    slug: 'el-triunfo-lavado',
    category: 'CAFÉ',
    origin: 'Chiapas',
    region: 'El Triunfo',
    altitude: 1550,
    variety: 'Typica',
    process: 'Lavado',
    scaScore: 86.0,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Chocolate con leche', 'Pera', 'Almendra', 'Miel']),
    price: 290,
    weight: 250,
    stock: 95,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Café clásico de El Triunfo con perfil suave y chocolatoso.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'El Triunfo Geisha',
    slug: 'el-triunfo-geisha',
    category: 'CAFÉ',
    origin: 'Chiapas',
    region: 'El Triunfo',
    altitude: 1800,
    variety: 'Geisha',
    process: 'Lavado',
    scaScore: 92.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Jazmín', 'Pétalo de rosa', 'Melocotón blanco', 'Té blanco']),
    price: 620,
    weight: 100,
    stock: 25,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Microlote Geisha con perfil floral excepcional y acidez brillante. Edición limitada.',
    isLimited: true,
    isActive: true,
  },
  {
    name: 'Tapachula Geisha',
    slug: 'tapachula-geisha',
    category: 'CAFÉ',
    origin: 'Chiapas',
    region: 'Tapachula',
    altitude: 1800,
    variety: 'Geisha',
    process: 'Honey',
    scaScore: 93.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Jazmín', 'Bergamota', 'Melocotón blanco', 'Té negro']),
    price: 680,
    weight: 100,
    stock: 20,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Variedad Geisha legendaria cultivada a 1800m. Edición limitada de temporada.',
    isLimited: true,
    isActive: true,
  },
  {
    name: 'Tapachula Pacamara',
    slug: 'tapachula-pacamara',
    category: 'CAFÉ',
    origin: 'Chiapas',
    region: 'Tapachula',
    altitude: 1700,
    variety: 'Pacamara',
    process: 'Natural',
    scaScore: 91.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Ciruela', 'Chocolate amargo', 'Vino', 'Especias']),
    price: 560,
    weight: 100,
    stock: 30,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Pacamara (grano gigante) con proceso natural para máxima concentración.',
    isLimited: true,
    isActive: true,
  },
  {
    name: 'San Cristóbal Anaeróbico',
    slug: 'san-cristobal-anaerobico',
    category: 'CAFÉ',
    origin: 'Chiapas',
    region: 'San Cristóbal',
    altitude: 1450,
    variety: 'Marsellesa',
    process: 'Anaeróbico Natural',
    scaScore: 90.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Blackberry', 'Remolacha', 'Chocolate oscuro', 'Ron']),
    price: 480,
    weight: 250,
    stock: 70,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Variedad rara Marsellesa con fermentación anaeróbica experimental.',
    isLimited: false,
    isActive: true,
  },

  // Oaxaca origins
  {
    name: 'Pluma Lavado',
    slug: 'pluma-lavado',
    category: 'CAFÉ',
    origin: 'Oaxaca',
    region: 'Pluma Hidalgo',
    altitude: 1350,
    variety: 'Typica',
    process: 'Lavado',
    scaScore: 86.0,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Chocolate amargo', 'Naranja', 'Almendra', 'Miel']),
    price: 295,
    weight: 250,
    stock: 105,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Clásico de Pluma con equilibrio chocolate-frutal.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Pluma Natural',
    slug: 'pluma-natural',
    category: 'CAFÉ',
    origin: 'Oaxaca',
    region: 'Pluma Hidalgo',
    altitude: 1350,
    variety: 'Bourbon Amarillo',
    process: 'Natural',
    scaScore: 88.0,
    roastLevel: 'Medio-Ligero',
    flavors: JSON.stringify(['Mango', 'Caramelo', 'Flores', 'Chocolate']),
    price: 340,
    weight: 250,
    stock: 90,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Bourbon Amarillo con proceso natural para dulzura tropical.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Sierra Juárez Lavado',
    slug: 'sierra-juarez-lavado',
    category: 'CAFÉ',
    origin: 'Oaxaca',
    region: 'Sierra Juárez',
    altitude: 1400,
    variety: 'Caturra',
    process: 'Lavado',
    scaScore: 85.0,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Caramelo', 'Nueces', 'Chocolate', 'Cítrico']),
    price: 270,
    weight: 250,
    stock: 110,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Café de Sierra Juárez con perfil chocolate-caramelo balanceado.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Sierra Juárez Honey',
    slug: 'sierra-juarez-honey',
    category: 'CAFÉ',
    origin: 'Oaxaca',
    region: 'Sierra Juárez',
    altitude: 1400,
    variety: 'Catuaí',
    process: 'Honey',
    scaScore: 86.0,
    roastLevel: 'Medio-Ligero',
    flavors: JSON.stringify(['Fresa', 'Miel', 'Chocolate blanco', 'Floral']),
    price: 310,
    weight: 250,
    stock: 95,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Catuaí con honey para dulzura natural y cuerpo delicado.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Yucuyoo Anaeróbico',
    slug: 'yucuyoo-anaerobico',
    category: 'CAFÉ',
    origin: 'Oaxaca',
    region: 'Yucuyoo',
    altitude: 1500,
    variety: 'Bourbon Rosado',
    process: 'Anaeróbico Natural',
    scaScore: 91.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Cereza fermentada', 'Vino tinto', 'Blackberry', 'Tabaco']),
    price: 490,
    weight: 250,
    stock: 50,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Pink Bourbon anaeróbico con perfil vinoso y complejo. Edición limitada.',
    isLimited: true,
    isActive: true,
  },
  {
    name: 'Yucuyoo Natural',
    slug: 'yucuyoo-natural',
    category: 'CAFÉ',
    origin: 'Oaxaca',
    region: 'Yucuyoo',
    altitude: 1500,
    variety: 'Bourbon Amarillo',
    process: 'Natural',
    scaScore: 88.0,
    roastLevel: 'Medio-Ligero',
    flavors: JSON.stringify(['Papaya', 'Piña', 'Miel', 'Cítrico']),
    price: 350,
    weight: 250,
    stock: 80,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Bourbon Amarillo natural de las montañas de Yucuyoo.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Cañada Lavado',
    slug: 'canada-oaxaca-lavado',
    category: 'CAFÉ',
    origin: 'Oaxaca',
    region: 'Cañada Oaxaqueña',
    altitude: 1250,
    variety: 'Typica',
    process: 'Lavado',
    scaScore: 83.0,
    roastLevel: 'Oscuro',
    flavors: JSON.stringify(['Chocolate oscuro', 'Caramelo quemado', 'Humo', 'Nuez']),
    price: 240,
    weight: 250,
    stock: 120,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Café oscuro de La Cañada ideal para espresso con cuerpo robusto.',
    isLimited: false,
    isActive: true,
  },

  // Guerrero origins
  {
    name: 'Atoyac Lavado',
    slug: 'atoyac-lavado',
    category: 'CAFÉ',
    origin: 'Guerrero',
    region: 'Atoyac de Álvarez',
    altitude: 1300,
    variety: 'Garnica',
    process: 'Lavado',
    scaScore: 84.0,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Chocolate', 'Pera', 'Almendra', 'Vainilla']),
    price: 255,
    weight: 250,
    stock: 105,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Garnica de Atoyac con perfil suave y aromático.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Atoyac Natural',
    slug: 'atoyac-natural',
    category: 'CAFÉ',
    origin: 'Guerrero',
    region: 'Atoyac de Álvarez',
    altitude: 1300,
    variety: 'Garnica',
    process: 'Natural',
    scaScore: 85.0,
    roastLevel: 'Medio-Ligero',
    flavors: JSON.stringify(['Cereza', 'Frambuesa', 'Cacao', 'Pimienta']),
    price: 285,
    weight: 250,
    stock: 90,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Garnica natural de Guerrero con perfil frutal y especiado.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Atoyac Honey',
    slug: 'atoyac-honey',
    category: 'CAFÉ',
    origin: 'Guerrero',
    region: 'Atoyac de Álvarez',
    altitude: 1300,
    variety: 'Bourbon Amarillo',
    process: 'Honey',
    scaScore: 86.0,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Mango', 'Miel de caña', 'Almendra', 'Caramelo']),
    price: 305,
    weight: 250,
    stock: 85,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Bourbon Amarillo honey con dulzura natural y equilibrio.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Atoyac SL28 Anaeróbico',
    slug: 'atoyac-anaerobico-sl28',
    category: 'CAFÉ',
    origin: 'Guerrero',
    region: 'Atoyac de Álvarez',
    altitude: 1400,
    variety: 'SL28',
    process: 'Anaeróbico Natural',
    scaScore: 92.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Frambuesa', 'Chocolate oscuro', 'Floral', 'Vino tinto']),
    price: 580,
    weight: 100,
    stock: 25,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'SL28 legendaria con fermentación anaeróbica para máxima complejidad. Edición limitada.',
    isLimited: true,
    isActive: true,
  },

  // Hidalgo origins
  {
    name: 'Huauchinango Lavado',
    slug: 'huauchinango-lavado',
    category: 'CAFÉ',
    origin: 'Hidalgo',
    region: 'Huauchinango',
    altitude: 1350,
    variety: 'Typica',
    process: 'Lavado',
    scaScore: 85.0,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Chocolate con leche', 'Durazno', 'Panela', 'Almendra']),
    price: 265,
    weight: 250,
    stock: 100,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Café clásico de Hidalgo con perfil dulce y balanceado.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Huauchinango Honey',
    slug: 'huauchinango-honey',
    category: 'CAFÉ',
    origin: 'Hidalgo',
    region: 'Huauchinango',
    altitude: 1350,
    variety: 'Mundo Novo',
    process: 'Honey',
    scaScore: 86.0,
    roastLevel: 'Medio-Ligero',
    flavors: JSON.stringify(['Mango', 'Melocotón', 'Miel', 'Vainilla']),
    price: 300,
    weight: 250,
    stock: 90,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Mundo Novo honey con dulzura tropical y cuerpo medio.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Huauchinango Natural',
    slug: 'huauchinango-natural',
    category: 'CAFÉ',
    origin: 'Hidalgo',
    region: 'Huauchinango',
    altitude: 1350,
    variety: 'Catuaí',
    process: 'Natural',
    scaScore: 87.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Fresa', 'Frambuesa', 'Floral', 'Cítrico']),
    price: 330,
    weight: 250,
    stock: 80,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Catuaí natural de Hidalgo con frescura y acidez brillante.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Hidalgo Maragogype',
    slug: 'hidalgo-maragogype',
    category: 'CAFÉ',
    origin: 'Hidalgo',
    region: 'Huauchinango',
    altitude: 1300,
    variety: 'Maragogype',
    process: 'Lavado',
    scaScore: 88.0,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Durazno', 'Miel', 'Chocolate blanco', 'Floral']),
    price: 410,
    weight: 250,
    stock: 60,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Grano gigante Maragogype con perfil delicado y complejo.',
    isLimited: false,
    isActive: true,
  },

  // Puebla origins
  {
    name: 'Cuetzalan Lavado',
    slug: 'cuetzalan-lavado',
    category: 'CAFÉ',
    origin: 'Puebla',
    region: 'Cuetzalan',
    altitude: 1350,
    variety: 'Typica',
    process: 'Lavado',
    scaScore: 85.0,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Chocolate', 'Caramelo', 'Durazno', 'Almendra']),
    price: 270,
    weight: 250,
    stock: 105,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Café tradicional de Cuetzalan con carácter chocolate.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Cuetzalan Natural',
    slug: 'cuetzalan-natural',
    category: 'CAFÉ',
    origin: 'Puebla',
    region: 'Cuetzalan',
    altitude: 1350,
    variety: 'Bourbon Amarillo',
    process: 'Natural',
    scaScore: 87.0,
    roastLevel: 'Medio-Ligero',
    flavors: JSON.stringify(['Mango', 'Caramelo', 'Flores', 'Cacao']),
    price: 310,
    weight: 250,
    stock: 90,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Bourbon Amarillo natural con perfil tropical dulce.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Huehuetla Honey',
    slug: 'huehuetla-honey',
    category: 'CAFÉ',
    origin: 'Puebla',
    region: 'Huehuetla',
    altitude: 1400,
    variety: 'Caturra',
    process: 'Honey',
    scaScore: 86.0,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Miel', 'Piña', 'Chocolate', 'Vainilla']),
    price: 295,
    weight: 250,
    stock: 85,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Caturra honey con dulzura natural y cuerpo balanceado.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Puebla Pacamara',
    slug: 'puebla-pacamara',
    category: 'CAFÉ',
    origin: 'Puebla',
    region: 'Huehuetla',
    altitude: 1450,
    variety: 'Pacamara',
    process: 'Natural',
    scaScore: 90.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Ciruela', 'Vino tinto', 'Chocolate oscuro', 'Tabaco']),
    price: 520,
    weight: 100,
    stock: 35,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Pacamara (grano grande) natural para bebidas concentradas.',
    isLimited: true,
    isActive: true,
  },

  // Nayarit origins
  {
    name: 'Xalisco Lavado',
    slug: 'xalisco-lavado',
    category: 'CAFÉ',
    origin: 'Nayarit',
    region: 'Xalisco',
    altitude: 1200,
    variety: 'Typica',
    process: 'Lavado',
    scaScore: 84.0,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Chocolate', 'Caramelo', 'Almendra', 'Miel']),
    price: 255,
    weight: 250,
    stock: 110,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Café suave de Nayarit con perfil accesible y balanceado.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Xalisco Natural',
    slug: 'xalisco-natural',
    category: 'CAFÉ',
    origin: 'Nayarit',
    region: 'Xalisco',
    altitude: 1200,
    variety: 'Catuaí',
    process: 'Natural',
    scaScore: 86.0,
    roastLevel: 'Medio-Ligero',
    flavors: JSON.stringify(['Cereza', 'Miel', 'Chocolate', 'Cítrico']),
    price: 295,
    weight: 250,
    stock: 95,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Catuaí natural de Nayarit con frutalidad media.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Nayarit Honey',
    slug: 'nayarit-honey',
    category: 'CAFÉ',
    origin: 'Nayarit',
    region: 'San Juan',
    altitude: 1250,
    variety: 'Bourbon Amarillo',
    process: 'Honey',
    scaScore: 85.0,
    roastLevel: 'Medio-Ligero',
    flavors: JSON.stringify(['Mango', 'Miel', 'Almendra', 'Chocolate']),
    price: 280,
    weight: 250,
    stock: 100,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Bourbon Amarillo honey con dulzura tropical.',
    isLimited: false,
    isActive: true,
  },

  // San Luis Potosí origins
  {
    name: 'Xilitla Lavado',
    slug: 'xilitla-lavado',
    category: 'CAFÉ',
    origin: 'San Luis Potosí',
    region: 'Xilitla',
    altitude: 1300,
    variety: 'Typica',
    process: 'Lavado',
    scaScore: 84.0,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Chocolate', 'Nueces', 'Caramelo', 'Vainilla']),
    price: 250,
    weight: 250,
    stock: 115,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Café suave de Xilitla ideal para consumo diario.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Xilitla Natural',
    slug: 'xilitla-natural',
    category: 'CAFÉ',
    origin: 'San Luis Potosí',
    region: 'Xilitla',
    altitude: 1300,
    variety: 'Bourbon Rosado',
    process: 'Natural',
    scaScore: 86.0,
    roastLevel: 'Medio-Ligero',
    flavors: JSON.stringify(['Fresa', 'Chocolate', 'Floral', 'Cítrico']),
    price: 285,
    weight: 250,
    stock: 90,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Pink Bourbon natural de Xilitla con perfil frutal.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Xilitla Honey',
    slug: 'xilitla-honey',
    category: 'CAFÉ',
    origin: 'San Luis Potosí',
    region: 'Xilitla',
    altitude: 1300,
    variety: 'Caturra',
    process: 'Honey',
    scaScore: 85.0,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Miel', 'Chocolate blanco', 'Piña', 'Almendra']),
    price: 275,
    weight: 250,
    stock: 100,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Caturra honey con dulzura natural y equilibrio.',
    isLimited: false,
    isActive: true,
  },

  // Specialty/Limited
  {
    name: 'Pink Bourbon Anaeróbico',
    slug: 'pink-bourbon-anaerobico',
    category: 'CAFÉ',
    origin: 'Chiapas',
    region: 'El Triunfo',
    altitude: 1750,
    variety: 'Pink Bourbon',
    process: 'Anaeróbico Natural',
    scaScore: 94.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Fresa', 'Ron oscuro', 'Hibisco', 'Mora azul']),
    price: 540,
    weight: 100,
    stock: 28,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Pink Bourbon legendaria con fermentación anaeróbica de 72 horas. Edición limitada.',
    isLimited: true,
    isActive: true,
  },
  {
    name: 'Pink Bourbon Natural',
    slug: 'pink-bourbon-natural',
    category: 'CAFÉ',
    origin: 'Oaxaca',
    region: 'Sierra Juárez',
    altitude: 1550,
    variety: 'Pink Bourbon',
    process: 'Natural',
    scaScore: 93.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Frambuesa', 'Vino tinto', 'Floral', 'Especias']),
    price: 490,
    weight: 100,
    stock: 32,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Pink Bourbon natural con complejidad y elegancia. Edición limitada.',
    isLimited: true,
    isActive: true,
  },
  {
    name: 'Geisha Doble Fermentado',
    slug: 'geisha-doble-fermentado',
    category: 'CAFÉ',
    origin: 'Chiapas',
    region: 'Tapachula',
    altitude: 1900,
    variety: 'Geisha',
    process: 'Anaeróbico Natural',
    scaScore: 95.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Jazmín intenso', 'Bergamota', 'Melocotón blanco', 'Té oolong']),
    price: 850,
    weight: 50,
    stock: 15,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Geisha doble fermentada — la máxima expresión floral. Microlote exclusivo.',
    isLimited: true,
    isActive: true,
  },
  {
    name: 'SL28 Honey',
    slug: 'sl28-honey',
    category: 'CAFÉ',
    origin: 'Guerrero',
    region: 'Atoyac de Álvarez',
    altitude: 1400,
    variety: 'SL28',
    process: 'Honey',
    scaScore: 91.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Frambuesa', 'Miel negra', 'Chocolate oscuro', 'Especias']),
    price: 560,
    weight: 100,
    stock: 26,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'SL28 con honey para equilibrio entre frutalidad y dulzura. Edición limitada.',
    isLimited: true,
    isActive: true,
  },

  // Blends
  {
    name: 'Blend 12%',
    slug: 'blend-12',
    category: 'CAFÉ',
    origin: 'México',
    region: 'Multiregional',
    variety: 'Blend',
    process: 'Lavado / Natural',
    scaScore: 84.0,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Chocolate con leche', 'Almendra', 'Panela', 'Vainilla']),
    price: 240,
    weight: 250,
    stock: 150,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Nuestro blend emblema. Selección curada para perfil balanceado y consistente.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Blend Espresso 12%',
    slug: 'blend-espresso-12',
    category: 'CAFÉ',
    origin: 'México',
    region: 'Multiregional',
    variety: 'Blend',
    process: 'Lavado',
    scaScore: 85.0,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Chocolate oscuro', 'Caramelo', 'Nueces', 'Cacao']),
    price: 255,
    weight: 250,
    stock: 140,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Blend optimizado para espresso con cuerpo robusto y crema persistente.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Blend Mañana',
    slug: 'blend-mañana',
    category: 'CAFÉ',
    origin: 'México',
    region: 'Multiregional',
    variety: 'Blend',
    process: 'Natural',
    scaScore: 86.0,
    roastLevel: 'Medio-Ligero',
    flavors: JSON.stringify(['Fresa', 'Chocolate blanco', 'Vainilla', 'Floral']),
    price: 270,
    weight: 250,
    stock: 130,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Blend para las mañanas — frutal, ligero y aromático.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Blend Bar',
    slug: 'blend-bar',
    category: 'CAFÉ',
    origin: 'México',
    region: 'Multiregional',
    variety: 'Blend',
    process: 'Lavado',
    scaScore: 83.0,
    roastLevel: 'Oscuro',
    flavors: JSON.stringify(['Chocolate oscuro', 'Caramelo quemado', 'Nuez', 'Tabaco']),
    price: 235,
    weight: 250,
    stock: 145,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Blend oscuro para cafeteras — cuerpo pesado y sabor robusto.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Descafeinado Veracruz',
    slug: 'decaf-veracruz',
    category: 'CAFÉ',
    origin: 'Veracruz',
    region: 'Coatepec',
    variety: 'Catuaí',
    process: 'Lavado',
    scaScore: 83.0,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Chocolate', 'Miel', 'Almendra', 'Suave']),
    price: 320,
    weight: 250,
    stock: 70,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Descafeinado de proceso suizo preservando sabor y aroma.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Cold Brew Blend',
    slug: 'cold-brew-blend',
    category: 'CAFÉ',
    origin: 'México',
    region: 'Multiregional',
    variety: 'Blend',
    process: 'Natural',
    scaScore: 82.0,
    roastLevel: 'Oscuro',
    flavors: JSON.stringify(['Chocolate', 'Cereza', 'Suave', 'Cuerpo']),
    price: 280,
    weight: 250,
    stock: 100,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Blend oscuro ideal para cold brew — sabor limpio y cuerpo.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Café de Olla Especial',
    slug: 'cafe-de-olla-especial',
    category: 'CAFÉ',
    origin: 'Oaxaca',
    region: 'Pluma Hidalgo',
    variety: 'Typica',
    process: 'Lavado',
    scaScore: 80.0,
    roastLevel: 'Oscuro',
    flavors: JSON.stringify(['Chocolate', 'Canela', 'Tradicional', 'Suave']),
    price: 220,
    weight: 250,
    stock: 120,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Café tradicional mexicano tostado oscuro para olla de barro.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Café Specialty Instantáneo',
    slug: 'cafe-instantaneo-specialty',
    category: 'CAFÉ',
    origin: 'México',
    region: 'Multiregional',
    variety: 'Blend',
    process: 'Natural',
    scaScore: 82.0,
    roastLevel: 'Medio',
    flavors: JSON.stringify(['Chocolate', 'Frutales', 'Suave', 'Rápido']),
    price: 180,
    weight: 100,
    stock: 200,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Café instantáneo premium para conveniencia sin sacrificar sabor.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Microlote Bourbon Rosado',
    slug: 'microlote-bourbon-rosado',
    category: 'CAFÉ',
    origin: 'Veracruz',
    region: 'Huatusco',
    variety: 'Bourbon Rosado',
    process: 'Honey',
    scaScore: 91.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Fresa', 'Flores silvestres', 'Miel', 'Cítrico']),
    price: 520,
    weight: 100,
    stock: 32,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Microlote Pink Bourbon con honey para máxima complejidad frutal. Edición limitada.',
    isLimited: true,
    isActive: true,
  },
  {
    name: 'Microlote Typica Añejo',
    slug: 'microlote-typica-lavado',
    category: 'CAFÉ',
    origin: 'Chiapas',
    region: 'Jaltenango',
    variety: 'Typica',
    process: 'Natural',
    scaScore: 90.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Cereza', 'Cacao nibs', 'Floral', 'Especias']),
    price: 480,
    weight: 100,
    stock: 35,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Typica vieja de más de 50 años en Jaltenango con carácter excepcional. Edición limitada.',
    isLimited: true,
    isActive: true,
  },
  {
    name: 'Microlote Caturra Anaeróbico',
    slug: 'microlote-caturra-anaerobico',
    category: 'CAFÉ',
    origin: 'Guerrero',
    region: 'Atoyac',
    variety: 'Caturra',
    process: 'Anaeróbico Natural',
    scaScore: 91.0,
    roastLevel: 'Ligero',
    flavors: JSON.stringify(['Blueberry', 'Vino tinto', 'Chocolate oscuro', 'Tabaco']),
    price: 510,
    weight: 100,
    stock: 30,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Caturra anaeróbica experimental con fermentación controlada. Edición limitada.',
    isLimited: true,
    isActive: true,
  },
  {
    name: 'Bolsa Degustación 3x100g',
    slug: 'subscripcion-starter-bag',
    category: 'CAFÉ',
    origin: 'México',
    region: 'Multiregional',
    variety: 'Varios',
    process: 'Varios',
    flavors: JSON.stringify(['Degustación', 'Exploración', 'Variedad']),
    price: 390,
    weight: 300,
    stock: 80,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Bolsa de inicio con 3 orígenes diferentes de 100g cada uno para exploración.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Caja Muestra 4 Orígenes',
    slug: 'muestra-cuatro-origenes',
    category: 'CAFÉ',
    origin: 'México',
    region: 'Multiregional',
    variety: 'Varios',
    process: 'Varios',
    flavors: JSON.stringify(['Degustación premium', 'Viaje sensorial']),
    price: 490,
    weight: 400,
    stock: 70,
    imageUrl: pickImage(CAFÉ_BOLSA),
    images: JSON.stringify([pickImage(CAFÉ_GRANO), pickImage(CAFÉ_BEBIDA), pickImage(CAFÉ_BOLSA)]),
    description: 'Caja premium con 4 microlotes de 100g para viaje sensorial completo.',
    isLimited: false,
    isActive: true,
  },

  // ─── ACCESORIOS: 35 products ───────────────────────────────────────────────

  // Grinders
  {
    name: 'Comandante C40 MK4 — Negro',
    slug: 'comandante-c40-negro',
    category: 'ACCESORIOS',
    price: 3200,
    weight: 400,
    stock: 30,
    imageUrl: pickImage(ACCESORIOS_MOLINILLO),
    images: JSON.stringify([pickImage(ACCESORIOS_MOLINILLO), pickImage(ACCESORIOS_MOLINILLO)]),
    description: 'Molino manual premium con 40mm de diámetro. Ajuste infinito, burrs conică. Favorito de campeones.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Comandante C40 MK4 — Rojo',
    slug: 'comandante-c40-rojo',
    category: 'ACCESORIOS',
    price: 3200,
    weight: 400,
    stock: 25,
    imageUrl: pickImage(ACCESORIOS_MOLINILLO),
    images: JSON.stringify([pickImage(ACCESORIOS_MOLINILLO), pickImage(ACCESORIOS_MOLINILLO)]),
    description: 'Molino manual en acabado rojo. Especificaciones idénticas al modelo negro.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Hario Skerton Pro',
    slug: 'hario-skerton-pro',
    category: 'ACCESORIOS',
    price: 980,
    weight: 250,
    stock: 50,
    imageUrl: pickImage(ACCESORIOS_MOLINILLO),
    images: JSON.stringify([pickImage(ACCESORIOS_MOLINILLO), pickImage(ACCESORIOS_MOLINILLO)]),
    description: 'Molino manual asequible de calidad con burrs cerámicos. Ideal para principiantes.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Kingrinder K6',
    slug: 'kingrinder-k6',
    category: 'ACCESORIOS',
    price: 1450,
    weight: 350,
    stock: 40,
    imageUrl: pickImage(ACCESORIOS_MOLINILLO),
    images: JSON.stringify([pickImage(ACCESORIOS_MOLINILLO), pickImage(ACCESORIOS_MOLINILLO)]),
    description: 'Molino chino de calidad con burrs afilados. Excelente relación precio-calidad.',
    isLimited: false,
    isActive: true,
  },
  {
    name: '1Zpresso JX-Pro',
    slug: '1zpresso-jx-pro',
    category: 'ACCESORIOS',
    price: 2600,
    weight: 380,
    stock: 35,
    imageUrl: pickImage(ACCESORIOS_MOLINILLO),
    images: JSON.stringify([pickImage(ACCESORIOS_MOLINILLO), pickImage(ACCESORIOS_MOLINILLO)]),
    description: 'Molino premium con burrs espiral. Ligeramente más rápido que Comandante.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Timemore Chestnut C2 Max',
    slug: 'timemore-c2-max',
    category: 'ACCESORIOS',
    price: 1100,
    weight: 320,
    stock: 45,
    imageUrl: pickImage(ACCESORIOS_MOLINILLO),
    images: JSON.stringify([pickImage(ACCESORIOS_MOLINILLO), pickImage(ACCESORIOS_MOLINILLO)]),
    description: 'Molino compacto con burrs S55 de Etzberg. Portátil y eficiente.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Baratza Encore ESP (Eléctrico)',
    slug: 'baratza-encore-esp',
    category: 'ACCESORIOS',
    price: 3500,
    weight: 800,
    stock: 20,
    imageUrl: pickImage(ACCESORIOS_MOLINILLO),
    images: JSON.stringify([pickImage(ACCESORIOS_MOLINILLO), pickImage(ACCESORIOS_MOLINILLO)]),
    description: 'Molino eléctrico Baratza con 40 niveles de molienda. Rápido y confiable.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Fellow Ode Gen 2 (Eléctrico)',
    slug: 'fellow-ode-gen2',
    category: 'ACCESORIOS',
    price: 7800,
    weight: 1200,
    stock: 15,
    imageUrl: pickImage(ACCESORIOS_MOLINILLO),
    images: JSON.stringify([pickImage(ACCESORIOS_MOLINILLO), pickImage(ACCESORIOS_MOLINILLO)]),
    description: 'Molino eléctrico premium diseñado especialmente para filtro. Precisión extrema.',
    isLimited: false,
    isActive: true,
  },

  // Brewers
  {
    name: 'V60-02 Cerámica — Blanco',
    slug: 'v60-02-ceramic-blanco',
    category: 'ACCESORIOS',
    price: 580,
    weight: 150,
    stock: 60,
    imageUrl: pickImage(ACCESORIOS_BREWER),
    images: JSON.stringify([pickImage(ACCESORIOS_BREWER), pickImage(ACCESORIOS_BREWER)]),
    description: 'Dripper de cerámica V60 clásico en color blanco. Excelente retención de calor.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'V60-02 Cerámica — Negro',
    slug: 'v60-02-ceramic-negro',
    category: 'ACCESORIOS',
    price: 580,
    weight: 150,
    stock: 55,
    imageUrl: pickImage(ACCESORIOS_BREWER),
    images: JSON.stringify([pickImage(ACCESORIOS_BREWER), pickImage(ACCESORIOS_BREWER)]),
    description: 'Dripper de cerámica V60 en color negro. Mismo rendimiento, diferente estética.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'V60-02 Plástico — Rojo',
    slug: 'v60-02-plastic',
    category: 'ACCESORIOS',
    price: 280,
    weight: 80,
    stock: 80,
    imageUrl: pickImage(ACCESORIOS_BREWER),
    images: JSON.stringify([pickImage(ACCESORIOS_BREWER), pickImage(ACCESORIOS_BREWER)]),
    description: 'Dripper V60 de plástico resistente en rojo. Asequible y portátil.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'V60-02 Vidrio',
    slug: 'v60-02-glass',
    category: 'ACCESORIOS',
    price: 780,
    weight: 200,
    stock: 40,
    imageUrl: pickImage(ACCESORIOS_BREWER),
    images: JSON.stringify([pickImage(ACCESORIOS_BREWER), pickImage(ACCESORIOS_BREWER)]),
    description: 'Dripper V60 premium de vidrio borosilicato. Transparencia total + durabilidad.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Chemex 6 Tazas',
    slug: 'chemex-6-tazas',
    category: 'ACCESORIOS',
    price: 1350,
    weight: 600,
    stock: 35,
    imageUrl: pickImage(ACCESORIOS_BREWER),
    images: JSON.stringify([pickImage(ACCESORIOS_BREWER), pickImage(ACCESORIOS_BREWER)]),
    description: 'Cafetera Chemex clásica para 6 tazas. Vidrio borosilicato y filtros gruesos incluidos.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Chemex 3 Tazas',
    slug: 'chemex-3-tazas',
    category: 'ACCESORIOS',
    price: 1150,
    weight: 450,
    stock: 40,
    imageUrl: pickImage(ACCESORIOS_BREWER),
    images: JSON.stringify([pickImage(ACCESORIOS_BREWER), pickImage(ACCESORIOS_BREWER)]),
    description: 'Chemex compacta para 3 tazas. Ideal para individuos o parejas.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'AeroPress Original',
    slug: 'aeropress-original',
    category: 'ACCESORIOS',
    price: 1050,
    weight: 300,
    stock: 50,
    imageUrl: pickImage(ACCESORIOS_BREWER),
    images: JSON.stringify([pickImage(ACCESORIOS_BREWER), pickImage(ACCESORIOS_BREWER)]),
    description: 'AeroPress clásico. Rápido, versátil y fácil de limpiar.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'AeroPress Go',
    slug: 'aeropress-go',
    category: 'ACCESORIOS',
    price: 980,
    weight: 280,
    stock: 45,
    imageUrl: pickImage(ACCESORIOS_BREWER),
    images: JSON.stringify([pickImage(ACCESORIOS_BREWER), pickImage(ACCESORIOS_BREWER)]),
    description: 'AeroPress portátil con taza integrada. Perfecto para viajes.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'AeroPress Clear',
    slug: 'aeropress-clear',
    category: 'ACCESORIOS',
    price: 1150,
    weight: 320,
    stock: 38,
    imageUrl: pickImage(ACCESORIOS_BREWER),
    images: JSON.stringify([pickImage(ACCESORIOS_BREWER), pickImage(ACCESORIOS_BREWER)]),
    description: 'AeroPress en material transparente. Mismo rendimiento, mayor visibilidad.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Moka Pot Bialetti 3 Tazas',
    slug: 'moka-3-tazas',
    category: 'ACCESORIOS',
    price: 450,
    weight: 400,
    stock: 70,
    imageUrl: pickImage(ACCESORIOS_MOKA),
    images: JSON.stringify([pickImage(ACCESORIOS_MOKA), pickImage(ACCESORIOS_MOKA)]),
    description: 'Moka clásica Bialetti de aluminio para 3 tazas. Método tradicional italiano.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Moka Pot Bialetti 6 Tazas',
    slug: 'moka-6-tazas',
    category: 'ACCESORIOS',
    price: 550,
    weight: 500,
    stock: 65,
    imageUrl: pickImage(ACCESORIOS_MOKA),
    images: JSON.stringify([pickImage(ACCESORIOS_MOKA), pickImage(ACCESORIOS_MOKA)]),
    description: 'Moka Bialetti de 6 tazas. Mayor capacidad para familias.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Moka Pot Bialetti 9 Tazas',
    slug: 'moka-9-tazas',
    category: 'ACCESORIOS',
    price: 650,
    weight: 600,
    stock: 55,
    imageUrl: pickImage(ACCESORIOS_MOKA),
    images: JSON.stringify([pickImage(ACCESORIOS_MOKA), pickImage(ACCESORIOS_MOKA)]),
    description: 'Moka de 9 tazas para café en cantidad. Acero inoxidable resistente.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'French Press 350ml',
    slug: 'french-press-350ml',
    category: 'ACCESORIOS',
    price: 420,
    weight: 350,
    stock: 60,
    imageUrl: pickImage(ACCESORIOS_MOKA),
    images: JSON.stringify([pickImage(ACCESORIOS_MOKA), pickImage(ACCESORIOS_MOKA)]),
    description: 'Cafetera de inmersión clásica. Perfecta para uno o dos. Vidrio borosilicato.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'French Press 1L',
    slug: 'french-press-1l',
    category: 'ACCESORIOS',
    price: 580,
    weight: 500,
    stock: 50,
    imageUrl: pickImage(ACCESORIOS_MOKA),
    images: JSON.stringify([pickImage(ACCESORIOS_MOKA), pickImage(ACCESORIOS_MOKA)]),
    description: 'French Press grande para 8 tazas. Cuerpo pesado y sabor robusto.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Kalita Wave 185 — Acero',
    slug: 'kalita-wave-185',
    category: 'ACCESORIOS',
    price: 1200,
    weight: 200,
    stock: 42,
    imageUrl: pickImage(ACCESORIOS_BREWER),
    images: JSON.stringify([pickImage(ACCESORIOS_BREWER), pickImage(ACCESORIOS_BREWER)]),
    description: 'Dripper Kalita Wave con fondo plano. Extracción consistente y limpia.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Clever Dripper L',
    slug: 'clever-dripper',
    category: 'ACCESORIOS',
    price: 480,
    weight: 150,
    stock: 55,
    imageUrl: pickImage(ACCESORIOS_BREWER),
    images: JSON.stringify([pickImage(ACCESORIOS_BREWER), pickImage(ACCESORIOS_BREWER)]),
    description: 'Método híbrido (inmersión + filtración). Ideal para resultados consistentes.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Nel Drip (Bolsa Flanela)',
    slug: 'nel-drip-flanela',
    category: 'ACCESORIOS',
    price: 320,
    weight: 80,
    stock: 70,
    imageUrl: pickImage(ACCESORIOS_BREWER),
    images: JSON.stringify([pickImage(ACCESORIOS_BREWER), pickImage(ACCESORIOS_BREWER)]),
    description: 'Método tailandés con bolsa de tela. Café suave y aromático.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Cold Brew Maker 1L',
    slug: 'cold-brew-maker',
    category: 'ACCESORIOS',
    price: 690,
    weight: 400,
    stock: 48,
    imageUrl: pickImage(ACCESORIOS_BREWER),
    images: JSON.stringify([pickImage(ACCESORIOS_BREWER), pickImage(ACCESORIOS_BREWER)]),
    description: 'Botella de cold brew con filtro integrado. Listo para refrigerar y servir.',
    isLimited: false,
    isActive: true,
  },

  // Kettles
  {
    name: 'Fellow Stagg EKG 0.9L',
    slug: 'fellow-stagg-ekg',
    category: 'ACCESORIOS',
    price: 4200,
    weight: 1100,
    stock: 20,
    imageUrl: pickImage(ACCESORIOS_KETTLE),
    images: JSON.stringify([pickImage(ACCESORIOS_KETTLE), pickImage(ACCESORIOS_KETTLE)]),
    description: 'Kettle de temperatura variable con pantalla LCD. Control de precisión para brew perfecto.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Hario Buono Cuello de Ganso 1.2L',
    slug: 'hario-buono-1200',
    category: 'ACCESORIOS',
    price: 980,
    weight: 600,
    stock: 40,
    imageUrl: pickImage(ACCESORIOS_KETTLE),
    images: JSON.stringify([pickImage(ACCESORIOS_KETTLE), pickImage(ACCESORIOS_KETTLE)]),
    description: 'Kettle de cuello ganso clásico. Control fino del vertido para pour-overs.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Bonavita Variable 1L',
    slug: 'bonavita-kettle',
    category: 'ACCESORIOS',
    price: 1450,
    weight: 900,
    stock: 35,
    imageUrl: pickImage(ACCESORIOS_KETTLE),
    images: JSON.stringify([pickImage(ACCESORIOS_KETTLE), pickImage(ACCESORIOS_KETTLE)]),
    description: 'Kettle de temperatura variable de calidad. Mantiene temperura constante.',
    isLimited: false,
    isActive: true,
  },

  // Scales
  {
    name: 'Timemore Black Mirror Basic',
    slug: 'timemore-black-mirror',
    category: 'ACCESORIOS',
    price: 850,
    weight: 200,
    stock: 55,
    imageUrl: pickImage(ACCESORIOS_BASCULA),
    images: JSON.stringify([pickImage(ACCESORIOS_BASCULA), pickImage(ACCESORIOS_BASCULA)]),
    description: 'Báscula de precisión minimalista con pantalla LED. Rango 0-2kg.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Acaia Pearl S',
    slug: 'acaia-pearl-s',
    category: 'ACCESORIOS',
    price: 2400,
    weight: 350,
    stock: 18,
    imageUrl: pickImage(ACCESORIOS_BASCULA),
    images: JSON.stringify([pickImage(ACCESORIOS_BASCULA), pickImage(ACCESORIOS_BASCULA)]),
    description: 'Báscula de barista profesional con Bluetooth. Rango 0-2kg con precisión.',
    isLimited: false,
    isActive: true,
  },

  // Filters & Consumables
  {
    name: 'Filtros V60 Tabachi (100u)',
    slug: 'filtros-v60-tabachi-100',
    category: 'ACCESORIOS',
    price: 120,
    weight: 100,
    stock: 150,
    imageUrl: pickImage(ACCESORIOS_FILTROS),
    images: JSON.stringify([pickImage(ACCESORIOS_FILTROS), pickImage(ACCESORIOS_FILTROS)]),
    description: 'Filtros de papel premium tabachi para V60. Paquete de 100 unidades.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Filtros V60 Blancos (100u)',
    slug: 'filtros-v60-blancos-100',
    category: 'ACCESORIOS',
    price: 130,
    weight: 100,
    stock: 140,
    imageUrl: pickImage(ACCESORIOS_FILTROS),
    images: JSON.stringify([pickImage(ACCESORIOS_FILTROS), pickImage(ACCESORIOS_FILTROS)]),
    description: 'Filtros blancos para V60. Mejora la claridad del café.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Filtros Kalita Wave 185 (100u)',
    slug: 'filtros-kalita-wave-100',
    category: 'ACCESORIOS',
    price: 150,
    weight: 100,
    stock: 120,
    imageUrl: pickImage(ACCESORIOS_FILTROS),
    images: JSON.stringify([pickImage(ACCESORIOS_FILTROS), pickImage(ACCESORIOS_FILTROS)]),
    description: 'Filtros planos para Kalita Wave. Paquete de 100 unidades.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Filtros AeroPress Paper (350u)',
    slug: 'filtros-aeropress-350',
    category: 'ACCESORIOS',
    price: 160,
    weight: 150,
    stock: 130,
    imageUrl: pickImage(ACCESORIOS_FILTROS),
    images: JSON.stringify([pickImage(ACCESORIOS_FILTROS), pickImage(ACCESORIOS_FILTROS)]),
    description: 'Filtros de papel para AeroPress. Paquete de 350 unidades.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Disco Metálico AeroPress',
    slug: 'disco-metalico-aeropress',
    category: 'ACCESORIOS',
    price: 280,
    weight: 50,
    stock: 80,
    imageUrl: pickImage(ACCESORIOS_FILTROS),
    images: JSON.stringify([pickImage(ACCESORIOS_FILTROS), pickImage(ACCESORIOS_FILTROS)]),
    description: 'Filtro metálico reutilizable para AeroPress. Permite aceites naturales.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Cafiza Cleaning Tablets (25u)',
    slug: 'cafiza-pastillas-25',
    category: 'ACCESORIOS',
    price: 240,
    weight: 150,
    stock: 100,
    imageUrl: pickImage(ACCESORIOS_FILTROS),
    images: JSON.stringify([pickImage(ACCESORIOS_FILTROS), pickImage(ACCESORIOS_FILTROS)]),
    description: 'Pastillas de limpieza para cafetera. Limpieza profunda sin químicos agresivos.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Airscape Canister 500g',
    slug: 'airscape-500g',
    category: 'ACCESORIOS',
    price: 680,
    weight: 300,
    stock: 60,
    imageUrl: pickImage(ACCESORIOS_FILTROS),
    images: JSON.stringify([pickImage(ACCESORIOS_FILTROS), pickImage(ACCESORIOS_FILTROS)]),
    description: 'Contenedor de vacío patentado para preservar frescura de café.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Fellow Atmos 1.2L — Negro',
    slug: 'fellow-atmos-12l',
    category: 'ACCESORIOS',
    price: 1050,
    weight: 400,
    stock: 45,
    imageUrl: pickImage(ACCESORIOS_FILTROS),
    images: JSON.stringify([pickImage(ACCESORIOS_FILTROS), pickImage(ACCESORIOS_FILTROS)]),
    description: 'Contenedor con sistema de presión de aire. Mantiene café fresco hasta 4 semanas.',
    isLimited: false,
    isActive: true,
  },

  // ─── MERCH: 20 products ───────────────────────────────────────────────────

  {
    name: 'Camiseta 12% — Negra',
    slug: 'camiseta-12-negra',
    category: 'MERCH',
    price: 490,
    weight: 200,
    stock: 80,
    imageUrl: pickImage(MERCH_ROPA),
    images: JSON.stringify([pickImage(MERCH_ROPA), pickImage(MERCH_ROPA)]),
    description: 'Camiseta de algodón 100% con logo 12%. Corte cómodo unisex.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Camiseta 12% — Blanca',
    slug: 'camiseta-12-blanca',
    category: 'MERCH',
    price: 490,
    weight: 200,
    stock: 85,
    imageUrl: pickImage(MERCH_ROPA),
    images: JSON.stringify([pickImage(MERCH_ROPA), pickImage(MERCH_ROPA)]),
    description: 'Camiseta blanca con branding minimalista. Tallas S-XL disponibles.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Camiseta 12% — Arena',
    slug: 'camiseta-12-arena',
    category: 'MERCH',
    price: 490,
    weight: 200,
    stock: 75,
    imageUrl: pickImage(MERCH_ROPA),
    images: JSON.stringify([pickImage(MERCH_ROPA), pickImage(MERCH_ROPA)]),
    description: 'Camiseta en tono arena neutro. Combina con todo.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Hoodie 12% — Negro',
    slug: 'hoodie-12-negro',
    category: 'MERCH',
    price: 850,
    weight: 350,
    stock: 55,
    imageUrl: pickImage(MERCH_ROPA),
    images: JSON.stringify([pickImage(MERCH_ROPA), pickImage(MERCH_ROPA)]),
    description: 'Sudadera con capucha 100% algodón. Logo bordado 12%. Calidez y estilo.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Hoodie 12% — Gris',
    slug: 'hoodie-12-gris',
    category: 'MERCH',
    price: 850,
    weight: 350,
    stock: 50,
    imageUrl: pickImage(MERCH_ROPA),
    images: JSON.stringify([pickImage(MERCH_ROPA), pickImage(MERCH_ROPA)]),
    description: 'Hoodie gris carbón. Perfecto para cualquier clima.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Hoodie 12% — Café',
    slug: 'hoodie-12-cafe',
    category: 'MERCH',
    price: 850,
    weight: 350,
    stock: 48,
    imageUrl: pickImage(MERCH_ROPA),
    images: JSON.stringify([pickImage(MERCH_ROPA), pickImage(MERCH_ROPA)]),
    description: 'Hoodie en tono café oscuro. Ideal para amantes del café.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Cap 12% Snapback — Negro',
    slug: 'cap-12-negro',
    category: 'MERCH',
    price: 380,
    weight: 100,
    stock: 100,
    imageUrl: pickImage(MERCH_ROPA),
    images: JSON.stringify([pickImage(MERCH_ROPA), pickImage(MERCH_ROPA)]),
    description: 'Gorra Snapback con ajuste libre. Logo bordado 12%.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Cap 12% Dad Hat — Beige',
    slug: 'cap-12-beige',
    category: 'MERCH',
    price: 350,
    weight: 100,
    stock: 95,
    imageUrl: pickImage(MERCH_ROPA),
    images: JSON.stringify([pickImage(MERCH_ROPA), pickImage(MERCH_ROPA)]),
    description: 'Dad hat en beige con cierre ajustable. Casual y versátil.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Taza Cerámica 12oz — Blanca',
    slug: 'taza-ceramica-12oz-blanca',
    category: 'MERCH',
    price: 320,
    weight: 250,
    stock: 120,
    imageUrl: pickImage(MERCH_TAZA),
    images: JSON.stringify([pickImage(MERCH_TAZA), pickImage(MERCH_TAZA)]),
    description: 'Taza de cerámica 12oz con branding 12%. Lavavajillas y microondas seguros.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Taza Cerámica 12oz — Negra',
    slug: 'taza-ceramica-12oz-negra',
    category: 'MERCH',
    price: 320,
    weight: 250,
    stock: 110,
    imageUrl: pickImage(MERCH_TAZA),
    images: JSON.stringify([pickImage(MERCH_TAZA), pickImage(MERCH_TAZA)]),
    description: 'Taza negra con diseño 12%. Material premium y acabado mate.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Taza Cerámica 16oz',
    slug: 'taza-ceramica-16oz',
    category: 'MERCH',
    price: 360,
    weight: 300,
    stock: 100,
    imageUrl: pickImage(MERCH_TAZA),
    images: JSON.stringify([pickImage(MERCH_TAZA), pickImage(MERCH_TAZA)]),
    description: 'Taza grande 16oz para bebidas generosas. Cerámica de calidad.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Travel Mug Termo 350ml',
    slug: 'travel-mug-350ml',
    category: 'MERCH',
    price: 580,
    weight: 280,
    stock: 80,
    imageUrl: pickImage(MERCH_TAZA),
    images: JSON.stringify([pickImage(MERCH_TAZA), pickImage(MERCH_TAZA)]),
    description: 'Termo aislante de doble pared. Mantiene temperatura hasta 8 horas.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Vaso Borosilicato 350ml',
    slug: 'vaso-vidrio-350ml',
    category: 'MERCH',
    price: 420,
    weight: 200,
    stock: 90,
    imageUrl: pickImage(MERCH_TAZA),
    images: JSON.stringify([pickImage(MERCH_TAZA), pickImage(MERCH_TAZA)]),
    description: 'Vaso de vidrio borosilicato resistente al calor. Perfecto para cold brew.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Vaso Espresso Doble Pared 100ml',
    slug: 'vaso-espresso-doble',
    category: 'MERCH',
    price: 280,
    weight: 120,
    stock: 110,
    imageUrl: pickImage(MERCH_TAZA),
    images: JSON.stringify([pickImage(MERCH_TAZA), pickImage(MERCH_TAZA)]),
    description: 'Vaso espresso de doble pared. Mantiene calor sin quemar manos.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Tote Bag 12%',
    slug: 'tote-bag-12',
    category: 'MERCH',
    price: 250,
    weight: 150,
    stock: 130,
    imageUrl: pickImage(MERCH_ACCESORIOS),
    images: JSON.stringify([pickImage(MERCH_ACCESORIOS), pickImage(MERCH_ACCESORIOS)]),
    description: 'Bolsa de tela con logo 12%. Ecofriendly y resistente.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Delantal Barista Canvas',
    slug: 'delantal-barista',
    category: 'MERCH',
    price: 650,
    weight: 200,
    stock: 60,
    imageUrl: pickImage(MERCH_ACCESORIOS),
    images: JSON.stringify([pickImage(MERCH_ACCESORIOS), pickImage(MERCH_ACCESORIOS)]),
    description: 'Delantal canvas profesional para baristas. Bolsillos prácticos.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Sticker Pack (10u)',
    slug: 'stickers-pack-10',
    category: 'MERCH',
    price: 180,
    weight: 30,
    stock: 200,
    imageUrl: pickImage(MERCH_ACCESORIOS),
    images: JSON.stringify([pickImage(MERCH_ACCESORIOS), pickImage(MERCH_ACCESORIOS)]),
    description: 'Paquete de 10 stickers variados 12%. Diseños exclusivos.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Libreta Barista 120p',
    slug: 'libreta-barista',
    category: 'MERCH',
    price: 220,
    weight: 150,
    stock: 140,
    imageUrl: pickImage(MERCH_ACCESORIOS),
    images: JSON.stringify([pickImage(MERCH_ACCESORIOS), pickImage(MERCH_ACCESORIOS)]),
    description: 'Libreta con páginas especiales para registrar recetas de café. 120 páginas.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Pin Set Colección (5 pines)',
    slug: 'pin-set-coleccion',
    category: 'MERCH',
    price: 290,
    weight: 50,
    stock: 160,
    imageUrl: pickImage(MERCH_ACCESORIOS),
    images: JSON.stringify([pickImage(MERCH_ACCESORIOS), pickImage(MERCH_ACCESORIOS)]),
    description: 'Set de 5 pines coleccionables con diferentes diseños de café.',
    isLimited: false,
    isActive: true,
  },
  {
    name: 'Poster 12% Café 30x40cm',
    slug: 'poster-12-cafe',
    category: 'MERCH',
    price: 350,
    weight: 100,
    stock: 120,
    imageUrl: pickImage(MERCH_ACCESORIOS),
    images: JSON.stringify([pickImage(MERCH_ACCESORIOS), pickImage(MERCH_ACCESORIOS)]),
    description: 'Póster artístico 30x40cm para decorar espacios. Impresión premium.',
    isLimited: false,
    isActive: true,
  },
];

// Map products by slug for bundle reference
const productMap = new Map(products.map(p => [p.slug, p]));

// Bundles: 10 themed packages
const bundles = [
  {
    name: 'Starter V60',
    description: 'Kit completo para iniciar en métodos de filtro. V60 plastic + filtros + báscula + café.',
    basePrice: 1280,
    discountPct: 15,
    imageUrl: pickImage(ACCESORIOS_BREWER),
    items: [
      { productSlug: 'v60-02-plastic', quantity: 1 },
      { productSlug: 'filtros-v60-tabachi-100', quantity: 1 },
      { productSlug: 'timemore-black-mirror', quantity: 1 },
      { productSlug: 'coatepec-lavado', quantity: 1 },
    ],
  },
  {
    name: 'Starter AeroPress',
    description: 'Todo lo que necesitas para AeroPress. Prensa + filtros + disco + café blend.',
    basePrice: 1550,
    discountPct: 15,
    imageUrl: pickImage(ACCESORIOS_BREWER),
    items: [
      { productSlug: 'aeropress-original', quantity: 1 },
      { productSlug: 'filtros-aeropress-350', quantity: 1 },
      { productSlug: 'disco-metalico-aeropress', quantity: 1 },
      { productSlug: 'blend-12', quantity: 1 },
    ],
  },
  {
    name: 'Espresso Home Kit',
    description: 'Moka pot + café espresso + tazas cerámica para bebidas italianas.',
    basePrice: 1210,
    discountPct: 12,
    imageUrl: pickImage(ACCESORIOS_MOKA),
    items: [
      { productSlug: 'moka-6-tazas', quantity: 1 },
      { productSlug: 'blend-espresso-12', quantity: 1 },
      { productSlug: 'taza-ceramica-12oz-negra', quantity: 2 },
    ],
  },
  {
    name: 'México Discovery Box',
    description: 'Degustación de 4 orígenes mexicanos. 100g cada uno para exploración.',
    basePrice: 1150,
    discountPct: 10,
    imageUrl: pickImage(CAFÉ_BOLSA),
    items: [
      { productSlug: 'coatepec-lavado', quantity: 1 },
      { productSlug: 'jaltenango-honey', quantity: 1 },
      { productSlug: 'pluma-natural', quantity: 1 },
      { productSlug: 'atoyac-natural', quantity: 1 },
    ],
  },
  {
    name: 'Barista Pro Setup',
    description: 'Molino premium + kettle de temperatura + báscula. Para baristas serios.',
    basePrice: 7850,
    discountPct: 12,
    imageUrl: pickImage(ACCESORIOS_MOLINILLO),
    items: [
      { productSlug: 'comandante-c40-negro', quantity: 1 },
      { productSlug: 'fellow-stagg-ekg', quantity: 1 },
      { productSlug: 'timemore-black-mirror', quantity: 1 },
    ],
  },
  {
    name: 'Regalo Café',
    description: 'Paquete regalo con café, taza, stickers y tote bag. Perfecto para regalar.',
    basePrice: 910,
    discountPct: 10,
    imageUrl: pickImage(MERCH_TAZA),
    items: [
      { productSlug: 'blend-12', quantity: 1 },
      { productSlug: 'taza-ceramica-12oz-blanca', quantity: 1 },
      { productSlug: 'stickers-pack-10', quantity: 1 },
      { productSlug: 'tote-bag-12', quantity: 1 },
    ],
  },
  {
    name: 'Colección Geisha',
    description: 'Tres microlotes Geisha de lujo. Para verdaderos exploradores de sabor.',
    basePrice: 2120,
    discountPct: 8,
    imageUrl: pickImage(CAFÉ_BOLSA),
    items: [
      { productSlug: 'tapachula-geisha', quantity: 1 },
      { productSlug: 'el-triunfo-geisha', quantity: 1 },
      { productSlug: 'geisha-doble-fermentado', quantity: 1 },
    ],
  },
  {
    name: 'Cold Brew Kit',
    description: 'Cold brew maker + café blend especial + vaso de vidrio.',
    basePrice: 1350,
    discountPct: 15,
    imageUrl: pickImage(ACCESORIOS_BREWER),
    items: [
      { productSlug: 'cold-brew-maker', quantity: 1 },
      { productSlug: 'cold-brew-blend', quantity: 1 },
      { productSlug: 'vaso-vidrio-350ml', quantity: 1 },
    ],
  },
  {
    name: 'Oficina Completa',
    description: 'French press + café mañana + tazas cerámicas. Para usar en la oficina.',
    basePrice: 1960,
    discountPct: 10,
    imageUrl: pickImage(ACCESORIOS_MOKA),
    items: [
      { productSlug: 'french-press-1l', quantity: 1 },
      { productSlug: 'blend-mañana', quantity: 1 },
      { productSlug: 'taza-ceramica-12oz-blanca', quantity: 4 },
    ],
  },
  {
    name: 'Explorador+',
    description: 'Nuestro bundle bestseller mejorado. Todo para explorar 12% con estilo.',
    basePrice: 4130,
    discountPct: 15,
    imageUrl: pickImage(ACCESORIOS_MOLINILLO),
    items: [
      { productSlug: 'blend-12', quantity: 1 },
      { productSlug: 'comandante-c40-negro', quantity: 1 },
      { productSlug: 'filtros-v60-blancos-100', quantity: 1 },
      { productSlug: 'taza-ceramica-12oz-blanca', quantity: 1 },
    ],
  },
];

async function main() {
  console.log('🌱 Iniciando seed de cafetería con 114 productos, 10 bundles y 16 achievements...\n');

  // ──────────────────────────────────────────────────────────────────────────
  // 0. SEED achievements
  // ──────────────────────────────────────────────────────────────────────────
  console.log('🏆 Creando logros...');
  const achievements = [
    { name: 'Primer Brew', slug: 'first_brew', icon: '☕', description: 'Registra tu primer brew', rarity: 'COMMON', xpReward: 10 },
    { name: 'Cinco Brews', slug: 'five_brews', icon: '🎯', description: '5 brews registrados', rarity: 'UNCOMMON', xpReward: 25 },
    { name: 'Diez Brews', slug: 'ten_brews', icon: '⚡', description: '10 brews registrados', rarity: 'UNCOMMON', xpReward: 40 },
    { name: 'Brew Perfecto', slug: 'perfect_brew', icon: '⭐', description: 'Brew con calificación 10/10', rarity: 'RARE', xpReward: 50 },
    { name: 'V60 Experto', slug: 'v60_5', icon: '▽', description: '5 brews con V60', rarity: 'UNCOMMON', xpReward: 30 },
    { name: 'AeroPress Experto', slug: 'aeropress_5', icon: '⊕', description: '5 brews con AeroPress', rarity: 'UNCOMMON', xpReward: 30 },
    { name: 'Espresso Experto', slug: 'espresso_5', icon: '☕', description: '5 brews con Espresso', rarity: 'UNCOMMON', xpReward: 30 },
    { name: 'Racha de 3', slug: 'streak_3', icon: '🔥', description: '3 días consecutivos preparando café', rarity: 'COMMON', xpReward: 15 },
    { name: 'Racha de 7', slug: 'streak_7', icon: '🔥', description: '7 días consecutivos preparando café', rarity: 'UNCOMMON', xpReward: 30 },
    { name: 'Café Connoisseur', slug: 'coffee_connoisseur', icon: '🎓', description: '50 brews registrados', rarity: 'UNCOMMON', xpReward: 50 },
    { name: 'Racha Perfecta 30', slug: 'perfect_streak_30', icon: '🔥', description: '30 días consecutivos preparando café', rarity: 'RARE', xpReward: 75 },
    { name: 'Coleccionista de Métodos', slug: 'method_collector', icon: '🎯', description: '5+ brews de 3 métodos diferentes', rarity: 'UNCOMMON', xpReward: 40 },
    { name: 'Maestro Catador', slug: 'master_taster', icon: '⭐', description: 'Promedio de calificación ≥ 8', rarity: 'RARE', xpReward: 60 },
    { name: 'Madrugador', slug: 'early_bird', icon: '🌅', description: '5 brews antes de las 8am', rarity: 'UNCOMMON', xpReward: 30 },
    { name: 'Búho Nocturno', slug: 'night_owl', icon: '🌙', description: '5 brews después de las 9pm', rarity: 'UNCOMMON', xpReward: 30 },
    { name: 'Guerrero del Fin de Semana', slug: 'weekend_warrior', icon: '⚔️', description: '10 brews durante fines de semana', rarity: 'UNCOMMON', xpReward: 45 },
  ];

  for (const ach of achievements) {
    const existing = await prisma.achievement.findUnique({ where: { slug: ach.slug } });
    if (!existing) {
      await prisma.achievement.create({ data: ach });
    }
  }
  console.log(`   ✓ ${achievements.length} logros creados\n`);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. DELETE existing data (optional, for clean slate)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('🧹 Limpiando datos existentes...');
  await prisma.bundleItem.deleteMany({});
  await prisma.bundle.deleteMany({});
  await prisma.subscriptionItem.deleteMany({});
  await prisma.product.deleteMany({});
  console.log('   ✓ Datos previos eliminados\n');

  // ──────────────────────────────────────────────────────────────────────────
  // 2. CREATE products
  // ──────────────────────────────────────────────────────────────────────────
  console.log('☕ Creando 114 productos...');
  const createdProducts = [];
  for (const product of products) {
    const isCafe = product.category === 'CAFÉ';
    const p = product as any;

    let producer: string | null = null;
    let farmName: string | null = null;
    let harvestYear: number | null = null;
    let certifications: string | null = null;
    let body: string | null = null;
    let acidity: string | null = null;
    let processingDescription: string | null = null;
    let recommendedBrewMethod: string | null = null;
    let brewTemperature: number | null = null;
    let brewRatio: string | null = null;
    let grindSize: string | null = null;
    let tastingNotes: string | null = null;
    let pairingSuggestions: string | null = null;
    let isMemberExclusive = false;

    if (isCafe) {
      producer = producerForOrigin(p.origin);
      farmName = farmNameForOrigin(p.origin);
      harvestYear = 2025;
      certifications = certificationsFor(p.altitude, p.scaScore, p.isLimited);
      body = bodyForProcess(p.process);
      acidity = acidityForAltitude(p.altitude);
      processingDescription = processingDescForProcess(p.process);
      recommendedBrewMethod = brewMethodForScore(p.scaScore);
      brewTemperature = brewTempForRoast(p.roastLevel);
      brewRatio = brewRatioForRoast(p.roastLevel);
      grindSize = grindSizeForMethod(recommendedBrewMethod);
      tastingNotes = tastingNotesFor(p.flavors, body, acidity);
      pairingSuggestions = pairingForProcess(p.process);
      isMemberExclusive = (p.scaScore >= 89) || p.isLimited;
    }

    const created = await prisma.product.create({
      data: {
        ...product,
        producer,
        farmName,
        harvestYear,
        certifications,
        body,
        acidity,
        processingDescription,
        recommendedBrewMethod,
        brewTemperature,
        brewRatio,
        grindSize,
        tastingNotes,
        pairingSuggestions,
        isMemberExclusive,
        sku: product.slug.toUpperCase(),
        costPrice: Math.round(product.price * 0.3),
        supplier: 'Cafetería 12%',
        minOrderQty: 1,
        lowStockThreshold: product.isLimited ? 5 : 10,
      },
    });
    createdProducts.push(created);
  }
  console.log(`   ✓ ${createdProducts.length} productos creados\n`);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. CREATE bundles with bundle items
  // ──────────────────────────────────────────────────────────────────────────
  console.log('📦 Creando 10 bundles...');
  for (const bundle of bundles) {
    const created = await prisma.bundle.create({
      data: {
        name: bundle.name,
        description: bundle.description,
        basePrice: bundle.basePrice,
        discountPct: bundle.discountPct,
        finalPrice: bundle.basePrice * (1 - bundle.discountPct / 100),
        imageUrl: bundle.imageUrl,
        isActive: true,
      },
    });

    // Create bundle items
    for (const item of bundle.items) {
      const product = createdProducts.find(p => p.slug === item.productSlug);
      if (!product) {
        console.warn(`   ⚠ Producto no encontrado: ${item.productSlug}`);
        continue;
      }
      await prisma.bundleItem.create({
        data: {
          bundleId: created.id,
          productId: product.id,
          quantity: item.quantity,
        },
      });
    }
    console.log(`   ✓ Bundle "${created.name}" creado con ${bundle.items.length} items`);
  }

  console.log(`\n✨ Seed completado exitosamente!`);
  console.log(`   • 11 achievements`);
  console.log(`   • 114 productos (55 CAFÉ + 35 ACCESORIOS + 20 MERCH)`);
  console.log(`   • 10 bundles temáticos`);
}

main()
  .catch(e => {
    console.error('❌ Error durante seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
