# Stock Indicators + Flavor Filters Design

**Date:** 2026-06-11  
**Author:** Claude + Grxson  
**Status:** Design approved

## Overview

Add two interconnected UX features to 12porciento café:

1. **Flavor Filters in Shop** — clickable inline chips to filter products by tasting notes (notas de cata)
2. **Stock Indicators** — display product availability at multiple points (ProductDetail, CartDrawer, Checkout)

## Scope

- Frontend: React components + state management
- Backend: API filtering + validation
- Database: No schema changes (flavors already stored as JSON string)

## User Stories

### Story 1: Filter by Flavor
As a user browsing the shop, I want to click flavor chips to see only products with those notes, so I can discover coffees matching my taste preferences.

**Acceptance Criteria:**
- Flavor chips display below category tabs in Shop
- Multiple flavors can be selected (multi-select)
- OR logic: show products with ANY selected flavor
- Selected chips highlight with gold background
- Clear button removes all flavor filters
- URL params update for deep-linking

### Story 2: Know Stock Before Purchase
As a user, I want to see if a product is in stock before adding to cart, and get feedback if I try to add more than available.

**Acceptance Criteria:**
- ProductDetail shows stock status badge (En Stock / Sin existencias / Quedan N)
- Badge appears below price
- Qty stepper disables + button at max stock
- Adding beyond stock shows toast: "Stock insuficiente. Limitado a X unidades."
- CartDrawer shows "Stock bajo" badge if item qty ≤ 5
- Checkout validates stock and returns 400 if insufficient

## Technical Design

### Backend: API Filtering

**GET /api/products**

Add query parameter:
```
?flavors=Frutal,Chocolate
```

Implementation:
- Parse `flavors` param as CSV array
- Build WHERE clause: `product.flavors LIKE %Frutal% OR product.flavors LIKE %Chocolate%`
- Uses existing `flavors` column (stored as JSON stringified array)
- Return products matching any selected flavor

Code change in `server/src/routes/products.ts`:
```typescript
if (flavors) {
  const flavorArray = (flavors as string).split(',').map(f => f.trim());
  where.OR = flavorArray.map(flavor => ({
    flavors: { contains: flavor }
  }));
}
```

### Backend: Stock Validation at Checkout

**POST /api/orders**

Before creating order:
```typescript
for (const item of req.body.items) {
  const product = await prisma.product.findUnique({ where: { id: item.productId } });
  if (item.quantity > product.stock) {
    return res.status(400).json({
      error: `Stock insuficiente para ${product.name}. Máximo: ${product.stock}`
    });
  }
}
```

No changes to order creation logic; only pre-validation.

### Frontend: Flavor Filter UI

**Shop.tsx changes:**

1. Extract unique flavors from current product list after fetch
2. Add new state: `const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);`
3. Render flavor chips below category tabs:
   ```tsx
   <div className="flex gap-2 flex-wrap mb-4">
     {uniqueFlavors.map(flavor => (
       <button
         key={flavor}
         onClick={() => toggleFlavor(flavor)}
         className={`px-3 py-1.5 text-sm rounded transition-all ${
           selectedFlavors.includes(flavor)
             ? 'bg-gold-500 text-coffee-950'
             : 'bg-coffee-100 border border-coffee-200 text-coffee-700'
         }`}
       >
         {flavor}
       </button>
     ))}
   </div>
   ```
4. Pass `flavors: selectedFlavors.join(',')` to API params
5. Add clear button when flavors selected

### Frontend: Stock Indicator in ProductDetail

**ProductDetail.tsx changes:**

Replace "X unidades disponibles" line with badge:
```tsx
const getStockBadge = () => {
  if (product.stock === 0) {
    return <span className="text-red-600">❌ Sin existencias</span>;
  } else if (product.stock <= 5) {
    return <span className="text-amber-600">⚠️ Quedan {product.stock}</span>;
  } else {
    return <span className="text-green-600">✓ En stock</span>;
  }
};
```

