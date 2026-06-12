# Stock Indicators + Flavor Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add clickable flavor filter chips in Shop (OR multi-select, server-filtered) and stock availability indicators throughout the purchase flow (ProductDetail badge, CartDrawer low-stock warning, Checkout error toast).

**Architecture:** Backend adds `flavors` CSV query param to `GET /products` using OR LIKE queries against the existing JSON string column. No schema changes. Frontend adds flavor chip state in Shop, stock badge in ProductDetail, low-stock alert in CartDrawer, and explicit toast for stock errors at payment intent creation. CartContext caps `addItem` / `updateQuantity` at `product.stock`.

**Tech Stack:** React 19, TypeScript, Zustand, Tailwind CSS, Shadcn/ui, Node/Express, Prisma/SQLite

**Important discoveries (read before coding):**
- Stock validation at checkout **already exists** server-side in `POST /payments/create-intent` — throws `{ error: "Stock insuficiente para \"${name}\"" }` (line 98–100 of `server/src/routes/payments.ts`). No new backend validation needed.
- Toast system: `useToast()` from `client/src/context/ToastContext.tsx` — call `add(message, type)` where type is `'success' | 'error' | 'info' | 'warning'`.
- Checkout already shows `setError(err.response?.data?.error || ...)` as inline red text — the stock error message surfaces, just needs a toast too.
- `flavors` stored as JSON stringified array (e.g. `'["Frutal","Chocolate"]'`) — OR filtering via `contains` per flavor works.

---

## File Map

| File | Change |
|------|--------|
| `server/src/routes/products.ts` | Add `flavors` CSV query param, OR LIKE filter |
| `client/src/context/CartContext.tsx` | Cap `addItem` and `updateQuantity` at `product.stock` |
| `client/src/pages/Shop.tsx` | Add flavor chip state, render chips, pass param to API, mobile sheet |
| `client/src/pages/ProductDetail.tsx` | Stock badge below price, disable + stepper at max, toast on attempt |
| `client/src/components/CartDrawer.tsx` | Low-stock badge per item when `product.stock <= 5` |
| `client/src/pages/Checkout.tsx` | Toast on stock error from `createIntentAndAdvance` |

---

## Task 1: Backend — Flavor Filter Param

**Files:**
- Modify: `server/src/routes/products.ts:13–60`

- [ ] **Step 1: Add `flavors` param to the GET handler**

In `server/src/routes/products.ts`, inside `router.get('/', ...)`, add after the `search` block (after line 24 in current file):

```typescript
const { process, roast, limited, limit, category, sort, search, flavors, page, pageSize } = req.query;
```

Then add after the `search` OR block:

```typescript
if (flavors) {
  const flavorArray = (flavors as string).split(',').map((f) => f.trim()).filter(Boolean);
  if (flavorArray.length > 0) {
    const flavorConditions = flavorArray.map((f) => ({ flavors: { contains: f } }));
    if (where.OR) {
      // search already uses OR — wrap both in AND
      where.AND = [{ OR: where.OR }, { OR: flavorConditions }];
      delete where.OR;
    } else {
      where.OR = flavorConditions;
    }
  }
}
```

- [ ] **Step 2: Manual test**

Start server: `pnpm --filter server dev`

```bash
curl "http://localhost:4000/api/products?flavors=Frutal,Chocolate" | jq '.data | length'
# Should return number of products with Frutal or Chocolate in flavors
curl "http://localhost:4000/api/products?flavors=Frutal,Chocolate" | jq '.data[].flavors'
# Each should contain "Frutal" or "Chocolate"
```

- [ ] **Step 3: Commit**

```bash
git add server/src/routes/products.ts
git commit -m "feat(api): add flavor OR filter to GET /products"
```

---

## Task 2: CartContext — Stock Cap

**Files:**
- Modify: `client/src/context/CartContext.tsx`

This prevents users adding more than available stock via the cart drawer stepper.

- [ ] **Step 1: Cap `addItem` at `product.stock`**

In `client/src/context/CartContext.tsx`, replace the `addItem` implementation:

```typescript
addItem: (product, quantity = 1) => {
  const items = get().items;
  const existing = items.find((i) => i.product.id === product.id);
  if (existing) {
    const newQty = Math.min(existing.quantity + quantity, product.stock);
    set({
      items: items.map((i) =>
        i.product.id === product.id ? { ...i, quantity: newQty } : i,
      ),
    });
  } else {
    const cappedQty = Math.min(quantity, product.stock);
    set({ items: [...items, { product, quantity: cappedQty }] });
  }
},
```

