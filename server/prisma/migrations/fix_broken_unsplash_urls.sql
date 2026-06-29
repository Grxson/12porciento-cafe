-- Fix broken Unsplash image URLs
-- Unsplash deleted these photos; they now return 404.
-- Safe to run multiple times (idempotent).

-- ============================================================
-- PRODUCTS
-- ============================================================

UPDATE "Product"
SET "imageUrl" = REPLACE("imageUrl", 'photo-1447933710033-6461bcad5d65', 'photo-1495474472287-4d71bcdd2085')
WHERE "imageUrl" LIKE '%photo-1447933710033-6461bcad5d65%';

UPDATE "Product"
SET "imageUrl" = REPLACE("imageUrl", 'photo-1443512220425-95bc62f2d40b', 'photo-1501339847302-ac426a4a7cbb')
WHERE "imageUrl" LIKE '%photo-1443512220425-95bc62f2d40b%';

UPDATE "Product"
SET "imageUrl" = REPLACE("imageUrl", 'photo-1559053614-cd4628902d4a', 'photo-1461023058943-07fcbe16d735')
WHERE "imageUrl" LIKE '%photo-1559053614-cd4628902d4a%';

UPDATE "Product"
SET "imageUrl" = REPLACE("imageUrl", 'photo-1447933601769-c00d465a05d3', 'photo-1447933601403-0c6688de566e')
WHERE "imageUrl" LIKE '%photo-1447933601769-c00d465a05d3%';

-- Also fix the "images" JSON array field
UPDATE "Product"
SET "images" = REPLACE("images", 'photo-1447933710033-6461bcad5d65', 'photo-1495474472287-4d71bcdd2085')
WHERE "images" LIKE '%photo-1447933710033-6461bcad5d65%';

UPDATE "Product"
SET "images" = REPLACE("images", 'photo-1443512220425-95bc62f2d40b', 'photo-1501339847302-ac426a4a7cbb')
WHERE "images" LIKE '%photo-1443512220425-95bc62f2d40b%';

UPDATE "Product"
SET "images" = REPLACE("images", 'photo-1559053614-cd4628902d4a', 'photo-1461023058943-07fcbe16d735')
WHERE "images" LIKE '%photo-1559053614-cd4628902d4a%';

UPDATE "Product"
SET "images" = REPLACE("images", 'photo-1447933601769-c00d465a05d3', 'photo-1447933601403-0c6688de566e')
WHERE "images" LIKE '%photo-1447933601769-c00d465a05d3%';

-- ============================================================
-- RECIPES
-- ============================================================

UPDATE "Recipe"
SET "imageUrl" = REPLACE("imageUrl", 'photo-1447933710033-6461bcad5d65', 'photo-1495474472287-4d71bcdd2085')
WHERE "imageUrl" LIKE '%photo-1447933710033-6461bcad5d65%';

UPDATE "Recipe"
SET "imageUrl" = REPLACE("imageUrl", 'photo-1443512220425-95bc62f2d40b', 'photo-1501339847302-ac426a4a7cbb')
WHERE "imageUrl" LIKE '%photo-1443512220425-95bc62f2d40b%';

UPDATE "Recipe"
SET "imageUrl" = REPLACE("imageUrl", 'photo-1559053614-cd4628902d4a', 'photo-1461023058943-07fcbe16d735')
WHERE "imageUrl" LIKE '%photo-1559053614-cd4628902d4a%';

UPDATE "Recipe"
SET "imageUrl" = REPLACE("imageUrl", 'photo-1447933601769-c00d465a05d3', 'photo-1447933601403-0c6688de566e')
WHERE "imageUrl" LIKE '%photo-1447933601769-c00d465a05d3%';

-- ============================================================
-- RECIPE STEPS
-- ============================================================

UPDATE "RecipeStep"
SET "imageUrl" = REPLACE("imageUrl", 'photo-1447933710033-6461bcad5d65', 'photo-1495474472287-4d71bcdd2085')
WHERE "imageUrl" LIKE '%photo-1447933710033-6461bcad5d65%';

UPDATE "RecipeStep"
SET "imageUrl" = REPLACE("imageUrl", 'photo-1443512220425-95bc62f2d40b', 'photo-1501339847302-ac426a4a7cbb')
WHERE "imageUrl" LIKE '%photo-1443512220425-95bc62f2d40b%';

UPDATE "RecipeStep"
SET "imageUrl" = REPLACE("imageUrl", 'photo-1559053614-cd4628902d4a', 'photo-1461023058943-07fcbe16d735')
WHERE "imageUrl" LIKE '%photo-1559053614-cd4628902d4a%';

UPDATE "RecipeStep"
SET "imageUrl" = REPLACE("imageUrl", 'photo-1447933601769-c00d465a05d3', 'photo-1447933601403-0c6688de566e')
WHERE "imageUrl" LIKE '%photo-1447933601769-c00d465a05d3%';
