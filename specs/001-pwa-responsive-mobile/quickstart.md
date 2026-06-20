# Quickstart Validation Guide: PWA Responsive Mobile

## Prerequisites

- Dev server running: `pnpm dev` from repo root
- Physical device OR emulator:
  - **iOS**: iPhone SE (375px), iPhone 14/15 Pro (393px, Dynamic Island), iPhone 14/15 (390px)
  - **Android**: Pixel 5 (393px), Samsung Galaxy S21 (360px)
  - Fallback: Chrome DevTools → Device Toolbar (set to iPhone SE, then iPhone 14 Pro)

---

## Setup: Install PWA for Testing

1. Open `http://localhost:5173` on mobile browser (or via Ngrok tunnel)
2. On iPhone Safari: tap Share → "Add to Home Screen"
3. On Android Chrome: tap ⋮ → "Install app"
4. Launch from home screen — this is PWA mode (full screen, no browser chrome)

---

## Scenario 1: Safe Area — BottomNav (P1)

**Test device**: iPhone 14 Pro (Dynamic Island) OR iPhone SE (no notch)

1. Open PWA from home screen
2. Navigate to `/tienda`

**Expected**: BottomNav tabs fully visible, no content hidden behind home indicator
**Pass if**: Bottom edge of BottomNav tabs does NOT overlap with iPhone gesture bar
**Fail if**: "Tienda" / "Carrito" labels or icons clip behind home indicator

---

## Scenario 2: Safe Area — CartDrawer Footer (P1)

**Test device**: iPhone 13/14 Pro (notch or Dynamic Island)

1. Open any page with BottomNav visible
2. Tap the cart icon in Navbar (opens CartDrawer)
3. Add items if cart is empty
4. Observe the drawer footer: "Proceder al pago" + "Ver carrito completo" buttons

**Expected**: Both buttons fully visible above the home indicator
**Pass if**: Button text not clipped, buttons fully tappable
**Fail if**: Buttons hidden or partially obscured by home indicator safe area

---

## Scenario 3: Touch Targets — BottomNav (P1)

**Test device**: Any mobile device

1. Open PWA
2. Using thumb, tap each BottomNav tab: Tienda, Paquetes, Carrito, Galería, Perfil

**Expected**: Each tab registers tap on first try, no mis-taps
**Pass if**: Each navigation works on first tap attempt, no accidentally activating adjacent tab
**Fail if**: Frequent mis-taps or needing to aim carefully

**Verification**: In DevTools → Elements, select BottomNav `<a>` — computed height should be ≥ 48px

---

## Scenario 4: Touch Targets — CartDrawer Quantity Buttons (P1)

1. Open CartDrawer with items in cart
2. Tap `+` and `-` quantity buttons with thumb

**Expected**: Each tap registers, no mis-taps, quantity changes reliably
**Pass if**: First-tap accuracy, buttons feel comfortably sized
**Fail if**: Need multiple taps, or accidentally tap adjacent item

**Verification**: Computed size of `+`/`-` buttons should be ≥ 44×44px

---

## Scenario 5: Safe Area — RecipeLiveMode Bottom Panel (P1)

1. Navigate to `/recetas`
2. Open any recipe → tap "Empezar"
3. Proceed to last step
4. Observe the bottom action panel (brew log CTA)

**Expected**: Bottom panel visible, not obscured by home indicator
**Pass if**: "Registrar este Brew" button fully visible and tappable
**Fail if**: Button partially hidden behind safe area

---

## Scenario 6: Mobile Menu Width (P2)

**Test device**: iPhone SE (375px wide — smallest common iPhone)

1. Open PWA in browser (not installed)
2. Tap hamburger menu (≡) in Navbar
3. Slide-in menu appears from right

**Expected**: Menu does NOT fill entire screen — visible left margin (backdrop visible)
**Pass if**: At least 2rem (32px) left gap between menu and left edge
**Fail if**: Menu fills entire screen or overflows to left

---

## Scenario 7: Cart Page Sticky Sidebar (P2)

1. Navigate to `/carrito` with items
2. On mobile (< 768px): verify page scrolls normally, no sticky element causes jumps
3. On desktop (> 768px): order summary sidebar should be sticky below navbar

**Expected**: No unwanted gap between top and sticky element on mobile
**Pass if**: Cart page scrolls smoothly, no layout shift
**Fail if**: Order summary appears offset with a gap above it on mobile

---

## Scenario 8: ConfirmDialog Touch Targets (P2)

1. Navigate to Profile → try to delete a payment method (or any action that triggers ConfirmDialog)
2. On mobile, observe the Confirm/Cancel buttons

**Expected**: Buttons comfortably tappable
**Pass if**: Computed button height ≥ 44px
**Fail if**: Buttons feel too small or clip below safe area

---

## Scenario 9: BrewLogForm Modal on iPhone (P2)

1. Complete a recipe step, tap "Registrar este Brew"
2. BrewLogForm modal appears
3. Tap a form field — keyboard opens

**Expected**: Form remains scrollable, submit button accessible, modal does not clip behind home indicator
**Pass if**: Can scroll to submit button while keyboard is open
**Fail if**: Submit button hidden behind keyboard with no way to scroll to it

---

## Scenario 10: No 300ms Tap Delay (P2)

1. Open PWA from home screen (full PWA mode)
2. Tap multiple buttons rapidly across different pages

**Expected**: Responses feel instant (< 100ms perceived)
**Pass if**: No noticeable delay between tap and action
**Fail if**: Clear 300ms pause before buttons respond

---

## Quick Regression Check (after fixes)

| Check | Command | Expected |
|-------|---------|---------|
| No TS errors | `pnpm typecheck` (in `/client`) | Exit 0 |
| No test regressions | `pnpm test` (in `/client`) | All pass |
| No build errors | `pnpm build` (in `/client`) | Exit 0 |

---

## References

- UI Contracts: [contracts/ui-contracts.md](contracts/ui-contracts.md)
- Component touch target standards: [data-model.md](data-model.md)
- Issues found in research: [research.md](research.md)
