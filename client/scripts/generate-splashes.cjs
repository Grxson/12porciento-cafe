const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, 'public', 'splashes');

// Coffee brand colors
const BG_COLOR = 0x0d0806ff;  // #0d0806
const GOLD = 0xd4a853ff;      // #d4a853
const CREAM = 0xfaf7f4ff;     // #faf7f4

const sizes = [
  { w: 640,  h: 1136, file: 'splash-640x1136.png' },   // iPhone 5/SE
  { w: 750,  h: 1334, file: 'splash-750x1334.png' },  // iPhone 8/7/6s
  { w: 1125, h: 2436, file: 'splash-1125x2436.png' }, // iPhone X/XS
  { w: 1242, h: 2208, file: 'splash-1242x2208.png' }, // iPhone 8 Plus
  { w: 828,  h: 1792, file: 'splash-828x1792.png' },  // iPhone XR/11
  { w: 1242, h: 2688, file: 'splash-1242x2688.png' }, // iPhone XS Max
];

async function generateSplash({ w, h, file }) {
  const img = new Jimp(w, h, BG_COLOR);

  const cx = w / 2;
  const cy = h / 2;

  // Gold circle outline (ring)
  const ringRadius = Math.min(w, h) * 0.22;
  const ringThickness = Math.max(2, Math.floor(ringRadius * 0.06));

  for (let y = Math.floor(cy - ringRadius); y <= Math.ceil(cy + ringRadius); y++) {
    for (let x = Math.floor(cx - ringRadius); x <= Math.ceil(cx + ringRadius); x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist >= ringRadius - ringThickness && dist <= ringRadius) {
        img.setPixelColor(GOLD, x, y);
      }
    }
  }

  // "12%" text — simple bitmap approach using circles for dots
  const font = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
  img.print(
    font,
    0, 0,
    {
      text: '12%',
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
      alignmentY: Jimp.VERTICAL_ALIGN_CENTER,
    },
    w,
    h,
  );

  // Overlay gold tint on the "12" to make it gold
  const fontGold = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);

  await img.writeAsync(path.join(OUT_DIR, file));
  console.log(`Generated ${file} (${w}×${h})`);
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // Jimp doesn't support custom fonts easily without pre-loaded ttf
  // Use solid color splash with branded circle instead
  for (const size of sizes) {
    const img = new Jimp(size.w, size.h, BG_COLOR);
    const cx = size.w / 2;
    const cy = size.h / 2;

    // Inner filled circle (dark)
    const r = Math.min(size.w, size.h) * 0.20;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist <= r) {
          img.setPixelColor(GOLD, x, y);
        }
      }
    }

    // Outer ring
    const ringR = Math.min(size.w, size.h) * 0.22;
    const thick = Math.max(2, Math.floor(ringR * 0.07));
    for (let y = Math.floor(cy - ringR); y <= Math.ceil(cy + ringR); y++) {
      for (let x = Math.floor(cx - ringR); x <= Math.ceil(cx + ringR); x++) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist >= ringR - thick && dist <= ringR) {
          img.setPixelColor(GOLD, x, y);
        }
      }
    }

    await img.writeAsync(path.join(OUT_DIR, size.file));
    console.log(`✓ ${size.file} (${size.w}×${size.h})`);
  }

  console.log('\nAll splash screens generated.');
}

main().catch(console.error);
