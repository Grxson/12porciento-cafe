---

description: "CSS-only typography standardization: convert text-[10px]→text-xs, review edge cases, verify no regression."

---

# Tasks: Typography Standardization

**Input**: Design documents from `specs/004-typography-standardization/`

**Prerequisites**: spec.md, plan.md

**Tests**: Visual verification only (no automated visual regression tests in repo). Changes are CSS class replacements — verify TypeScript compiles.

**Organization**: Tasks grouped by file, ordered GROUP A (safe replaceAll) → GROUP C (manual review) → GROUP B (documentation) → Verification.

## Format: `[ID] [P?] [Group] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Group]**: GROUP A / GROUP C / GROUP B / VERIFY
- Include exact file paths in descriptions

---

## Phase 1: GROUP A — Safe `text-[10px]` → `text-xs` by `replaceAll`

**Purpose**: Convert all GROUP A occurrences using bulk search-and-replace per file. Each file is independent.

**⚠️ IMPORTANT**: `NotificationBell.tsx` has BOTH GROUP A (bell body) and GROUP B (count badge w-4 h-4). Use `replaceAll` will incorrectly change the badge too. Must replace line-by-line, NOT replaceAll.

### Batch 1: Admin files

- [X] T001 [P] [A] Inventory.tsx — `text-[10px]` → `text-xs` in 47-48 lines (use `replaceAll` except ThresholdEditor buttons at L756-757 which are GROUP B). `client/src/admin/Inventory.tsx`
- [X] T002 [P] [A] Subscribers.tsx — `text-[10px]` → `text-xs` in status badge + grind preference. `client/src/admin/Subscribers.tsx`
- [X] T003 [P] [A] SubscriptionPayments.tsx — `text-[10px]` → `text-xs` in payment status badge. `client/src/admin/SubscriptionPayments.tsx`
- [X] T004 [P] [A] GalleryUploader.tsx — `text-[10px]` → `text-xs` in upload label. `client/src/admin/components/GalleryUploader.tsx`

### Batch 2: Page files (part 1)

- [X] T005 [P] [A] Cart.tsx — `text-[10px]` → `text-xs` for weight badge, bundle badge, discount. `client/src/pages/Cart.tsx`
- [X] T006 [P] [A] Home.tsx — `text-[10px]` → `text-xs` for card subtitle, step number. `client/src/pages/Home.tsx`
- [X] T007 [P] [A] Recipes.tsx — `text-[10px]` → `text-xs` for premium badge, difficulty badge, param labels. `client/src/pages/Recipes.tsx`
- [X] T008 [P] [A] Profile.tsx — `text-[10px]` → `text-xs` for XP count + "Barista Level" text. `client/src/pages/Profile.tsx`
- [X] T009 [P] [A] product/BaristaProfile.tsx — `text-[10px]` → `text-xs` for achievement name, XP display. `client/src/pages/BaristaProfile.tsx`

### Batch 3: Page files (part 2)

- [X] T010 [P] [A] Bundles.tsx — `text-[10px]` → `text-xs` for "Incluye" header. `client/src/pages/Bundles.tsx`
- [X] T011 [P] [A] profile/Settings.tsx — `text-[10px]` → `text-xs` for avatar helper text. `client/src/pages/profile/Settings.tsx`
- [X] T012 [P] [A] profile/Subscription.tsx — `text-[10px]` → `text-xs` for status badge. `client/src/pages/profile/Subscription.tsx`
- [X] T013 [P] [A] AchievementGallery.tsx — `text-[10px]` → `text-xs` for rarity badge, progress count, unlock hint. `client/src/pages/AchievementGallery.tsx`

### Batch 4: Component files

