import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'splashes');

// Brand colors
const BG = { r: 13, g: 8, b: 6 };     // #0d0806
const GOLD = { r: 212, g: 168, b: 83 }; // #d4a853

const sizes = [
  { w: 640,  h: 1136, file: 'splash-640x1136.png' },
  { w: 750,  h: 1334, file: 'splash-750x1334.png' },
  { w: 1125, h: 2436, file: 'splash-1125x2436.png' },
  { w: 1242, h: 2208, file: 'splash-1242x2208.png' },
  { w: 828,  h: 1792, file: 'splash-828x1792.png' },
  { w: 1242, h: 2688, file: 'splash-1242x2688.png' },
];

// Generate SVG with branded circle logo
function makeSvg(w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h);

  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="#0d0806"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.20}" fill="#d4a853"/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.22}" fill="none" stroke="#d4a853" stroke-width="${Math.max(3, r * 0.014)}"/>
  </svg>`;
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const { w, h, file } of sizes) {
    const svg = Buffer.from(makeSvg(w, h));
    await sharp(svg).png().toFile(path.join(OUT_DIR, file));
    console.log(`✓ ${file} (${w}×${h})`);
  }

  console.log(`\nAll splash screens → ${OUT_DIR}`);
}

main().catch(console.error);
