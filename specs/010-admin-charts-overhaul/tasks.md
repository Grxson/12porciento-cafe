---
description: 'Task list for Admin Charts Overhaul'
---

# Tasks: Admin Charts Overhaul

**Input**: Design documents from `specs/010-admin-charts-overhaul/`

**Prerequisites**: plan.md ✅ spec.md ✅

**Tests**: Visual testing — toggle dark mode, collapse/expand charts, verify legends. No unit tests needed (UI-only).

**Organization**: Tasks grouped by dependency. Group A blocks all others.

## Format: `[ID] [P?] [Group] Description`

- **[P]**: Can run in parallel (different files, no dependencies)

---

## Phase 1: Shared Hook Extraction

**Purpose**: Extract `useChartColors` from Dashboard.tsx into shared hook. Blocks all dark mode fixes.

- [ ] T001 Read `specs/010-admin-charts-overhaul/plan.md` before touching any file

- [ ] T002 Create `apps/admin/src/hooks/useChartColors.ts`. Extract the `ChartColors` interface and `useChartColors()` function from `apps/admin/src/admin/Dashboard.tsx` lines 34-80. The hook: (1) defines `ChartColors` interface with `grid`, `text`, `gold`, `tooltipBg`, `tooltipBorder`, `tooltipText` fields, (2) initializes state with dark-mode defaults, (3) uses `useEffect` with `MutationObserver` on `document.documentElement` to detect `.dark` class changes, (4) reads CSS custom properties (`--chart-grid`, `--chart-text`, etc.) for light mode values, (5) returns the colors object. Export both `ChartColors` type and `useChartColors` function.

- [ ] T003 Update `apps/admin/src/admin/Dashboard.tsx`. Remove the inline `ChartColors` interface (line ~34-43) and `useChartColors()` function (line ~45-80). Add import: `import { useChartColors } from '../hooks/useChartColors';`. Keep the `const chartColors = useChartColors();` call inside the component — it stays the same.

- [ ] T004 Verify: `pnpm --filter=@12porciento/admin exec tsc --noEmit` exits 0. `pnpm --filter=@12porciento/admin build` exits 0.

**Checkpoint**: Shared hook working, Dashboard unchanged visually.

---

## Phase 2: Dark Mode Fixes

**Purpose**: Fix the 2 charts with hardcoded broken colors. Can run in parallel with Phase 3+.

- [ ] T005 [P] `Orders.tsx` — Add `import { useChartColors } from '../hooks/useChartColors';` at top. Add `const chartColors = useChartColors();` inside the component function. Then replace ALL hardcoded colors in the pipeline chart (lines ~214-242): `stroke="#2c1810"` → `stroke={chartColors.grid}`, `tick={{ fill: '#a05a2c', fontSize: 11 }}` → `tick={{ fill: chartColors.text, fontSize: 11 }}` (both XAxis and YAxis), `background: '#1a0f0a'` → `background: chartColors.tooltipBg`, `border: '1px solid #2c1810'` → `` border: `1px solid ${chartColors.tooltipBorder}` ``, `labelStyle={{ color: '#c9a96e' }}` → `labelStyle={{ color: chartColors.gold }}`, `itemStyle={{ color: '#e8d5b7' }}` → `itemStyle={{ color: chartColors.tooltipText }}`.

- [ ] T006 [P] `Inventory.tsx` — Add `import { useChartColors } from '../hooks/useChartColors';` at top. Add `const chartColors = useChartColors();` inside the component. Replace ALL hardcoded colors in the stock levels chart (lines ~272-315): `stroke="#e8d5c4"` → `stroke={chartColors.grid}`, `tick={{ fill: '#8b5a2b', fontSize: 10 }}` → `tick={{ fill: chartColors.text, fontSize: 10 }}` (both axes), `background: '#fff'` → `background: chartColors.tooltipBg`, `border: '1px solid #e8d5c4'` → `` border: `1px solid ${chartColors.tooltipBorder}` ``, `itemStyle={{ color: '#4a3728' }}` → `itemStyle={{ color: chartColors.tooltipText }}`.

- [ ] T007 [P] `Subscribers.tsx` — Add `import { useChartColors } from '../hooks/useChartColors';` at top. Add `const chartColors = useChartColors();` inside the component. Replace hardcoded tooltip colors in BOTH donut charts (lines ~480-486 and ~513-519): `background: '#1a0f0a'` → `background: chartColors.tooltipBg`, `border: '1px solid #2c1810'` → `` border: `1px solid ${chartColors.tooltipBorder}` ``. Note: these tooltips are actually dark-only styled which works OK in both themes, but switching to chartColors makes it consistent and future-proof.

- [ ] T008 [P] `Reviews.tsx` — Add `import { useChartColors } from '../hooks/useChartColors';` at top. Add `const chartColors = useChartColors();` inside the component. Replace hardcoded tooltip colors (lines ~191-196): same pattern as T007.

- [ ] T009 [P] `AbandonedCarts.tsx` — Add `import { useChartColors } from '../hooks/useChartColors';` at top. Add `const chartColors = useChartColors();` inside the component. Replace hardcoded tooltip colors (lines ~119-124): same pattern.