- [X] T014 [P] [A] NotesCapture.tsx — `text-[10px]` → `text-xs` for section label, char count. `client/src/components/recipes/NotesCapture.tsx`
- [X] T015 [P] [A] AttemptsList.tsx — `text-[10px]` → `text-xs` for date. `client/src/components/recipes/AttemptsList.tsx`
- [X] T016 [P] [A] RatingSlider.tsx — `text-[10px]` → `text-xs` for section label. `client/src/components/recipes/RatingSlider.tsx`
- [X] T017 [P] [A] RecipeList.tsx — `text-[10px]` → `text-xs` for status badges. `client/src/components/recipes/RecipeList.tsx`
- [X] T018 [P] [A] BrewComparator.tsx — `text-[10px]` → `text-xs` for helper text, date. `client/src/components/barista/BrewComparator.tsx`
- [X] T019 [P] [A] StreakHeatmap.tsx — `text-[10px]` → `text-xs` for legend labels. `client/src/components/StreakHeatmap.tsx`
- [X] T020 [P] [A] PasswordField.tsx — `text-[10px]` → `text-xs` for strength label. `client/src/components/PasswordField.tsx`
- [X] T021 [P] [A] QuizProductCard.tsx — `text-[10px]` → `text-xs` for match percentage badge. `client/src/components/QuizProductCard.tsx`

### Batch 5: RecipeLiveMode + Checkout (larger files)

- [X] T022 [P] [A] RecipeLiveMode.tsx — `text-[10px]` → `text-xs` for offline badge, param labels, difficulty badge. `client/src/components/recipes/RecipeLiveMode.tsx`
- [X] T023 [P] [A] Checkout.tsx — `text-[10px]` → `text-xs` for default payment badge, discount code label. `client/src/pages/Checkout.tsx`

### Batch 6: Remaining components

- [X] T024 [P] [A] CartDrawer.tsx — `text-[10px]` → `text-xs` for bundle badge, discount, bundle items. `client/src/components/CartDrawer.tsx`
- [X] T025 [P] [A] ProductDetail.tsx — `text-[10px]` → `text-xs` for SCA labels, param labels, avatar, helper text. `client/src/pages/ProductDetail.tsx`
- [X] T026 [P] [A] RecipeDetail.tsx — `text-[10px]` → `text-xs` for param labels (already fixed during audit). `client/src/pages/RecipeDetail.tsx`

### Batch 7: CoffeePicker + ProductCard (have GROUP C too — do GROUP A first)

- [X] T027 [P] [A] CoffeePicker.tsx — `text-[10px]` → `text-xs` for region, flavors, SCA score, plan name. `client/src/components/CoffeePicker.tsx`
- [X] T028 [P] [A] ProductCard.tsx — `text-[10px]` → `text-xs` for non-absolute elements (process label). `client/src/components/ProductCard.tsx`

### Batch 8: Admin dense files

- [X] T029 [P] [A] Shop.tsx — `text-[10px]` → `text-xs` for filter section labels. `client/src/pages/Shop.tsx`
- [X] T030 [P] [A] Subscriptions.tsx — `text-[10px]` → `text-xs` for non-featured plan badge. `client/src/pages/Subscriptions.tsx`

---

## Phase 2: GROUP C — Manual Edge Case Review

**Purpose**: Review 10 edge cases where `text-xs` may cause overflow. Adjust or document as exceptions.

- [X] T031 [GALLERY] StreakHeatmap month/day labels — verify cellSize ≥14px supports text-xs. `client/src/components/StreakHeatmap.tsx`
- [X] T032 [GALLERY] ProductCard category + "En carrito" badges — stacked absolute positioning. Verify no overlap at text-xs. `client/src/components/ProductCard.tsx`
- [X] T033 [GALLERY] CoffeePicker "Limitado" + "Plan benefit" badges — check card fit. `client/src/components/CoffeePicker.tsx`
- [X] T034 [GALLERY] CoffeeTimeline detail text — verify max-h-20 animation height accommodates text-xs. `client/src/components/CoffeeTimeline.tsx`
- [X] T035 [GALLERY] Profile "Barista Level" multi-line — verify no card height increase at text-xs. `client/src/pages/Profile.tsx`
- [X] T036 [GALLERY] Inventory "Inactivo" label + Subscribers truncated name — verify table cell fit. `client/src/admin/Inventory.tsx`, `client/src/admin/Subscribers.tsx`

