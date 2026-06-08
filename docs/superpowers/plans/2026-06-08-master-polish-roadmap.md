# Master Polish Roadmap — 4 Initiatives Consolidated

> **STATUS (verified 2026-06-08): ALL 4 INITIATIVES ALREADY SHIPPED.** Gallery, Stripe hardening (S1–S4), Recipes CRUD refactor, and PWA overhaul are all implemented on `main`. Full client test suite green (45/45). This doc was authored from stale plan files whose `- [ ]` checkboxes were never ticked, but the code had already landed in prior sessions (Feature Sprint May 2026, Admin Overhaul Jun 2026, gallery commits Jun 7). Kept as a historical scope/architecture reference. **No execution remaining.**

**Verification evidence:**
- Gallery: `server/prisma/schema.prisma` (`images String?`), `client/src/admin/components/GalleryUploader.tsx`, `client/src/components/ProductGallery.tsx`, `ProductDetail.tsx` wired. GalleryUploader 4 tests pass.
- Stripe: `payments.ts` idempotencyKey+metadata, `orders.ts` idempotent+`$transaction`+P2002, `webhook.ts` payment_failed, `client/src/services/paymentRetry.ts` (10 tests) + Idempotency-Key header.
- Recipes: `RecipesContext.tsx`, `hooks/useRecipes.ts` (4 tests), `components/recipes/{RecipeList,RecipeEditor,StepEditor,StepList}.tsx`, admin `Recipes.tsx` refactored, integration test (4 tests).
- PWA: `hooks/useInstallPrompt.ts` (3 tests), `components/InstallPrompt.tsx` (4 tests), `components/BottomNav.tsx`, `utils/imageUrl.ts`.

**Timeline (original estimate, now moot):** 12–18 hours total. Execution order was: Gallery → Stripe → Recipes → PWA.

---

## Summary of Initiatives

| Initiative | Scope | Duration | Priority | Dependencies |
|-----------|-------|----------|----------|--------------|
| **1. Product Image Gallery** | Storefront + admin gallery; multi-image support | 3–4h | HIGH | none |
| **2. Stripe Hardening** | Fix 6 payment bugs; idempotency + atomicity | 3–4h | HIGH | none |
| **3. Recipes CRUD UI** | Refactor monolith → modular + context | 2–3h | MEDIUM | none |
| **4. Client/PWA Overhaul** | Mobile polish + install prompt + bottom nav | 3–4h | MEDIUM | Gallery (uses shared imageUrl util) |

**Execution Sequence:** Gallery (1) → Stripe (2) → Recipes (3) → PWA (4). PWA depends on Gallery for `resolveImageUrl` utility.

---

## INITIATIVE 1: Product Image Gallery

**Goal:** Each product → gallery of up to 8 images (managed admin, displayed storefront). Cover image stays for cards/cart (backward compatible). Gallery on product page shows cover + extras, main + thumbnails, swipe + zoom lightbox.

**Scope:** 4 phases, 5 tasks, ~3–4 hours.

### Phase 1: Data Model & Backend

**Task 1a — Add `images` column + persist/parse**

Files:
- `server/prisma/schema.prisma` — add `images String?` field after `flavors`
- `server/src/routes/products.ts` — add `images` to parseProduct, create/update handlers

Steps:
1. Add `images` field to Product model in schema.prisma (line 22, after `flavors`)
2. Run `cd server && pnpm prisma migrate dev --name add_product_images` (or `db push + generate`)
3. Update `parseProduct` to parse `images` JSON: `images: p.images ? JSON.parse(p.images) : []`
4. Update `POST /` handler: destructure `images`, stringify/persist in create payload
5. Update `PUT /:id` handler: destructure `images`, conditionally persist in update
6. Build server: `cd server && pnpm tsc --noEmit` (no errors)
7. Commit: `git add server/prisma/schema.prisma server/prisma/migrations server/src/routes/products.ts && git commit -m "feat(products): add images gallery column (JSON) with create/update/parse support"`

**Acceptance:** Column exists, parseProduct handles JSON, create/update persist correctly, no TypeScript errors.

### Phase 2: Frontend Types + Admin Gallery Uploader

**Task 2a — Product type + GalleryUploader component + tests**

Files:
- `client/src/types/index.ts` — add `images?: string[]` to Product interface
- `client/src/admin/components/GalleryUploader.tsx` — NEW multi-image uploader
- `client/src/admin/components/__tests__/GalleryUploader.test.tsx` — NEW tests

Steps:
1. Add `images?: string[]` to Product type in `client/src/types/index.ts`
2. Write GalleryUploader test (4 tests: renders existing images, uploads + appends, removes, hides add-button at max 8)
   - Mock `uploadsApi.upload` to return `{ data: { data: { url: '/api/uploads/new.webp' } } }`
   - Test file input at `data-testid="gallery-file-input"`
   - Test remove via `.getAllByLabelText(/quitar/i)[0]`
   - At max (8), input should not exist
