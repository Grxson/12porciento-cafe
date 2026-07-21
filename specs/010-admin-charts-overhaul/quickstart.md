# Quickstart: Admin Charts Overhaul Validation

**Feature**: `010-admin-charts-overhaul`
**Date**: 2026-07-20

## Prerequisites

1. `pnpm install` completed
2. `pnpm --filter=@12porciento/admin build` exits 0
3. Admin running locally or deployed to staging

---

## Scenario 1: Dark Mode — All Charts

1. Open admin Dashboard in light mode
2. Toggle to dark mode (sun/moon icon in header)
3. **Verify**: All 5 Dashboard charts — grid lines visible, axis text readable, tooltips show dark bg with light text
4. Navigate to Pedidos → verify pipeline chart renders correctly in dark mode
5. Navigate to Inventario → verify stock levels chart renders correctly in dark mode
6. Navigate to Suscriptores → verify both donut tooltips work in dark mode
7. Navigate to Reseñas → verify donut tooltip works in dark mode
8. Navigate to Carritos Abandonados → verify donut tooltip works in dark mode
9. Toggle back to light mode → verify all charts switch correctly

**Pass criteria**: Zero charts with broken colors in either theme.

---

## Scenario 2: Light Mode — All Charts

1. Open admin in light mode
2. Navigate to Dashboard
3. **Verify**: Grid lines are light brown (not dark), axis text is brown (not gold), tooltips have white bg with dark text
4. Check all 5 charts: Revenue trend, Orders by day, Order status donut, Category donut, Top products

**Pass criteria**: All charts readable in light mode.

---

## Scenario 3: Collapse/Expand — Dashboard

1. Open Dashboard
2. **Verify**: All 5 chart sections visible by default
3. Click "Tendencia de ingresos" header
4. **Verify**: Chart content collapses with smooth animation (~200ms)
5. **Verify**: Chevron icon rotates from down to up
6. Click header again
7. **Verify**: Chart expands back with animation
8. Collapse all 5 charts
9. **Verify**: Page is compact — stats cards and tables visible without scrolling
10. Refresh page
11. **Verify**: All 5 charts still collapsed (localStorage persisted)

**Pass criteria**: All sections collapsible, animation smooth, state persists.

---

## Scenario 4: Collapse/Expand — Other Pages

1. Navigate to Pedidos → collapse pipeline chart → refresh → stays collapsed
2. Navigate to Inventario → collapse stock chart → refresh → stays collapsed
3. Navigate to Suscriptores → collapse donuts section → refresh → stays collapsed
4. Navigate to Reseñas → collapse summary → refresh → stays collapsed
5. Navigate to Carritos → collapse recovery → refresh → stays collapsed

**Pass criteria**: Collapse works on every page with charts.

---

## Scenario 5: Donut Legends

1. Navigate to Suscriptores
2. **Verify**: "Por Estado" donut has legend showing: Activa, Pausada, Cancelada (or similar)
3. **Verify**: "Por Plan" donut has legend showing: Fundador, Explorador, Connoisseur, Empresarial
4. **Verify**: Legend colors match donut segment colors
5. **Verify**: Plan donut colors are distinct (not all brown)

**Pass criteria**: Both donuts have readable legends with correct labels.

---

## Scenario 6: Chart Titles Accuracy

1. Navigate to Reseñas
2. **Verify**: Donut chart title says "Reseñas pendientes vs aprobadas" (NOT "Distribución de Calificaciones")
3. Navigate to Dashboard
4. **Verify**: Exactly 5 chart sections (no duplicate "Tendencia ingresos 6 meses")
5. **Verify**: Each chart title matches its data

**Pass criteria**: All titles accurate, no duplicates.

---

## Scenario 7: Donut Responsiveness

1. Open Reviews page on desktop (1920px)
2. **Verify**: Donut fills available width (not tiny 160px square)
3. Resize to mobile (375px)
4. **Verify**: Donut scales down proportionally
5. Repeat for AbandonedCarts page

**Pass criteria**: Donuts scale with container.

---

## Scenario 8: Margin Clipping

1. Open Dashboard
2. **Verify**: YAxis labels on revenue chart are fully visible (not cut off at left edge)
3. Check orders by day chart — same verification
4. Navigate to Inventario — check stock chart YAxis labels

**Pass criteria**: No text clipping on any chart axis.

---

## Scenario 9: Desktop Regression

1. Open Dashboard at 1920×1080
2. **Verify**: Charts fill their grid containers properly
3. **Verify**: Collapsed charts don't leave ugly gaps
4. **Verify**: All charts still interactive (tooltips work on hover)

**Pass criteria**: Desktop layout unchanged in quality.

---

## Sign-off

| Scenario                 | Result | Device | Date |
| ------------------------ | ------ | ------ | ---- |
| 1. Dark mode all charts  |        |        |      |
| 2. Light mode all charts |        |        |      |
| 3. Collapse Dashboard    |        |        |      |
| 4. Collapse other pages  |        |        |      |
| 5. Donut legends         |        |        |      |
| 6. Chart titles          |        |        |      |
| 7. Donut responsiveness  |        |        |      |
| 8. Margin clipping       |        |        |      |
| 9. Desktop regression    |        |        |      |