- [ ] **Step 2: Cap `updateQuantity` at `product.stock`**

Replace `updateQuantity`:

```typescript
updateQuantity: (productId, quantity) => {
  if (quantity <= 0) {
    get().removeItem(productId);
    return;
  }
  set({
    items: get().items.map((i) =>
      i.product.id === productId
        ? { ...i, quantity: Math.min(quantity, i.product.stock) }
        : i,
    ),
  });
},
```

- [ ] **Step 3: Commit**

```bash
git add client/src/context/CartContext.tsx
git commit -m "fix(cart): cap addItem and updateQuantity at product.stock"
```

---

## Task 3: ProductDetail — Stock Badge + Stepper Guard + Toast

**Files:**
- Modify: `client/src/pages/ProductDetail.tsx`

- [ ] **Step 1: Import `useToast`**

Add to existing imports in `ProductDetail.tsx`:

```typescript
import { useToast } from '../context/ToastContext';
```

Inside the component, add:

```typescript
const { add: addToast } = useToast();
```

- [ ] **Step 2: Replace qty increment handler**

Replace the inline `onClick` on the `+` qty button (currently `setQty(Math.min(product.stock, qty + 1))`). First add a named handler inside the component (before `return`):

```typescript
const handleQtyIncrease = () => {
  if (qty >= product.stock) {
    addToast(`Stock insuficiente. Máximo disponible: ${product.stock} unidades.`, 'warning');
  } else {
    setQty(qty + 1);
  }
};
```

Then in the JSX replace the `+` button `onClick`:

```tsx
<button
  onClick={handleQtyIncrease}
  disabled={product.stock === 0}
  className="w-11 min-h-[44px] flex items-center justify-center text-coffee-500 hover:text-coffee-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
>+</button>
```

- [ ] **Step 3: Replace stock text line with badge**

Find the current line (around line 222–224):

```tsx
<p className="text-coffee-500 text-xs mt-3">
  {product.stock} unidades disponibles{isCafe ? ' · Tostado a pedido' : ''}
</p>
```

Replace with:

```tsx
<div className="flex items-center gap-2 mt-3">
  {product.stock === 0 ? (
    <span className="text-xs font-semibold text-red-500">❌ Sin existencias</span>
  ) : product.stock <= 5 ? (
    <span className="text-xs font-semibold text-amber-500">⚠️ Quedan {product.stock} unidades</span>
  ) : (
    <span className="text-xs font-semibold text-green-600">✓ En stock</span>
  )}
  {isCafe && <span className="text-coffee-400 text-xs">· Tostado a pedido</span>}
</div>
```

- [ ] **Step 4: Manual test**

Start dev: `pnpm dev`

- Product with stock > 5: shows "✓ En stock"
- Product with stock 1–5: shows "⚠️ Quedan N unidades"
- Product with stock 0: shows "❌ Sin existencias", button disabled
- Click + at max qty: toast "Stock insuficiente. Máximo disponible: N unidades."

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/ProductDetail.tsx
git commit -m "feat(product): add stock badge and stepper guard with toast"
```

---

## Task 4: CartDrawer — Low-Stock Badge

**Files:**
- Modify: `client/src/components/CartDrawer.tsx`

- [ ] **Step 1: Add low-stock badge per item**

In `CartDrawer.tsx`, inside the item render (around line 67–68), after the product name `<p>` and weight `<p>`, add:

```tsx
{product.stock <= 5 && product.stock > 0 && (
  <p className="text-amber-500 text-[10px] font-semibold uppercase tracking-wider mt-0.5">
    Stock bajo
  </p>
)}
{product.stock === 0 && (
  <p className="text-red-400 text-[10px] font-semibold uppercase tracking-wider mt-0.5">
    Agotado
  </p>
)}
```

Full item name block context for placement:

```tsx
<div className="flex-1 min-w-0">
  <p className="text-coffee-900 text-sm font-medium leading-tight truncate">{product.name}</p>
  {product.weight && <p className="text-coffee-400 text-xs mt-0.5">{product.weight}g</p>}
  {product.stock <= 5 && product.stock > 0 && (
    <p className="text-amber-500 text-[10px] font-semibold uppercase tracking-wider mt-0.5">
      Stock bajo
    </p>
  )}
  {product.stock === 0 && (
    <p className="text-red-400 text-[10px] font-semibold uppercase tracking-wider mt-0.5">
      Agotado
    </p>
  )}
  {/* ... qty stepper below ... */}
