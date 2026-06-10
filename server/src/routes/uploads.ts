import { Router, Response } from 'express';
import { requireAuth, requireAnyAuth, AnyAuthRequest, AuthRequest } from '../middleware/auth';
import { uploadMiddleware, processImage, deleteImage } from '../lib/uploads';

const router = Router();

router.post('/', requireAnyAuth, (req: AnyAuthRequest, res: Response) => {
  uploadMiddleware(req, res, async (err: any) => {
    if (err) {
      res.status(400).json({ error: err.message || 'Error al subir imagen' });
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

router.delete('/:file', requireAuth, (req: AuthRequest, res: Response) => {
  deleteImage(`/api/uploads/${req.params.file}`);
  res.json({ success: true });
});

export default router;
