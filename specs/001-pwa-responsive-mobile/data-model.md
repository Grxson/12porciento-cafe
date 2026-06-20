# Data Model: PWA Responsive Mobile Fixes

This feature is purely UI/CSS — no new database entities or API changes. This document defines the UI component contracts and responsive design system decisions.

## Responsive Breakpoints

| Name | Min Width | Use |
|------|-----------|-----|
| (default) | 0px | Mobile-first base styles |
| `sm` | 640px | Larger phones, small tablets |
| `md` | 768px | Tablet — BottomNav hidden, desktop Navbar shown |
| `lg` | 1024px | Desktop layouts |
| `xl` | 1280px | Wide desktop |

**Key breakpoint**: `md` (768px) is the BottomNav/Navbar switch point. All mobile-specific fixes apply below `md`.

## Safe Area Zones

| Zone | CSS Variable | Applied To |
|------|-------------|------------|
| Bottom | `env(safe-area-inset-bottom)` | BottomNav, CartDrawer footer, RecipeLiveMode bottom panel, BrewLogForm, ConfirmDialog |
| Top | `env(safe-area-inset-top)` | Not needed — Navbar transparent + `viewport-fit=cover` covers it |
| Left/Right | `env(safe-area-inset-left/right)` | Not needed — portrait layout only on mobile |

## Touch Target Standards

| Element Type | Minimum Size | Implementation |
|-------------|-------------|----------------|
| Primary button | 48×48px | `min-h-[48px]` + `w-full` or `min-w-[48px]` |
| Icon button | 44×44px | `w-11 h-11` (2.75rem) with `flex items-center justify-center` |
| Nav tab (BottomNav) | 48px height | `min-h-[48px]` |
| Quantity +/- button | 44×44px | `w-11 h-11` (upgrade from `w-6 h-6`) |
| Dialog button | 44px height | `py-3 min-h-[44px]` |

## Component State Transitions

### CartDrawer (mobile)
```
closed → opening → open → (scroll items) → closing → closed
         [spring animation: x: 100%→0]          [spring animation: x: 0→100%]
```
Footer section must clear safe-area-inset-bottom at all states.

### RecipeLiveMode bottom panel
```
hidden → visible (when showQuickPanel=true)
fixed bottom-0 + paddingBottom: env(safe-area-inset-bottom)
```

### Navbar mobile menu
```
closed → open (spring x: 100%→0, max-width: min(18rem, calc(100vw-2rem)))
backdrop: opacity 0→1
```

## Modified Files Index

| File | Change Type | Priority |
|------|-------------|----------|
| `client/src/index.css` | Add global touch-action, overscroll-behavior | P1 |
| `client/src/components/BottomNav.tsx` | Fix touch target size | P1 |
| `client/src/components/CartDrawer.tsx` | Fix safe-area + touch targets | P1 |
| `client/src/components/recipes/RecipeLiveMode.tsx` | Fix safe-area on bottom panel | P1 |
| `client/src/components/BrewLogForm.tsx` | Fix modal safe-area + dvh height | P2 |
| `client/src/components/ConfirmDialog.tsx` | Fix safe-area + touch targets | P2 |
| `client/src/components/Navbar.tsx` | Fix mobile menu width | P2 |
| `client/src/pages/Cart.tsx` | Fix sticky top offset | P2 |
| `client/src/components/InstallPrompt.tsx` | Fix touch target size | P3 |
