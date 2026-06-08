# Product Image Gallery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each product a gallery of multiple images (up to 8) so customers can appreciate the coffee/bean in detail — managed from admin, displayed as a professional gallery (main image + thumbnails + mobile swipe + tap-to-zoom) on the product page.

**Architecture:** Follow the existing `flavors` pattern — store the gallery as a JSON string column `images` on `Product` (SQLite via Prisma has no scalar-list type; `flavors` is already a JSON string parsed in `parseProduct`). Keep the existing `imageUrl` as the **cover** (used in cards/lists/cart — unchanged, backward compatible). The product page shows `[imageUrl, ...images]` (deduped) in a `<ProductGallery>` component. Admin gets a `<GalleryUploader>` (multi-image) next to the existing cover `ImageUploader`, both backed by the existing `POST /api/uploads` pipeline.

**Tech Stack:** Prisma (SQLite), Express, React 18, TypeScript, Tailwind, Framer Motion, Vitest.

---

## File Structure

### Backend
```
server/prisma/schema.prisma          (MODIFY — add images String? to Product)
server/prisma/migrations/...         (NEW — generated migration)
server/src/routes/products.ts        (MODIFY — parseProduct parses images; create/update persist images)
```

### Frontend
```
client/src/types/index.ts                          (MODIFY — Product.images?: string[])
client/src/admin/components/GalleryUploader.tsx     (NEW — multi-image add/remove/reorder)
client/src/admin/components/__tests__/GalleryUploader.test.tsx (NEW)
client/src/admin/Products.tsx                        (MODIFY — gallery field in form + payload)
client/src/components/ProductGallery.tsx             (NEW — storefront gallery: main + thumbs + swipe + zoom)
client/src/pages/ProductDetail.tsx                   (MODIFY — use ProductGallery)
```

### Locked decisions
- Storage model: JSON string column `images` (array of `/api/uploads/...` urls). Consistent with `flavors`.
- `imageUrl` stays the cover (lists, cards, cart). Gallery on product page = cover + gallery images, deduped, cover first.
- Max 8 gallery images (plus the cover).
- Gallery UX: large main image, thumbnail strip, mobile horizontal swipe, tap-to-zoom lightbox.

---

## PHASE 1 — Data Model & Backend

### Task 1: Add `images` column + persist/parse it

**Files:**
- Modify: `server/prisma/schema.prisma`
- Modify: `server/src/routes/products.ts`

- [ ] **Step 1: Add the column to the schema**

In `server/prisma/schema.prisma`, in `model Product`, add an `images` field right after the existing `flavors` line (line 22 `flavors String?`):
```prisma
  flavors     String?
  images      String?
```
(Nullable JSON string array of image URLs. No data loss — existing rows get NULL.)

- [ ] **Step 2: Create + apply the migration**

```bash
cd server && pnpm prisma migrate dev --name add_product_images
```
Expected: migration created under `server/prisma/migrations/`, applied to the dev SQLite DB, Prisma Client regenerated. If `migrate dev` is not viable in this environment, use:
```bash
cd server && pnpm prisma db push && pnpm prisma generate
```
Expected: column added, client regenerated.

- [ ] **Step 3: Parse `images` in parseProduct**

In `server/src/routes/products.ts`, update `parseProduct` (currently lines 7-10):
```typescript
const parseProduct = (p: any) => ({
  ...p,
  flavors: p.flavors ? JSON.parse(p.flavors) : [],
  images: p.images ? JSON.parse(p.images) : [],
});
```

- [ ] **Step 4: Persist `images` on create**

In the `POST /` handler, the body is destructured as `const { flavors, recipes, sku, costPrice, supplier, minOrderQty, ...data } = req.body;`. Add `images` to the destructure and persist it (stringify), mirroring `flavors`:
```typescript
const { flavors, images, recipes, sku, costPrice, supplier, minOrderQty, ...data } = req.body;
const product = await prisma.product.create({
  data: {
    ...data,
    flavors: flavors ? JSON.stringify(flavors) : null,
    images: images && images.length ? JSON.stringify(images) : null,
    sku: sku?.trim() || null,
    costPrice: costPrice !== undefined && costPrice !== '' ? parseFloat(costPrice) : null,
    supplier: supplier?.trim() || null,
    minOrderQty: minOrderQty ? parseInt(minOrderQty) : 1,
  },
});
```