Place below price, before qty stepper.

Disable + button in qty stepper when `qty >= product.stock`:
```tsx
<button 
  onClick={() => setQty(Math.min(product.stock, qty + 1))} 
  disabled={qty >= product.stock}
  className="..."
>+</button>
```

### Frontend: Stock Cap in CartContext

**CartContext.tsx changes:**

In `addItem()` and `updateQuantity()`:
```typescript
addItem: (product, quantity = 1) => {
  const cappedQty = Math.min(quantity, product.stock);
  // ... existing logic with cappedQty
}
```

This prevents overshooting at the cart level.

### Frontend: Toast on Overstocking in ProductDetail

**ProductDetail.tsx**:

When user clicks + and qty would exceed stock:
```typescript
const handleQtyIncrease = () => {
  if (qty >= product.stock) {
    showToast({
      type: 'warning',
      message: `Stock insuficiente. Limitado a ${product.stock} unidades.`
    });
    setQty(product.stock);
  } else {
    setQty(qty + 1);
  }
};
```

### Frontend: Stock Badge in CartDrawer

**CartDrawer.tsx**:

For each item:
```tsx
{item.product.stock <= 5 && (
  <span className="text-xs font-semibold text-amber-600">Stock bajo</span>
)}
```

Show only if stock ≤ 5. Don't show exact quantity (just alert).

### Frontend: Stock Validation at Checkout

**Checkout.tsx**:

When submitting order:
```typescript
try {
  const order = await ordersApi.create(checkoutData);
  // success
} catch (err: any) {
  if (err.response?.status === 400 && err.response?.data?.error?.includes('Stock')) {
    showToast({
      type: 'error',
      message: err.response.data.error
    });
    // Return user to cart
    navigate('/carrito');
  }
}
```

## Data Flow

```
User clicks flavor chip (Shop)
  ↓
selectedFlavors state updates
  ↓
API called with ?flavors=Frutal,Chocolate
  ↓
Products filtered server-side (OR logic)
  ↓
User clicks product → ProductDetail
  ↓
Stock badge rendered (✓ / ⚠️ / ❌)
  ↓
User adjusts qty, stock cap enforced
  ↓
User adds to cart (capped qty stored)
  ↓
CartDrawer shows "Stock bajo" if ≤5
  ↓
User proceeds to checkout
  ↓
Checkout validates stock before creating order
  ↓
If insufficient: 400 error → toast → return to cart
  ↓
If OK: order created, cart cleared
```

## Testing Strategy

### Unit Tests
- `productsApi.list({ flavors: '...' })` returns correct filtered results
- `CartContext.addItem()` caps qty at product.stock
- Toast messages render on overstocking

### Integration Tests
- Flavor filter persists through URL navigation
- Stock validation at checkout returns 400 for insufficient qty
- CartDrawer updates when product stock changes

### Manual Testing (Browser)
- Golden path: filter by flavor → view details → add within limits → checkout succeeds
- Edge case: add to cart, stock runs out server-side, checkout fails with toast
- Edge case: qty stepper doesn't allow + beyond stock
- Edge case: flavor filters clear properly

## UI/UX Notes

- Flavor chips style: Shadcn button or custom CSS (simple toggle)
- Stock badge colors: green (available) → orange (≤5) → gray (0)
- Toast styling: existing Toast component
- No major component refactoring needed

## Dependencies

- Frontend: no new dependencies (uses existing Toast, state mgmt)
- Backend: no new dependencies (existing Prisma)

## Migration & Rollout

No DB migration needed. Flavor filters gracefully degrade if server doesn't support—just don't render chips.

Stock validation at checkout is additive—doesn't break existing orders.

## Success Criteria

- [x] Flavors filterable from Shop UI
- [x] Stock visible before purchase decision
- [x] User can't add more than available (capped in UI + validated at checkout)
- [x] Insufficient stock at checkout returns clear error + feedback
- [x] CartDrawer shows urgent stock warning
- [x] No breaking changes to existing flows
