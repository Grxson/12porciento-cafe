import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import sharp from 'sharp';

// Resolve upload dir from env; default to ./uploads (dev) — Docker sets /app/data/uploads.
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), 'uploads');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Formato no soportado. Usa JPG, PNG, WEBP o HEIC.'));
  },
}).single('image');

export interface ProcessedImage {
  url: string;
  thumbUrl: string;
}

export async function processBannerImage(buffer: Buffer): Promise<{ url: string }> {
  const id = crypto.randomBytes(12).toString('hex');
  const mainName = `banner_${id}.webp`;

  await sharp(buffer)
    .rotate()
    .resize({ width: 1200, height: 400, fit: 'cover', position: 'centre' })
    .webp({ quality: 85 })
    .toFile(path.join(UPLOAD_DIR, mainName));

  return { url: `/api/uploads/${mainName}` };
}

export async function processImage(buffer: Buffer): Promise<ProcessedImage> {
  const id = crypto.randomBytes(12).toString('hex');
  const mainName = `${id}.webp`;
  const thumbName = `${id}_thumb.webp`;

  await sharp(buffer)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(path.join(UPLOAD_DIR, mainName));

  await sharp(buffer)
    .rotate()
    .resize({ width: 300, height: 300, fit: 'cover' })
    .webp({ quality: 75 })
    .toFile(path.join(UPLOAD_DIR, thumbName));

  return { url: `/api/uploads/${mainName}`, thumbUrl: `/api/uploads/${thumbName}` };
}

export function deleteImage(url: string): void {
  const name = path.basename(url);
  if (!name.endsWith('.webp')) return;
  const main = path.join(UPLOAD_DIR, name);
  const thumb = path.join(UPLOAD_DIR, name.slice(0, -5) + '_thumb.webp');
  for (const f of [main, thumb]) {
    fs.promises.unlink(f).catch(() => {});
  }
}
