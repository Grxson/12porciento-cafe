# UI Contracts: Component Theme Compliance

## UpdateNotificationModal

**Acceptance Criteria**:
- Displays centered modal with semi-transparent backdrop
- Shows title "Actualización disponible"
- Shows message: "Hemos detectado una nueva versión. ¿Deseas actualizar?" (or custom message)
- Has two buttons: "Actualizar" (primary gold), "Ahora no" (secondary)
- Button touch targets ≥44×44 pixels
- Respects dark/light theme via Tailwind dark: classes
- Non-dismissible by backdrop click (user must choose a button)
- Smooth fade-in animation
- Modal height appropriate for mobile (max-height 90vh or dynamic viewport height)

**Theme Compliance**:
- Light mode: white/coffee-100 background, coffee-900 text, gold-500 button
- Dark mode: coffee-900 background, cream text, gold-500 button
- All text meets WCAG AA 4.5:1 contrast ratio on both light and dark

**Props**:
```typescript
{
  open: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
  message?: string;
}
```

---

## UpdateNotificationToast

**Acceptance Criteria**:
- Shows brief notification at bottom-right (or configurable position)
- Message: "Hemos actualizado el diseño de la app ✨" (or custom)
- Auto-dismisses after 4 seconds
- Doesn't block user interaction
- Smooth fade-in and fade-out animations
- Positioned above other content (z-index appropriate)
- Respects dark/light theme

**Theme Compliance**:
- Light mode: coffee-100 background, coffee-900 text, gold accent
- Dark mode: coffee-900 background, cream text, gold accent
- All text readable on chosen background

**Props**:
```typescript
{
  visible: boolean;
  message?: string;
  duration?: number; // default 4000
  onDismiss: () => void;
}
```

---

## ThemeContext (Hook: useClientTheme)

**Acceptance Criteria**:
- Provides `dark: boolean` (true = dark mode active)
- Provides `toggle: () => void` (switch theme)
- Persists preference to localStorage('theme-preference')
- Applies `.dark` class to `document.documentElement`
- On app load, reads from localStorage immediately (no FOUC)
- If no stored preference, uses system preference (prefers-color-scheme media query)
- Theme toggle responds in < 50ms

**Export interface**:
```typescript
{
  dark: boolean;
  toggle: () => void;
  preference: 'light' | 'dark' | 'system';
  setPreference: (pref: 'light' | 'dark' | 'system') => void;
}
```

**Validation**:
- localStorage key `theme-preference` contains 'light', 'dark', or 'system'
- document.documentElement.classList contains 'dark' only in dark mode

---

## Global CSS Classes Theme Compliance

### Button Classes

**`.btn-primary`**
- Light mode: gold-500 bg, coffee-950 text, gold-400 hover
- Dark mode: gold-500 bg (works same), coffee-950 text (works same)
- ✅ Already compatible

**`.btn-outline`**
- Light mode: coffee-800 border, coffee-900 text, coffee-900 bg on hover
- Dark mode: coffee-200 border, cream text, coffee-200 bg on hover (via `dark:` classes)
- ✅ Has dark: variants

**`.btn-ghost`**
- Light mode: text-coffee-400, hover text-cream
- ❌ Missing light-mode hover color variant
- Fix: Add light mode color classes or provide dedicated `.btn-ghost-light` variant

### Input Classes

**`.input-dark`**
- Fixed dark background (coffee-800)
- ✅ Works as intended for dark-only contexts (admin)

**`.input-light`**
- Fixed light background (white)
- ✅ Works as intended for light-only contexts

**Inline form inputs (preferred pattern)**:
- Format: `bg-white dark:bg-coffee-800 border border-coffee-300 dark:border-coffee-700`
- ✅ Properly supports both modes

### Section/Page Classes

**`.section-title`**
- Light mode: text-coffee-900
- Dark mode: text-cream (via `dark:`)
- ✅ Fixed (was hardcoded text-cream)

**`.page-header`**
- Light mode: bg-coffee-100 border-coffee-200
- Dark mode: bg-coffee-900 border-coffee-800 (via `dark:`)
- ✅ Fixed (was hardcoded bg-coffee-900)

### Card Classes

**`.card-dark`**
- bg-coffee-800 border-coffee-700
- ✅ Works for dark cards in both light and dark modes

