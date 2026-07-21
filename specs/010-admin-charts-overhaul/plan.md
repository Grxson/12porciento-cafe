# Implementation Plan: Admin Charts Overhaul

**Branch**: `010-admin-charts-overhaul` | **Date**: 2026-07-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/010-admin-charts-overhaul/spec.md`

## Summary

Fix dark mode in 2 broken charts, add legends to 2 donut charts, make all 12 chart sections collapsible with animation + localStorage persistence, correct misleading titles, remove duplicate revenue chart, make fixed-width donuts responsive, fix margin clipping, improve color accessibility. ~10 files modified, 1 new file (shared hook).

## Technical Context

**Language/Version**: TypeScript 5.x, React 18

**Primary Dependencies**: recharts (existing), framer-motion (existing), Tailwind CSS 3

**New Dependencies**: None

**Storage**: localStorage for collapse state (namespaced per page)

**Project Type**: React SPA — UI-only changes, no API/schema changes

**Constraints**: No new npm deps. All fixes use existing patterns. Desktop layout unchanged. No chart library change.

## Architecture Decisions

### A1: Extract `useChartColors` to Shared Hook

**Decision**: Move `useChartColors()` from `Dashboard.tsx` to `apps/admin/src/hooks/useChartColors.ts`. Import in all chart files.

**Rationale**: Currently Dashboard.tsx has the only theme-aware chart color hook. Orders.tsx and Inventory.tsx hardcode colors. Extract once, import everywhere.

### A2: Collapsible Pattern — framer-motion + localStorage

**Decision**: Create a `CollapsibleChart` wrapper component that handles:

- Clickable header with chevron icon
- `<AnimatePresence>` + `motion.div` with `animate={{ height: 'auto' }}` / `exit={{ height: 0 }}`
- localStorage persistence per section key

**Rationale**: Same pattern as sidebar nav groups in AdminLayout.tsx. Proven, consistent.

### A3: Remove Dashboard Revenue Duplication

**Decision**: Remove Chart #6 (6mo BarChart from `financial.revenueByMonth`). Keep Chart #1 (12mo AreaChart from `stats.revenueByMonth`).

**Rationale**: Chart #1 has more data (12 months vs 6), better visualization (area with gradient), and is in the primary stats section. Chart #6 is redundant.

### A4: Donut Legends — Recharts `<Legend>` Component

**Decision**: Add `<Legend>` with custom `formatter` to all donut charts. Use the existing label mapping from data.

**Rationale**: Recharts Legend is built-in, no extra deps. Custom formatter matches admin typography.

## Implementation Tasks

### Group A — Shared Hook Extraction (Blocking)

**A1. Create `apps/admin/src/hooks/useChartColors.ts`**

Extract the `useChartColors()` function and `ChartColors` interface from `Dashboard.tsx:34-80` into a new file. Export both. The hook reads CSS custom properties and observes dark mode class changes via MutationObserver.

**A2. Update `apps/admin/src/admin/Dashboard.tsx`**

Remove the inline `useChartColors()` definition (lines 34-80). Import from `../hooks/useChartColors`. No other changes needed — the hook signature is identical.

---

### Group B — Dark Mode Fixes (Orders + Inventory)

**B1. `apps/admin/src/admin/Orders.tsx:214-242` — Pipeline chart**

Replace all hardcoded colors with `useChartColors()`:

- `stroke="#2c1810"` → `stroke={chartColors.grid}`
- `tick={{ fill: '#a05a2c' }}` → `tick={{ fill: chartColors.text }}`
- `background: '#1a0f0a'` → `background: chartColors.tooltipBg`
- `border: '1px solid #2c1810'` → `border: \`1px solid ${chartColors.tooltipBorder}\``
- `labelStyle={{ color: '#c9a96e' }}` → `labelStyle={{ color: chartColors.gold }}`
- `itemStyle={{ color: '#e8d5b7' }}` → `itemStyle={{ color: chartColors.tooltipText }}`

Import `useChartColors` at top of file. Add `const chartColors = useChartColors();` inside component.

**B2. `apps/admin/src/admin/Inventory.tsx:272-315` — Stock levels chart**

Same pattern as B1:

- `stroke="#e8d5c4"` → `stroke={chartColors.grid}`
- `tick={{ fill: '#8b5a2b' }}` → `tick={{ fill: chartColors.text }}`
- `background: '#fff'` → `background: chartColors.tooltipBg}`
- `border: '1px solid #e8d5c4'` → `border: \`1px solid ${chartColors.tooltipBorder}\``
- `itemStyle={{ color: '#4a3728' }}` → `itemStyle={{ color: chartColors.tooltipText }}`

