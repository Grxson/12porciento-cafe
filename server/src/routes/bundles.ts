import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../db';

const router = Router();

router.get('/', async (req, res) => {
  const bundles = await prisma.bundle.findMany({
    where: { isActive: true },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: bundles });
});

router.get('/:id', async (req, res) => {
  const bundle = await prisma.bundle.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { product: true } } },
  });
  if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
  res.json({ data: bundle });
});

router.post('/', requireAuth, async (req, res) => {
  const { name, description, basePrice, discountPct, imageUrl, items } = req.body;
  const finalPrice = basePrice * (1 - discountPct / 100);

  const bundle = await prisma.bundle.create({
    data: {
      name,
      description,
      basePrice,
      discountPct,
      finalPrice,
      imageUrl,
      items: {
        create: items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity || 1,
        })),
      },
    },
    include: { items: { include: { product: true } } },
  });

  res.status(201).json({ data: bundle });
});

router.put('/:id', requireAuth, async (req, res) => {
  const { name, description, basePrice, discountPct, imageUrl, isActive } = req.body;
  const finalPrice = basePrice * (1 - discountPct / 100);

  const bundle = await prisma.bundle.update({
    where: { id: req.params.id },
    data: { name, description, basePrice, discountPct, finalPrice, imageUrl, isActive },
    include: { items: { include: { product: true } } },
  });

  res.json({ data: bundle });
});

router.delete('/:id', requireAuth, async (req, res) => {
  await prisma.bundle.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;
