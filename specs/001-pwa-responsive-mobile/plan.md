# Implementation Plan: PWA Responsive Mobile Fixes

**Branch**: `001-pwa-responsive-mobile` | **Date**: 2026-06-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-pwa-responsive-mobile/spec.md`

## Summary

Fix 12 specific mobile responsiveness issues identified via code audit across 9 client-side files. Primary issues: missing `safe-area-inset-bottom` on 4 fixed/overlay components (RecipeLiveMode, CartDrawer, BrewLogForm, ConfirmDialog), undersized touch targets on BottomNav tabs and CartDrawer quantity buttons, mobile menu width risk on 320px devices, and sticky offset misalignment on Cart page. All fixes are CSS/Tailwind only — no new dependencies, no API changes, no schema changes.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19

**Primary Dependencies**: Tailwind CSS (custom config), Framer Motion, Shadcn/ui, React Router v6

**Storage**: N/A (UI-only feature)

**Testing**: Vitest + React Testing Library (existing suite)

**Target Platform**: iOS 14+ Safari PWA, Android 8+ Chrome PWA, minimum viewport 320px

**Project Type**: React PWA — client-side only changes

**Performance Goals**: No perceptible rendering delay; tap response < 100ms (achieved via `touch-action: manipulation`)

**Constraints**: No new npm dependencies; all fixes via existing Tailwind/CSS patterns already in codebase; no backwards-incompatible layout changes; all existing tests must remain green

**Scale/Scope**: 9 files, ~12 targeted changes, all in `client/src/`

## Constitution Check

No project constitution defined (template only). No gate violations. Proceeding.

## Project Structure

### Documentation (this feature)

```text
specs/001-pwa-responsive-mobile/
├── plan.md              # This file
├── research.md          # Phase 0 — issues found, decisions made
├── data-model.md        # Phase 1 — component contracts, responsive system
├── quickstart.md        # Phase 1 — validation scenarios
├── contracts/
│   └── ui-contracts.md  # Phase 1 — per-component acceptance contracts
└── tasks.md             # Phase 2 — /speckit-tasks output (not yet created)
```

### Source Code

```text
client/
├── index.html                                    # viewport meta (already correct)
├── src/
│   ├── index.css                                 # ADD: touch-action:manipulation global
│   ├── components/
│   │   ├── BottomNav.tsx                         # FIX: touch target min-h-[48px]
│   │   ├── CartDrawer.tsx                        # FIX: safe-area footer + touch targets
│   │   ├── ConfirmDialog.tsx                     # FIX: safe-area + button touch targets
│   │   ├── BrewLogForm.tsx                       # FIX: modal height dvh + safe-area
│   │   ├── Navbar.tsx                            # FIX: mobile menu max-width constraint
│   │   ├── InstallPrompt.tsx                     # FIX: button touch target
│   │   └── recipes/
│   │       └── RecipeLiveMode.tsx                # FIX: safe-area on fixed bottom panel
│   └── pages/
│       └── Cart.tsx                              # FIX: sticky top-24 → top-16 md:top-24
```

## Implementation Tasks

### Group A — Safe-Area Fixes (P1)

**A1. RecipeLiveMode.tsx — bottom panel safe area**

File: `client/src/components/recipes/RecipeLiveMode.tsx:485`

Current:
```jsx
className="fixed bottom-0 left-0 right-0 z-[60] bg-coffee-900 border-t border-coffee-700 p-4"
```

Fix: Add `style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}` and remove `p-4` bottom from className (keep `px-4 pt-4`). Or use inline style for the bottom padding calculation.

---

**A2. CartDrawer.tsx — drawer footer safe area**

File: `client/src/components/CartDrawer.tsx`

The footer section (`items.length > 0` block) div:
```jsx
<div className="px-5 py-4 border-t border-coffee-200 dark:border-coffee-700 bg-coffee-50 dark:bg-coffee-800">
```

Fix: Add `style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}` to this div (keep `py-4` as top padding, override bottom with style).

---

**A3. BrewLogForm.tsx — modal safe area + height**

File: `client/src/components/BrewLogForm.tsx:108`

Current:
```jsx
className="... max-h-[90vh] overflow-y-auto ..."
```

Fix:
- Change `max-h-[90vh]` → `max-h-[min(90vh,calc(100dvh-8rem))]`
- Add `style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}` to the modal container or its inner padding div.

---

**A4. ConfirmDialog.tsx — dialog safe area**

File: `client/src/components/ConfirmDialog.tsx:44`

The dialog content area with `p-6`:
Fix: Add `style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}` as inline style for the wrapper, or add the safe-area bottom padding to the action buttons container.

---

### Group B — Touch Target Fixes (P1)

**B1. BottomNav.tsx — tab touch targets**

File: `client/src/components/BottomNav.tsx:37`

Current `<NavLink>` className contains `py-2.5` ≈ 28px height.

Fix: Replace `py-2.5` with `min-h-[48px] py-2` to enforce minimum tap target while keeping visual spacing.

---

**B2. CartDrawer.tsx — quantity button touch targets**

File: `client/src/components/CartDrawer.tsx:148,175` (ProductDrawerItem qty buttons)

Current:
```jsx
className="w-6 h-6 border border-coffee-300 ..."
```

Fix: Change to `w-11 h-11 border border-coffee-300 ...` (44px = 2.75rem = w-11).

Also fix the Trash button — wrap icon in a `<span className="flex w-10 h-10 items-center justify-center">` to hit 40px target.

---

**B3. ConfirmDialog.tsx — action button touch targets**

File: `client/src/components/ConfirmDialog.tsx:60,68`

Current: `py-2`

Fix: `py-3 min-h-[44px]`

---

**B4. InstallPrompt.tsx — install button touch target**

File: `client/src/components/InstallPrompt.tsx:55`

Current: `py-2`

Fix: `py-3 min-h-[44px]`

---

### Group C — Layout Fixes (P2)

**C1. Navbar.tsx — mobile menu width**

File: `client/src/components/Navbar.tsx:146`

Current: `w-72`

Fix: `max-w-[18rem] w-full`

This ensures on 320px viewport (iPhone SE), the menu is 288px max but guaranteed to not overflow (320 - 32px minimum gap = 288px).

---

**C2. Cart.tsx — sticky offset**

File: `client/src/pages/Cart.tsx:206`

Current: `sticky top-24`

Fix: `sticky top-16 md:top-24`

Mobile navbar is `h-16` (64px), desktop is `h-20` (80px). `top-24` created 32px gap on mobile.

---

### Group D — Global CSS (P2)

**D1. index.css — touch-action and overscroll**

File: `client/src/index.css`

Add to `@layer base`:
```css
button,
a,
[role="button"],
[role="tab"],
[role="link"] {
  touch-action: manipulation;
}
```

Add `overscroll-behavior: contain` to drawer/modal scroll containers via Tailwind class `overscroll-contain` (already in Tailwind — no new CSS needed, just add class to `overflow-y-auto` containers in CartDrawer and BrewLogForm).

---

## Complexity Tracking

No constitution violations. No complexity to justify.

## Execution Order

1. **Group D** first — global CSS affects all components, do it once
2. **Group A** — safe-area fixes (highest user-visible impact)
3. **Group B** — touch target fixes (high usability impact)
4. **Group C** — layout fixes (medium impact)

Test after each group using quickstart scenarios.

## Definition of Done

- [ ] All 10 validation scenarios in `quickstart.md` pass on iPhone SE + iPhone 14 Pro (or emulators)
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` (in `client/`) passes all existing tests
- [ ] `pnpm build` (in `client/`) exits 0
- [ ] No horizontal scroll on any page at 320px viewport
- [ ] All fixed-bottom elements clear safe area on notch devices
