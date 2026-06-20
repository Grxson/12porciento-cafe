# UI Contracts: PWA Responsive Mobile

These contracts define the expected behavior of modified components after this feature ships. They are technology-agnostic acceptance contracts — not code.

---

## BottomNav

**Contract**: On any mobile viewport (< 768px), the bottom navigation MUST:
- Be fully visible above the device's home indicator / gesture bar (safe area respected)
- Each tab touch target MUST be ≥ 48px tall
- Active tab MUST be visually distinct
- Badge count MUST be readable without obstruction

**Invariants**:
- Hidden at md breakpoint (768px+)
- Always rendered above all other page content (z-index highest)
- Does NOT appear when keyboard is open on iOS (browser default behavior)

---

## CartDrawer

**Contract**: When drawer is open on mobile, it MUST:
- Cover full screen height (`inset-y-0`) with no content hidden behind safe areas
- Footer action buttons (`Proceder al pago`, `Ver carrito completo`) MUST be visible and tappable above iPhone home indicator
- Quantity `+/-` buttons MUST have ≥ 44×44px touch targets
- Remove (trash) button MUST have ≥ 44×44px touch target
- Backdrop tap MUST close drawer
- Content area MUST be independently scrollable when cart has many items

**Safe area**: Footer section must add `paddingBottom: env(safe-area-inset-bottom, 0px)`.

---

## RecipeLiveMode Bottom Panel

**Contract**: The fixed bottom action panel (brew log CTA, next step button) MUST:
- Always be fully visible, never hidden behind device bottom edge
- Have ≥ 44px touch targets for all buttons
- Not overlap or be obscured by BottomNav (z-index ordering: panel at z-60, BottomNav at z-50)
- Be scroll-blocked when the quick panel overlay is visible

**Safe area**: Bottom panel must add `paddingBottom: env(safe-area-inset-bottom, 0px)`.

---

## BrewLogForm Modal

**Contract**: On mobile (< 768px), the modal MUST:
- Not exceed `min(90vh, calc(100dvh - 8rem))` height to accommodate keyboard
- Have scrollable content area for long forms
- Bottom padding MUST clear safe area
- All form inputs MUST remain accessible when mobile keyboard is open (content scrolls)
- Submit button MUST be visible without scrolling on iPhone SE (375px wide, 667px tall)

---

## ConfirmDialog

**Contract**: On mobile, the dialog MUST:
- Fit within the viewport without overflow
- Action buttons MUST have ≥ 44px touch targets (`py-3 min-h-[44px]`)
- Bottom padding MUST clear safe area on notch devices
- Backdrop dismissal behavior follows existing implementation

---

## Navbar Mobile Menu

**Contract**: The slide-in menu on mobile MUST:
- Never exceed `min(18rem, calc(100vw - 2rem))` width — ensures ≥ 2rem left margin on all devices including 320px iPhone SE
- Backdrop tap MUST close menu
- All nav items MUST have ≥ 44px touch targets

---

## Global Touch Behavior

**Contract**: All `<button>`, `<a>`, and `[role="button"]` elements MUST:
- Have `touch-action: manipulation` (prevents 300ms double-tap delay in PWA)
- Links styled as buttons MUST meet the 44px minimum touch target

---

## Validation Matrix

| Component | Safe-Area | Touch Target ≥44px | Overflow-safe | Scroll-independent |
|-----------|-----------|-------------------|---------------|-------------------|
| BottomNav | ✓ must pass | ✓ must pass | ✓ must pass | N/A |
| CartDrawer | ✓ must pass | ✓ must pass | ✓ must pass | ✓ must pass |
| RecipeLiveMode panel | ✓ must pass | ✓ must pass | ✓ must pass | N/A |
| BrewLogForm | ✓ must pass | N/A (forms use 44px+ labels) | ✓ must pass | ✓ must pass |
| ConfirmDialog | ✓ must pass | ✓ must pass | ✓ must pass | N/A |
| Navbar menu | N/A | ✓ must pass | ✓ must pass | N/A |
| Cart sticky | N/A | N/A | N/A | N/A (offset fix only) |
