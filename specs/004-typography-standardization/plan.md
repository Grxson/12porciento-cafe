# Implementation Plan: Typography Standardization

**Branch**: `004-typography-standardization` | **Date**: 2026-06-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-typography-standardization/spec.md`

## Summary

Standardize all typography across 34 files with 88+ arbitrary font-size values. Convert GROUP A `text-[10px]` → `text-xs`, keep GROUP B exceptions documented, review GROUP C edge cases. Already completed: `tracking-[0.2em]` elimination (15 occurrences), `text-[11px]` → `text-xs` (Shop.tsx, 8 occurrences), `text-[8px]`/`text-[9px]` → `text-[10px]` (CoffeePicker, BottomNav, CoffeeTimeline, PaymentMethod).

## Technical Context

**Language/Version**: TypeScript 5.x, React 19, Tailwind CSS

**Primary Dependencies**: Tailwind CSS default scale (`text-xs: 12px`, `text-sm: 14px`, `text-base: 16px`)

**Storage**: N/A — CSS-only changes

**Testing**: Visual inspection (no automated visual regression tests)

**Target Platform**: Web (all viewports 320px+)

**Project Type**: Client-side CSS standardization

**Performance Goals**: No impact — Tailwind classes resolved at build time

**Constraints**: Fixed-size containers (w-4 h-4 = 16px circles) cannot accommodate `text-xs` (12px) without overflow

**Scale/Scope**: 34 files, 88 text-[10px] instances, 10 edge cases needing review

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No constitution violations — CSS-only changes, no architecture changes, no new dependencies.

## Project Structure

### Documentation (this feature)

```text
specs/004-typography-standardization/
├── spec.md              # Feature specification
├── plan.md              # This file
└── tasks.md             # Task list
```

### Source Code (repository root)

```text
client/src/
├── admin/
│   ├── Inventory.tsx
│   ├── Subscribers.tsx
│   ├── SubscriptionPayments.tsx
│   └── components/GalleryUploader.tsx
├── pages/
│   ├── Shop.tsx
│   ├── Subscriptions.tsx
│   ├── Recipes.tsx
│   ├── Cart.tsx
│   ├── Home.tsx
│   ├── ProductDetail.tsx
│   ├── RecipeDetail.tsx
│   ├── BaristaProfile.tsx
│   ├── Profile.tsx
│   ├── Bundles.tsx
│   ├── AchievementGallery.tsx
│   └── profile/
│       ├── Settings.tsx
│       ├── Subscription.tsx
│       └── PaymentMethod.tsx
├── components/
│   ├── CoffeePicker.tsx
│   ├── ProductCard.tsx
│   ├── BottomNav.tsx
│   ├── CoffeeTimeline.tsx
│   ├── CartDrawer.tsx
│   ├── NotificationBell.tsx
│   ├── PasswordField.tsx
│   ├── QuizProductCard.tsx
│   ├── StreakHeatmap.tsx
│   └── recipes/
│       ├── NotesCapture.tsx
│       ├── RecipeLiveMode.tsx
│       ├── RatingSlider.tsx
│       ├── RecipeList.tsx
│       └── AttemptsList.tsx
```

**Structure Decision**: Single client-side project. All changes are CSS Tailwind class replacements within existing files.

## Group Definitions

### GROUP A — Safe to convert `text-[10px]` → `text-xs` (72 occurrences across 24+ files)

These elements have sufficient container space. Conversion to 12px (text-xs) will not cause overflow.

| File | Count | Elements |
|------|-------|----------|
| Shop.tsx | 8 | Section labels, filter labels (already partially fixed) |
| ProductDetail.tsx | 5 | SCA labels, param labels (Temp/Molienda/Ratio), avatar, helper text |
| Cart.tsx | 3 | Weight badge, bundle badge, discount text |
| Home.tsx | 2 | Feature card subtitle, step number |
| Recipes.tsx | 3 | Premium badge, difficulty badge, param labels |
| RecipeDetail.tsx | 1 | Param labels in grid |
| Bundles.tsx | 1 | "Incluye" header |
| Profile.tsx | 1 | XP count |
| BaristaProfile.tsx | 2 | Achievement name, XP |
| Subscriptions.tsx | 1 | Non-featured plan badge (partial) |
| profile/Settings.tsx | 1 | Avatar helper text |
| profile/Subscription.tsx | 1 | Status badge |
| profile/PaymentMethod.tsx | 0 | Already fixed (text-[9px]→text-[10px]) |
| CoffeePicker.tsx | 4 | Region, flavors, SCA score, plan name |
| ProductCard.tsx | 2 | Category badge, process label |
| CartDrawer.tsx | 3 | Bundle badge, discount, bundle items |
| QuizProductCard.tsx | 1 | Match percentage badge |
| BrewComparator.tsx | 2 | Helper text, date display |
| StreakHeatmap.tsx | 1 | Legend labels |
| NotesCapture.tsx | 2 | Section label, char count |
| AttemptsList.tsx | 1 | Date in brew entry |
| RatingSlider.tsx | 1 | Section label |
| RecipeLiveMode.tsx | 5 | Offline badge, param labels (Duración/Temp/Molienda), difficulty badge |
| RecipeList.tsx | 3 | Status badges (Publicada/Borrador/Premium) |
| NotificationBell.tsx | 1 | (partially — bell has w-4 h-4 badge that MUST stay at 10px) |
| PasswordField.tsx | 1 | Password strength label |
| Checkout.tsx | 2 | Default badge, discount code label |
| Inventory.tsx | 5 | Stock label, quick action label, status badge, description, ThresholdEditor buttons (↔ some may be GROUP B) |
| SubscriptionPayments.tsx | 1 | Payment status badge |
| Subscribers.tsx | 2 | Fulfillment status, grind preference |
| GalleryUploader.tsx | 1 | Upload label |

### GROUP B — MUST stay at `text-[10px]` (6 occurrences)

Fixed-size containers that cannot fit `text-xs`:

| # | File:line | Container | Reason |
|---|-----------|-----------|--------|
| 1 | Shop.tsx:307 | w-4 h-4 absolute badge on filter button | Circle too small for 12px |
| 2 | NotificationBell.tsx:46 | w-4 h-4 absolute badge on bell icon | Same circle constraint |
| 3 | BottomNav.tsx:38 | 5-column mobile nav labels | Would overflow adjacent columns |
| 4 | BottomNav.tsx:45 | w-4 h-4 absolute cart badge | Same circle constraint |
| 5 | Inventory.tsx:756 | Inline ThresholdEditor save button | Compact input row |
| 6 | Inventory.tsx:757 | Inline ThresholdEditor cancel button | Same compact row |

### GROUP C — Manual review needed (10 occurrences)

| # | File:line | Element | Risk | Decision |
|---|-----------|---------|------|----------|
| 1 | StreakHeatmap.tsx:46 | Month labels x-axis | cellSize-dependent | Check cellSize ≥14px → safe |
| 2 | StreakHeatmap.tsx:54 | Day labels y-axis | cellSize-dependent | Check cellSize ≥14px → safe |
| 3 | Profile.tsx:57 | "Barista Level" fallback | 2-line overflow | Already long text, test change |
| 4 | CoffeePicker.tsx:159 | "Limitado" badge | Absolute pos compact card | Test with text-xs |
| 5 | CoffeePicker.tsx:165 | "Plan benefit" badge | Absolute pos compact card | Test with text-xs |
| 6 | CoffeeTimeline.tsx:66 | Detail text hover animation | max-h-20 may overflow | Test with text-xs |
| 7 | ProductCard.tsx:55 | Category badge over image | Stacked absolute pos | Test overlap on compact card |
| 8 | ProductCard.tsx:60 | "En carrito" badge | Stacked below category | Test overlap |
| 9 | Inventory.tsx:286 | "Inactivo" status label | Dense table, thumbnail | Test cell fit |
| 10 | Subscribers.tsx:424 | Product name truncated | max-w-[80px] severe | Keep truncation, test text-xs |

## Implementation Phases

### Phase 0: Preparation (Research done — spec + plan created)

### Phase 1: GROUP A Conversion (72 changes, CSS-only replaceAll)

Simple search-and-replace across all GROUP A files. Each file is independent.

Strategy: Use `replaceAll` for `text-[10px]` → `text-xs` per file. Verify no false positives (GROUP B exceptions).

### Phase 2: GROUP C Review (10 manual checks)

- Open each file with context
- Evaluate container constraints
- Apply `text-xs` or document as exception
- Adjust padding/width if needed

### Phase 3: Verification

- TypeScript compile check (`npx tsc --noEmit`)
- Visual scan of affected pages
- Verify GROUP B exceptions still intact
- Check GROUP C decisions logged in code comments or task notes

## Execution Strategy

### Sequential (single dev)

1. Phase 1: Process GROUP A files in batches of 3-5 files per commit
2. Phase 2: Manual review of GROUP C edge cases
3. Phase 3: Verify and document

### Parallel (multi-dev)

- Each GROUP A file is fully independent — can be assigned to different subagents
- GROUP C edge cases can be reviewed in parallel
- GROUP B requires no changes (just documentation)