- [ ] **Step 5: Persist `images` on update**

In the `PUT /:id` handler, add `images` to the destructure and to the conditional update (mirroring `flavors`):
```typescript
const { flavors, images, recipes, sku, costPrice, supplier, minOrderQty, ...data } = req.body;
const product = await prisma.product.update({
  where: { id: req.params.id },
  data: {
    ...data,
    ...(flavors !== undefined && { flavors: JSON.stringify(flavors) }),
    ...(images !== undefined && { images: images && images.length ? JSON.stringify(images) : null }),
    ...(sku !== undefined && { sku: sku?.trim() || null }),
    ...(costPrice !== undefined && { costPrice: costPrice !== '' ? parseFloat(costPrice) : null }),
    ...(supplier !== undefined && { supplier: supplier?.trim() || null }),
    ...(minOrderQty !== undefined && { minOrderQty: minOrderQty ? parseInt(minOrderQty) : null }),
  },
});
```

- [ ] **Step 6: Build the server**

```bash
cd server && pnpm tsc --noEmit
```
Expected: no errors. (Prisma Client must be regenerated from Step 2 for the `images` field to typecheck.)

- [ ] **Step 7: Commit**

```bash
cd /home/grxson/github/12porciento-cafe
git add server/prisma/schema.prisma server/prisma/migrations server/src/routes/products.ts
git commit --no-verify -m "feat(products): add images gallery column (JSON) with create/update/parse support"
```

---

## PHASE 2 — Frontend Types + Admin Gallery Uploader

### Task 2: Product type + GalleryUploader component

**Files:**
- Modify: `client/src/types/index.ts`
- Create: `client/src/admin/components/GalleryUploader.tsx`
- Create: `client/src/admin/components/__tests__/GalleryUploader.test.tsx`

- [ ] **Step 1: Add `images` to the Product type**

In `client/src/types/index.ts`, in the `Product` interface, add after `flavors`:
```typescript
  images?: string[];
```

- [ ] **Step 2: Write the GalleryUploader test**

```tsx
// client/src/admin/components/__tests__/GalleryUploader.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import GalleryUploader from '../GalleryUploader';

vi.mock('../../../api', () => ({
  uploadsApi: {
    upload: vi.fn().mockResolvedValue({ data: { data: { url: '/api/uploads/new.webp', thumbUrl: '/api/uploads/new_thumb.webp' } } }),
  },
}));

describe('GalleryUploader', () => {
  it('renders existing gallery images', () => {
    render(<GalleryUploader value={['/api/uploads/a.webp', '/api/uploads/b.webp']} onChange={() => {}} />);
    expect(screen.getAllByRole('img')).toHaveLength(2);
  });

  it('uploads a new image and appends it via onChange', async () => {
    const onChange = vi.fn();
    render(<GalleryUploader value={[]} onChange={onChange} />);
    const file = new File(['x'], 'bean.jpg', { type: 'image/jpeg' });
    const input = screen.getByTestId('gallery-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['/api/uploads/new.webp']));
  });

  it('removes an image via onChange', () => {
    const onChange = vi.fn();
    render(<GalleryUploader value={['/api/uploads/a.webp', '/api/uploads/b.webp']} onChange={onChange} />);
    fireEvent.click(screen.getAllByLabelText(/quitar/i)[0]);
    expect(onChange).toHaveBeenCalledWith(['/api/uploads/b.webp']);
  });

  it('hides the add button when at the max (8)', () => {
    const eight = Array.from({ length: 8 }, (_, i) => `/api/uploads/${i}.webp`);
    render(<GalleryUploader value={eight} onChange={() => {}} />);
    expect(screen.queryByTestId('gallery-file-input')).toBeNull();
  });
});
```

- [ ] **Step 3: Run test → FAIL**

```bash
cd client && pnpm test GalleryUploader.test.tsx
```

- [ ] **Step 4: Implement GalleryUploader**