Import `useChartColors` at top of file.

---

### Group C — CollapsibleChart Component

**C1. Create `apps/admin/src/admin/components/CollapsibleChart.tsx`**

New component with props:

```typescript
interface CollapsibleChartProps {
  id: string; // Unique key for localStorage (e.g., "dashboard-revenue-trend")
  title: string; // Section title
  subtitle?: string; // Optional subtitle
  badge?: string; // Optional badge (e.g., "MXN")
  defaultExpanded?: boolean; // Default: true
  children: React.ReactNode; // Chart content
}
```

Implementation:

- `useState` initialized from `localStorage.getItem('chart-collapse-${id}')` (default: expanded)
- `useEffect` to persist state to localStorage on change
- Header: clickable `<button>` with `flex items-center justify-between w-full`
  - Left: title + subtitle
  - Right: badge (if provided) + `<ChevronDown>` / `<ChevronUp>` icon with rotation animation
- Content: `<AnimatePresence initial={false}>` wrapping `<motion.div>`
  - `animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }}`
  - `exit={{ height: 0, opacity: 0 }}`
  - `transition={{ duration: 0.2 }}`
  - `className="overflow-hidden"`
- Container: same styling as current chart wrappers (`bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800`)

**C2. Wrap all 12 chart sections with `<CollapsibleChart>`**

Replace each chart's outer `<div>` with `<CollapsibleChart>`:

| File                      | Current wrapper                        | CollapsibleChart id          |
| ------------------------- | -------------------------------------- | ---------------------------- |
| Dashboard.tsx:376-437     | Revenue trend AreaChart                | `dashboard-revenue-trend`    |
| Dashboard.tsx:440-487     | Orders by day BarChart                 | `dashboard-orders-day`       |
| Dashboard.tsx:758-796     | Order status donut                     | `dashboard-order-status`     |
| Dashboard.tsx:804-845     | Category revenue donut                 | `dashboard-category-revenue` |
| Dashboard.tsx:854-907     | Top products horizontal bar            | `dashboard-top-products`     |
| Dashboard.tsx:911-954     | Revenue 6mo bar (REMOVE — see Group D) | —                            |
| Orders.tsx:211-243        | Pipeline bar chart                     | `orders-pipeline`            |
| Inventory.tsx:267-316     | Stock levels horizontal bar            | `inventory-stock-levels`     |
| Subscribers.tsx:457-524   | Status donut + Plan donut (grid)       | `subscribers-donuts`         |
| Reviews.tsx:170-217       | Pending/approved donut + rating cards  | `reviews-summary`            |
| AbandonedCarts.tsx:98-145 | Recovery rate donut + stats            | `carts-recovery`             |

For Dashboard charts, the current `motion.div` wrappers (with `initial/animate/transition` for fade-in) should be replaced by `CollapsibleChart` which handles its own animation. Remove the duplicate `motion.div` fade-in animation from each chart section to avoid animation conflict.

---

### Group D — Title Fixes + Deduplication

**D1. `apps/admin/src/admin/Reviews.tsx:172` — Fix misleading title**

Change:

```tsx
<p className="text-xs text-coffee-500 uppercase mb-3">Distribución de Calificaciones</p>
```

To:

```tsx
<p className="text-xs text-coffee-500 uppercase mb-3">Reseñas pendientes vs aprobadas</p>
```

**D2. `apps/admin/src/admin/Dashboard.tsx:911-954` — Remove duplicate revenue chart**

