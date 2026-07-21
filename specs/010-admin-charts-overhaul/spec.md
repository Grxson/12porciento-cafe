# Feature Specification: Admin Charts Overhaul

**Feature Branch**: `010-admin-charts-overhaul`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "algunas gráficas no se entienden, son invasivas, quiero que se puedan colapsar para que no estén ahí molestando todo el tiempo"

## User Scenarios & Testing

### User Story 1 — Charts Are Readable in Both Themes (Priority: P1)

All charts display correctly in both light and dark mode. No hardcoded colors that break in one theme. Legends present on all donut charts so user can identify segments.

**Why this priority**: 2 charts are completely broken in dark mode (Orders, Inventory). 2 donuts have no legend (Subscribers). This is a functional blocker.

**Independent Test**: Toggle dark mode on admin dashboard → all charts render with correct colors, tooltips readable, legends visible.

**Acceptance Scenarios**:

1. **Given** admin in dark mode, **When** viewing Orders page, **Then** chart grid, text, tooltip all use theme-aware colors (not hardcoded)
2. **Given** admin in dark mode, **When** viewing Inventory page, **Then** stock chart tooltip has dark bg with light text
3. **Given** admin viewing Subscribers, **When** looking at plan donut, **Then** each segment has a legend label identifying the plan name
4. **Given** admin viewing Subscribers, **When** looking at status donut, **Then** legend shows Active/Paused/Cancelled labels

---

### User Story 2 — Charts Are Collapsible (Priority: P1)

Every chart section has a clickable header that collapses/expands the chart content. Collapsed state persisted in localStorage per page. Charts start expanded by default.

**Why this priority**: User explicitly requested this — charts are "invasive" and take too much space.

**Independent Test**: Open Dashboard → click "Tendencia de ingresos" header → chart collapses with animation → header shows chevron → click again → expands. Refresh page → state preserved.

**Acceptance Scenarios**:

1. **Given** Dashboard loaded, **When** user clicks chart section header, **Then** chart content collapses with smooth height animation (framer-motion)
2. **Given** chart collapsed, **When** user clicks header again, **Then** chart expands back
3. **Given** chart collapsed, **When** user refreshes page, **Then** chart stays collapsed (localStorage)
4. **Given** any chart section, **When** collapsed, **Then** header shows chevron-down icon; when expanded shows chevron-up
5. **Given** Dashboard, **When** all 6 chart sections collapsed, **Then** page is compact — key stats and tables visible without scrolling

---

### User Story 3 — Chart Titles and Data Are Accurate (Priority: P2)

Chart titles accurately describe the data shown. No misleading labels. No duplicate charts showing overlapping data.

**Why this priority**: Reviews chart title says "Rating Distribution" but shows pending/approved. Dashboard has 2 revenue charts from different sources.

**Independent Test**: Read each chart title → verify it matches the data displayed. No chart duplicates another.

**Acceptance Scenarios**:

1. **Given** Reviews page, **When** viewing the donut chart, **Then** title says "Reseñas pendientes vs aprobadas" (not "Distribución de Calificaciones")
2. **Given** Dashboard, **When** viewing all charts, **Then** no two charts show the same metric from different sources

---

### User Story 4 — Donut Charts Are Responsive (Priority: P2)

Donut charts scale with their container instead of being fixed at 160px. Look good on both mobile and desktop.

**Why this priority**: Fixed-width donuts look tiny on desktop and may overflow on very small screens.

**Independent Test**: Open Reviews page on desktop → donut fills available space. Open on mobile → donut scales down gracefully.

**Acceptance Scenarios**:

1. **Given** Reviews/AbandonedCarts donuts, **When** viewed on desktop, **Then** chart fills container width (not fixed 160px)
2. **Given** same donuts on mobile, **When** viewed, **Then** chart scales down proportionally

---

### Edge Cases

- What if user has all charts collapsed and there's no content to show?
- What if localStorage is full — collapse state fails silently?
- What if chart has zero data — should it show empty state or hide entirely?

## Requirements

### Functional Requirements

- **FR-001**: All charts MUST use `useChartColors()` hook for theme-aware colors
- **FR-002**: `useChartColors()` MUST be extracted to shared hook (not duplicated per file)
- **FR-003**: All donut charts MUST include `<Legend>` component with formatted labels
- **FR-004**: All chart sections MUST be collapsible via clickable header
- **FR-005**: Collapse state MUST persist in localStorage per chart section (keyed by page + section id)
- **FR-006**: Collapse animation MUST use framer-motion (consistent with existing admin patterns)
- **FR-007**: Collapsed header MUST show chevron icon indicating state
- **FR-008**: Reviews chart title MUST be corrected to "Reseñas pendientes vs aprobadas"
- **FR-009**: Dashboard revenue chart duplication MUST be resolved (keep 12mo AreaChart, remove 6mo BarChart)
- **FR-010**: Donut charts in Reviews and AbandonedCarts MUST use `width="100%"` instead of `width={160}`
- **FR-011**: All `left: -16` margins MUST be changed to `left: 0` or `left: 8`
- **FR-012**: Subscribers plan donut MUST use distinct, accessible color palette

### Non-Functional Requirements

- **NFR-001**: Chart collapse/expand animation < 300ms
- **NFR-002**: No layout shift when charts collapse (smooth height transition)
- **NFR-003**: localStorage keys namespaced per page to avoid conflicts

## Success Criteria

### Measurable Outcomes

- **SC-001**: Dark mode → all 12 charts render correctly (0 broken tooltips/grids)
- **SC-002**: All 4 donut charts have visible legends with segment labels
- **SC-003**: All 12 chart sections collapsible with animation
- **SC-004**: Collapse state persists across page refresh
- **SC-005**: Reviews chart title matches displayed data
- **SC-006**: Dashboard has 5 charts (not 6) — revenue duplication removed
- **SC-007**: Lighthouse accessibility score does not decrease

## Assumptions

- **Shared hook**: `useChartColors()` already exists in Dashboard.tsx — extract to new file, not rewrite
- **framer-motion**: Already in admin deps — no new dependency needed
- **Legend component**: Built into recharts — no new dependency
- **Collapse pattern**: Can use `<AnimatePresence>` + `motion.div` with `animate={{ height }}` — proven pattern in admin sidebar groups
- **No chart library change**: Keep recharts, just improve usage
