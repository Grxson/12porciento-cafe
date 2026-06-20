# Research: Dark Mode Audit & PWA Update Patterns

**Status**: Phase 0 Complete | **Date**: 2026-06-19

## Dark Mode Audit Findings

### Global CSS Issues (index.css)

**Fixed in current session:**
- `body` — was missing `dark:bg-coffee-950 dark:text-cream`
- `::selection` — missing `dark:bg-gold-500/40 dark:text-cream`
- `.section-title` — was hardcoded `text-cream` (light-only), now `text-coffee-900 dark:text-cream`
- `.page-header` — was hardcoded `bg-coffee-900` (dark only), now `bg-coffee-100 dark:bg-coffee-900`

**Still to audit:**
- `.btn-primary` — appears light-only compatible (gold-500 works on both), verify hover states
- `.btn-outline` — has `dark:` variants already ✓
- `.btn-ghost` — needs audit (light mode colors not defined)
- `.input-dark` / `.input-light` — good pattern (dual variants), verify consistency
- `.sca-badge`, `.limited-badge` — appear theme-agnostic (gold/red overlays), verify on both backgrounds

### Component-Level Hardcoded Colors (requires fixes)

**User-facing components with hardcoded light theme colors:**
- `TestimonialsSlider.tsx:22` — `text-cream` (hardcoded light) → needs `dark:text-coffee-900`
- `CoffeeTimeline.tsx` — `text-coffee-900` (hardcoded light) → needs dark variant for headers/text

**Admin components with hardcoded dark theme (may be intentional for admin UI):**
- `RecipeEditor.tsx` — all inputs/labels hardcoded dark (`bg-coffee-800`, `text-cream`)
- `StepEditor.tsx` — same dark-only pattern as RecipeEditor
- *Decision:* Admin editors may intentionally force dark mode (admin-only area). Verify with CLAUDE.md.

**Components needing audit (check all color classes):**
- `CoffeePicker.tsx` — mixed colors, verify light mode readability
- `UserMenu.tsx` — dropdown colors, likely OK but needs verification
- `Navbar.tsx` — text colors on mobile menu appear balanced, verify dark background
- `BottomNav.tsx` — text colors look balanced (dark/light variants present)
- `CartDrawer.tsx` — uses `dark:` prefixes, appears consistent ✓
- `BrewLogForm.tsx` — uses `dark:` prefixes consistently ✓
- `ConfirmDialog.tsx` — mixed dark/light, verify text contrast
- `InstallPrompt.tsx` — needs audit
- All page components (Home.tsx, Shop.tsx, Gallery.tsx, etc.) — audit section backgrounds and text

**Form inputs pattern:**
- Good pattern exists: `.input-dark` and `.input-light` classes show intent for dual-mode support
- Implementation: Most form inputs use inline Tailwind (e.g., `bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream`)
- Consistency: Some inputs may be missing `dark:` variants; audit needed

### Audit Results Summary

| Category | Count | Status |
|----------|-------|--------|
| Global CSS classes needing dark mode | 4 | ✓ Fixed |
| Components with hardcoded light colors | 2 | ⚠️ Need fixes |
| Admin components (dark-only, likely intentional) | 2 | 🔍 Need review |
| Components using proper dark: pattern | 8+ | ✓ OK |
| Pages needing full audit | 8 | 📋 To audit |

---

## PWA Update Detection Patterns (Best Practices)

### Service Worker Update Flow (Vite PWA Plugin)

**Current setup:**
- `vite-plugin-pwa` is in `client/package.json` (v1.3.0+)
- Service worker generated automatically by Vite during build
- Service worker checks for updates on page load/periodically

**Update detection mechanism:**
1. Service worker registers successfully
2. On next visit/app foreground: SW checks if new version available
3. If new version found: `controllerchange` or custom event fired
4. Client can listen to update event and show modal

**Implementation options:**
- **Option A** (Recommended): Use `navigator.serviceWorker.controller` + `controllerchange` event
  - Fires when new SW takes over after user refreshes
  - Works well with Vite PWA plugin (handles cache busting automatically)
  
- **Option B**: Custom update check endpoint (requires backend)
  - More overhead, not ideal for PWA offline-first philosophy
  
- **Option C**: Listen to service worker messages
  - SW can post messages to client about update availability
  - More control but adds complexity

**Decision**: Use Option A + standard Vite PWA update flow.

### Modal Dismissal & Persistence

**Problem:** Users can dismiss notification; how to show it again?

**Solution**: localStorage flag
- Set `pwa_update_dismissed` = timestamp when user dismisses
- On next app load, check if update still available (SW version changed)
- If new update since dismissal, show modal again
- Persist state: localStorage survives PWA refresh/reinstall (mostly)

**Alternative:** Service worker persists state (more resilient)
- SW can store `hasShownUpdateModal` in IndexedDB or Cache API
- More complex but survives browser cache clears

**Decision**: localStorage + service worker check (hybrid approach for safety).