```

- [ ] **Step 2: Manual test**

Add a product with stock ≤ 5 to cart. Open cart drawer. Should show "Stock bajo" in amber under the product name. Product with stock 0: "Agotado" in red.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/CartDrawer.tsx
git commit -m "feat(cart): show low-stock and agotado badges in CartDrawer"
```

---

## Task 5: Checkout — Toast on Stock Error

**Files:**
- Modify: `client/src/pages/Checkout.tsx`

The backend already returns `{ error: "Stock insuficiente para \"X\"" }` from `POST /payments/create-intent`. Currently this sets `setError(...)` as inline red text. Add a toast so users get clear feedback even if they've scrolled.

- [ ] **Step 1: Import `useToast`**

Add to existing imports in `Checkout.tsx`:

```typescript
import { useToast } from '../context/ToastContext';
```

Inside the component, add:

```typescript
const { add: addToast } = useToast();
```

- [ ] **Step 2: Toast on stock error in `createIntentAndAdvance`**

Find the catch block in `createIntentAndAdvance` (around line 179):

```typescript
} catch (err: any) {
  setError(err.response?.data?.error || 'Error al iniciar el pago. Intenta de nuevo.');
```

Replace with:

```typescript
} catch (err: any) {
  const msg = err.response?.data?.error || 'Error al iniciar el pago. Intenta de nuevo.';
  setError(msg);
  if (err.response?.status === 400 && msg.toLowerCase().includes('stock')) {
    addToast(msg, 'warning');
  }
```

- [ ] **Step 3: Manual test**

Force a stock conflict: set a product's stock to 0 in DB, add it to cart (using a cart from localStorage), attempt checkout. Should see inline red error AND a toast warning.

```bash
# Quick DB update for testing:
cd server && npx prisma studio
# Set a product stock to 0, then attempt checkout with that product in cart
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Checkout.tsx
git commit -m "feat(checkout): toast warning on stock error from payment intent"
```

---

## Task 6: Shop — Flavor Filter Chips

**Files:**
- Modify: `client/src/pages/Shop.tsx`

This is the largest task. Adds multi-select flavor chips below the category tabs (desktop filter bar + mobile sheet). OR logic — any selected flavor matches.

- [ ] **Step 1: Add flavor state and extraction logic**

In `Shop.tsx`, add new state alongside existing state declarations:

```typescript
const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
const [availableFlavors, setAvailableFlavors] = useState<string[]>([]);
```

After the API fetch sets `products`, extract unique flavors. Add a separate `useEffect` that runs a flavor-list fetch (all café products, no other filters):

```typescript
useEffect(() => {
  productsApi.list({ category: 'CAFÉ', pageSize: '200' }).then((r) => {
    const all = r.data.data.flatMap((p) => p.flavors ?? []);
    const unique = Array.from(new Set(all)).sort();
    setAvailableFlavors(unique);
  }).catch(() => {});
}, []); // runs once on mount
```

- [ ] **Step 2: Add `selectedFlavors` to filter params**

In the existing `useEffect` that fetches products (the one that depends on `[process, roast, sort, category, search, page]`), add `selectedFlavors` to dependency array and add to params:

```typescript
useEffect(() => {
  setLoading(true);
  const params: Record<string, string> = {
    sort,
    page: String(page),
    pageSize: String(PAGE_SIZE),
  };
  if (process !== 'Todos') params.process = process;
  if (roast !== 'Todos') params.roast = roast;
  if (category !== 'TODOS') params.category = category;
  if (search) params.search = search;
  if (selectedFlavors.length > 0) params.flavors = selectedFlavors.join(',');

  productsApi.list(params)
    .then(/* existing */)
    .catch(/* existing */)
    .finally(/* existing */);
}, [process, roast, sort, category, search, page, selectedFlavors]);
```

- [ ] **Step 3: Add toggle handler and update `hasFilters` / `resetFilters`**

Add handler:

```typescript
const toggleFlavor = (flavor: string) => {
  setSelectedFlavors((prev) =>
    prev.includes(flavor) ? prev.filter((f) => f !== flavor) : [...prev, flavor],
  );
  setPage(1);
};
```

