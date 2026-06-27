# Feature Specification: Typography Standardization

**Feature Branch**: `004-typography-standardization`

**Created**: 2026-06-26

**Status**: Draft

**Input**: Comprehensive audit of 34 files, 88 uses of `text-[10px]`, inconsistent tracking and text sizing across admin, pages, and components.

## User Scenarios & Testing

### User Story 1 — Consistent Label Hierarchy (Priority: P1)

As a user, all form labels, section headers, and metadata text across the app use the same text size and letter-spacing, making the UI feel professionally designed and easier to scan.

**Why this priority**: Currently, form labels in Subscriptions use `text-[10px] tracking-[0.2em]` while Checkout/Register/Login use `text-xs tracking-widest`. This inconsistency makes the subscription flow look like a different app. Fixing this is the highest-impact visual improvement.

**Independent Test**: Navigate between Checkout → Register → Subscriptions. All form labels should use the same `text-xs uppercase tracking-widest` pattern. Compare screenshots — no perceptual size difference between label text across pages.

**Acceptance Scenarios**:

1. **Given** a user is on the Subscriptions page, **When** they look at any form label (Dirección, Ciudad, Frecuencia, etc.), **Then** the label uses `text-xs uppercase tracking-widest`
2. **Given** a user is on any page with form fields, **When** they compare label text sizes, **Then** all labels are the same visual size (12px)
3. **Given** a section eyebrow label (e.g., "Filtros" in Shop, "Notas" in ProductDetail), **When** measured, **Then** it uses `text-xs uppercase tracking-widest`

---

### User Story 2 — Readable Badges & Tags (Priority: P1)

All status badges, category tags, and filter chips are readable at a glance, using a minimum of 10px with consistent letter-spacing.

**Why this priority**: Badges at `text-[8px]` and `text-[9px]` are nearly unreadable on mobile. Filter chips at `text-[11px]` are arbitrarily different from the standard `text-xs`. Users shouldn't have to squint to read important status information.

**Independent Test**: View the app on a 375px mobile viewport. All badges (status, category, "NEW", cart count, difficulty, payment method default) must be readable without zooming. Inspect computed font-size — no badge is smaller than 10px.

**Acceptance Scenarios**:

1. **Given** a user views any badge (cart count, status pill, difficulty tag), **When** inspected, **Then** font-size is at least 10px
2. **Given** a user views a filter chip in Shop, **When** inspected, **Then** font-size is `text-xs` (12px), not `text-[11px]`
3. **Given** a user views the BottomNav cart badge, **When** inspected, **Then** it's large enough to contain the number without overflow (w-4 h-4 minimum)
4. **Given** a user views a badge that uses `tracking-[0.2em]`, **When** inspected, **Then** it now uses `tracking-wider` or `tracking-widest`

---

### User Story 3 — Standardized Admin Data Density (Priority: P2)

Admin users can scan dense tables and data displays with consistent typography that balances readability with information density.

**Why this priority**: Admin Inventory.tsx has 46 uses of `text-xs` (the densest file) alongside 7 uses of `text-[10px]`. The arbitrary 10px value is used inconsistently in the same table. Standardizing improves legibility without sacrificing data density.

**Independent Test**: Open each admin page side by side. Table cell text, status badges, and action buttons should use the same text size and tracking across all admin modules.

**Acceptance Scenarios**:

1. **Given** an admin views any admin table (Inventory, Subscribers, Orders, Products), **When** comparing cell text sizes, **Then** they are the same size within the same table column type
2. **Given** an admin views a status badge in any admin table, **When** inspected, **Then** it uses the same `text-[10px]` or `text-xs` across all admin modules

---

### Edge Cases

- What happens when `text-[10px]` text in a compact w-4 h-4 circle badge (Shop filter count, NotificationBell count, BottomNav cart count) is changed to `text-xs`? → **These 3 cases MUST stay at `text-[10px]`** because the container is fixed at 16px diameter.
- What happens when `text-[10px]` in admin ThresholdEditor inline buttons is changed to `text-xs`? → **MUST stay at `text-[10px]`** because buttons are in a compact input row with no room for larger text.
- What happens when text overflows a card badge with absolute positioning (ProductCard, CoffeePicker)? → Needs manual review — some may need padding adjustments when size increases.

## Requirements

### Functional Requirements

- **FR-001**: System MUST use `text-xs` (Tailwind default 12px) for all section labels, form labels, and metadata text
- **FR-002**: System MUST use `tracking-widest` for all uppercase label text and section headers
- **FR-003**: System MUST use `tracking-wider` for all uppercase badge text
- **FR-004**: Badges, chips, and status pills MUST use minimum `text-[10px]` font size
- **FR-005**: Circular badge containers (w-4 h-4 for counts) MUST be large enough to contain the number at `text-[10px]`
- **FR-006**: All `text-[11px]` occurrences MUST be changed to `text-xs` (12px)
- **FR-007**: All `text-[9px]` and smaller occurrences MUST be bumped to `text-[10px]` minimum EXCEPT for the brand subtitle convention (`text-[9px] tracking-[0.3em]` in Navbar, Footer, Login, Register, AdminLayout, AdminLogin)
- **FR-008**: All `tracking-[0.2em]` occurrences MUST be replaced with either `tracking-wider` (badges/buttons) or `tracking-widest` (labels/section headers)
- **FR-009**: The `text-[8px]` badge in CoffeePicker MUST be at least `text-[10px]` after re-evaluating container constraints

### Key Entities

- **Typography Scale**: The set of approved text-size tokens (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl+`) plus approved arbitrary sizes (`text-[10px]` for dense layout, `text-[9px]` for brand subtitle convention)
- **Tracking Scale**: The set of approved letter-spacing tokens (`tracking-wider`, `tracking-widest`, `tracking-[0.3em]` for section eyebrows)
- **Badge Standard**: Minimum 10px, `tracking-wider`, uppercase

## Success Criteria

### Measurable Outcomes

- **SC-001**: Zero occurrences of `text-[8px]` across the codebase
- **SC-002**: Zero occurrences of `tracking-[0.2em]` across the codebase (already completed)
- **SC-003**: Zero occurrences of `text-[11px]` across the codebase (already completed for Shop.tsx)
- **SC-004**: 100% of GROUP A `text-[10px]` occurrences converted to `text-xs` (72 of 72)
- **SC-005**: 100% of GROUP B `text-[10px]` occurrences documented as intentional exceptions (6 of 6)
- **SC-006**: 100% of GROUP C edge cases reviewed and either standardized or documented as justified exceptions (10 of 10)
- **SC-007**: All form labels across all pages use the same `text-xs uppercase tracking-widest` pattern
- **SC-008**: All uppercase section eyebrow headers use `text-xs uppercase tracking-[0.3em]` or `tracking-widest`

## Assumptions

- The brand subtitle pattern (`text-[9px] tracking-[0.3em]`) in Navbar, Footer, Login, Register, AdminLayout, AdminLogin is an intentional design convention and should NOT be changed
- `text-[10px]` is acceptable for compact layouts where container constraints prevent `text-xs` — this is an intentional exception, not a bug
- Admin table cells and compact cards may retain `text-[10px]` for status badges to maintain data density
- All changes are CSS-only — no component structure or logic changes needed
- Tailwind's default `text-xs` maps to `font-size: 0.75rem` (12px) — this is the standard reference