**Checkpoint**: All 12 charts render correctly in both light and dark mode.

---

## Phase 3: CollapsibleChart Component

**Purpose**: Create the collapsible wrapper and apply to all chart sections.

- [ ] T010 Create `apps/admin/src/admin/components/CollapsibleChart.tsx`. Props: `id: string`, `title: string`, `subtitle?: string`, `badge?: string`, `defaultExpanded?: boolean` (default true), `children: React.ReactNode`. Implementation: (1) `useState` initialized from `localStorage.getItem('chart-collapse-${id}') === 'collapsed' ? false : (defaultExpanded ?? true)`, (2) `useEffect` to persist `localStorage.setItem('chart-collapse-${id}', expanded ? 'expanded' : 'collapsed')` on change, (3) header is a `<button className="flex items-center justify-between w-full p-6 pb-0">` with title/subtitle on left, badge + `<motion.div animate={{ rotate: expanded ? 180 : 0 }}><ChevronDown /></motion.div>` on right, (4) content wrapped in `<AnimatePresence initial={false}>` with `<motion.div key="content" initial={{ height: 0, opacity: 0 }} animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">` containing `{children}` with `p-6 pt-4`, (5) outer container: `<div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 mb-6">`.

- [ ] T011 `Dashboard.tsx` — Wrap revenue trend chart (lines ~376-437). Replace the outer `<motion.div>` (with fade-in animation) with `<CollapsibleChart id="dashboard-revenue-trend" title="Tendencia de ingresos" subtitle="Últimos 12 meses" badge="MXN">`. Remove the `motion.div` initial/animate/transition props — CollapsibleChart handles animation. Keep the inner chart content.

- [ ] T012 [P] `Dashboard.tsx` — Wrap orders by day chart (lines ~440-487). Replace outer `<motion.div>` with `<CollapsibleChart id="dashboard-orders-day" title="Pedidos por día" subtitle="Últimos 14 días">`.

- [ ] T013 [P] `Dashboard.tsx` — Wrap order status donut (lines ~758-796). Replace outer `<div>` with `<CollapsibleChart id="dashboard-order-status" title="Estado de pedidos">`.

- [ ] T014 [P] `Dashboard.tsx` — Wrap category revenue donut (lines ~804-845). Replace outer `<div>` with `<CollapsibleChart id="dashboard-category-revenue" title="Ingresos por categoría">`.

- [ ] T015 [P] `Dashboard.tsx` — Wrap top products chart (lines ~854-907). Replace outer `<div>` with `<CollapsibleChart id="dashboard-top-products" title="Top ingresos por producto">`.

- [ ] T016 [P] `Orders.tsx` — Wrap pipeline chart (lines ~211-243). Replace outer `<div>` with `<CollapsibleChart id="orders-pipeline" title="Pipeline de estados">`.

- [ ] T017 [P] `Inventory.tsx` — Wrap stock levels chart (lines ~267-316). Replace outer `<div>` with `<CollapsibleChart id="inventory-stock-levels" title="Niveles de stock por producto">`.

- [ ] T018 [P] `Subscribers.tsx` — Wrap both donuts grid (lines ~457-524). Replace outer `<div className="grid ...">` with `<CollapsibleChart id="subscribers-donuts" title="Distribución de suscripciones"><div className="grid ...">...</div></CollapsibleChart>`. Both donuts inside one collapsible section.

- [ ] T019 [P] `Reviews.tsx` — Wrap summary section (lines ~170-217). Replace outer `<div>` with `<CollapsibleChart id="reviews-summary" title="Resumen de reseñas">`.

- [ ] T020 [P] `AbandonedCarts.tsx` — Wrap recovery section (lines ~98-145). Replace outer `<div>` with `<CollapsibleChart id="carts-recovery" title="Tasa de recuperación">`.

- [ ] T021 Verify: `pnpm --filter=@12porciento/admin build` exits 0. `pnpm --filter=@12porciento/admin exec tsc --noEmit` exits 0.

**Checkpoint**: All chart sections collapsible. Animation smooth. State persists.

---

## Phase 4: Title Fixes + Deduplication

**Purpose**: Correct misleading titles, remove redundant chart.

- [ ] T022 [P] `Reviews.tsx:172` — Change title from "Distribución de Calificaciones" to "Reseñas pendientes vs aprobadas".