Remove the entire "Tendencia ingresos (6 meses)" BarChart section (lines ~911-954). The 12-month AreaChart (Chart #1) already covers this data with more detail.

After removal, the Dashboard goes from 6 chart sections to 5:

1. Revenue trend (12mo AreaChart) ← keep
2. Orders by day (14d BarChart) ← keep
3. Order status donut ← keep
4. Category revenue donut ← keep
5. Top products horizontal bar ← keep

---

### Group E — Donut Legends + Responsive

**E1. `Subscribers.tsx:460-489` — Status donut legend**

Add `<Legend>` inside `<PieChart>`. Format labels:

```tsx
<Legend
  formatter={(value) => {
    const labels: Record<string, string> = {
      ACTIVE: 'Activa',
      PAUSED: 'Pausada',
      CANCELLED: 'Cancelada',
    };
    return labels[value] || value;
  }}
  wrapperStyle={{ fontSize: 11, color: chartColors.text }}
/>
```

**E2. `Subscribers.tsx:493-522` — Plan donut legend**

Add `<Legend>` with plan name mapping:

```tsx
<Legend
  formatter={(value) => {
    const labels: Record<string, string> = {
      FUNDADOR: 'Fundador',
      EXPLORADOR: 'Explorador',
      CONNOISSEUR: 'Connoisseur',
      EMPRESARIAL: 'Empresarial',
    };
    return labels[value] || value;
  }}
  wrapperStyle={{ fontSize: 11, color: chartColors.text }}
/>
```

Also improve color palette — replace similar browns with more distinct colors:

```tsx
const palette = ['#c9a96e', '#8b5a2b', '#d4a76a', '#6b3a1f'];
// → more distinct:
const palette = ['#c9a96e', '#3b82f6', '#d4a76a', '#ef4444'];
// gold, blue, tan, red — clearly distinguishable
```

**E3. `Subscribers.tsx` — Import useChartColors**

Add `useChartColors` import and apply to both donut tooltips (currently hardcoded to dark-only).

**E4. `Reviews.tsx:174` — Make donut responsive**

Change:

```tsx
<ResponsiveContainer width={160} height={160}>
```

To:

```tsx
<ResponsiveContainer width="100%" height={180}>
```

Remove the fixed `width={160}`. The parent flex container already handles layout.

**E5. `AbandonedCarts.tsx:102` — Make donut responsive**

Same fix:

```tsx
<ResponsiveContainer width={160} height={160}>
```

To:

```tsx
<ResponsiveContainer width="100%" height={180}>
```

**E6. `Reviews.tsx` + `AbandonedCarts.tsx` — Import useChartColors**

Both files hardcode tooltip colors to dark-only. Add `useChartColors` and apply to tooltips.

---

### Group F — Margin Fix

**F1. Fix `left: -16` on all charts**

Files affected:

- `Dashboard.tsx:391` — AreaChart revenue: `left: -16` → `left: 0`
- `Dashboard.tsx:456` — BarChart orders: `left: -16` → `left: 0`
- `Dashboard.tsx:920` — (removed in D2, no action needed)
- `Orders.tsx:220` — BarChart pipeline: `left: -16` → `left: 0`
- `Inventory.tsx:283` — BarChart stock: `left: -16` → `left: 0`

Also check Dashboard.tsx top products chart (line ~860) — it uses `margin={{ top: 4, right: 4, left: 0, bottom: 0 }}` already, so no fix needed.

---

### Group G — CollapsibleChart in Subscribers (Grid Layout)

**Special case**: Subscribers.tsx has TWO donuts in a `grid grid-cols-1 md:grid-cols-2` layout. The `CollapsibleChart` wrapper should wrap the entire grid (both donuts together), not each individually. This way collapsing hides both donuts at once, which is the desired behavior (collapse the "visualizations" section).

Current:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
  <div>Por Estado donut</div>
  <div>Por Plan donut</div>
</div>
```

Becomes:

```tsx
<CollapsibleChart id="subscribers-donuts" title="Distribución de suscripciones">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>Por Estado donut (with legend)</div>
    <div>Por Plan donut (with legend)</div>
  </div>
</CollapsibleChart>
```

---

## Complexity Tracking

No constitution violations. No complexity to justify.

## Execution Order

1. **Group A** — Shared hook extraction (blocking, everything depends on it)
2. **Group B** — Dark mode fixes (highest functional impact)
3. **Group C** — CollapsibleChart component + wrapping all charts
4. **Group D** — Title fixes + deduplication
5. **Group E** — Donut legends + responsive
6. **Group F** — Margin fixes

Groups B-F can run in parallel after A completes (different files).

## Definition of Done

- [ ] `pnpm --filter=@12porciento/admin build` exits 0
- [ ] `pnpm --filter=@12porciento/admin exec tsc --noEmit` exits 0
- [ ] All 12 charts render correctly in dark mode
- [ ] All 4 donut charts have legends with labels
- [ ] All chart sections collapsible with animation
- [ ] Collapse state persists across refresh
- [ ] Reviews chart title corrected
- [ ] Dashboard has 5 charts (duplicate removed)
- [ ] No `left: -16` margins remaining
- [ ] Donut charts responsive (no fixed width)
