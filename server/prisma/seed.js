const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const products = [
  {
    name: 'Coatepec Lavado', slug: 'coatepec-lavado', category: 'CAFÉ',
    origin: 'México', region: 'Coatepec, Veracruz', altitude: 1400,
    variety: 'Typica, Bourbon', process: 'Lavado', scaScore: 86.0,
    roastLevel: 'Medio-Ligero',
    flavors: JSON.stringify(['Chocolate amargo', 'Durazno', 'Miel de abeja', 'Frambuesa']),
    recipes: JSON.stringify([
      { title: 'V60', method: 'Filtro', temp: '92°C', grind: 'Medio-fino', ratio: '1:15', steps: ['Moler 15g de café', 'Pre-infusión 30s con 50ml', 'Verter 200ml en 2-3 pulsos', 'Extracción en 3:00-3:30 min'], videoUrl: 'https://www.youtube.com/embed/AI4ynXzkSQo' },
      { title: 'Prensa Francesa', method: 'Inmersión', temp: '94°C', grind: 'Grueso', ratio: '1:12', steps: ['Moler 20g de café', 'Agregar 240ml de agua', 'Revolver y esperar 4 min', 'Presionar lentamente y servir'], videoUrl: 'https://www.youtube.com/embed/st571DYYTR8' }
    ]),
    price: 280, weight: 250, stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
    description: 'Lote de origen único proveniente de las faldas del Cofre de Perote. Perfil dulce y balanceado ideal para consumo diario. Producido por la familia Méndez en su tercera generación cafetalera.',
    isLimited: false, isActive: true,
  },
  {
    name: 'Huatusco Natural', slug: 'huatusco-natural', category: 'CAFÉ',
    origin: 'México', region: 'Huatusco, Veracruz', altitude: 1200,
    variety: 'Caturra', process: 'Natural', scaScore: 84.5, roastLevel: 'Medio',
    flavors: JSON.stringify(['Frutos rojos', 'Caramelo', 'Cacao', 'Canela']),
    recipes: JSON.stringify([
      { title: 'Chemex', method: 'Filtro', temp: '93°C', grind: 'Medio', ratio: '1:15', steps: ['Moler 30g', 'Pre-infusión 45s', 'Verter 450ml en círculos', 'Extraer en 4:00 min'], videoUrl: 'https://www.youtube.com/embed/ikt-X5x7yoc' },
      { title: 'Moka', method: 'Presión', temp: 'Fuego medio', grind: 'Fino', ratio: '1:7', steps: ['Llenar canasta con café', 'Agua fría hasta válvula', 'Fuego medio-bajo', 'Retirar al silbido'], videoUrl: 'https://www.youtube.com/embed/rpyJ4gFzHCo' }
    ]),
    price: 260, weight: 250, stock: 35,
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
    description: 'Proceso natural que resalta la dulzura frutal del grano. Notas intensas a frutos rojos con un finish a cacao oscuro.',
    isLimited: false, isActive: true,
  },
  {
    name: 'Jaltenango Honey', slug: 'jaltenango-honey', category: 'CAFÉ',
    origin: 'México', region: 'Jaltenango, Chiapas', altitude: 1600,
    variety: 'Bourbon Amarillo', process: 'Honey', scaScore: 87.0, roastLevel: 'Ligero',
    flavors: JSON.stringify(['Mango', 'Maracuyá', 'Miel', 'Flor de azahar']),
    recipes: JSON.stringify([
      { title: 'Pour Over V60', method: 'Filtro', temp: '91°C', grind: 'Medio-fino', ratio: '1:16', steps: ['Moler 12g', 'Pre-infusión suave 25s', 'Verter en espiral hacia afuera', 'Total 3:00-3:30 min'], videoUrl: 'https://www.youtube.com/embed/AI4ynXzkSQo' }
    ]),
    price: 320, weight: 250, stock: 25,
    imageUrl: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&w=800&q=80',
    description: 'Proceso honey que preserva la mucilago del grano, otorgando dulzura tropical y cuerpo cremoso.',
    isLimited: false, isActive: true,
  },
  {
    name: 'Tapachula Geisha', slug: 'tapachula-geisha', category: 'CAFÉ',
    origin: 'México', region: 'Tapachula, Chiapas', altitude: 1800,
    variety: 'Geisha', process: 'Lavado', scaScore: 89.5, roastLevel: 'Ligero',
    flavors: JSON.stringify(['Jazmín', 'Bergamota', 'Melocotón blanco', 'Té negro']),
    recipes: JSON.stringify([
      { title: 'Kalita Wave', method: 'Filtro', temp: '90°C', grind: 'Medio', ratio: '1:17', steps: ['Moler 10g café', 'Pre-infusión 30s con 20ml', 'Verter en pulsos de 50ml', 'Extracción 3:30-4:00 min'], videoUrl: 'https://www.youtube.com/embed/AI4ynXzkSQo' }
    ]),
    price: 680, weight: 100, stock: 10,
    imageUrl: 'https://images.unsplash.com/photo-1497515114629-f71d768fd07c?auto=format&fit=crop&w=800&q=80',
    description: 'Microlote de variedad Geisha cultivada a 1800 metros. Perfil floral excepcional con acidez cítrica brillante. Edición limitada.',
    isLimited: true, isActive: true,
  },
  {
    name: 'Pink Bourbon Anaeróbico', slug: 'pink-bourbon-anaerobico', category: 'CAFÉ',
    origin: 'México', region: 'Soconusco, Chiapas', altitude: 1750,
    variety: 'Pink Bourbon', process: 'Anaeróbico Natural', scaScore: 88.0, roastLevel: 'Ligero',
    flavors: JSON.stringify(['Fresa', 'Ron', 'Hibisco', 'Mora azul']),
    recipes: JSON.stringify([
      { title: 'Cold Brew', method: 'Inmersión fría', temp: '4°C (refrigerador)', grind: 'Extra grueso', ratio: '1:8', steps: ['Moler 60g', 'Mezclar con 500ml agua fría', 'Refrigerar 16-24 horas', 'Filtrar y servir con hielo'], videoUrl: 'https://www.youtube.com/embed/544prMSTFls' }
    ]),
    price: 540, weight: 150, stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1611564494260-6f21b80af7ea?auto=format&fit=crop&w=800&q=80',
    description: 'Proceso experimental anaeróbico de 72 horas en tanques sellados. Perfil intensamente frutal.',
    isLimited: true, isActive: true,
  },
  {
    name: 'Blend 12%', slug: 'blend-12', category: 'CAFÉ',
    origin: 'México', region: 'Veracruz / Chiapas', altitude: 1300,
    variety: 'Typica, Caturra, Bourbon', process: 'Lavado / Natural', scaScore: 84.0, roastLevel: 'Medio',
    flavors: JSON.stringify(['Chocolate con leche', 'Almendra', 'Panela', 'Vainilla']),
    recipes: JSON.stringify([
      { title: 'Espresso', method: 'Presión', temp: '93°C', grind: 'Muy fino', ratio: '1:2', steps: ['Moler 18g', 'Tampar con 30kg de presión', 'Extraer en 25-30s', 'Rendimiento: 36ml'], videoUrl: 'https://www.youtube.com/embed/bG9bBFT0wl8' },
      { title: 'Americano', method: 'Espresso + agua', temp: '93°C', grind: 'Muy fino', ratio: '1:5', steps: ['Preparar espresso 18g/36ml', 'Agregar 150ml agua caliente', 'Servir inmediatamente'], videoUrl: 'https://www.youtube.com/embed/bG9bBFT0wl8' }
    ]),
    price: 240, weight: 250, stock: 80,
    imageUrl: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=800&q=80',
    description: 'Nuestro blend emblema. Selección curada de los mejores lotes del año para ofrecer un perfil balanceado, consistente y accesible.',
    isLimited: false, isActive: true,
  },
  {
    name: 'Soconusco Washed', slug: 'soconusco-washed', category: 'CAFÉ',
    origin: 'México', region: 'Soconusco, Chiapas', altitude: 1500,
    variety: 'Typica, Maragogype', process: 'Lavado', scaScore: 85.5, roastLevel: 'Medio-Ligero',
    flavors: JSON.stringify(['Naranja', 'Almendra tostada', 'Caramelo', 'Avellana']),
    recipes: JSON.stringify([
      { title: 'V60', method: 'Filtro', temp: '92°C', grind: 'Medio-fino', ratio: '1:15',
        steps: ['Moler 15g', 'Pre-infusión 30s con 50ml', 'Verter 200ml en 2 pulsos', 'Extraer en 3:00-3:30 min'],
        videoUrl: 'https://www.youtube.com/embed/AI4ynXzkSQo' },
      { title: 'Chemex', method: 'Filtro', temp: '93°C', grind: 'Medio', ratio: '1:15',
        steps: ['Moler 30g', 'Pre-infusión 45s', 'Verter 450ml en círculos', 'Extraer en 4:00 min'],
        videoUrl: 'https://www.youtube.com/embed/ikt-X5x7yoc' }
    ]),
    price: 290, weight: 250, stock: 40,
    imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80',
    description: 'Lote de la variedad Maragogype, conocida por su grano gigante y perfil suave. Proceso lavado que revela notas cítricas y una acidez delicada.',
    isLimited: false, isActive: true,
  },
  {
    name: 'Veracruz Oscuro', slug: 'veracruz-oscuro', category: 'CAFÉ',
    origin: 'México', region: 'Xico, Veracruz', altitude: 1100,
    variety: 'Mundo Novo, Typica', process: 'Natural', scaScore: 84.0, roastLevel: 'Oscuro',
    flavors: JSON.stringify(['Chocolate negro', 'Nuez', 'Tabaco dulce', 'Dátil']),
    recipes: JSON.stringify([
      { title: 'Prensa Francesa', method: 'Inmersión', temp: '94°C', grind: 'Grueso', ratio: '1:12',
        steps: ['Moler 20g', 'Agregar 240ml agua', 'Revolver y esperar 4 min', 'Presionar y servir'],
        videoUrl: 'https://www.youtube.com/embed/st571DYYTR8' },
      { title: 'Espresso', method: 'Presión', temp: '93°C', grind: 'Muy fino', ratio: '1:2',
        steps: ['Moler 18g', 'Tampar con 30kg de presión', 'Extraer en 25-30s', 'Rendimiento: 36ml'],
        videoUrl: 'https://www.youtube.com/embed/bG9bBFT0wl8' }
    ]),
    price: 250, weight: 250, stock: 60,
    imageUrl: 'https://images.unsplash.com/photo-1559056169-641e0ac8618e?auto=format&fit=crop&w=800&q=80',
    description: 'Tueste oscuro de origen Veracruz. Perfecto para espresso con leche. Cuerpo potente con chocolate amargo y notas de nuez en el finish.',
    isLimited: false, isActive: true,
  },
  {
    name: 'San Cristóbal Honey', slug: 'san-cristobal-honey', category: 'CAFÉ',
    origin: 'México', region: 'San Cristóbal de las Casas, Chiapas', altitude: 1650,
    variety: 'Catuaí Amarillo', process: 'Honey', scaScore: 86.5, roastLevel: 'Ligero',
    flavors: JSON.stringify(['Durazno', 'Guayaba', 'Miel de flores', 'Jazmín']),
    recipes: JSON.stringify([
      { title: 'Chemex', method: 'Filtro', temp: '91°C', grind: 'Medio', ratio: '1:16',
        steps: ['Moler 30g', 'Pre-infusión 40s con 60ml', 'Verter 480ml lentamente', 'Extraer en 4:30 min'],
        videoUrl: 'https://www.youtube.com/embed/ikt-X5x7yoc' },
      { title: 'Cold Brew', method: 'Inmersión fría', temp: '4°C (refrigerador)', grind: 'Extra grueso', ratio: '1:8',
        steps: ['Moler 60g', 'Mezclar con 500ml agua fría', 'Refrigerar 16-24 horas', 'Filtrar y servir con hielo'],
        videoUrl: 'https://www.youtube.com/embed/544prMSTFls' }
    ]),
    price: 310, weight: 250, stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=800&q=80',
    description: 'Proceso honey de Catuaí Amarillo cultivado en los Altos de Chiapas. La mucilago retenida aporta una dulzura frutal característica.',
    isLimited: false, isActive: true,
  },
  {
    name: 'Cápsulas Nespresso — Blend 12%', slug: 'capsulas-nespresso-blend', category: 'CAFÉ',
    origin: 'México', region: 'Veracruz / Chiapas', altitude: 1300,
    variety: 'Typica, Caturra, Bourbon', process: 'Lavado / Natural', scaScore: 84.0, roastLevel: 'Medio',
    flavors: JSON.stringify(['Chocolate con leche', 'Almendra', 'Panela']),
    recipes: JSON.stringify([
      { title: 'Espresso', method: 'Cápsula Nespresso', temp: '93°C', grind: 'Cápsula', ratio: '1:2',
        steps: ['Insertar cápsula en tu máquina Nespresso', 'Seleccionar modo espresso (40ml)', 'Disfrutar directamente o agregar leche'],
        videoUrl: 'https://www.youtube.com/embed/bG9bBFT0wl8' }
    ]),
    price: 195, weight: 56, stock: 100,
    imageUrl: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80',
    description: 'Nuestro Blend 12% en formato cápsula compatible con Nespresso Original Line. Caja de 10 cápsulas de aluminio reciclable. Sin comprometer el sabor del café de especialidad.',
    isLimited: false, isActive: true,
  },
  {
    name: 'Cápsulas Nespresso — Jaltenango Honey', slug: 'capsulas-nespresso-jaltenango', category: 'CAFÉ',
    origin: 'México', region: 'Jaltenango, Chiapas', altitude: 1600,
    variety: 'Bourbon Amarillo', process: 'Honey', scaScore: 87.0, roastLevel: 'Ligero',
    flavors: JSON.stringify(['Mango', 'Miel', 'Flor de azahar']),
    recipes: JSON.stringify([
      { title: 'Espresso', method: 'Cápsula Nespresso', temp: '93°C', grind: 'Cápsula', ratio: '1:2',
        steps: ['Insertar cápsula en tu máquina Nespresso', 'Seleccionar modo espresso (40ml)', 'Agregar leche vaporizada para un latte tropical'],
        videoUrl: 'https://www.youtube.com/embed/bG9bBFT0wl8' }
    ]),
    price: 220, weight: 56, stock: 80,
    imageUrl: 'https://images.unsplash.com/photo-1562547256-2c5ee93b60b7?auto=format&fit=crop&w=800&q=80',
    description: 'El perfil honey del Jaltenango capturado en cápsula. Dulzura tropical en 30 segundos. Compatible con Nespresso Original Line. Caja de 10 cápsulas.',
    isLimited: false, isActive: true,
  },
  {
    name: 'Comandante Grinder C40', slug: 'comandante-grinder', category: 'ACCESORIOS',
    price: 95, stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1559547669-acf713ad3fb0?auto=format&fit=crop&w=800&q=80',
    description: 'Molino de mano manual de alta precisión con 40 pasos de ajuste infinito. Cuerpo de acero inoxidable y titanio. El estándar de la industria para café de especialidad.',
    isLimited: false, isActive: true,
  },
  {
    name: 'Set V60 + Chemex 3-cup', slug: 'v60-chemex-set', category: 'ACCESORIOS',
    price: 85, stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1599599810694-a5d5b2fc1f30?auto=format&fit=crop&w=800&q=80',
    description: 'Kit de inicio en métodos de filtro. Incluye dripper V60 cerámico, Chemex 3-tazas y un paquete de filtros de papel. El mejor regalo para un cafero en ciernes.',
    isLimited: false, isActive: true,
  },
  {
    name: 'Filtros Japoneses — 100 uds', slug: 'filtros-japoneses', category: 'ACCESORIOS',
    price: 8, stock: 80,
    imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688fa566e?auto=format&fit=crop&w=800&q=80',
    description: 'Filtros de papel premium sin cloro. Compatibles con V60 tamaño 02, Kalita Wave 185, Melitta. Mejoran la claridad y el perfil limpio del café.',
    isLimited: false, isActive: true,
  },
  {
    name: 'Báscula Timemore Black Mirror', slug: 'bascula-timemore', category: 'ACCESORIOS',
    price: 55, stock: 12,
    imageUrl: 'https://images.unsplash.com/photo-1606791405792-1004f1718d0c?auto=format&fit=crop&w=800&q=80',
    description: 'Báscula de alta precisión con temporizador integrado. Respuesta en 0.1g. Ideal para medir la relación exacta café:agua durante el proceso de preparación.',
    isLimited: false, isActive: true,
  },
  {
    name: 'Taza Café 12% — Cerámica 10oz', slug: 'taza-ceramic-12', category: 'MERCH',
    price: 25, stock: 60,
    imageUrl: 'https://images.unsplash.com/photo-1572365992253-3cb3e56dd362?auto=format&fit=crop&w=800&q=80',
    description: 'Taza de cerámica artesanal con el logo de Café 12%. 10oz, doble pared, apta para lavavajillas. Diseño minimalista que combina con cualquier cocina.',
    isLimited: false, isActive: true,
  },
  {
    name: 'Hoodie Café 12% — Algodón 100%', slug: 'hoodie-cafe-12', category: 'MERCH',
    price: 55, stock: 30,
    imageUrl: 'https://images.unsplash.com/photo-1556821552-5f94d2fdf561?auto=format&fit=crop&w=800&q=80',
    description: 'Sudadera con capucha de algodón 100% pre-lavado. Logo bordado de Café 12% en el pecho. Unisex, tallas S-XL. El favorito de nuestro equipo.',
    isLimited: false, isActive: true,
  },
];