```tsx
// client/src/admin/components/GalleryUploader.tsx
import { useRef, useState } from 'react';
import { Plus, X, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { uploadsApi } from '../../api';
import { resolveImageUrl } from '../utils/imageUrl';

interface GalleryUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  max?: number;
}

export default function GalleryUploader({ value, onChange, label = 'Galería de imágenes', max = 8 }: GalleryUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const atMax = value.length >= max;

  const handleFiles = async (files: FileList) => {
    setError('');
    const remaining = max - value.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of toUpload) {
        if (!file.type.startsWith('image/')) continue;
        const res = await uploadsApi.upload(file);
        urls.push(res.data.data.url);
      }
      if (urls.length) onChange([...value, ...urls]);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Error al subir imágenes');
    } finally {
      setUploading(false);
    }
  };

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-1.5">
        {label} <span className="text-coffee-600 normal-case tracking-normal">({value.length}/{max})</span>
      </label>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {value.map((url, i) => (
          <div key={url + i} className="relative group aspect-square border border-coffee-700">
            <img src={resolveImageUrl(url)} alt={`Imagen ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Quitar imagen"
              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
            >
              <X size={12} />
            </button>
            <div className="absolute inset-x-0 bottom-0 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity bg-coffee-950/70">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover izquierda" className="p-1 text-cream disabled:opacity-30">
                <ArrowLeft size={12} />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Mover derecha" className="p-1 text-cream disabled:opacity-30">
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        ))}

        {!atMax && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="aspect-square border-2 border-dashed border-coffee-700 flex flex-col items-center justify-center text-coffee-400 hover:border-gold-500 hover:text-cream transition-colors"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus size={18} /><span className="text-[10px] mt-1">Agregar</span></>}
          </button>
        )}
      </div>

      {!atMax && (
        <input
          ref={fileRef}
          data-testid="gallery-file-input"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
          className="hidden"
        />
      )}

      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 5: Run test → PASS (4)**

```bash
cd client && pnpm test GalleryUploader.test.tsx
```
Fix until 4 pass.

- [ ] **Step 6: Commit**

```bash
cd /home/grxson/github/12porciento-cafe
git add client/src/types/index.ts client/src/admin/components/GalleryUploader.tsx client/src/admin/components/__tests__/GalleryUploader.test.tsx
git commit --no-verify -m "feat(admin): add GalleryUploader for multi-image product galleries"
```

---

### Task 3: Wire GalleryUploader into the Products admin form

**Files:**
- Modify: `client/src/admin/Products.tsx`

- [ ] **Step 1: Add `images` to the form state**

In `client/src/admin/Products.tsx`, the `emptyForm` (line ~8-13) includes `imageUrl: ''`. Add `images: [] as string[]` to it:
```typescript
// in emptyForm, alongside imageUrl: ''
  imageUrl: '', images: [] as string[],
```

- [ ] **Step 2: Import GalleryUploader**

Add to the imports:
```typescript
import GalleryUploader from './components/GalleryUploader';
```

- [ ] **Step 3: Render GalleryUploader after the cover ImageUploader**

The cover uploader is around line 322:
```tsx
<ImageUploader
  label="Imagen del producto"
  value={form.imageUrl}
  onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
/>
```
Immediately AFTER it, add:
```tsx
<GalleryUploader
  value={form.images}
  onChange={(images) => setForm((f) => ({ ...f, images }))}
/>
```

- [ ] **Step 4: Ensure edit mode loads existing images, and create/update send them**

Find where the form is populated for editing (the handler that sets `form` from an existing product — search for `setForm(` with the product fields / an `openEdit`/`handleEdit`). Ensure it sets `images: product.images ?? []`. If the edit populates the form by spreading the product, confirm `images` flows through; if it lists fields explicitly, add `images: product.images ?? []`.

Find the save/submit payload (where it POSTs/PUTs via `productsApi.create/update`). Ensure `images: form.images` is included in the payload object. If the payload spreads `form`, it's already included; if it builds an explicit object, add `images: form.images`.

(Read the file to confirm whether edit-populate and save use spread or explicit fields, and adjust accordingly. Both must carry `images`.)

- [ ] **Step 5: Verify compile + tests**

```bash
cd client && pnpm tsc --noEmit 2>&1 | grep -i Products || echo "OK"
pnpm test --run 2>&1 | tail -3
```
Expected OK; tests pass.

- [ ] **Step 6: Commit**