**`.card-light`**
- bg-white border-coffee-200
- ✅ Works for light cards in both light and dark modes

### Badge Classes

**`.sca-badge`**
- bg-gold-500/10 border-gold-500/25 text-gold-500
- ✅ Works on both light and dark backgrounds (gold is readable)

**`.limited-badge`**
- bg-red-950/60 border-red-500/30 text-red-400
- ✅ Works on both backgrounds (opacity and colors chosen for visibility)

---

## Component-Level Compliance (Sample Components)

### TestimonialsSlider

**Current issue**: `text-cream` (hardcoded light-only) on testimonial names

**Fix required**:
```jsx
// Before
<p className="text-cream font-medium text-sm">{t.name}</p>

// After
<p className="text-cream dark:text-coffee-900 font-medium text-sm">{t.name}</p>
// OR
<p className="text-coffee-900 dark:text-cream font-medium text-sm">{t.name}</p>
// (Choose based on background context)
```

**Acceptance Criteria**:
- Name text readable on both light and dark backgrounds
- Contrast ratio ≥4.5:1 (WCAG AA)

---

### CoffeeTimeline

**Current issue**: `text-coffee-900` (hardcoded light-only) on timeline headers and text

**Fix required**:
```jsx
// Before
<h3 className="font-serif text-xl text-coffee-900">Del origen a tu taza</h3>

// After
<h3 className="font-serif text-xl text-coffee-900 dark:text-cream">Del origen a tu taza</h3>
```

**Acceptance Criteria**:
- Timeline headers and content readable in both light and dark modes
- Sufficient contrast on both backgrounds

---

### CartDrawer

**Current state**: Uses proper dark: variants for background and text
- `bg-coffee-50 dark:bg-coffee-800` ✅
- `border-coffee-200 dark:border-coffee-700` ✅
- Text colors balanced ✅

**Acceptance Criteria**: Already compliant (no changes needed)

---

### BrewLogForm

**Current state**: Uses proper dark: variants throughout
- Inputs: `bg-white dark:bg-coffee-800` ✅
- Labels: `text-coffee-500 dark:text-coffee-400` ✅
- Borders: `border-coffee-200 dark:border-coffee-700` ✅

**Acceptance Criteria**: Already compliant (no changes needed)

---

## Contrast Validation

All text/background pairs must pass WCAG AA (minimum 4.5:1 ratio).

**Examples**:

| Light Background | Text | Ratio | Status |
|-----------------|------|-------|--------|
| coffee-50 | coffee-900 | ~12:1 | ✅ Pass |
| coffee-100 | coffee-900 | ~10:1 | ✅ Pass |
| white | coffee-600 | ~8:1 | ✅ Pass |
| gold-500 | coffee-950 | ~7:1 | ✅ Pass |

| Dark Background | Text | Ratio | Status |
|-----------------|------|-------|--------|
| coffee-950 | cream | ~10:1 | ✅ Pass |
| coffee-900 | cream | ~11:1 | ✅ Pass |
| coffee-800 | cream | ~8:1 | ✅ Pass |
| gold-500 | coffee-950 | ~7:1 | ✅ Pass |

(Ratios estimated based on Tailwind color values; verify with WCAG checker tool)

---

## Implementation Order

1. **Global CSS** (index.css): Fix body, ::selection, .section-title, .page-header
2. **Button classes** (index.css): Fix .btn-ghost if needed
3. **User-facing components**: TestimonialsSlider, CoffeeTimeline, CoffeePicker
4. **Page components**: Home, Shop, Gallery, Recipes, Cart, Barista
5. **Already compliant**: CartDrawer, BrewLogForm, BottomNav (no changes needed)
6. **Admin components** (review): RecipeEditor, StepEditor (confirm dark-only is intentional)

---

## Testing Checklist

For each component:

- [ ] Light mode: render with light background, verify text readable
- [ ] Dark mode: render with dark background, verify text readable
- [ ] Contrast checker: WCAG AA 4.5:1 minimum on both
- [ ] Theme toggle: switching themes updates colors (no hardcoded colors override)
- [ ] DevTools inspect: no inline styles with hardcoded colors
- [ ] Mobile: theme applies correctly on small screens (320px)