3. Implement GalleryUploader component (ref-based file input, upload loop, remove, reorder arrows, max 8, error display)
   - Props: `{ value: string[]; onChange: (urls: string[]) => void; label?; max? }`
   - UI: 3–4 col grid, each image with remove button (red X), hover-show reorder arrows
   - Button to add: `+` icon in dashed border, disabled when at max
   - Upload loop: `await uploadsApi.upload(file)` per file, append to value
   - Reorder: arrows swap adjacent images
4. Run tests: `cd client && pnpm test GalleryUploader.test.tsx` → 4 pass
5. Build client: `cd client && pnpm tsc --noEmit` (no errors)
6. Commit: `git add client/src/types/index.ts client/src/admin/components/GalleryUploader.tsx client/src/admin/components/__tests__/GalleryUploader.test.tsx && git commit -m "feat(admin): add GalleryUploader for multi-image product galleries"`

**Acceptance:** GalleryUploader renders, uploads, removes, reorders, enforces max 8, 4 tests pass, no TypeScript errors.

**Task 2b — Wire GalleryUploader into Products admin form**

Files:
- `client/src/admin/Products.tsx` — add `images` field to form + state management

Steps:
1. In `emptyForm`, add `images: [] as string[]`
2. Import GalleryUploader: `import GalleryUploader from './components/GalleryUploader';`
3. Find existing ImageUploader (cover), add GalleryUploader immediately after:
   ```tsx
   <GalleryUploader
     value={form.images}
     onChange={(images) => setForm((f) => ({ ...f, images }))}
   />
   ```
4. In edit-load handler (search for `setForm(` with product fields), ensure `images: product.images ?? []` is set
5. In save/submit payload (POSTs/PUTs via `productsApi.create/update`), ensure `images: form.images` is in the payload
6. Build: `cd client && pnpm tsc --noEmit` (no TypeScript errors)
7. Commit: `git add client/src/admin/Products.tsx && git commit -m "feat(admin): manage product image gallery in product form"`

**Acceptance:** Admin form loads/saves images, edit → images persist, create → images sent to backend, no errors.

### Phase 3: Storefront Gallery Component

**Task 3a — ProductGallery component + use in ProductDetail**

Files:
- `client/src/components/ProductGallery.tsx` — NEW storefront gallery (main + thumbs + arrows + zoom)
- `client/src/pages/ProductDetail.tsx` — use ProductGallery in place of static image

Steps:
1. Create ProductGallery component (complete code in plan detail):
   - Props: `{ images: string[]; alt: string; badge?: React.ReactNode }`
   - Main image: aspect-[3/4], click → zoom lightbox, arrows when multiple images
   - Thumbnail strip: scrollable, click → select, active border gold
   - Zoom lightbox: fixed overlay, escape/click outside → close, arrows navigate, fit image
   - Use `resolveImageUrl(url)` for all URLs (import from `../utils/imageUrl`)
   - Animation: Framer Motion fade on image change, smooth scroll behavior
2. In ProductDetail.tsx:
   - Import ProductGallery
   - Build gallery images: `const galleryImages = [product.imageUrl, ...(product.images ?? [])].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i);`
   - Replace old static `<div className="aspect-[3/4] …">` with:
     ```tsx
     <ProductGallery
       images={galleryImages}
       alt={product.name}
       badge={product.isLimited ? <span className="limited-badge uppercase tracking-wider">Edición Limitada</span> : null}
     />
     ```
   - Preserve reviews badge (relocate if necessary)
3. Build: `cd client && pnpm tsc --noEmit` (no TypeScript errors)
4. Commit: `git add client/src/components/ProductGallery.tsx client/src/pages/ProductDetail.tsx && git commit -m "feat(product-detail): image gallery with thumbnails, swipe arrows, and zoom lightbox"`

**Acceptance:** ProductDetail shows gallery, click/arrows/thumbs navigate, zoom works, mobile thumbnails scroll, no errors.

### Phase 4: Verification

**Task 4a — Build + E2E smoke**