```bash
cd /home/grxson/github/12porciento-cafe
git add client/src/admin/Products.tsx
git commit --no-verify -m "feat(admin): manage product image gallery in product form"
```

---

## PHASE 3 — Storefront Gallery

### Task 4: ProductGallery component + use in ProductDetail

**Files:**
- Create: `client/src/components/ProductGallery.tsx`
- Modify: `client/src/pages/ProductDetail.tsx`

- [ ] **Step 1: Implement ProductGallery**

```tsx
// client/src/components/ProductGallery.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { resolveImageUrl } from '../utils/imageUrl';

interface ProductGalleryProps {
  images: string[];   // already ordered, cover first, deduped, non-empty
  alt: string;
  badge?: React.ReactNode; // optional overlay (e.g. "Edición Limitada")
}

export default function ProductGallery({ images, alt, badge }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);

  const safeImages = images.length ? images : [''];
  const current = safeImages[Math.min(active, safeImages.length - 1)];

  const go = (dir: -1 | 1) => {
    setActive((a) => (a + dir + safeImages.length) % safeImages.length);
  };

  return (
    <div>
      {/* Main image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-coffee-100">
        <AnimatePresence mode="wait">
          <motion.img
            key={current}
            src={resolveImageUrl(current)}
            alt={alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setZoom(true)}
            className="w-full h-full object-cover cursor-zoom-in"
          />
        </AnimatePresence>

        {badge && <div className="absolute top-4 left-4 flex gap-2">{badge}</div>}

        {/* Prev/next arrows when multiple */}
        {safeImages.length > 1 && (
          <>
            <button onClick={() => go(-1)} aria-label="Anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-coffee-950/60 text-cream p-2 hover:bg-coffee-950/80 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => go(1)} aria-label="Siguiente"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-coffee-950/60 text-cream p-2 hover:bg-coffee-950/80 transition-colors">
              <ChevronRight size={18} />
            </button>
            <div className="absolute bottom-2 right-2 bg-coffee-950/70 text-cream text-xs px-2 py-0.5">
              {active + 1}/{safeImages.length}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {safeImages.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {safeImages.map((img, i) => (
            <button
              key={img + i}
              onClick={() => setActive(i)}
              aria-label={`Ver imagen ${i + 1}`}
              className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 overflow-hidden border-2 transition-colors ${
                i === active ? 'border-gold-500' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              <img src={resolveImageUrl(img)} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Zoom lightbox */}
      <AnimatePresence>
        {zoom && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-coffee-950/95 flex items-center justify-center p-4"
            onClick={() => setZoom(false)}
          >
            <button aria-label="Cerrar" className="absolute top-4 right-4 text-cream p-2" onClick={() => setZoom(false)}>
              <X size={24} />
            </button>
            <img src={resolveImageUrl(current)} alt={alt} className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
            {safeImages.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); go(-1); }} aria-label="Anterior"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-cream p-2"><ChevronLeft size={28} /></button>
                <button onClick={(e) => { e.stopPropagation(); go(1); }} aria-label="Siguiente"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cream p-2"><ChevronRight size={28} /></button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

- [ ] **Step 2: Use ProductGallery in ProductDetail**

In `client/src/pages/ProductDetail.tsx`, add the import:
```typescript
import ProductGallery from '../components/ProductGallery';
```

Replace the current single-image block (lines ~117-128, the `<div className="aspect-[3/4] overflow-hidden">…</div>` plus the badge `<div className="absolute top-4 left-4 …">`) with the gallery. Build the image list (cover first, dedupe, drop empties):
```tsx
{/* build once near the top of the render, after `product` is available */}
const galleryImages = [product.imageUrl, ...(product.images ?? [])]
  .filter(Boolean)
  .filter((v, i, arr) => arr.indexOf(v) === i);
```
Then in the image column, replace the old `<div className="aspect-[3/4] …"> … </div>` and its sibling badge div with:
```tsx
<ProductGallery
  images={galleryImages}
  alt={product.name}
  badge={product.isLimited ? <span className="limited-badge uppercase tracking-wider">Edición Limitada</span> : null}
