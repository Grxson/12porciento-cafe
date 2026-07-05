import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const SOURCE_PATH = path.join(ICONS_DIR, 'ico-modern.png');

const icons = [
  { file: 'pwa-64x64.png',      size: 64,  maskable: false },
  { file: 'pwa-192x192.png',    size: 192, maskable: false },
  { file: 'pwa-256x256.png',    size: 256, maskable: false },
  { file: 'pwa-384x384.png',    size: 384, maskable: false },
  { file: 'pwa-512x512.png',    size: 512, maskable: false },
  { file: 'icon-1024x1024.png', size: 1024, maskable: false },
  // Maskable: logo wrapped in 10% padding so content stays within safe zone
  { file: 'maskable-icon-512x512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon-180x180.png', size: 180, maskable: false },
];

async function main() {
  // ico-modern.png has a soft radial glow baked around the actual tile, leaving
  // ~27% of the canvas transparent — trim it so the icon fills the frame.
  const trimmed = await sharp(SOURCE_PATH).trim().resize(1024, 1024, { fit: 'cover' }).toBuffer();

  for (const { file, size, maskable } of icons) {
    let pipeline;

    if (maskable) {
      // Shrink to 80% and center on a same-color canvas so content stays within the safe zone
      const inner = Math.round(size * 0.8);
      const resized = await sharp(trimmed).resize(inner, inner, { fit: 'contain' }).toBuffer();
      pipeline = sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 13, g: 8, b: 6, alpha: 1 }, // matches manifest background_color #0d0806
        },
      }).composite([{ input: resized, gravity: 'center' }]);
    } else {
      pipeline = sharp(trimmed).resize(size, size, { fit: 'contain' });
    }

    await pipeline
      .png({ compressionLevel: 9, palette: false })
      .toFile(path.join(ICONS_DIR, file));

    console.log(`✓ ${file} (${size}×${size})`);
  }

  console.log('\nAll icons regenerated from ico-modern.png (trimmed to remove transparent glow margin).');
}

main().catch(console.error);
