import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
    imageUrl: 'https://images.unsplash.com/photo-1559547669-acf713ad3fb0?auto=format&fit=crop&w=800&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1599599810694-a5d5b2fc1f30?auto=format&fit=crop&w=800&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1447933601403-0c6688fa566e?auto=format&fit=crop&w=800&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1572365992253-3cb3e56dd362?auto=format&fit=crop&w=800&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1556821552-5f94d2fdf561?auto=format&fit=crop&w=800&q=80',
    description: 'Sudadera con capucha 100% algodón. Logo minimalista de Café 12% impreso. Unisex, tallas S-XL.',
    isLimited: false,
    isActive: true,
  },
];

async function main() {
  console.log('Seeding database...');

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
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

  console.log('Seed complete. Admin: admin@12porciento.com / admin123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
