import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');
const SVG_PATH = path.join(ICONS_DIR, 'logo.svg');

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
  { file: 'badge-72x72.png',    size: 72,  maskable: false },
];

function badgeSvg(size) {
  const r = size * 0.4;
  const cx = size / 2;
  const cy = size / 2;
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#d4a853"/>
  </svg>`;
}

async function main() {
  const svg = fs.readFileSync(SVG_PATH, 'utf-8');

  // Extract inner content of the logo SVG (everything inside <svg>…</svg>)
  const innerMatch = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (!innerMatch) throw new Error('Could not parse SVG content');
  const innerContent = innerMatch[1];

  for (const { file, size, maskable } of icons) {
    let input;

    if (maskable) {
      // Wrap logo at 80% scale, centered, so content stays within safe zone
      const pad = (512 * (1 - 0.8)) / 2; // = 51.2
      const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <g transform="translate(${pad}, ${pad}) scale(0.8)">
          ${innerContent}
        </g>
      </svg>`;
      input = Buffer.from(maskableSvg);
    } else {
      input = Buffer.from(svg);
    }

    await sharp(input)
      .resize(size, size, { fit: 'contain' })
      .png({ compressionLevel: 9, palette: false })
      .toFile(path.join(ICONS_DIR, file));

    const meta = await sharp(input).resize(size, size).metadata();
    console.log(`✓ ${file} (${size}×${size}, channels:${meta.channels})`);
  }

  console.log('\nAll icons regenerated.');
}

main().catch(console.error);