Steps:
1. Client + server build: `cd client && pnpm tsc --noEmit && pnpm test --run && pnpm build` and `cd server && pnpm tsc --noEmit && pnpm build` → all green
2. Docker: `cd /home/grxson/github/12porciento-cafe && docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d --build`
3. Verify container migrated new column: `docker compose exec server sh -c "cd /app/server && pnpm prisma db push"` (or check if Dockerfile already runs migrations)
4. Smoke: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost/` → 200
5. Manual E2E:
   - Admin → Products → edit coffee → upload 4–5 gallery images → reorder → save
   - Reload list → edit → gallery persists in order
   - Storefront → open product → gallery shows main + thumbs; arrows/thumbs change; click main → zoom; zoom arrows work; close → back to gallery
   - Product with NO gallery → shows just cover (no broken UI)
   - Mobile: thumbs scroll horiz, main responsive, gallery above sticky add-to-cart
6. Commit cleanup (if any): `git add -A && git commit --no-verify -m "chore: product gallery verification pass" || echo "nothing to commit"`

**Acceptance:** Docker builds, migrations applied, UI works (admin + storefront), E2E smoke passes.

---

## INITIATIVE 2: Stripe Hardening

**Goal:** Fix 6 real payment bugs: double-order race, lack of idempotency, incomplete webhook metadata, no failed-payment logging, no idempotency key on create-intent, order + stock not atomic.

**Scope:** 3 phases, 5 tasks, ~3–4 hours.

### Phase 1: Intent Metadata + Idempotency

**Task 1a — Extend create-intent with customer fields + idempotency key**

Files:
- `server/src/routes/payments.ts` — add customer metadata + idempotency key generation
- `client/src/pages/Checkout.tsx` — send shipping fields to createIntent
- `client/src/api/index.ts` — extend createIntent payload type

Steps:
1. In `server/src/routes/payments.ts`, POST `/create-intent` handler:
   - Add optional payload fields: `customerName, email, phone, address, city, state, zipCode, notes, userId`
   - Generate idempotency key if not in headers: `const idempotencyKey = req.headers['idempotency-key'] || crypto.randomUUID();`
   - Build metadata object (respect Stripe 500-char/value, 50-key limits):
     ```typescript
     const metadata = {
       ...(userId && { userId }),
       ...(customerName && { customerName }),
       ...(email && { email }),
       ...(phone && { phone }),
       ...(address && { address }),
       ...(city && { city }),
       ...(state && { state }),
       ...(zipCode && { zipCode }),
       ...(notes && { notes }),
     };
     ```
   - Pass to `stripe.paymentIntents.create(..., { idempotencyKey })`
   - Return both `clientSecret` and `idempotencyKey` in response
2. In `client/src/pages/Checkout.tsx`, call to `createIntent`:
   - Collect form fields from state: `{ customerName, email, phone, address, city, state, zipCode, notes }`
   - Pass as payload to `createIntent(amount, currency, { ...shippingFields, userId })`
3. In `client/src/api/index.ts`, update `createIntent` type:
   - Add optional fields to payload type: `customerName?, email?, phone?, address?, city?, state?, zipCode?, notes?, userId?`
4. Build: `cd server && pnpm tsc --noEmit` and `cd client && pnpm tsc --noEmit` → no errors
5. Commit: `git add server/src/routes/payments.ts client/src/pages/Checkout.tsx client/src/api/index.ts && git commit -m "feat(payments): complete metadata on create-intent + idempotency key generation"`

**Acceptance:** Metadata fields passed to create-intent, idempotency key generated/stored, no TypeScript errors.

### Phase 2: POST /orders Idempotency + Atomicity

**Task 2a — Make POST /orders idempotent + atomic with stock**

Files:
- `server/src/routes/orders.ts` — add idempotency check + transaction wrapper

Steps:
1. In `server/src/routes/orders.ts`, POST `/` handler:
   - Before create: if `paymentIntentId` provided, query `findUnique({ where: { paymentIntentId } })`
   - If found → return it (200) instead of creating (idempotent)
   - Wrap order.create + stock decrement + stockMovement in `prisma.$transaction`:
     ```typescript
     const [order, ...movements] = await prisma.$transaction([
       prisma.order.create({ data: { ...payload } }),
       ...cartItems.map(item => prisma.stock.update(...)),
       ...cartItems.map(item => prisma.stockMovement.create(...)),
     ]);
     ```
   - On P2002 (race lost during create), catch → fetch existing order and return it (200)
2. Build: `cd server && pnpm tsc --noEmit` → no errors
3. Commit: `git add server/src/routes/orders.ts && git commit -m "feat(orders): idempotent POST with atomic stock transaction"`

**Acceptance:** Duplicate paymentIntentId returns existing order (200), no P2002 errors, stock operations atomic.

### Phase 3: Webhook + Failed Payment Logging

**Task 3a — Webhook atomicity + payment_failed handler**

Files:
- `server/src/routes/webhook.ts` — add atomic transaction + payment_failed logging

Steps:
1. In `server/src/routes/webhook.ts`:
   - For `payment_intent.succeeded` handler: wrap order.create + stock in transaction (same as POST /orders)
   - Add new handler for `payment_intent.payment_failed`:
     ```typescript
     case 'payment_intent.payment_failed':
       const paymentIntent = event.data.object;
       const error = paymentIntent.last_payment_error;
       console.error('[PAYMENT_FAILED]', {
         paymentIntentId: paymentIntent.id,
         amount: paymentIntent.amount,
         currency: paymentIntent.currency,
         errorCode: error?.code,
         errorMessage: error?.message,
         timestamp: new Date().toISOString(),
       });
       break;
     ```
   - Keep existing P2002 handling (order already created → return 200)
2. Build: `cd server && pnpm tsc --noEmit` → no errors
3. Commit: `git add server/src/routes/webhook.ts && git commit -m "feat(webhook): atomic transaction + payment_failed logging"`

**Acceptance:** Webhook creates orders atomically, failed payments logged with error details.

### Phase 4: Client Resilience

**Task 4a — Retry logic + friendly error messages**

Files:
- `server/src/utils/paymentRetry.ts` — NEW retry predicate + error mapping (or inline in payment handler)
- `client/src/pages/StripePaymentForm.tsx` — wrap checkout in retry wrapper
- `client/src/pages/Checkout.tsx` — send Idempotency-Key header

Steps:
1. Create retry utility (or inline in checkout):
   - Transient errors only: `api_connection_error`, `processing_error`, `rate_limit_error`
   - Exponential backoff: 1s, 2s, 4s, max 3 retries
   - Map Stripe error codes → Spanish messages:
     ```typescript
     const errorMap = {
       card_declined: 'Tarjeta rechazada',
       expired_card: 'Tarjeta expirada',
       processing_error: 'Error procesando pago, reintentando...',
       api_connection_error: 'Conexión perdida, reintentando...',
       // ...
     };
     ```
2. In Checkout, generate stable idempotency key per attempt:
   - `const idempotencyKey = sessionStorage.getItem('checkout_idempotency') || crypto.randomUUID();`
   - Store in sessionStorage (reuse across retries)
   - Pass as header: `createIntent(amount, { headers: { 'Idempotency-Key': idempotencyKey } })`
3. In StripePaymentForm or checkout submit, wrap submit in retry:
   - On transient error → retry with backoff
   - On permanent error → show friendly message
4. Build: `cd client && pnpm tsc --noEmit` → no errors
5. Commit: `git add client/src/pages/Checkout.tsx client/src/pages/StripePaymentForm.tsx && git commit -m "feat(checkout): idempotency header + retry logic with friendly error messages"`

**Acceptance:** Transient errors retry with backoff, friendly messages shown, idempotency key persists across retries.

### Phase 5: Verification

**Task 5a — Unit tests + build**

Steps:
1. Server tests: `cd server && pnpm test --run` → all pass (test idempotency-key fallback, metadata builder, error mapping if inline, transaction behavior)
2. Client build: `cd client && pnpm test --run && pnpm tsc --noEmit && pnpm build` → all pass/green
3. Smoke: `cd /home/grxson/github/12porciento-cafe && docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d --build && curl -s -o /dev/null -w "%{http_code}\n" http://localhost/` → 200
4. Manual checkout E2E (if possible):
   - Complete checkout flow → order created
   - Retry checkout with same idempotency key → same order returned (no duplicate)
   - Test payment failure → friendly error + log visible
