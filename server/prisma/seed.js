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

  console.log('Seed complete. Admin: admin@12porciento.com / admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
