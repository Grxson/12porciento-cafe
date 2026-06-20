---
description: "Task list for PWA Responsive Mobile Fixes"
---

# Tasks: PWA Responsive Mobile Fixes

**Input**: Design documents from `specs/001-pwa-responsive-mobile/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ui-contracts.md ✅

**Tests**: No test tasks — UI layout changes; validated manually via quickstart.md scenarios.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Maps to spec.md user stories (US1–US4)

---

## Phase 1: Setup

**Purpose**: No new dependencies or project setup needed. This is a CSS/Tailwind-only feature.

- [x] T001 Read `specs/001-pwa-responsive-mobile/plan.md` and `research.md` before touching any file

---

## Phase 2: Foundational (Blocking Prerequisite)

**Purpose**: Global CSS change that underpins all touch fixes across every user story.

**⚠️ CRITICAL**: Complete T002 before any other task — it affects all interactive elements globally.

- [x] T002 Add `touch-action: manipulation` to `button, a, [role="button"], [role="tab"]` in `client/src/index.css` `@layer base` block — eliminates 300ms tap delay PWA-wide

**Checkpoint**: Global touch delay eliminated — user story work can begin.

---

## Phase 3: User Story 1 — iPhone Proper Layout (Priority: P1) 🎯 MVP

**Goal**: All content visible on iPhone viewports (SE → Pro Max). No overflow, no safe-area clipping on notched devices.

**Independent Test**: Install PWA on iPhone SE + iPhone 14 Pro. Navigate all main pages. No horizontal scroll, no content behind home indicator, all elements visible.

### Implementation

- [x] T003 [US1] Add `paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)'` inline style to `RecipeLiveMode` fixed bottom panel at `client/src/components/recipes/RecipeLiveMode.tsx:485` — remove bottom component of `p-4` class, keep `px-4 pt-4`

- [x] T004 [P] [US1] Add `overscroll-contain` Tailwind class to `overflow-y-auto` content scroll container inside `RecipeLiveMode` at `client/src/components/recipes/RecipeLiveMode.tsx:296`

- [x] T005 [P] [US1] Fix `BottomNav` tab touch targets: change `py-2.5` to `min-h-[48px] py-2` on `<NavLink>` element at `client/src/components/BottomNav.tsx:37` — brings each tab from ~28px to ≥48px height

**Checkpoint**: iPhone layout correct — RecipeLiveMode panel visible, BottomNav tabs properly sized.

---

## Phase 4: User Story 4 — Viewport & Safe-Area on Remaining Components (Priority: P1)

**Goal**: CartDrawer, BrewLogForm, ConfirmDialog all clear safe area on notched iPhones. Modals accessible when keyboard is open.

**Independent Test**: Open CartDrawer on iPhone 14 Pro — checkout buttons visible above home indicator. Open BrewLogForm — form scrollable with keyboard open.

### Implementation

- [x] T006 [US4] Add safe-area bottom padding to `CartDrawer` footer div at `client/src/components/CartDrawer.tsx` — the `<div className="px-5 py-4 border-t ...">` that wraps checkout buttons: add `style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}`

- [x] T007 [P] [US4] Fix `CartDrawer` quantity `+` / `-` buttons: change `w-6 h-6` → `w-11 h-11` on both `<button>` elements at `client/src/components/CartDrawer.tsx` (ProductDrawerItem qty buttons) — brings from 24px to 44px touch target

- [x] T008 [P] [US4] Fix `CartDrawer` remove (Trash) button: wrap `<Trash2>` icon in `<span className="flex w-10 h-10 items-center justify-center">` at `client/src/components/CartDrawer.tsx` (ProductDrawerItem and BundleDrawerItem)

- [x] T009 [P] [US4] Add safe-area bottom padding to `BrewLogForm` modal container at `client/src/components/BrewLogForm.tsx` — find the outermost modal wrapper div and add `style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}`; also change `max-h-[90vh]` → `max-h-[min(90vh,calc(100dvh-8rem))]` to accommodate keyboard

- [x] T010 [P] [US4] Add `overscroll-contain` class to `BrewLogForm` `overflow-y-auto` scroll container at `client/src/components/BrewLogForm.tsx`

- [x] T011 [P] [US4] Add safe-area bottom padding to `ConfirmDialog` at `client/src/components/ConfirmDialog.tsx:44` — add `style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}` to the dialog content wrapper

- [x] T012 [P] [US4] Fix `ConfirmDialog` action button touch targets: change `py-2` → `py-3 min-h-[44px]` on both Confirm and Cancel buttons at `client/src/components/ConfirmDialog.tsx:60,68`

**Checkpoint**: CartDrawer checkout buttons, BrewLogForm, and ConfirmDialog all clear iPhone safe area.