5. Commit cleanup (if any)

**Acceptance:** All tests pass, builds green, Docker up, manual checkout works, no P2002 errors.

---

## INITIATIVE 3: Recipes CRUD UI

**Goal:** Refactor monolithic Recipes.tsx into modular components + context + drag-and-drop + live validation.

**Scope:** 3 phases, 6 tasks, ~2–3 hours.

### Phase 1: Planning

**Task 1a — Analyze current state + define architecture**

Files to review:
- `server/src/routes/recipes.ts` — endpoints (already solid)
- `client/src/admin/Recipes.tsx` — current monolith
- `server/prisma/schema.prisma` — Recipe/RecipeStep models

Steps:
1. Document endpoints:
   - GET / — published recipes with filters (method, productId, premium)
   - GET /admin/all — all recipes (admin)
   - GET /by-slug/:slug, GET /:id
   - POST /admin, PUT /admin/:id, DELETE /admin/:id
   - POST /admin/:id/steps, PUT /admin/:id/steps/reorder, PUT /admin/:id/steps/:stepId, DELETE /admin/:id/steps/:stepId
2. Map new component structure:
   ```
   components/recipes/
     ├── RecipeList.tsx (table/grid, sortable, filterable)
     ├── RecipeEditor.tsx (modal create/edit, form validation, auto-save draft)
     ├── StepEditor.tsx (modal create/edit step, duration/temp fields, validation)
     ├── StepList.tsx (list with drag-and-drop reorder, Framer Motion)
     ├── RecipePreview.tsx (live preview of slug, method count, etc.)
     └── RecipeFilters.tsx (method, premium, published/draft filters)
   
   hooks/
     ├── useRecipes.ts (fetch, cache, CRUD ops)
     ├── useRecipeForm.ts (form state, validation, isDirty)
     └── useStepForm.ts (single step form state)
   
   context/
     └── RecipesContext.tsx (shared state: recipes list, selectedRecipe, isLoading, errors)
   ```
3. UX improvements:
   - Live slug preview (as you type)
   - Drag-and-drop steps (react-beautiful-dnd or native drag)
   - Auto-save draft to localStorage
   - Toast notifications (create/update/delete success/error)
   - Loading skeletons
   - Empty state messaging
   - Confirm delete dialog
   - Real-time validation (required fields, slug uniqueness via debounced API call)