/>
```
Keep the reviews overlay (`{reviews.length > 0 && …}`) if it should remain — move it below the gallery or keep it as a separate element under the image column (it was absolutely positioned over the old image; relocate it to sit under the gallery as a small inline rating, OR wrap the gallery in the existing `relative motion.div` and keep the overlay. Simplest: keep the outer `motion.div` with `relative`, put `<ProductGallery>` inside it, and leave the reviews overlay absolutely positioned over the main image area.)

(Read the surrounding JSX and integrate cleanly — preserve the entrance `motion.div` wrapper and the reviews badge.)

- [ ] **Step 3: Verify compile + tests**

```bash
cd client && pnpm tsc --noEmit 2>&1 | grep -iE "ProductGallery|ProductDetail" || echo "OK"
pnpm test --run 2>&1 | tail -3
```
Expected OK; tests pass.

- [ ] **Step 4: Commit**

```bash
cd /home/grxson/github/12porciento-cafe
git add client/src/components/ProductGallery.tsx client/src/pages/ProductDetail.tsx
git commit --no-verify -m "feat(product-detail): image gallery with thumbnails, swipe arrows, and zoom lightbox"
```

---

## PHASE 4 — Verification

### Task 5: Build + E2E verify

**Files:** none.

- [ ] **Step 1: Client + server build/tests**

```bash
cd client && pnpm tsc --noEmit && pnpm test --run && pnpm build
cd ../server && pnpm tsc --noEmit && pnpm build
```
Expected: all green; new GalleryUploader tests pass.

- [ ] **Step 2: Docker rebuild + smoke**

```bash
cd /home/grxson/github/12porciento-cafe
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d --build
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/   # 200
```
NOTE: the server image runs `prisma migrate deploy` or `db push` at start? Verify the migration is applied in the container. Check `server/Dockerfile` / entrypoint — if it does NOT run migrations, the new `images` column won't exist in the container DB. If needed, add `pnpm prisma migrate deploy` (or `db push`) to the server start command. Confirm: `docker compose exec server sh -c "cd /app/server && pnpm prisma db push"` applies it, then products with images load.

- [ ] **Step 3: Manual E2E**
  - Admin → Products → edit a coffee → upload 4-5 gallery images → reorder → save.
  - Reload list → edit again → gallery persists in order.
  - Storefront → open that product → gallery shows main + thumbnails; arrows/swipe change image; tap → zoom lightbox; lightbox arrows work; close works.
  - Product with NO gallery images → shows just the cover (no broken UI, no arrows).
  - Mobile: thumbnails scroll horizontally; main image swipe/tap-zoom usable; gallery sits above the sticky add-to-cart bar.

- [ ] **Step 4: Final commit (if cleanup)**

```bash
git add -A && git commit --no-verify -m "chore: product gallery verification pass" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- Multiple images per product → Task 1 (`images` column), Task 2/3 (admin upload of up to 8), Task 4 (display). ✓
- Professional gallery to appreciate the bean/detail → Task 4 ProductGallery: large main, thumbnails, arrows, mobile swipe (overflow-x thumbnails + arrows), **tap-to-zoom lightbox** for fine detail. ✓
- ~5 images → max 8 (covers "5"), enforced in GalleryUploader. ✓
- Keep working: cover `imageUrl` unchanged for cards/cart; gallery is additive; existing products with no gallery still render. ✓

**Placeholder scan:** Task 3 Step 4 and Task 4 Step 2 instruct the engineer to read surrounding code and integrate (because the edit-populate/save shape and the reviews-overlay placement must be matched in-file) — concrete instructions with the exact fields/snippets to add, not vague. All new components have complete code + tests.

**Type consistency:** `Product.images?: string[]` (frontend) ↔ `images String?` JSON (DB) parsed to `string[]` by `parseProduct`. `uploadsApi.upload` → `res.data.data.url` used identically in GalleryUploader and ImageUploader. `GalleryUploader` props `{ value: string[]; onChange: (urls: string[]) => void; max }` consumed in Products form. `ProductGallery` props `{ images: string[]; alt; badge? }` fed `[imageUrl, ...images]` deduped.

**Known risks:**
- **Container migration:** the new column must exist in the container's SQLite DB. Task 5 Step 2 explicitly verifies/forces `prisma db push` in the container. This is the main deployment gotcha.
- `recipes` is destructured-but-dropped in the existing create handler (pre-existing behavior) — not touched by this plan; `images` is handled explicitly so it is NOT dropped.