async function main() {
  console.log('Seeding database...');

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: product,
      create: product,
    });
  }
  console.log(`Seeded ${products.length} products`);

  const hashedPassword = await bcrypt.hash('admin123', 12);
  await prisma.adminUser.upsert({
    where: { email: 'admin@12porciento.com' },
    update: {},
    create: { name: 'Administrador', email: 'admin@12porciento.com', password: hashedPassword },
  });

  const blendId = (await prisma.product.findUnique({ where: { slug: 'blend-12' } }))?.id;
  const comandanteId = (await prisma.product.findUnique({ where: { slug: 'comandante-grinder' } }))?.id;
  const filtrosId = (await prisma.product.findUnique({ where: { slug: 'filtros-japoneses' } }))?.id;
  const tazaId = (await prisma.product.findUnique({ where: { slug: 'taza-ceramic-12' } }))?.id;
  const basicId = (await prisma.product.findUnique({ where: { slug: 'coatepec-lavado' } }))?.id;
  const basiclId = (await prisma.product.findUnique({ where: { slug: 'bascula-timemore' } }))?.id;

  const existingBundle = await prisma.bundle.findFirst({ where: { name: 'Explorador+' } });
  if (!existingBundle && blendId && comandanteId && filtrosId && tazaId) {
    await prisma.bundle.create({
      data: {
        name: 'Explorador+',
        description: 'Todo lo que necesitas para empezar tu aventura en el café de especialidad. Café curado + equipo esencial de barista.',
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
            { productId: tazaId, quantity: 2 },
          ],
        },
      },
    });
    console.log('Created bundle: Explorador+');
  }

  if (!existingBundle && basicId && basiclId) {
    await prisma.bundle.create({
      data: {
        name: 'Kit Precision',
        description: 'El combo del barista analítico: café de origen único + báscula de precisión + filtros premium.',
        basePrice: 343,
        discountPct: 10,
        finalPrice: 309,
        imageUrl: 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?auto=format&fit=crop&w=800&q=80',
        isActive: true,
        items: {
          create: [
            { productId: basicId, quantity: 1 },
            { productId: basiclId, quantity: 1 },
            { productId: filtrosId, quantity: 1 },
          ],
        },
      },
    });
    console.log('Created bundle: Kit Precision');
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

  // ── Recipes ───────────────────────────────────────────────────────────────
  const recipes = [
    {
      slug: 'v60-clasico', title: 'V60 Clásico',
      description: 'La base de todo barista: extracción limpia y brillante que resalta la acidez y dulzura del café de especialidad.',
      method: 'V60', difficulty: 'MEDIA', prepTime: 5, yield: '250 ml',
      temp: '93°C', grind: 'Medio-fino', ratio: '1:15 (15g / 225ml)',
      isPremium: false, isPublished: true, productSlug: 'coatepec-lavado',
      steps: [
        { order: 1, title: 'Pesa y muele', description: 'Pesa 15g de café y muele a punto medio-fino, similar a azúcar morena.', duration: 30 },
        { order: 2, title: 'Pre-infusión', description: 'Vierte 30ml de agua a 93°C en movimientos circulares. Espera 30 segundos para que el café libere CO₂ (bloom).', duration: 30 },
        { order: 3, title: 'Primera vertida', description: 'Vierte lentamente hasta 150ml en espiral hacia adentro, sin mojar el filtro. Tarda ~45 segundos.', duration: 45 },
        { order: 4, title: 'Segunda vertida', description: 'Cuando el nivel baje a la mitad, vierte hasta completar 225ml. Mantén movimientos circulares suaves.', duration: 40 },
        { order: 5, title: 'Extracción final', description: 'Espera que drene completamente. Total de 3:00–3:30 min desde la primera vertida. Sirve inmediatamente.', duration: null },
      ],
    },
    {
      slug: 'v60-4-6-method', title: 'Método 4:6 de Tetsu Kasuya',
      description: 'Técnica ganadora del Campeonato Mundial de Brewer\'s Cup 2016. Controlas acidez y dulzura con las primeras dos vertidas.',
      method: 'V60', difficulty: 'DIFÍCIL', prepTime: 5, yield: '300 ml',
      temp: '92°C', grind: 'Grueso-medio', ratio: '1:15 (20g / 300ml)',
      isPremium: true, isPublished: true, productSlug: 'jaltenango-honey',
      steps: [
        { order: 1, title: 'Setup', description: 'Pesa 20g molidos grueso-medio. Precalienta el V60 y la taza con agua caliente. Desecha el agua.', duration: 20 },
        { order: 2, title: 'Primera vertida (40%)', description: 'Vierte 60ml (40% de 150ml de "control"). Espera 45 seg. Esta vertida controla acidez — más agua = más acidez.', duration: 45 },
        { order: 3, title: 'Segunda vertida (60%)', description: 'Vierte 90ml hasta completar 150ml. Espera 45 seg. Esta vertida controla dulzura — más agua = más dulce.', duration: 45 },
        { order: 4, title: 'Tres vertidas iguales', description: 'Divide los 150ml restantes en 3 vertidas de 50ml cada una, cada 45 seg. Estas controlan la fortaleza.', duration: 135 },
        { order: 5, title: 'Drenado', description: 'Deja drenar completamente. Tiempo total: ~5 min. Ajusta las primeras dos vertidas en futuras preparaciones.', duration: null },
      ],
    },
    {
      slug: 'aeropress-estandar', title: 'AeroPress Estándar',
      description: 'Rápido, limpio y versátil. El método favorito de viajeros y entusiastas por su consistencia y facilidad.',
      method: 'AeroPress', difficulty: 'FÁCIL', prepTime: 3, yield: '200 ml',
      temp: '85°C', grind: 'Medio', ratio: '1:13 (15g / 195ml)',
      isPremium: false, isPublished: true, productSlug: null,
      steps: [
        { order: 1, title: 'Prepara el AeroPress', description: 'Coloca el filtro de papel en la tapa metálica, enjuágalo con agua caliente. Ensambla el AeroPress en posición normal sobre tu taza.', duration: 20 },
        { order: 2, title: 'Agrega el café', description: 'Vierte 15g de café molido medio en el AeroPress. Nivela suavemente.', duration: 10 },
        { order: 3, title: 'Pre-infusión', description: 'Añade 30ml de agua a 85°C. Revuelve rápidamente con la paleta durante 10 segundos para humedecer todo el café.', duration: 15 },
        { order: 4, title: 'Vertida principal', description: 'Vierte los 165ml restantes en ~10 segundos. Coloca el émbolo para crear vacío — no lo empujes aún.', duration: 30 },
        { order: 5, title: 'Presiona', description: 'A los 60 seg totales, presiona el émbolo lentamente durante 20–30 segundos hasta escuchar un ligero silbido. No fuerces hasta el fondo.', duration: 30 },
      ],
    },
    {
      slug: 'aeropress-invertido', title: 'AeroPress Invertido',
      description: 'La técnica "inverted" favorita de campeones. Control total del tiempo de contacto sin goteo prematuro.',
      method: 'AeroPress', difficulty: 'MEDIA', prepTime: 4, yield: '200 ml',
      temp: '88°C', grind: 'Medio-fino', ratio: '1:12 (17g / 200ml)',
      isPremium: false, isPublished: true, productSlug: 'huatusco-natural',
      steps: [
        { order: 1, title: 'Posición invertida', description: 'Inserta el émbolo ~1cm en el cuerpo del AeroPress. Colócalo boca abajo sobre una superficie estable.', duration: 15 },
        { order: 2, title: 'Café y agua', description: 'Agrega 17g molidos medio-fino. Vierte 200ml de agua a 88°C. Revuelve 10 segundos con la paleta.', duration: 20 },
        { order: 3, title: 'Infusión', description: 'Espera 1 minuto con el émbolo puesto (sin apretar) para mantener el calor. Mientras tanto, coloca el filtro enjuagado en la tapa.', duration: 60 },
        { order: 4, title: 'Tapa y gira', description: 'Coloca la tapa con filtro y enrosca firmemente. Con un movimiento seguro y rápido, gira el AeroPress sobre tu taza.', duration: 10 },
        { order: 5, title: 'Presiona', description: 'Presiona el émbolo en ~20 segundos con presión uniforme. Detén al escuchar el silbido. Resultado: taza limpia y compleja.', duration: 25 },
      ],
    },
    {
      slug: 'espresso-doble', title: 'Espresso Doble',
      description: 'La base de toda la barra. Dos shots perfectos con crema dorada y sabor concentrado e intenso.',
      method: 'Espresso', difficulty: 'DIFÍCIL', prepTime: 2, yield: '60 ml',
      temp: '94°C', grind: 'Fino', ratio: '1:2 (18g / 36ml)',
      isPremium: false, isPublished: true, productSlug: null,
      steps: [
        { order: 1, title: 'Purga y temperatura', description: 'Purga el grupo de la máquina 2-3 segundos para estabilizar la temperatura. Seca el portafiltro.', duration: 10 },
        { order: 2, title: 'Dosis y distribución', description: 'Dosa 18g en el portafiltro. Usa el Weiss Distribution Technique (WDT): un palillo distribuye el café uniformemente para eliminar canales.', duration: 20 },
        { order: 3, title: 'Tampar', description: 'Tampa con 15–20 kg de presión de forma nivelada y perpendicular. Un buen tamp es silencioso y firme.', duration: 10 },
        { order: 4, title: 'Extracción', description: 'Inserta el portafiltro y activa inmediatamente. El flujo debe comenzar en 5–8 seg. Objetivo: 36ml en 25–30 seg. Crema color avellana.', duration: 30 },
        { order: 5, title: 'Evalúa', description: 'Prueba el shot solo: debe tener dulzura, cuerpo y acidez balanceados. Si es amargo, muele más grueso. Si es ácido y aguado, muele más fino.', duration: null },
      ],
    },
    {
      slug: 'cortado', title: 'Cortado',
      description: 'El equilibrio perfecto entre espresso y leche. 1:1 de café y leche vaporizada, sin espuma densa.',
      method: 'Espresso', difficulty: 'MEDIA', prepTime: 3, yield: '120 ml',
      temp: '94°C', grind: 'Fino', ratio: '1:1 espresso/leche',
      isPremium: false, isPublished: true, productSlug: null,
      steps: [
        { order: 1, title: 'Extrae el espresso doble', description: 'Sigue la receta de espresso doble (18g → 36ml en 25-30 seg). Coloca el shot en el vaso cortado de 120ml.', duration: 35 },
        { order: 2, title: 'Vaporiza la leche', description: 'Usa 80ml de leche entera fría. Sumerge la lanza en ángulo, crea microespuma (textura sedosa, sin burbujas grandes). Temperatura: 60-65°C.', duration: 20 },
        { order: 3, title: 'Mezcla', description: 'Vierte la leche texturizada sobre el espresso en un movimiento continuo. La leche "corta" la acidez del café.', duration: 10 },
      ],
    },
    {
      slug: 'chemex-clasico', title: 'Chemex Clásico',
      description: 'Extracción limpia y cristalina con el filtro más grueso del mercado. Resalta la claridad y los matices florales.',
      method: 'Chemex', difficulty: 'MEDIA', prepTime: 6, yield: '500 ml',
      temp: '94°C', grind: 'Grueso', ratio: '1:15 (33g / 500ml)',
      isPremium: false, isPublished: true, productSlug: 'jaltenango-honey',
      steps: [
        { order: 1, title: 'Coloca y enjuaga el filtro', description: 'Dobla el filtro cuadrado de Chemex en forma de cono (3 capas al frente). Enjuaga abundantemente con agua caliente para eliminar sabor a papel y precalentar.', duration: 20 },
        { order: 2, title: 'Pesa el café', description: 'Agrega 33g molidos grueso — como sal de mar gruesa. El Chemex requiere molienda más gruesa por el filtro denso.', duration: 15 },
        { order: 3, title: 'Bloom', description: 'Vierte 66ml de agua a 94°C de forma circular. Espera 45 segundos hasta que el café deje de crecer.', duration: 45 },
        { order: 4, title: 'Vertida continua', description: 'Vierte el agua restante en 3 pulsos de ~145ml cada 45 seg, siempre en espiral. Mantén el nivel de agua por encima del café.', duration: 180 },
        { order: 5, title: 'Drenado', description: 'Retira el filtro al terminar de drenar (~5-6 min totales). Se puede servir directamente o guardar en la jarra por hasta 1 hora.', duration: 30 },
      ],
    },
    {
      slug: 'french-press-clasico', title: 'French Press Clásico',
      description: 'El método de inmersión por excelencia. Cuerpo pesado, aceites esenciales intactos y sabor robusto.',
      method: 'French Press', difficulty: 'FÁCIL', prepTime: 4, yield: '400 ml',
      temp: '93°C', grind: 'Grueso', ratio: '1:12 (33g / 400ml)',
      isPremium: false, isPublished: true, productSlug: 'huatusco-natural',
      steps: [
        { order: 1, title: 'Precalienta la prensa', description: 'Llena la French Press con agua caliente, espera 30 seg y desecha. Estabiliza la temperatura durante la extracción.', duration: 30 },
        { order: 2, title: 'Café molido grueso', description: 'Agrega 33g molidos muy grueso — como sal kosher. La molienda fina tapará el émbolo y producirá sabor amargo.', duration: 15 },
        { order: 3, title: 'Vertida y revuelta', description: 'Vierte 400ml de agua a 93°C de una sola vez. Revuelve 3–4 veces con cuchara de madera para asegurar saturación completa.', duration: 20 },
        { order: 4, title: 'Infusión 4 minutos', description: 'Coloca la tapa sin presionar. Espera exactamente 4 minutos. Este tiempo produce extracción completa sin sobre-extracción.', duration: 240 },
        { order: 5, title: 'Presiona y sirve', description: 'Presiona el émbolo lentamente en ~30 seg. Sirve INMEDIATAMENTE — no dejes el café en la prensa o seguirá extrayendo y se volverá amargo.', duration: 30 },
      ],
    },
    {
      slug: 'cold-brew-concentrado', title: 'Cold Brew Concentrado',
      description: 'Infusión en frío de 12–18 horas. Sin acidez, suave y naturalmente dulce. Perfecto para dilutir o tomar solo.',
      method: 'Cold Brew', difficulty: 'FÁCIL', prepTime: 720, yield: '500 ml concentrado',
      temp: 'Frío (4°C)', grind: 'Extra grueso', ratio: '1:5 concentrado (100g / 500ml)',
      isPremium: false, isPublished: true, productSlug: null,
      steps: [
        { order: 1, title: 'Muele grueso', description: 'Muele 100g de café muy grueso — como chips de chocolate. La molienda gruesa extrae lento y evita amargor.', duration: 60 },
        { order: 2, title: 'Mezcla con agua fría', description: 'En un frasco de vidrio de 1L, combina el café molido con 500ml de agua filtrada fría. Revuelve bien para saturar todo el café.', duration: 10 },
        { order: 3, title: 'Refrigeración', description: 'Cubre el frasco y refrigera entre 12 y 18 horas. 12h = suave, 18h = intenso. No lo dejes más tiempo o desarrolla sabores amargos.', duration: 900 },
        { order: 4, title: 'Filtra', description: 'Pasa el concentrado por un filtro de papel (Chemex o V60), un filtro de tela o una bolsa de cold brew. Filtra lentamente sin presionar.', duration: 30 },
        { order: 5, title: 'Sirve', description: 'Mezcla 1 parte concentrado + 1 parte agua o leche con hielo. Guarda el concentrado hasta 2 semanas refrigerado.', duration: null },
      ],
    },
    {
      slug: 'cold-brew-nitro', title: 'Cold Brew Nitro en Casa',
      description: 'Transforma tu cold brew en una experiencia cremosa con textura tipo cerveza oscura usando un sifón de cocina.',
      method: 'Cold Brew', difficulty: 'DIFÍCIL', prepTime: 750, yield: '300 ml',
      temp: 'Frío (2°C)', grind: 'Extra grueso', ratio: '1:4 (75g / 300ml)',
      isPremium: true, isPublished: true, productSlug: null,
      steps: [
        { order: 1, title: 'Prepara el cold brew base', description: 'Sigue la receta Cold Brew Concentrado con 75g de café y 300ml de agua. Refrigera 16 horas para mayor intensidad.', duration: 960 },
        { order: 2, title: 'Filtra muy bien', description: 'Filtra 2 veces: primero con filtro grueso para remover sólidos, luego con filtro de papel fino. Cualquier sedimento tapará el sifón.', duration: 20 },
        { order: 3, title: 'Llena el sifón ISI', description: 'Vierte el cold brew filtrado en el sifón. No llenes más del 75% de capacidad. Cierra la tapa firmemente.', duration: 10 },
        { order: 4, title: 'Carga con N₂O', description: 'Inserta 1 cápsula de N₂O en el soporte y enrosca. Agita vigorosamente 10 veces. Refrigera el sifón cargado 30 min adicionales.', duration: 1800 },
        { order: 5, title: 'Sirve en vaso frío', description: 'Enfría el vaso con hielo, desecha el hielo. Sostén el sifón boca abajo e inclínalo 45°. Dispensa lentamente para crear cascada de espuma cremosa.', duration: null },
      ],
    },
    {
      slug: 'moka-pot-italiano', title: 'Moka Pot Italiano',
      description: 'El ritual matutino de millones de hogares. Concentrado, con cuerpo y con ese aroma único que llena la cocina.',
      method: 'Moka Pot', difficulty: 'FÁCIL', prepTime: 5, yield: '60 ml',
      temp: '100°C (ebullición)', grind: 'Fino-medio', ratio: '1:7 (10g / 70ml)',
      isPremium: false, isPublished: true, productSlug: null,
      steps: [
        { order: 1, title: 'Agua prekalentada', description: 'Llena el depósito inferior HASTA la válvula de seguridad con agua ya caliente (de hervidor). Esto acorta el tiempo de extracción y evita sobre-cocinar el café.', duration: 30 },
        { order: 2, title: 'Llena el filtro', description: 'Llena el filtro con café molido fino-medio. No compactes ni golpees — solo nivela con el dedo.', duration: 15 },
        { order: 3, title: 'Enrosca y calienta', description: 'Enrosca la parte superior firmemente. Coloca en fuego medio. Deja la tapa abierta para monitorear el flujo.', duration: 10 },
        { order: 4, title: 'Escucha el burbujeo', description: 'En ~3–4 min comenzará a salir café color chocolate oscuro. Cuando el flujo se vuelva esputante y claro, retira inmediatamente del fuego.', duration: 180 },
        { order: 5, title: 'Enfría el fondo', description: 'Envuelve el fondo con trapo húmedo o pásalo bajo agua fría para detener la extracción. Sirve de inmediato.', duration: 15 },
      ],
    },
    {
      slug: 'sifon-japones', title: 'Sifón Japonés',
      description: 'El método más teatral del café. Vacío, temperatura controlada y claridad cristalina en taza.',
      method: 'Sifón', difficulty: 'DIFÍCIL', prepTime: 8, yield: '300 ml',
      temp: '92°C', grind: 'Medio', ratio: '1:12 (25g / 300ml)',
      isPremium: true, isPublished: true, productSlug: null,
      steps: [
        { order: 1, title: 'Prepara el filtro', description: 'Remoja el filtro de tela en agua tibia 10 min. Colócalo en el tubo superior con el gancho centrado. Asegúralo firmemente desde abajo.', duration: 600 },
        { order: 2, title: 'Agua en cámara inferior', description: 'Vierte 350ml de agua en la cámara inferior. Limpia el exterior del globo con trapo seco — la humedad puede romper el vidrio con el calor.', duration: 20 },
        { order: 3, title: 'Encaja la cámara superior', description: 'Cuando el agua esté a 70°C (~2 min), inserta el tubo superior sin enroscar completamente. Al llegar a 92°C, enrosca para crear el sello hermético.', duration: 120 },
        { order: 4, title: 'Café y extracción', description: 'El agua sube por presión al tubo superior. Agrega 25g de café y revuelve suavemente en figura de 8 durante 10 seg. Mantén fuego medio 1:30 min.', duration: 100 },
        { order: 5, title: 'Retira y observa', description: 'Apaga el calor. El vacío jalará el café filtrado hacia abajo. La "torta" de café debe quedar seca y cóncava. Sirve en tazas pre-calentadas.', duration: null },
      ],
    },
    {
      slug: 'cafe-turco', title: 'Café Turco (Cezve)',
      description: 'El método más antiguo documentado. Sin filtro, con cuerpo denso y sabor profundo. Bebe sin agitar la última fracción.',
      method: 'Turco', difficulty: 'MEDIA', prepTime: 5, yield: '60 ml',
      temp: null, grind: 'Ultrafino (polvo)', ratio: '1:8 (8g / 65ml)',
      isPremium: false, isPublished: true, productSlug: null,
      steps: [
        { order: 1, title: 'Muele ultrafino', description: 'Muele 8g más fino que el espresso — casi polvo. Este café no se filtra, así que la molienda determina el cuerpo y sedimento.', duration: 30 },
        { order: 2, title: 'Agua fría en el cezve', description: 'Pon 65ml de agua FRÍA en el cezve. Agrega el café y opcionalmente 1 cucharadita de azúcar. No revuelvas aún.', duration: 15 },
        { order: 3, title: 'Calentamiento lento', description: 'Coloca en fuego muy bajo. Cuando el café empiece a disolverse (~2 min), revuelve suavemente una sola vez y ya no toques más.', duration: 120 },
        { order: 4, title: 'Primera espuma', description: 'A ~70°C formará una espuma cremosa (kaimak) en el borde. Con una cuchara, transfiere esa espuma con cuidado a la taza — es la mejor parte.', duration: 60 },
        { order: 5, title: 'Segunda subida', description: 'Cuando casi hierva de nuevo, retira del fuego ANTES de que hierva. Vierte lentamente sobre la espuma en la taza. Espera 2 min para que los sedimentos asienten.', duration: 120 },
      ],
    },
    {
      slug: 'kalita-wave', title: 'Kalita Wave',
      description: 'Fondo plano, tres agujeros. Más forgiving que el V60, produce extracción uniforme y cuerpo equilibrado.',
      method: 'Kalita Wave', difficulty: 'MEDIA', prepTime: 5, yield: '250 ml',
      temp: '93°C', grind: 'Medio', ratio: '1:15 (17g / 250ml)',
      isPremium: false, isPublished: true, productSlug: null,
      steps: [
        { order: 1, title: 'Enjuaga el filtro ondulado', description: 'El filtro wave de Kalita tiene ondas que crean separación con el dripper. Enjuágalo bien — retiene más papel que filtros planos.', duration: 15 },
        { order: 2, title: 'Bloom', description: 'Vierte 34ml de agua a 93°C. El fondo plano hace que el bloom sea más uniforme que en el V60. Espera 40 segundos.', duration: 40 },
        { order: 3, title: 'Vertida en pulsos', description: 'Vierte en 3 pulsos de ~70ml cada 40 seg, siempre en espiral. El fondo plano distribuye el flujo entre los 3 agujeros automáticamente.', duration: 120 },
        { order: 4, title: 'Drenado', description: 'Tiempo total: ~3:30 min. La Kalita Wave es más tolerante a variaciones de vertida que el V60, produciendo resultados consistentes.', duration: 30 },
      ],
    },
    {
      slug: 'latte-art-tulip', title: 'Latte con Arte: Tulipán',
      description: 'Técnica de pour para crear un tulipán de 3 capas sobre tu latte. Requiere práctica pero impresiona.',
      method: 'Espresso', difficulty: 'DIFÍCIL', prepTime: 5, yield: '240 ml',
      temp: '65°C (leche)', grind: 'Fino', ratio: '1:2 espresso base',
      isPremium: true, isPublished: true, productSlug: null,
      steps: [
        { order: 1, title: 'Extrae espresso doble', description: 'Extrae 36ml de espresso en una taza de 240ml tipo "latte bowl" con paredes anchas. Asegúrate que la crema esté intacta.', duration: 35 },
        { order: 2, title: 'Texturiza la leche', description: 'Vaporiza 180ml de leche entera hasta 65°C. La textura debe ser sedosa, sin burbujas visibles — como pintura.', duration: 25 },
        { order: 3, title: 'Primera capa del tulipán', description: 'Inclina la taza 45°. Vierte desde altura (~10cm) en el centro del espresso. Luego baja la jarra y vierte una "gota" de leche apretando hacia atrás.', duration: 15 },
        { order: 4, title: 'Segunda y tercera capa', description: 'Repite el movimiento de "gota" dos veces más, cada vez un poco adelante de la anterior. Cada capa empuja la anterior hacia atrás formando los pétalos.', duration: 15 },
        { order: 5, title: 'El tallo', description: 'Para cerrar el tulipán, tira una línea recta de leche desde la última gota hacia el borde de la taza. Sirve inmediatamente.', duration: null },
      ],
    },
    {
      slug: 'dalgona-coffee', title: 'Dalgona Coffee',
      description: 'La sensación viral. Espuma cremosa de café instantáneo montada sobre leche fría. Fácil, impresionante y delicioso.',
      method: 'Frío', difficulty: 'FÁCIL', prepTime: 10, yield: '350 ml',
      temp: 'Frío', grind: null, ratio: '1:1:1 (café:azúcar:agua)',
      isPremium: false, isPublished: true, productSlug: null,
      steps: [
        { order: 1, title: 'Mezcla los sólidos', description: 'En un bowl, combina 2 cucharadas de café instantáneo, 2 cucharadas de azúcar y 2 cucharadas de agua caliente.', duration: 10 },
        { order: 2, title: 'Bate hasta espuma', description: 'Con batidor eléctrico o manual, bate la mezcla 2–5 min hasta que se vuelva espuma color caramelo que mantiene picos firmes.', duration: 180 },
        { order: 3, title: 'Prepara la base', description: 'Llena un vaso alto con hielo y 250ml de leche entera o vegetal.', duration: 10 },
        { order: 4, title: 'Vierte la espuma', description: 'Coloca una cucharada generosa de espuma de café sobre la leche. No mezcles inmediatamente.', duration: 10 },
        { order: 5, title: 'Mezcla y bebe', description: 'Revuelve con popote antes de beber para integrar la espuma con la leche. La proporción espuma:leche se ajusta al gusto.', duration: null },
      ],
    },
    {
      slug: 'cafe-de-olla', title: 'Café de Olla',
      description: 'Receta tradicional mexicana con piloncillo, canela y anís. El café de la abuela, profundo y especiado.',
      method: 'Tradicional', difficulty: 'FÁCIL', prepTime: 15, yield: '4 tazas',
      temp: '100°C (hervor)', grind: null, ratio: '1L agua / 4 cdas café / 60g piloncillo',
      isPremium: false, isPublished: true, productSlug: null,
      steps: [
        { order: 1, title: 'Hierve agua con especias', description: 'En una olla de barro (o acero), hierve 1L de agua con 1 raja de canela, 2 estrellas de anís y 60g de piloncillo troceado. Deja hervir 5 min hasta disolver el piloncillo.', duration: 300 },
        { order: 2, title: 'Agrega el café', description: 'Cuando el agua esté aromática y el piloncillo disuelto, agrega 4 cucharadas colmadas de café molido medio-grueso. Revuelve suavemente.', duration: 15 },
        { order: 3, title: 'Infusión sin hervir', description: 'Baja el fuego a mínimo. NO permitas que hierva con el café adentro — esto amarga la infusión. Mantén 5 min tapado.', duration: 300 },
        { order: 4, title: 'Reposa', description: 'Apaga el fuego. Deja reposar 3 minutos sin destape para que los sedimentos asienten al fondo.', duration: 180 },
        { order: 5, title: 'Cuela y sirve', description: 'Cuela con colador fino o manta de cielo directo a las tazas. Sirve bien caliente. Opcional: añade un chorrito de leche caliente para un "café con leche de olla".', duration: 15 },
      ],
    },
    {
      slug: 'flat-white', title: 'Flat White',
      description: 'El favorito australiano. Más intenso que un latte, más pequeño, microespuma integrada que intensifica el sabor del espresso.',
      method: 'Espresso', difficulty: 'MEDIA', prepTime: 4, yield: '160 ml',
      temp: '65°C (leche)', grind: 'Fino', ratio: '1:3 ristretto/leche',
      isPremium: false, isPublished: true, productSlug: null,
      steps: [
        { order: 1, title: 'Ristretto doble', description: 'Extrae un ristretto doble: 18g de café → 30ml (ratio 1:1.6) en 20–25 seg. Más concentrado que espresso estándar.', duration: 30 },
        { order: 2, title: 'Leche texturizada fina', description: 'Vaporiza 120ml de leche entera a 65°C con microespuma muy fina, casi sin volumen. La espuma debe integrarse con la leche, no flotar encima.', duration: 20 },
        { order: 3, title: 'Vierte rápido', description: 'Inclina la taza y vierte desde cerca (5cm). En el flat white la leche y el espresso se integran desde el primer segundo — buscas unidad, no capas.', duration: 15 },
      ],
    },
    {
      slug: 'espresso-tonic', title: 'Espresso Tonic',
      description: 'La tendencia de las cafeterías nórdicas. Espresso sobre agua tónica con hielo: burbujas, acidez y amargor en perfecta tensión.',
      method: 'Espresso', difficulty: 'FÁCIL', prepTime: 3, yield: '200 ml',
      temp: 'Frío', grind: 'Fino', ratio: 'doble espresso + 120ml tónica',
      isPremium: false, isPublished: true, productSlug: 'coatepec-lavado',
      steps: [
        { order: 1, title: 'Vaso frío con hielo', description: 'Llena un vaso de vidrio alto con hielo hasta el borde. Un vaso frío es crucial — si el vidrio está caliente, la tónica perderá sus burbujas al instante.', duration: 10 },
        { order: 2, title: 'Vierte la tónica', description: 'Añade 120ml de agua tónica premium inclinando el vaso. Hazlo lentamente para preservar las burbujas.', duration: 15 },
        { order: 3, title: 'Extrae el espresso', description: 'Extrae un doble espresso (18g → 36ml). Usa un café con notas cítricas o frutales — el Coatepec Lavado funciona perfectamente.', duration: 30 },
        { order: 4, title: 'Vierte sobre la tónica', description: 'Vierte el espresso caliente LENTAMENTE sobre el dorso de una cuchara para que flote sobre la tónica. La colisión visual de los líquidos es parte de la experiencia.', duration: 10 },
        { order: 5, title: 'Sirve sin mezclar', description: 'Entrega sin revolver. El cliente mezcla al gusto con el popote. El primer sorbo de cada capa es intencionalmente diferente.', duration: null },
      ],
    },
    {
      slug: 'pour-over-woodneck', title: 'Nel Drip / Woodneck',
      description: 'Filtro de tela japonés que preserva aceites del café sin papel. Resultado intermedio entre French Press y V60: cuerpo con claridad.',
      method: 'Nel Drip', difficulty: 'MEDIA', prepTime: 6, yield: '300 ml',
      temp: '88°C', grind: 'Medio-grueso', ratio: '1:14 (21g / 300ml)',
      isPremium: true, isPublished: true, productSlug: 'jaltenango-honey',
      steps: [
        { order: 1, title: 'Acondiciona el filtro', description: 'El filtro de flanela nel drip debe guardarse SIEMPRE húmedo en el refrigerador. Antes de usar, enjuágalo con agua caliente y exprime suavemente.', duration: 20 },
        { order: 2, title: 'Calienta el servidor', description: 'Llena el servidor de vidrio con agua caliente, espera 30 seg. Desecha. La flanela y el vidrio frío bajarán la temperatura del café.', duration: 30 },
        { order: 3, title: 'Café y bloom', description: 'Agrega 21g molidos medio-grueso. Vierte 42ml a 88°C en espiral. Espera 40 seg — la flanela absorbe parte del agua, así que el bloom es menos visible que en papel.', duration: 40 },
        { order: 4, title: 'Vertida lenta continua', description: 'Vierte los 258ml restantes en un flujo constante y suave, siempre en espiral. La flanela fluye más lento que el papel. Total: ~5 min.', duration: 240 },
        { order: 5, title: 'Limpia y guarda el filtro', description: 'Enjuaga con agua FRÍA (el agua caliente deteriora la tela), exprime y guarda sumergido en agua fría en el refrigerador. Dura meses con buen cuidado.', duration: null },
      ],
    },
  ];

  for (const r of recipes) {
    const productId = r.productSlug
      ? ((await prisma.product.findUnique({ where: { slug: r.productSlug } })) || {}).id || null
      : null;

    const existing = await prisma.recipe.findUnique({ where: { slug: r.slug } });
    if (existing) {
      await prisma.recipe.update({
        where: { slug: r.slug },
        data: {
          title: r.title, description: r.description, method: r.method,
          difficulty: r.difficulty, prepTime: r.prepTime, yield: r.yield,
          temp: r.temp || null, grind: r.grind || null, ratio: r.ratio || null,
          isPremium: r.isPremium, isPublished: r.isPublished, productId,
        },
      });
      continue;
    }

    await prisma.recipe.create({
      data: {
        slug: r.slug, title: r.title, description: r.description,
        method: r.method, difficulty: r.difficulty, prepTime: r.prepTime,
        yield: r.yield, temp: r.temp || null, grind: r.grind || null,
        ratio: r.ratio || null, isPremium: r.isPremium, isPublished: r.isPublished,
        productId,
        steps: {
          create: r.steps.map((s) => ({
            order: s.order, title: s.title, description: s.description,
            duration: s.duration || null,
          })),
        },
      },
    });
  }
  console.log(`Seeded ${recipes.length} recipes.`);

  console.log('Seed complete. Admin: admin@12porciento.com / admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