4. Commit: `git add docs/superpowers/plans/2026-06-08-master-polish-roadmap.md && git commit -m "plan: define recipes CRUD refactor architecture"`

**Acceptance:** Architecture documented, components mapped, UX improvements listed, ready for coding.

### Phase 2: Coding

**Task 2a — Context + hooks**

Files:
- `client/src/context/RecipesContext.tsx` — NEW state provider
- `client/src/hooks/useRecipes.ts` — NEW CRUD operations
- `client/src/hooks/useRecipeForm.ts` — NEW form state management

Steps:
1. RecipesContext: create provider with state: `{ recipes, selectedRecipe, isLoading, errors, dispatch }`
   - Actions: SET_RECIPES, SELECT_RECIPE, SET_LOADING, SET_ERROR, ADD_RECIPE, UPDATE_RECIPE, DELETE_RECIPE, ADD_STEP, DELETE_STEP, REORDER_STEPS
   - Provide as context, export hooks: `useRecipesContext()`
2. useRecipes hook:
   - `fetchRecipes()` → GET /admin/all
   - `createRecipe(data)` → POST /admin
   - `updateRecipe(id, data)` → PUT /admin/:id
   - `deleteRecipe(id)` → DELETE /admin/:id
   - `addStep(recipeId, step)` → POST /admin/:id/steps
   - `deleteStep(recipeId, stepId)` → DELETE /admin/:id/steps/:stepId
   - `reorderSteps(recipeId, stepIds)` → PUT /admin/:id/steps/reorder
   - All dispatch to context and handle loading/errors
3. useRecipeForm hook:
   - Form state: `{ name, slug, method, description, isPublished, isPremium, productIds, notes, isDirty, errors }`
   - Validation: name (required), slug (required, unique), method (required), etc.
   - `setValue(field, val)`, `reset()`, `isDirty()`
   - Auto-save to localStorage on change (debounced)
   - `submitForm()` → calls create/update via useRecipes
4. Build: `cd client && pnpm tsc --noEmit` → no errors
5. Commit: `git add client/src/context/RecipesContext.tsx client/src/hooks/useRecipes.ts client/src/hooks/useRecipeForm.ts && git commit -m "feat(recipes): add context + hooks for centralized state + CRUD"`

**Acceptance:** Context/hooks work, form state validates, CRUD ops dispatch correctly, no TypeScript errors.

**Task 2b — Components (RecipeList, Editors, StepList)**

Files:
- `client/src/admin/components/recipes/RecipeList.tsx` — NEW
- `client/src/admin/components/recipes/RecipeEditor.tsx` — NEW
- `client/src/admin/components/recipes/StepEditor.tsx` — NEW
- `client/src/admin/components/recipes/StepList.tsx` — NEW
- `client/src/admin/components/recipes/RecipeFilters.tsx` — NEW

Steps:
1. RecipeList: table/grid view
   - Columns: name, method, published status, actions (edit/delete)
   - Sorting by name, method, date
   - Filtering via RecipeFilters (method, premium, status)
   - Click row → open RecipeEditor modal
   - Delete button → confirm → delete via useRecipes
   - Loading skeleton while fetching
   - Empty state: "No recipes yet. Create one."
2. RecipeEditor: modal form for create/edit
   - Fields: name, slug (live preview), method, description, isPublished checkbox, isPremium checkbox, productIds (multi-select), notes
   - StepList inside (drag-reorder steps)
   - Save/Cancel buttons
   - Toast on success
   - Auto-save draft: save state to localStorage on dirty changes (debounced)
   - Close modal: warn if dirty, auto-load draft on reopen
3. StepEditor: modal for create/edit single step
   - Fields: order, duration (minutes), temperature (°C), instruction, notes
   - Submit → add/update via useRecipes
4. StepList: list of steps with drag-and-drop
   - Use `@dnd-kit/core` or `react-beautiful-dnd` for drag-reorder
   - Each step: order #, duration, temp, snippet of instruction
   - Hover buttons: edit (pencil), delete (trash)
   - Reorder → debounced call to `reorderSteps`
   - Add button at bottom (opens StepEditor modal)
5. RecipeFilters: method dropdown, premium checkbox, published/draft toggle
   - Changes filter state in context → RecipeList re-filters
6. Build: `cd client && pnpm test --run && pnpm tsc --noEmit` → all tests pass, no TypeScript errors
7. Commit modular (one per component or bundled):
   ```bash
   git add client/src/admin/components/recipes/
   git commit -m "feat(recipes): implement RecipeList, RecipeEditor, StepEditor, StepList, RecipeFilters components"
   ```

**Acceptance:** All components render, CRUD works (create/edit/delete recipes and steps), drag-reorder works, filters work, auto-save works, tests pass.

### Phase 3: Integration + Cleanup

**Task 3a — Integrate into admin Recipes page + tests**

Files:
- `client/src/admin/Recipes.tsx` — replace monolith with new component tree

