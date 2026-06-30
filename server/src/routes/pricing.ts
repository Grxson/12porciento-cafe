import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { logAdminAction } from '../lib/adminLog';
import { calculatePrices } from '../lib/pricing';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        costPrice: true,
        weight: true,
        pricingConfig: true,
      },
      orderBy: { name: 'asc' },
    });

    const data = products.map((p) => {
      const cfg = p.pricingConfig;
      let calculated = null;
      if (cfg && p.costPrice && p.weight) {
        calculated = calculatePrices({
          costPerKg: p.costPrice,
          gramsPerUnit: p.weight,
          roastingCostPerUnit: cfg.roastingCostPerUnit,
          packagingCostPerUnit: cfg.packagingCostPerUnit,
          overheadFixed: cfg.overheadFixed,
          marginRetailPct: cfg.marginRetailPct,
          marginB2bPct: cfg.marginB2bPct,
        });
      }
      return { ...p, calculated };
    });

    res.json({ data });
  } catch (err) {
    console.error('[pricing] GET /', err);
    res.status(500).json({ error: 'Error al obtener precios' });
  }
});

router.post('/calculate', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = calculatePrices(req.body as Parameters<typeof calculatePrices>[0]);
    res.json({ data: result });
  } catch (err) {
    console.error('[pricing] POST /calculate', err);
    res.status(400).json({ error: 'Parámetros inválidos para calcular precio' });
  }
});

router.put('/:productId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { productId } = req.params;
    const {
      roastingCostPerUnit,
      packagingCostPerUnit,
      overheadFixed,
      marginRetailPct,
      marginB2bPct,
      minAlertMarginPct,
    } = req.body;

    const config = await prisma.pricingConfig.upsert({
      where: { productId },
      create: {
        productId,
        roastingCostPerUnit: parseFloat(roastingCostPerUnit) || 0,
        packagingCostPerUnit: parseFloat(packagingCostPerUnit) || 0,
        overheadFixed: parseFloat(overheadFixed) || 0,
        marginRetailPct: parseFloat(marginRetailPct) || 60,
        marginB2bPct: parseFloat(marginB2bPct) || 30,
        minAlertMarginPct: parseFloat(minAlertMarginPct) || 20,
      },
      update: {
        roastingCostPerUnit: parseFloat(roastingCostPerUnit) || 0,
        packagingCostPerUnit: parseFloat(packagingCostPerUnit) || 0,
        overheadFixed: parseFloat(overheadFixed) || 0,
        marginRetailPct: parseFloat(marginRetailPct) || 60,
        marginB2bPct: parseFloat(marginB2bPct) || 30,
        minAlertMarginPct: parseFloat(minAlertMarginPct) || 20,
      },
    });

    await logAdminAction({
      adminId: req.admin?.id,
      action: 'UPDATE',
      entity: 'PricingConfig',
      entityId: productId,
      metadata: { marginRetailPct, marginB2bPct },
    });

    res.json({ data: config });
  } catch (err) {
    console.error('[pricing] PUT /:productId', err);
    res.status(500).json({ error: 'Error al guardar configuración de precios' });
  }
});

export default router;