Update `hasFilters`:

```typescript
const hasFilters = process !== 'Todos' || roast !== 'Todos' || search || selectedFlavors.length > 0;
```

Update `resetFilters`:

```typescript
const resetFilters = () => {
  setProcess('Todos'); setRoast('Todos'); setCategory('TODOS');
  setSearch(''); setSearchInput(''); setSelectedFlavors([]); setPage(1);
};
```

- [ ] **Step 4: Render flavor chips in desktop filter bar**

In the desktop filter bar (inside the `AnimatePresence` → `motion.div` around line 154), add the flavors section after the Tueste block (after the closing `</div>` of the roasts section):

```tsx
{availableFlavors.length > 0 && (
  <div className="flex flex-wrap gap-1.5 items-center">
    <span className="text-[10px] text-coffee-400 uppercase tracking-widest mr-1">Notas</span>
    {availableFlavors.map((f) => (
      <button
        key={f}
        onClick={() => toggleFlavor(f)}
        className={`text-[11px] px-3 py-1 border transition-all duration-150 cursor-pointer ${
          selectedFlavors.includes(f)
            ? 'border-gold-500 text-gold-500 bg-gold-500/8 font-medium'
            : 'border-coffee-300 text-coffee-600 hover:border-coffee-500 hover:text-coffee-900'
        }`}
      >
        {f}
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 5: Render flavor chips in mobile bottom sheet**

In the mobile sheet (inside the `filtersOpen` AnimatePresence block), add after the Tueste section (after its closing `</div>`):

```tsx
{availableFlavors.length > 0 && (
  <div className="space-y-2">
    <span className="text-[10px] text-coffee-400 uppercase tracking-widest block">Notas de Cata</span>
    <div className="flex flex-wrap gap-1.5">
      {availableFlavors.map((f) => (
        <button
          key={f}
          onClick={() => toggleFlavor(f)}
          className={`text-[11px] px-3 py-1.5 border transition-all duration-150 cursor-pointer ${
            selectedFlavors.includes(f)
              ? 'border-gold-500 text-gold-500 bg-gold-500/10 font-medium'
              : 'border-coffee-700 text-coffee-300 hover:border-coffee-500 hover:text-cream'
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 6: Update mobile filter count badge**

Find the mobile filter badge (around line 219):

```tsx
{(process !== 'Todos' || roast !== 'Todos' || category !== 'TODOS') && (
  <span ...>
    {[process !== 'Todos', roast !== 'Todos', category !== 'TODOS'].filter(Boolean).length}
  </span>
)}
```

Replace with:

```tsx
{(process !== 'Todos' || roast !== 'Todos' || category !== 'TODOS' || selectedFlavors.length > 0) && (
  <span className="absolute -top-1.5 -right-1.5 bg-gold-500 text-coffee-950 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
    {[process !== 'Todos', roast !== 'Todos', category !== 'TODOS', selectedFlavors.length > 0].filter(Boolean).length}
  </span>
)}
```

- [ ] **Step 7: Manual test**

- Desktop: click "Frutal" chip → products update. Click "Chocolate" → OR union. Click "Frutal" again to deselect. "Limpiar filtros" clears all.
- Mobile: open sheet, tap flavor chips, "Ver resultados" → products update.
- Category change to ACCESORIOS → flavor chips hidden (no café flavors shown — `isCafe` is false, but chips show since `availableFlavors` loaded on mount and may still be visible). 
  - **Note:** flavor chips are inside the `isCafe && AnimatePresence` desktop block, so they auto-hide for non-café categories. ✓

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/Shop.tsx
git commit -m "feat(shop): add multi-select flavor filter chips (OR logic)"
```

---

## Task 7: ProductDetail — Clickable Flavor Tags → Shop Filter

**Files:**
- Modify: `client/src/pages/ProductDetail.tsx`

When user clicks a nota de cata in ProductDetail, navigate to Shop pre-filtered by that flavor.

- [ ] **Step 1: Import `useNavigate`**

`useNavigate` is from `react-router-dom` which is already imported. Add `useNavigate` to the import:

```typescript
import { useParams, Link, useNavigate } from 'react-router-dom';
```

Inside component, add:

```typescript
const navigate = useNavigate();
```

- [ ] **Step 2: Make flavor tags clickable — main info section**

Find the main flavor chip render (around line 164–169):

```tsx
{product.flavors.map((f) => (
  <span key={f} className="bg-coffee-100 border border-coffee-200 text-coffee-700 text-sm px-3 py-1.5">{f}</span>
))}
```

Replace with:

```tsx
{product.flavors.map((f) => (
  <button
    key={f}
    onClick={() => navigate(`/tienda?flavors=${encodeURIComponent(f)}`)}
    className="bg-coffee-100 border border-coffee-200 text-coffee-700 text-sm px-3 py-1.5 hover:border-gold-500 hover:text-gold-600 transition-all cursor-pointer"
    title={`Ver cafés con nota "${f}"`}
  >
    {f}
  </button>
))}
```

- [ ] **Step 3: Make flavor tags clickable — Ficha Técnica tab**

Find the ficha tab flavor chips (around line 388–393, dark background section):

```tsx
{product.flavors.map((f) => (
  <span key={f} className="bg-coffee-800 border border-coffee-700 text-coffee-200 px-3 py-1.5 text-sm">{f}</span>
))}
```

Replace with:

```tsx
{product.flavors.map((f) => (
  <button
    key={f}
    onClick={() => navigate(`/tienda?flavors=${encodeURIComponent(f)}`)}
    className="bg-coffee-800 border border-coffee-700 text-coffee-200 px-3 py-1.5 text-sm hover:border-gold-500 hover:text-gold-400 transition-all cursor-pointer"
    title={`Ver cafés con nota "${f}"`}
  >
    {f}
  </button>
))}
```

- [ ] **Step 4: Read URL param in Shop and pre-select flavor**

In `Shop.tsx`, add URL param reading. Import `useEffect` is already there. Add `useLocation` import:

```typescript
import { useLocation } from 'react-router-dom';
```

Inside Shop component, add:

```typescript
const location = useLocation();
```

Add a one-time effect after the other state declarations:

```typescript
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const flavorParam = params.get('flavors');
  if (flavorParam) {
    setSelectedFlavors(flavorParam.split(',').map((f) => f.trim()).filter(Boolean));
    setCategory('CAFÉ');
  }
}, []); // intentionally runs once on mount to seed from URL
```

- [ ] **Step 5: Manual test**

From ProductDetail, click "Chocolate" nota de cata. Should navigate to `/tienda?flavors=Chocolate` and show only products with Chocolate in their flavors. Flavor chip "Chocolate" highlighted.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/ProductDetail.tsx client/src/pages/Shop.tsx
git commit -m "feat(product): make flavor tags clickable, deep-link to shop filter"
```

---

## Task 8: Full Integration Test

- [ ] **Step 1: Start full dev stack**

```bash
pnpm dev
```

- [ ] **Step 2: Golden path — flavor filter**

1. Go to `/tienda` → category CAFÉ → flavor chips visible
2. Click 1 chip → product list updates, chip highlighted
3. Click 2nd chip → OR union, both highlighted
4. Deselect one chip → updates
5. Click "Limpiar filtros" → all chips deselected, all products shown
6. Go to a product detail page → click nota de cata chip → navigates to `/tienda?flavors=X` → pre-filtered, chip highlighted

- [ ] **Step 3: Golden path — stock indicators**

1. Go to product with stock > 5 → shows "✓ En stock"
2. Go to product with stock 1–5 → shows "⚠️ Quedan N unidades"
3. Go to product with stock 0 → shows "❌ Sin existencias", "Agotado" button, + button disabled
4. At stock > 1 product: click + until max → toast warning fires, qty stays at max
5. Add low-stock product to cart → open drawer → "Stock bajo" badge visible

- [ ] **Step 4: Edge case — stock at checkout**

1. In DB, set product stock to 0 (use Prisma Studio or direct query)
2. Keep it in localStorage cart (or add before setting stock to 0)
3. Attempt checkout → should get inline error + toast: "Stock insuficiente para X"

- [ ] **Step 5: Mobile test**

1. Open Shop on mobile viewport (DevTools)
2. Tap "Filtros" button → bottom sheet opens → "Notas de Cata" section visible
3. Tap flavor chips → sheet filter count badge increments
4. Tap "Ver resultados" → sheet closes, products filtered

- [ ] **Step 6: Final commit**

```bash
git add -A
git status  # verify nothing unexpected staged
git commit -m "feat: stock indicators + flavor filters — full integration"
```