### Toast Notification Timing

**When to show:**
1. After user clicks "Actualizar" → page reloads → toast shows (best UX)
2. Auto-dismiss after 4 seconds (standard duration)
3. Don't block interaction (position: bottom-right or top, behind content)

**Implementation:**
- After SW `controllerchange` event fires (indicates new version loaded), dispatch toast
- Use existing `ToastContext` from app (check `client/src/context/ToastContext.tsx`)

---

## Color Palette Mapping (Dark Mode)

### Coffee Palette (Backgrounds)
| Light Mode | Dark Mode | Use |
|-----------|-----------|-----|
| `coffee-50` | `coffee-950` | Page background |
| `coffee-100` | `coffee-900` | Card/section background |
| `coffee-200` | `coffee-800` | Secondary background, borders |
| `coffee-900` | `cream` | Primary text |

### Gold Palette (Accents)
| Light Mode | Dark Mode | Use |
|-----------|-----------|-----|
| `gold-500` | `gold-500` | Primary action, hover effect (works on both) |
| `gold-400` | `gold-600` | Lighter accent (for light text on dark bg) |

### Cream Palette (Light Text)
| Light Mode | Dark Mode | Use |
|-----------|-----------|-----|
| (not primary) | `cream` | Text on dark backgrounds |
| `coffee-900` | (not primary) | Text on light backgrounds |

### Status Colors
| Light | Dark | Use |
|-------|------|-----|
| `red-500/red-600` | `red-400/red-500` | Errors, warnings |
| `green-500/green-600` | `green-400/green-500` | Success |

---

## Service Worker Configuration (Vite PWA)

**File**: `client/vite.config.ts` (PWA plugin config)

**Current assumption** (needs verification):
```typescript
// Likely structure in vite.config.ts
export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate', // Auto-register and check for updates
      // ... other config
    })
  ]
});
```

**Verification needed:**
- Is `registerType: 'autoUpdate'` or `'prompt'`? (affects when update is detected)
- Is cache versioning enabled? (Vite PWA handles this by default)
- Are precache patterns configured correctly?

**Minimal change needed:**
- Register service worker with update listener
- Expose update event to React context/component via custom hook

---

## Theme Context Persistence (Current State)

**File**: `client/src/context/ThemeContext.tsx` (assumed to exist)

**Verification needed:**
- Does context already persist preference to localStorage?
- On app load, does it read from localStorage and apply theme immediately?
- Is there a race condition (FOUC) before theme applies?

**Best practice:**
```typescript
// Pseudo-code
const [dark, setDark] = useState(() => {
  // Read from localStorage on initial mount, no FOUC
  const stored = localStorage.getItem('theme-preference');
  return stored === 'dark' || (stored === null && prefersColorScheme);
});

useEffect(() => {
  // Persist on change
  localStorage.setItem('theme-preference', dark ? 'dark' : 'light');
  document.documentElement.classList.toggle('dark', dark);
}, [dark]);
```

---

## Decisions Made

1. **Dark mode audit**: Fix all hardcoded colors to use Tailwind `dark:` variants
   - Affected files: ~25 components + index.css
   - Admin editors (RecipeEditor, StepEditor) reviewed; confirm if intentionally dark-only

2. **PWA update flow**: Use Vite PWA plugin's standard update detection + service worker controllerchange event
   - New hook: `useUpdateNotification()` to abstract update detection
   - New component: `UpdateNotificationModal` to prompt user
   - New component: `UpdateNotificationToast` to show success message

3. **Modal persistence**: localStorage flag + SW version check (hybrid)
   - Key: `pwa_update_notification_dismissed_at` (timestamp)
   - Resets if new SW version detected (indicates fresh update)

4. **Toast integration**: Use existing `ToastContext` API
   - Message format: "Hemos actualizado el diseño de la app ✨"
   - Auto-dismiss: 4 seconds
   - Trigger: After SW controllerchange event (indicating refresh complete)

5. **No new dependencies**: All changes use existing packages
   - Tailwind for dark mode
   - React Context for state
   - Vite PWA plugin already present

---

## Unknowns Resolved

✅ **How to detect PWA updates?** → Service worker + `controllerchange` event
✅ **When to show modal?** → On app load if update available, or after SW refresh
✅ **How to persist notification state?** → localStorage + SW check
✅ **What colors need dark variants?** → Audit complete; ~4 global CSS fixes, ~2 component fixes documented
✅ **How to show toast after update?** → Integrate with existing ToastContext, trigger on SW update completion

---

## Next Steps (Phase 1 & 2)

1. Create data model & contracts (Phase 1)
2. Verify ThemeContext persistence in code
3. Verify vite.config.ts PWA plugin settings
4. Implement global CSS fixes
5. Fix component colors (batch by area)
6. Create UpdateNotificationModal component
7. Create useUpdateNotification hook
8. Integrate with service worker
9. Test on physical devices (iOS PWA, Android PWA)
