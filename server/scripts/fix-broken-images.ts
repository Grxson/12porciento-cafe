/**
 * Script to fix broken Unsplash image URLs in the database.
 * Unsplash deletes photos, leaving our product images as 404s.
 *
 * Usage: npx ts-node --esm scripts/fix-broken-images.ts
 * Or: node scripts/fix-broken-images.ts (if running via tsx)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Map of broken URL fragment → replacement URL fragment
const REPLACEMENTS: Record<string, string> = {
  // photo-1447933710033-6461bcad5d65 — BROKEN
  'photo-1447933710033-6461bcad5d65':
    'photo-1495474472287-4d71bcdd2085',
  // photo-1443512220425-95bc62f2d40b — BROKEN
  'photo-1443512220425-95bc62f2d40b':
    'photo-1501339847302-ac426a4a7cbb',
  // photo-1559053614-cd4628902d4a — BROKEN
  'photo-1559053614-cd4628902d4a':
    'photo-1461023058943-07fcbe16d735',
  // photo-1447933601769-c00d465a05d3 — BROKEN
  'photo-1447933601769-c00d465a05d3':
    'photo-1447933601403-0c6688de566e',
};

function replaceUrl(url: string): string {
  let result = url;
  for (const [broken, good] of Object.entries(REPLACEMENTS)) {
    if (result.includes(broken)) {
      result = result.replace(broken, good);
      console.log(`  ✓ Replaced: ${broken} → ${good}`);
    }
  }
  return result;
}

async function main() {
  console.log('🔍 Scanning for broken Unsplash URLs...\n');

  // Check Product.imageUrl and Product.images[]
  const products = await prisma.product.findMany({ select: { id: true, name: true, imageUrl: true, images: true } });

  let updated = 0;

  for (const product of products) {
    const broken: string[] = [];
    for (const [brokenId] of Object.entries(REPLACEMENTS)) {
      if (product.imageUrl?.includes(brokenId)) broken.push('imageUrl');
      if (product.images && product.images.includes(brokenId)) broken.push('images');
    }

    if (broken.length === 0) continue;

    console.log(`Product: ${product.name} (${product.id}) — broken: ${broken.join(', ')}`);

    const newImageUrl = replaceUrl(product.imageUrl ?? '');
    const newImages = product.images ? replaceUrl(product.images) : null;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        imageUrl: newImageUrl !== product.imageUrl ? newImageUrl : undefined,
        images: newImages !== product.images ? newImages : undefined,
      },
    });

    console.log(`  ✓ Updated ${product.name}\n`);
    updated++;
  }

  // Also check Recipe.imageUrl and RecipeStep.imageUrl
  const recipes = await prisma.recipe.findMany({ where: { imageUrl: { not: null } } });
  for (const recipe of recipes) {
    if (!recipe.imageUrl) continue;
    const broken = Object.keys(REPLACEMENTS).find(k => recipe.imageUrl!.includes(k));
    if (!broken) continue;
    const good = REPLACEMENTS[broken];
    console.log(`Recipe: ${recipe.title} — updating imageUrl`);
    await prisma.recipe.update({
      where: { id: recipe.id },
      data: { imageUrl: recipe.imageUrl.replace(broken, good) },
    });
    console.log(`  ✓ ${broken} → ${good}`);
    updated++;
  }

  // Also check RecipeStep
  const steps = await prisma.recipeStep.findMany({ where: { imageUrl: { not: null } } });
  for (const step of steps) {
    if (!step.imageUrl) continue;
    const broken = Object.keys(REPLACEMENTS).find(k => step.imageUrl!.includes(k));
    if (!broken) continue;
    const good = REPLACEMENTS[broken];
    console.log(`RecipeStep ${step.id} — updating imageUrl`);
    await prisma.recipeStep.update({
      where: { id: step.id },
      data: { imageUrl: step.imageUrl.replace(broken, good) },
    });
    console.log(`  ✓ ${broken} → ${good}`);
    updated++;
  }

  console.log(`\n✅ Done. ${updated} record(s) updated.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
