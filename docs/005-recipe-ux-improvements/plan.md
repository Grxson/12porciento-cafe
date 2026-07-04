# Plan: Recipe UX + Branding

## Tasks

### 1. Optimizar favorites endpoint

**Files:** `server/src/routes/recipe-favorites.ts`

- Change `include: { recipe: { include: { steps: true } } }` → `select: { recipeId: true }`
- Client `useRecipeFavorites` only needs IDs, not full recipes + steps
- No migration needed

### 2. Optimizar useRecipeFavorites hook

**Files:** `client/src/hooks/useRecipeFavorites.ts`

- `toggle` callback recreated on every favorite toggle (`favoriteIds` in deps changes)
- Fix: use ref for `favoriteIds` inside `toggle`, or use a reducer pattern
- No migration needed

### 3. Rating promedio en recipe cards

**Files:**

- `client/src/types/index.ts` — add `ratings?: { rating: number }[]` to `Recipe`
- `client/src/pages/Recipes.tsx` — compute avg from `recipe.ratings`, show star display next to difficulty
- Server already includes `ratings: { select: { rating: true } }` in `GET /`
- No migration needed

### 4. Badge "Nueva" en cards

**Files:** `client/src/pages/Recipes.tsx`

- Add badge "🆕 Nueva" if recipe.createdAt is within last 14 days
- `Recipe.createdAt` already exists in type
- No migration needed

### 5. Recipe thumbnail imageUrl

**Files:**

- `server/prisma/schema.prisma` — add `imageUrl String?` to `Recipe` model
- Migration: `add_recipe_image`
- `client/src/types/index.ts` — add `imageUrl?: string | null` to `Recipe`
- `server/src/routes/recipes.ts` — include `imageUrl` in findMany selects (already auto-included unless excluded)
- `client/src/pages/Recipes.tsx` — show thumbnail next to method icon

### 6. PWA icons — replace with new logo

**Files:** `client/public/icons/`

- User provided new `icon.png` — need to:
  1. Replace `client/public/icons/logo.svg` with new source
  2. Run `node scripts/regenerate-icons.mjs` to regenerate all PNG sizes
  3. Verify all sizes: pwa-64x64, pwa-192x192, pwa-256x256, pwa-384x384, pwa-512x512, maskable-icon-512x512, apple-touch-icon-180x180
- No code changes needed (icons referenced by path in vite.config.ts)

### 7. Navbar logo — replace text with image

**Files:** `client/src/components/Navbar.tsx`

- Replace `<span>12%</span><span>doce por ciento</span>` with `<img src="/logo-horizontal.png" alt="12%" />`
- User provided `logo-horizontal.png`
- Place file at `client/public/logo-horizontal.png`

## DB Migrations (Railway CLI)

Only task 5 needs a migration. Run:

```bash
npx prisma migrate dev --name add_recipe_image
# Then apply to production:
DATABASE_URL="postgresql://postgres:FlDyqWTuuQczCxXEGjXyjpgCoCbPaIUs@metro.proxy.rlwy.net:18743/railway?sslmode=require" npx prisma migrate deploy
DATABASE_URL="postgresql://postgres:FlDyqWTuuQczCxXEGjXyjpgCoCbPaIUs@metro.proxy.rlwy.net:18743/railway?sslmode=require" npx prisma generate
```

## Image Asset Instructions

User uploaded two images:

- `icon.png` — new PWA icon source → place as `client/public/icons/logo.svg` (convert if needed) or `client/public/icons/icon.png`
- `logo-horizontal.png` — new navbar logo → place as `client/public/logo-horizontal.png`

Since model cannot read images, these must be placed manually by user before step 6 & 7 can be validated.

## Execution Order

1. Tasks 1 & 2 (no migration, no assets)
2. Task 3 (rating on cards)
3. Task 4 (Nueva badge)
4. Task 5 (recipe image — schema + migration via Railway + UI)
5. Tasks 6 & 7 (require user-placed assets)

## Verification

```bash
cd client && npx tsc --noEmit
cd server && npx tsc --noEmit
```
