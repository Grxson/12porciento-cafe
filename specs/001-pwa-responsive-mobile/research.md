# Research: PWA Responsive Mobile Fixes

## 1. Safe-Area Handling

**Decision**: Manual `env(safe-area-inset-*)` CSS inline styles and `@layer utilities` — no plugin needed.

**Rationale**: Project already uses `env()` inline across 6 files (BottomNav, Toast, InstallPrompt, ProductDetail, Shop). Adding `tailwindcss-safe-area` plugin would introduce a new dependency for parity with what can be done with a single CSS layer. Manual env() stays consistent with existing pattern.

**Alternatives considered**:
- `tailwindcss-safe-area` (npm) — adds `pb-safe`, `pt-safe` utilities. Rejected: adds dep, patterns already established without it.
- CSS `padding-bottom: constant(...)` (iOS 11.0 only) — rejected: iOS 12+ already on `env()`.

**Findings**:
- `viewport-fit=cover` already set in `index.html:6` ✅
- `apple-mobile-web-app-status-bar-style: black-translucent` already set ✅
- BottomNav: safe-area applied ✅ (`env(safe-area-inset-bottom, 0px)`)
- Toast: safe-area applied ✅
- InstallPrompt: safe-area applied ✅
- ProductDetail sticky bar: safe-area applied ✅
- Shop filter sheet: safe-area applied ✅

**Missing safe-area (need to add)**:
- `RecipeLiveMode.tsx:485` — `fixed bottom-0 left-0 right-0` — quick panel, no inset
- `CartDrawer.tsx:127` — drawer footer `px-5 py-4`, no inset
- `BrewLogForm.tsx:108` — modal, no inset
- `ConfirmDialog.tsx:44` — dialog, no inset

---

## 2. Touch Target Sizing

**Decision**: Enforce `min-h-[44px]` on all interactive elements on mobile. Use `touch-action: manipulation` globally on buttons/links to eliminate 300ms tap delay.

**Rationale**: Apple HIG minimum is 44×44px. Material Design is 48dp. Project already enforces `min-h-[44px]` on ProductCard, ProductDetail, Home CTAs, Profile buttons. Need to extend to BottomNav tabs, CartDrawer quantity buttons, ConfirmDialog actions.

**Alternatives considered**:
- `min-h-[48px]` everywhere — consistent with Material, but overkill for compact UI. 44px Apple standard is sufficient.
- `@media (pointer: coarse) { min-height: 44px }` — more targeted but adds complexity; Tailwind's responsive prefix achieves same.

**Undersized targets found**:
- `BottomNav.tsx:37` — `py-2.5` ≈ 28px height (icon 20px + 2×10px padding). Fix: `min-h-[48px]`.
- `CartDrawer.tsx:148,175` — quantity `+/-` buttons `w-6 h-6` = 24px. Fix: `w-11 h-11`.
- `CartDrawer.tsx` — Trash button `w-4 h-4` icon, no outer target. Fix: add `w-10 h-10` wrapper.
- `ConfirmDialog.tsx:60,68` — `py-2` ≈ 32px. Fix: `py-3 min-h-[44px]`.
- `InstallPrompt.tsx:55` — `py-2` ≈ 32px. Fix: `py-3 min-h-[44px]`.

---

## 3. Mobile Menu / Drawer Width

**Decision**: Constrain Navbar mobile menu width to `w-[min(18rem,calc(100vw-2rem))]`.

**Rationale**: Current `w-72` = 288px. On 320px viewport (iPhone SE), only 32px gap on left. With animation from right, this is borderline — at 320px it doesn't overflow but feels tight. Using `min()` with `calc(100vw-2rem)` (= 288px on 320px screen) ensures no overflow on any device.

**Alternatives considered**:
- `w-full` — too wide on larger phones.
- `max-w-[18rem] w-full` — equivalent, slightly more readable.

---

## 4. Sticky Offset Misalignment

**Decision**: Fix `Cart.tsx:206` `sticky top-24` → `top-16 md:top-24`.

**Rationale**: Mobile navbar is `h-16` (64px), desktop is `h-20` (80px). `top-24` (96px) creates 32px gap on mobile. Standard Tailwind pattern: `top-[4.5rem] md:top-24` or `top-16 md:top-24`.

---

## 5. iOS PWA Keyboard Handling

**Decision**: No code changes needed for keyboard handling — existing form structure already scrolls to show focused inputs on iOS. `overflow-y-auto` on modal/drawer content areas handles keyboard push.

**Rationale**: iOS 15+ safari and PWA mode handle keyboard scroll push automatically when `overflow-y-auto` is on the scrollable container. Verified in BrewLogForm and CartDrawer already use this pattern.

**Note**: `BrewLogForm.tsx` uses `max-h-[90vh]` which may clip when keyboard appears (keyboard eats ~40% viewport on iPhone). Consider `max-h-[60vh]` with fallback or `dvh` units for dynamic viewport.

---

## 6. Global Mobile CSS Utilities

**Decision**: Add to `index.css` global utilities:
1. `touch-action: manipulation` on `button, a, [role="button"]` — eliminates 300ms delay
2. `overscroll-behavior: contain` on modal/drawer scroll containers — prevents scroll bleed
3. `@supports (padding-bottom: env(safe-area-inset-bottom))` guard when needed

**Rationale**: `touch-action: manipulation` is the standard fix for click delay in PWAs without FastClick. Native browser support: 100% modern mobile. No library needed.

---

## Summary Table

| Issue | File | Severity | Fix |
|-------|------|----------|-----|
| Missing safe-area | RecipeLiveMode:485 | High | Add `paddingBottom: 'env(safe-area-inset-bottom)'` |
| Missing safe-area | CartDrawer footer | High | Add `paddingBottom: 'env(safe-area-inset-bottom)'` |
| Missing safe-area | BrewLogForm modal | Medium | Add `pb-[env(safe-area-inset-bottom)]` |
| Missing safe-area | ConfirmDialog | Medium | Add `pb-[env(safe-area-inset-bottom)]` |
| Small touch target | BottomNav tabs | High | Add `min-h-[48px]` |
| Small touch target | CartDrawer qty btns | High | Change `w-6 h-6` → `w-11 h-11` |
| Small touch target | ConfirmDialog btns | Medium | Change `py-2` → `py-3 min-h-[44px]` |
| Small touch target | InstallPrompt btn | Low | Change `py-2` → `py-3 min-h-[44px]` |
| Menu width | Navbar mobile menu | Low | `w-72` → `max-w-[18rem] w-full` |
| Sticky offset | Cart.tsx | Medium | `top-24` → `top-16 md:top-24` |
| Modal height | BrewLogForm | Medium | `max-h-[90vh]` → `max-h-[min(90vh,calc(100dvh-8rem))]` |
| No tap delay fix | Global | Medium | Add `touch-action: manipulation` to global CSS |
| CartDrawer trash | CartDrawer.tsx | High | Add `w-10 h-10` touch target wrapper |