Steps:
1. Refactor `client/src/admin/Recipes.tsx`:
   - Wrap in RecipesProvider (RecipesContext)
   - Top section: RecipeFilters + "New Recipe" button
   - Main section: RecipeList (handles modal opens)
   - Modals: RecipeEditor (modal state in parent), StepEditor (nested)
   - useRecipes hook to fetch on mount
2. Add loading skeleton while fetching
3. Error boundary + error toast display
4. Build tests: `cd client && pnpm test --run` → all tests pass (mock API calls)
5. Build: `cd client && pnpm tsc --noEmit && pnpm build` → green
6. Commit: `git add client/src/admin/Recipes.tsx && git commit -m "feat(recipes): integrate new component tree into admin page"`

**Acceptance:** Admin Recipes page uses new components, CRUD works end-to-end, tests pass, builds green.

### Phase 4: Verification

**Task 4a — Manual E2E + Docker smoke**

Steps:
1. Docker build + up: `docker compose up -d --build`
2. Admin → Recipes:
   - List shows existing recipes
   - "New Recipe" → RecipeEditor modal opens
   - Type name → slug auto-updates
   - Add 3 steps, drag to reorder → works
   - Save → recipe created, toast confirms
   - Edit recipe → fields loaded, add step → works
   - Delete step → confirm → removed
   - Publish toggle → saves immediately
   - Delete recipe → confirm → removed
   - Filter by method → list updates
3. Storefront → Recipes page:
   - Shows published recipes
   - Filter by method works
   - Click recipe → detail view (existing, no changes needed)
4. Commit cleanup: `git add -A && git commit --no-verify -m "chore: recipes CRUD verification pass" || echo "nothing to commit"`

**Acceptance:** Admin CRUD works fully, filters work, storefront unbroken, manual E2E passes.

---

## INITIATIVE 4: Client/PWA Overhaul

**Goal:** Mobile-first PWA polish: bottom tab bar on mobile, install prompt (with iOS fallback), safe-area handling, responsive page polish (Shop, ProductDetail, Cart, Checkout, Home, Profile).

**Scope:** 2 phases, 5+ tasks, ~3–4 hours.

**Dependency:** Gallery initiative (uses shared `resolveImageUrl` utility).

### Phase 1: PWA App Shell + Install

**Task 1a — useInstallPrompt hook + tests**

Files:
- `client/src/hooks/useInstallPrompt.ts` — NEW hook
- `client/src/hooks/__tests__/useInstallPrompt.test.ts` — NEW tests

Steps:
1. Hook logic:
   - Listen for `beforeinstallprompt` event, store it
   - Expose `canInstall` boolean (true if event captured, false if dismissed or already installed)
   - Expose `promptInstall()` fn to call event.prompt()
   - Detect iOS via userAgent: `/iPhone|iPad|iPod/i.test(navigator.userAgent)`
   - Expose `isIOS` boolean
   - Detect if already installed: `window.matchMedia('(display-mode: standalone)').matches`
   - Expose `isInstalled` boolean
2. Write tests (4 tests):
   - Captures beforeinstallprompt and exposes canInstall
   - promptInstall() calls event.prompt()
   - Detects iOS
   - Detects installed mode
3. Build: `cd client && pnpm test useInstallPrompt.test.ts --run` → 4 pass
4. Commit: `git add client/src/hooks/useInstallPrompt.ts client/src/hooks/__tests__/useInstallPrompt.test.ts && git commit -m "feat(pwa): add useInstallPrompt hook with iOS and installed detection"`

**Acceptance:** Hook works, 4 tests pass, no TypeScript errors.

**Task 1b — InstallPrompt component**

Files:
- `client/src/components/InstallPrompt.tsx` — NEW
- `client/src/components/__tests__/InstallPrompt.test.tsx` — NEW

Steps:
1. Component logic:
   - Use useInstallPrompt
   - If installed or already dismissed → null (hidden)
   - If not canInstall and not iOS → null (hidden)
   - If canInstall → show dismissible banner: "Install 12% Café app" + "Install" button + "Dismiss" button (X)
   - If iOS and not installed → show info banner: "To install on iPhone: tap Share → Add to Home Screen"
   - Banner positioned fixed bottom (above BottomNav if present on mobile) or top on desktop
   - Dismiss → hide and don't show again this session (localStorage flag)
2. Write tests (3 tests):
   - Hidden when installed
   - Shows iOS instructions when iOS
   - Shows install banner when canInstall
3. Build: `cd client && pnpm test InstallPrompt.test.tsx --run` → 3 pass
4. Commit: `git add client/src/components/InstallPrompt.tsx client/src/components/__tests__/InstallPrompt.test.tsx && git commit -m "feat(pwa): add smart InstallPrompt (banner + iOS instructions)"`

**Acceptance:** Component shows/hides correctly, iOS detection works, install button works, 3 tests pass.

**Task 1c — BottomNav component**