- [ ] T023 [P] `Dashboard.tsx` — Remove the "Tendencia ingresos (6 meses)" BarChart section (lines ~911-954). Delete the entire block: the conditional `{revenueMonthBarData.length > 0 && (...)}`, the `<div>` wrapper, the `<h3>` title, the `<ResponsiveContainer>` with `<BarChart>`. Also remove the `revenueMonthBarData` state variable and its computation (find where it's derived from `financial.revenueByMonth` and remove that too). Keep the `financial` state and its API call — other parts of the dashboard may use it.

**Checkpoint**: Titles accurate. Dashboard has 5 charts.

---

## Phase 5: Donut Legends + Responsive

**Purpose**: Add legends to legendless donuts, fix fixed-width donuts.

- [ ] T024 [P] `Subscribers.tsx:460-489` — Status donut: add `<Legend>` inside `<PieChart>`. Use `formatter` prop to map status keys to Spanish labels: `{ ACTIVE: 'Activa', PAUSED: 'Pausada', CANCELLED: 'Cancelada' }`. Style: `wrapperStyle={{ fontSize: 11 }}`. Also improve the color palette if any colors are too similar.

- [ ] T025 [P] `Subscribers.tsx:493-522` — Plan donut: add `<Legend>` inside `<PieChart>`. Map plan keys: `{ FUNDADOR: 'Fundador', EXPLORADOR: 'Explorador', CONNOISSEUR: 'Connoisseur', EMPRESARIAL: 'Empresarial' }`. Replace similar brown palette with more distinct colors: `['#c9a96e', '#3b82f6', '#d4a76a', '#ef4444']` (gold, blue, tan, red).

- [ ] T026 [P] `Reviews.tsx:174` — Change `<ResponsiveContainer width={160} height={160}>` to `<ResponsiveContainer width="100%" height={180}>`.

- [ ] T027 [P] `AbandonedCarts.tsx:102` — Change `<ResponsiveContainer width={160} height={160}>` to `<ResponsiveContainer width="100%" height={180}>`.

- [ ] T028 Verify: `pnpm --filter=@12porciento/admin build` exits 0.

**Checkpoint**: Legends visible. Donuts responsive.

---

## Phase 6: Margin Fix

**Purpose**: Fix `left: -16` clipping risk on all charts.

- [ ] T029 [P] `Dashboard.tsx:391` — AreaChart: change `margin={{ top: 4, right: 4, left: -16, bottom: 0 }}` to `margin={{ top: 4, right: 4, left: 0, bottom: 0 }}`.

- [ ] T030 [P] `Dashboard.tsx:456` — BarChart orders: change `margin={{ top: 4, right: 4, left: -16, bottom: 0 }}` to `margin={{ top: 4, right: 4, left: 0, bottom: 0 }}`.

- [ ] T031 [P] `Orders.tsx:220` — BarChart pipeline: change `margin={{ top: 4, right: 4, left: -16, bottom: 0 }}` to `margin={{ top: 4, right: 4, left: 0, bottom: 0 }}`.

- [ ] T032 [P] `Inventory.tsx:283` — BarChart stock: change `margin={{ top: 4, right: 4, left: -16, bottom: 0 }}` to `margin={{ top: 4, right: 4, left: 0, bottom: 0 }}`.

- [ ] T033 Final verify: `pnpm --filter=@12porciento/admin build` exits 0. `pnpm --filter=@12porciento/admin exec tsc --noEmit` exits 0.

**Checkpoint**: All margins fixed. No clipping.

---

## Phase 7: Final Validation

- [ ] T034 Open admin in browser. Toggle dark mode → verify all 11 charts (5 Dashboard + 1 Orders + 1 Inventory + 2 Subscribers + 1 Reviews + 1 AbandonedCarts) render correctly.

- [ ] T035 Click every chart header → verify collapse animation smooth, chevron rotates, content hides.

- [ ] T036 Collapse all Dashboard charts → refresh page → verify all stay collapsed.

- [ ] T037 Verify Subscribers donuts have legends with plan/status names.

- [ ] T038 Verify Reviews chart title says "Reseñas pendientes vs aprobadas".

- [ ] T039 Verify Dashboard has exactly 5 chart sections (no duplicate revenue chart).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Hook)**: Start immediately. Blocks Phase 2.
- **Phase 2 (Dark Mode)**: Depends on Phase 1. Can run parallel with Phase 3+.
- **Phase 3 (Collapsible)**: Independent of Phase 2. Can run parallel.
- **Phase 4 (Titles)**: Independent. Can run parallel.
- **Phase 5 (Legends)**: Independent. Can run parallel.
- **Phase 6 (Margins)**: Independent. Can run parallel.
- **Phase 7 (Validation)**: All phases complete.

### Parallel Opportunities

```bash
# After Phase 1 completes:
Phase 2: T005-T009     # Dark mode fixes (Orders, Inventory, Subscribers, Reviews, AbandonedCarts)
Phase 3: T010-T021     # CollapsibleChart + wrapping
Phase 4: T022-T023     # Title fix + dedup
Phase 5: T024-T027     # Legends + responsive donuts
Phase 6: T029-T032     # Margin fixes
```

---

## Notes

- `useChartColors` is already battle-tested in Dashboard.tsx — extraction is mechanical
- `CollapsibleChart` uses same framer-motion patterns as AdminLayout sidebar groups
- Recharts `<Legend>` is built-in, no new deps
- `left: 0` margins may shift chart slightly right — verify visual balance
- Subscribers plan palette change (brown→blue/red) is intentional for accessibility
- `revenueMonthBarData` removal in Dashboard may leave unused imports — clean up
