import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const SVG_PATH = path.join(ICONS_DIR, 'logo.svg');

const icons = [
  // PWA icons (all must be RGBA, not colormap)
  { file: 'pwa-64x64.png',      size: 64,  maskable: false },
  { file: 'pwa-192x192.png',    size: 192, maskable: false },
  { file: 'pwa-256x256.png',    size: 256, maskable: false },
  { file: 'pwa-384x384.png',    size: 384, maskable: false },
  { file: 'pwa-512x512.png',    size: 512, maskable: false },
  // Maskable icon (safe area padding for adaptive icon on Android)
  { file: 'maskable-icon-512x512.png', size: 512, maskable: true },
  // iOS icon
  { file: 'apple-touch-icon-180x180.png', size: 180, maskable: false },
  // Badge
  { file: 'badge-72x72.png',    size: 72,  maskable: false },
];

// Badge is simple — dot on transparent
function badgeSvg(size) {
  const r = size * 0.4;
  const cx = size / 2;
  const cy = size / 2;
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#d4a853"/>
  </svg>`;
}

async function main() {
  const svg = fs.readFileSync(SVG_PATH);

  for (const { file, size, maskable } of icons) {
    let input = svg;

    // Maskable icons need extra padding so the "12%" doesn't get cut
    // Safe zone is 81.6% of icon — add 10% padding around the logo
    if (maskable) {
      const padded = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
        <rect width="512" height="512" rx="80" fill="#0d0806"/>
        <text x="256" y="300" font-family="Georgia,serif" font-weight="900"
              font-size="170" fill="#c9a96e" text-anchor="middle">12%</text>
      </svg>`;
      input = Buffer.from(padded);
    }

    await sharp(input)
      .resize(size, size, { fit: 'contain' })
      .png({ compressionLevel: 9, palette: false }) // force RGBA, no colormap
      .toFile(path.join(ICONS_DIR, file));

    const meta = await sharp(input).resize(size, size).metadata();
    console.log(`✓ ${file} (${size}×${size}, channels:${meta.channels})`);
  }

  console.log('\nAll icons regenerated as RGBA.');
}

main().catch(console.error);