---

## Phase 5: User Story 3 — Cart Drawer & Modal Full Fix (Priority: P2)

**Goal**: All cart and modal interactions fully functional on mobile — swipe/tap gestures work, no unclickable elements.

**Independent Test**: Open CartDrawer → add/remove items, change quantities, tap "Proceder al pago". Open BrewLogForm → fill form, submit. All actions first-try on iPhone SE.

### Implementation

- [x] T013 [US3] Add `overscroll-contain` class to the `flex-1 overflow-y-auto` items scroll area in `CartDrawer` at `client/src/components/CartDrawer.tsx:142`

- [x] T014 [P] [US3] Fix `InstallPrompt` button touch target: change `py-2` → `py-3 min-h-[44px]` on install button at `client/src/components/InstallPrompt.tsx:55`

**Checkpoint**: Cart and modals fully usable — all interactions work first-try on mobile.

---

## Phase 6: User Story 2 — Android & Layout Consistency (Priority: P2)

**Goal**: Consistent layout across all mobile devices. No gaps, no overflow, orientation-safe.

**Independent Test**: Open app on Android phone (or Chrome DevTools Pixel 5). Navigate Cart page — sidebar not offset. Open mobile Navbar menu — backdrop visible behind menu.

### Implementation

- [x] T015 [US2] Fix `Navbar` mobile slide-in menu width: change `w-72` → `max-w-[18rem] w-full` at `client/src/components/Navbar.tsx:146` — ensures ≥2rem visible backdrop on 320px iPhone SE

- [x] T016 [P] [US2] Fix `Cart` page sticky sidebar offset: change `sticky top-24` → `sticky top-16 md:top-24` at `client/src/pages/Cart.tsx:206` — mobile navbar is h-16 (64px), not h-24 (96px)

**Checkpoint**: Layout consistent across Android and iPhone SE. No gaps or overflow.

---

## Phase 7: Polish & Validation

**Purpose**: Verify all stories work together; confirm no regressions.

- [ ] T017 Run quickstart.md Scenario 1–10 on iPhone SE emulator (Chrome DevTools → iPhone SE) and iPhone 14 Pro — document results

- [x] T018 [P] Run `pnpm test` in `client/` — 60/60 tests passed ✅

- [x] T019 [P] Run `pnpm build` in `client/` — built in 5.81s, exit 0 ✅

- [ ] T020 Check viewport at 320px in Chrome DevTools: navigate all main pages, confirm no horizontal scroll

- [ ] T021 Manual device validation per quickstart.md Scenario 1–10

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Start immediately
- **Phase 2 (Foundational)**: Must complete before all other phases
- **Phase 3 (US1)**: Depends on Phase 2 — RecipeLiveMode + BottomNav
- **Phase 4 (US4)**: Depends on Phase 2 — CartDrawer + BrewLogForm + ConfirmDialog. **Can run in parallel with Phase 3** (different files)
- **Phase 5 (US3)**: Depends on Phase 4 completion (same files — CartDrawer, BrewLogForm)
- **Phase 6 (US2)**: Depends on Phase 2 — Navbar + Cart. **Can run in parallel with Phase 3 and 4** (different files)
- **Phase 7 (Polish)**: All implementation phases complete

### Within Each Phase

- Tasks marked [P] have no dependencies on each other — run in parallel
- Tasks in same component without [P] must be sequential (same file edits)

### Parallel Opportunities

```bash
# After T002 (global CSS), these can start simultaneously:
Phase 3: T003, T004, T005          # RecipeLiveMode + BottomNav
Phase 4: T006, T007, T008, T009,   # CartDrawer + BrewLogForm + ConfirmDialog
         T010, T011, T012
Phase 6: T015, T016                # Navbar + Cart

# Phase 5 after Phase 4 complete:
T013, T014                          # CartDrawer overscroll + InstallPrompt
```

---

## Implementation Strategy

### MVP (User Story 1 + safe-area only)

1. T001 — read plan
2. T002 — global touch-action
3. T003, T004, T005 — RecipeLiveMode + BottomNav (Phase 3)
4. T006 — CartDrawer safe-area footer
5. **VALIDATE**: Scenario 1, 2, 3 from quickstart.md on iPhone

### Full Delivery

Complete all phases 1–6, then run Phase 7 validation.

---

## Notes

- All fixes are CSS/Tailwind-only — no new dependencies, no API changes
- Test on physical device or emulator after each checkpoint
- `env(safe-area-inset-bottom, 0px)` fallback ensures non-notch devices unaffected
- `100dvh` (dynamic viewport height) supported iOS 15.4+ and Chrome 108+ — fallback `100vh` in `min()` already handles older browsers
- Commit after each phase checkpoint so rollback is easy if needed
