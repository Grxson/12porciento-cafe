import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAnyAuth, AnyAuthRequest } from '../middleware/auth';
import { uploadMiddleware, processImage, deleteImage } from '../lib/uploads';

const router = Router();

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: { error: 'Demasiadas subidas. Intenta en 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/', uploadLimiter, requireAnyAuth, (req: AnyAuthRequest, res: Response) => {
  uploadMiddleware(req, res, async (err: unknown) => {
    if (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Error al subir imagen' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: 'No se recibió ninguna imagen' });
      return;
    }
    try {
      const result = await processImage(req.file.buffer);
      res.status(201).json({ data: result });
    } catch {
      res.status(500).json({ error: 'No se pudo procesar la imagen' });
    }
  });
});

router.delete('/:file', requireAnyAuth, (req: AnyAuthRequest, res: Response) => {
  deleteImage(`/api/uploads/${req.params.file}`);
  res.json({ success: true });
});

export default router;