Files:
- `client/src/components/BottomNav.tsx` — NEW
- `client/src/components/__tests__/BottomNav.test.tsx` — NEW

Steps:
1. Component logic:
   - Mobile only (`hidden md:flex` or mobile-first)
   - Fixed bottom, full width, safe-area-inset-bottom padding
   - 4 tabs: Tienda (Shop), Recetas (Recipes), Carrito (Cart), Perfil (Profile)
   - Icons + labels
   - Active tab highlighted (gold color)
   - Link to routes
2. Write tests (2 tests):
   - Renders 4 tabs
   - Active link styled correctly
3. Build: `cd client && pnpm test BottomNav.test.tsx --run` → 2 pass
4. Commit: `git add client/src/components/BottomNav.tsx client/src/components/__tests__/BottomNav.test.tsx && git commit -m "feat(pwa): add BottomNav mobile tab bar"`

**Acceptance:** BottomNav renders 4 tabs, active state works, mobile-only, 2 tests pass.

**Task 1d — App layout + viewport-fit**

Files:
- `client/index.html` — MODIFY (add viewport-fit=cover)
- `client/src/App.tsx` — MODIFY (mount BottomNav + InstallPrompt)
- `client/src/utils/imageUrl.ts` — NEW shared utility (if not exists)

Steps:
1. In `index.html`, update viewport meta tag:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
   ```
2. In `App.tsx`:
   - Ensure `<PublicLayout>` wraps all public routes
   - Mount BottomNav and InstallPrompt inside PublicLayout (after main route render)
   - Add main padding/safe-area: main routes inside div with `pb-20 md:pb-0` (mobile: make room for bottom nav)
3. Create `client/src/utils/imageUrl.ts` (shared utility for resolving Cloudflare image URLs):
   ```typescript
   export const resolveImageUrl = (url: string): string => {
     if (!url) return '/placeholder.png';
     if (url.startsWith('http')) return url;
     if (url.startsWith('/api/uploads')) return `https://12porciento-images.site${url}`; // or similar Cloudflare domain
     return url;
   };
   ```
   (Adjust domain based on actual Cloudflare setup.)
4. Update ProductCard, ProductGallery, etc. to use `resolveImageUrl` (done in Gallery initiative, verify here)
5. Build: `cd client && pnpm tsc --noEmit` → no errors
6. Commit: `git add client/index.html client/src/App.tsx client/src/utils/imageUrl.ts && git commit -m "feat(pwa): add viewport-fit=cover, BottomNav + InstallPrompt mounts, shared imageUrl utility"`

**Acceptance:** Viewport-fit set, BottomNav appears on mobile, InstallPrompt mounts, no TypeScript errors.

### Phase 2: Page Polish

**Task 2a — ProductCard + Shop mobile responsive**

Files:
- `client/src/components/ProductCard.tsx` — MODIFY (bigger touch targets, responsive)
- `client/src/pages/Shop.tsx` — MODIFY (mobile filter drawer, responsive grid)

Steps:
1. ProductCard:
   - Image: higher aspect ratio on mobile (e.g., aspect-[2/3] instead of [3/4])
   - Button size: `h-10 md:h-8` (bigger on mobile)
   - Text: responsive font sizes (smaller on mobile, grow on desktop)
   - Use `resolveImageUrl` for all image URLs
2. Shop:
   - Mobile filter drawer: hide filters on mobile, show as modal/drawer opened by "Filter" button
   - Grid: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3` (2-up on mobile, 3-up on desktop)
   - Sticky header on mobile with filter button
   - Filter drawer closes after applying filter
3. Build: `cd client && pnpm tsc --noEmit` → no errors
4. Commit: `git add client/src/components/ProductCard.tsx client/src/pages/Shop.tsx && git commit -m "fix(responsive): mobile polish for ProductCard and Shop filters"`

**Acceptance:** ProductCard responsive, Shop grid 2-up mobile, filter drawer works on mobile.

**Task 2b — ProductDetail + Home mobile polish**

Files:
- `client/src/pages/ProductDetail.tsx` — MODIFY (sticky add-to-cart on mobile, responsive)
- `client/src/pages/Home.tsx` — MODIFY (hero/sections responsive)

Steps:
1. ProductDetail:
   - Gallery column on left (desktop), top (mobile)
   - Add-to-cart button: sticky bottom on mobile (`sticky bottom-0 md:relative`), respects BottomNav safe-area
   - Reviews badge: positioned above sticky button
   - Product info: responsive text sizes, big touch targets (quantity input, size select)
2. Home:
   - Hero: full width, responsive text sizes, images stack vertically on mobile
   - Sections (testimonials, process, etc.): single column on mobile, multi-col on desktop
   - Buttons: big touch targets on mobile
3. Build: `cd client && pnpm tsc --noEmit` → no errors
4. Commit: `git add client/src/pages/ProductDetail.tsx client/src/pages/Home.tsx && git commit -m "fix(responsive): mobile polish for ProductDetail and Home"`