---

## Phase 3: GROUP B — Intentionally Keep `text-[10px]` (Documentation Only)

**Purpose**: Verify these 6 occurrences still have 10px and add explanatory comment.

- [X] T037 [B] Shop filter count badge — verify w-4 h-4 circle stays at `text-[10px]`. `client/src/pages/Shop.tsx:307`
- [X] T038 [B] NotificationBell count badge — verify w-4 h-4 circle stays at `text-[10px]`. `client/src/components/NotificationBell.tsx:46`
- [X] T039 [B] BottomNav labels + cart badge — verify 5-column nav + w-4 h-4 stay at `text-[10px]`. `client/src/components/BottomNav.tsx:38,45`
- [X] T040 [B] ThresholdEditor save/cancel buttons — verify inline compact row stays at `text-[10px]`. `client/src/admin/Inventory.tsx:756-757`

---

## Phase 4: NotificationBell Special Case

**Purpose**: NotificationBell has BOTH GROUP A and GROUP B in same file. The bell icon body should use `text-xs`, but the count badge (w-4 h-4) MUST stay `text-[10px]`.

- [X] T041 [A+B] NotificationBell.tsx — Convert line-by-line (NOT replaceAll). Find all `text-[10px]` occurrences, convert only non-badge lines to `text-xs`. `client/src/components/NotificationBell.tsx`

---

## Phase 5: Verification

- [X] T042 [VERIFY] TypeScript compilation — `npx tsc --noEmit` passes. `client/`
- [X] T043 [VERIFY] Visual scan of affected admin pages (Inventory, Subscribers, SubscriptionPayments). Verify no text overflow or layout shift.
- [X] T044 [VERIFY] Visual scan of affected public pages (Shop, Cart, Recipes, Subscriptions, Profile, ProductDetail). Verify badges, labels, chips readable.
- [X] T045 [VERIFY] Visual scan of components (CoffeePicker, ProductCard, BottomNav, NotificationBell, RecipeLiveMode). Verify no overlap.
- [X] T046 [VERIFY] Mobile viewport test at 375px width. Verify BottomNav labels, filter chips, and badges fit without overflow.
- [X] T047 [VERIFY] GROUP B exceptions documented with inline comments (`/* compact — keep at 10px */`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (GROUP A)**: All 30 tasks are independent — can run in any order, full parallel
- **Phase 2 (GROUP C)**: Depends on Phase 1 being complete for Shared files
- **Phase 3 (GROUP B)**: Independent — can run at any time
- **Phase 4 (NotificationBell)**: Must use line-by-line approach (not replaceAll) — runs independently
- **Phase 5 (VERIFY)**: Depends on all other phases complete

### Parallel Opportunities

- Phase 1: All 30 tasks can run in parallel (each file is independent)
- Phase 2: All GROUP C reviews can run in parallel
- Phase 1 + Phase 3: Can overlap (GROUP B is documentation, GROUP A is changes — no conflict)

### Execution Order (for single subagent)

```
Phase 1 (replaceAll per file, 30 tasks in any order)
    ↓
Phase 4 (NotificationBell line-by-line)
    ↓
Phase 2 (GROUP C manual review, 6 tasks)
    ↓
Phase 3 (GROUP B verification, 4 tasks)
    ↓
Phase 5 (compilation + visual verification)
```

---

## Notes

- [P] tasks = different files, no dependencies
- [Group] maps task to GROUP A/B/C/VERIFY for traceability
- NotificationBell.tsx is the ONLY file that needs line-by-line (not replaceAll) because it has both GROUP A and B
- GROUP B exceptions must get an inline comment: `/* compact container — keep at 10px */`
- GROUP C decisions must be documented: if changed → include in commit, if kept → add comment explaining why
- No component logic changes — CSS class replacement only
- Run `npx tsc --noEmit` from client/ after all changes to verify
