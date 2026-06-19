import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

const BASE_URL = process.env.CLIENT_URL || 'https://12porciento.cafe';

const staticUrls: Array<{ loc: string; changefreq: string; priority: string; lastmod?: string }> = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/tienda', changefreq: 'daily', priority: '0.9' },
  { loc: '/suscripciones', changefreq: 'weekly', priority: '0.8' },
  { loc: '/nosotros', changefreq: 'monthly', priority: '0.7' },
  { loc: '/paquetes', changefreq: 'daily', priority: '0.8' },
  { loc: '/recetas', changefreq: 'weekly', priority: '0.7' },
  { loc: '/galeria', changefreq: 'weekly', priority: '0.6' },
  { loc: '/leaderboard', changefreq: 'daily', priority: '0.5' },
  { loc: '/login', changefreq: 'monthly', priority: '0.3' },
  { loc: '/registro', changefreq: 'monthly', priority: '0.3' },
  { loc: '/quiz', changefreq: 'monthly', priority: '0.6' },
];

router.get('/sitemap.xml', async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    });

    const urls = [
      ...staticUrls,
      ...products.map((p: { slug: string; updatedAt: Date }) => ({
        loc: `/producto/${p.slug}`,
        changefreq: 'weekly' as const,
        priority: '0.7',
        lastmod: p.updatedAt.toISOString(),
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${BASE_URL}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.send(xml);
  } catch {
    res.status(500).send('Error generating sitemap');
  }
});

export default router;