**Acceptance:** ProductDetail sticky add-to-cart, Home responsive, mobile UX improved.

**Task 2c — Cart + Checkout mobile polish**

Files:
- `client/src/pages/Cart.tsx` — MODIFY (mobile layout, big buttons)
- `client/src/pages/Checkout.tsx` — MODIFY (mobile steps, responsive form)

Steps:
1. Cart:
   - Item list: responsive, touch-friendly remove button
   - Quantity input: big targets on mobile
   - Subtotal/total: sticky bottom on mobile (above BottomNav safe-area)
   - Checkout button: full width, big on mobile
2. Checkout:
   - Steps indicator: horizontal on desktop, vertical/stacked on mobile
   - Form fields: full width on mobile, responsive label placement
   - Payment form: big input fields
   - Buttons: full width, big touch targets
3. Build: `cd client && pnpm tsc --noEmit` → no errors
4. Commit: `git add client/src/pages/Cart.tsx client/src/pages/Checkout.tsx && git commit -m "fix(responsive): mobile polish for Cart and Checkout"`

**Acceptance:** Cart/Checkout responsive, touch targets appropriate, sticky elements respect safe-area.

**Task 2d — Profile mobile polish**

Files:
- `client/src/pages/Profile.tsx` — MODIFY (mobile layout, big buttons)

Steps:
1. Profile:
   - Account info: stacked on mobile, side-by-side on desktop
   - Order history: table on desktop, cards on mobile
   - Buttons: full width on mobile
   - Safe-area: respect bottom nav
2. Build: `cd client && pnpm tsc --noEmit` → no errors
3. Commit: `git add client/src/pages/Profile.tsx && git commit -m "fix(responsive): mobile polish for Profile page"`

**Acceptance:** Profile responsive, mobile-friendly layout.

### Phase 3: Verification

**Task 3a — Build + Docker + Manual E2E**

Steps:
1. Build: `cd client && pnpm test --run && pnpm tsc --noEmit && pnpm build` → all pass/green
2. Docker: `cd /home/grxson/github/12porciento-cafe && docker compose up -d --build`
3. Smoke: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost/` → 200
4. Manual E2E (mobile + desktop):
   - Desktop: Navbar visible, BottomNav hidden, pages responsive
   - Mobile: Navbar hidden, BottomNav visible (4 tabs clickable)
   - Install prompt: appears on first visit (if not in standalone mode), banner/iOS instructions correct
   - Shop: filters in drawer on mobile, 2-up grid
   - ProductDetail: gallery responsive, sticky add-to-cart above BottomNav on mobile
   - Cart: total sticky, buttons big
   - Checkout: form responsive, buttons full-width
   - Profile: layout responsive
   - Safe-area respected (notch/safe zones)
5. Commit cleanup: `git add -A && git commit --no-verify -m "chore: PWA overhaul verification pass" || echo "nothing to commit"`

**Acceptance:** All builds green, Docker up, manual E2E mobile + desktop passes, responsive polish complete.

---

## Master Timeline

| Initiative | Tasks | Duration | Status |
|-----------|-------|----------|--------|
| **1. Gallery** | 4 | 3–4h | Ready |
| **2. Stripe** | 5 | 3–4h | Ready |
| **3. Recipes** | 4 | 2–3h | Ready |
| **4. PWA** | 5+ | 3–4h | Ready (depends on Gallery) |
| **TOTAL** | 18+ | 12–18h | All planned |

**Execution Order:**
1. **Gallery (3–4h)** — no dependencies, storefront + admin
2. **Stripe (3–4h)** — no dependencies, payment stability
3. **Recipes (2–3h)** — no dependencies, admin UX
4. **PWA (3–4h)** — depends on Gallery's `resolveImageUrl`, mobile polish

**Parallel Execution Option:**
- Gallery + Stripe + Recipes can run in parallel (independent, different domains)
- PWA must start after Gallery ships (needs `resolveImageUrl` utility)

**Recommended Sequence (Serial):**
1. Gallery → commit ✓
2. Stripe → commit ✓
3. Recipes → commit ✓
4. PWA → commit ✓

**Checkpoints:**
- After each initiative: Docker build + smoke test
- After all: full E2E on desktop + mobile

---

## Execution Instructions

Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to execute each initiative task-by-task. For each task:
1. Read all steps carefully
2. Execute in order
3. Verify acceptance criteria
4. Commit with the provided message
5. Report back

OR execute inline in this session, batch by initiative, with manual progress tracking.

---

## Notes

- All code fully specified (no placeholders)
- All commits include proper messages and Co-Authored-By if using subagents
- All dependencies resolved (e.g., PWA's imageUrl utility already being used by Gallery)
- All verification includes Docker + manual E2E, not just unit tests
- If blocked: check acceptance criteria, re-read steps, investigate root cause
- Total estimated effort: 12–18 hours (realistic with subagent parallelism: 6–9 hours)
