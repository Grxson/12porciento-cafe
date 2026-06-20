# Implementation Plan: Dark Mode Audit & PWA Update Notifications

**Branch**: `002-dark-mode-audit-and-pwa-updates` | **Date**: 2026-06-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-dark-mode-audit-and-pwa-updates/spec.md`

## Summary

Two-phase implementation: (1) Audit and fix all dark mode inconsistencies across React components and global CSS to ensure 100% theme coherence. Components to audit: ~25 user-facing components, global CSS layer (index.css), form inputs, buttons, cards, page headers. (2) Implement PWA update notification system: detect service worker updates, display modal prompting user to refresh, show toast after update. New components: `UpdateNotificationModal`, service worker hook integration, localStorage-based persistence.

## Technical Context

**Language/Version**: TypeScript 5.x, React 19

**Primary Dependencies**: Tailwind CSS (dark mode via `class` selector), Framer Motion, Shadcn/ui, React Context API

**Storage**: localStorage for theme preference and update notification state

**Service Worker**: Existing Vite PWA plugin (`vite-plugin-pwa`); extends with update detection

**Testing**: Vitest + React Testing Library

**Target Platform**: iOS 14+ Safari PWA, Android 8+ Chrome PWA, desktop browsers (light/dark mode)

**Project Type**: React PWA — client-side UI + service worker updates

**Performance Goals**: Theme toggle < 50ms, update notification appears within 2s of app load

**Constraints**: No new npm dependencies; use existing Tailwind/CSS patterns; no breaking changes to color palette; PWA update logic must work offline (no external API calls)

**Scale/Scope**: ~25 component files to audit, ~8-12 CSS fixes, 3 new components (UpdateNotificationModal, UpdateNotificationToast, custom hook), service worker integration

## Constitution Check

No project constitution defined. No gate violations. Proceeding.

## Project Structure

### Documentation (this feature)

```text
specs/002-dark-mode-audit-and-pwa-updates/
├── plan.md                      # This file
├── spec.md                       # Phase 0 — feature requirements
├── research.md                   # Phase 0 — dark mode audit findings, PWA update patterns
├── data-model.md                # Phase 1 — UpdateNotification entity, component contracts
├── quickstart.md                # Phase 1 — validation scenarios
├── contracts/
│   └── ui-contracts.md          # Phase 1 — component theme acceptance criteria
└── tasks.md                      # Phase 2 — /speckit-tasks output
```

### Source Code Changes

```text
client/
├── src/
│   ├── index.css                               # FIX: body, ::selection, section-title, page-header dark variants
│   ├── components/
│   │   ├── UpdateNotificationModal.tsx         # NEW: update prompt modal
│   │   ├── UpdateNotificationToast.tsx         # NEW: toast after update
│   │   ├── Navbar.tsx                          # FIX: safe-area-inset-top (content hidden under transparent status bar on Android/iOS) + dark: color audit
│   │   ├── BottomNav.tsx                       # AUDIT: text colors dark-mode ready
│   │   ├── CartDrawer.tsx                      # AUDIT: backgrounds, borders, text dark-ready
│   │   ├── BrewLogForm.tsx                     # AUDIT: inputs, labels, errors dark-ready
│   │   ├── ConfirmDialog.tsx                   # AUDIT: text, buttons dark-ready
│   │   ├── InstallPrompt.tsx                   # AUDIT: button, text dark-ready
│   │   ├── TestimonialsSlider.tsx              # FIX: hardcoded text-cream → add dark: variant
│   │   ├── CoffeeTimeline.tsx                  # FIX: hardcoded text-coffee-900 needs dark:text-cream
│   │   ├── CoffeePicker.tsx                    # AUDIT: label, badge colors dark-ready
│   │   ├── UserMenu.tsx                        # AUDIT: dropdown text/bg colors
│   │   ├── recipes/
│   │   │   ├── RecipeEditor.tsx                # FIX: hardcoded bg-coffee-800, text-cream → allow light mode
│   │   │   ├── StepEditor.tsx                  # FIX: hardcoded dark colors in admin editor
│   │   │   ├── RecipeLiveMode.tsx              # AUDIT: step display colors
│   │   │   └── RecipeCard.tsx                  # AUDIT: card background/text colors
│   │   └── ...
│   ├── hooks/
│   │   └── useUpdateNotification.ts            # NEW: detects service worker updates
│   ├── context/
│   │   └── ThemeContext.ts                     # AUDIT: ensure persistence in localStorage
│   └── pages/
│       ├── Home.tsx                            # AUDIT: section backgrounds, text
│       ├── Shop.tsx                            # AUDIT: product cards, page header
│       ├── Gallery.tsx                         # AUDIT: gallery items, page header
│       ├── Recipes.tsx                         # AUDIT: recipe list layout colors
│       ├── Cart.tsx                            # AUDIT: checkout section colors
│       └── ...
├── vite.config.ts                              # Verify PWA plugin config
└── service-worker configs (via vite-plugin-pwa)
```

## Navbar Safe-Area Fix (Critical — Blocks Navigation)

**Problem confirmed via user screenshots**: Navbar `fixed top-0` renders content under the transparent system status bar on Android and iOS. Brand text and hamburger menu icon are unreachable.

**Root cause**:
- `client/index.html` missing `viewport-fit=cover` in viewport meta tag
- `Navbar` `<header>` missing `padding-top: env(safe-area-inset-top, 0px)` inline style
- Height calculation doesn't account for safe area (`h-16 md:h-20` → must be `h-[calc(4rem+env(safe-area-inset-top,0px))]` or compensated differently)

**Fix**:
```html
<!-- client/index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```
```jsx
// Navbar.tsx <header> element
<header
  style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
  className="fixed top-0 left-0 right-0 z-50 ..."
>
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
```
The `h-16 md:h-20` applies to the inner div — content row height stays fixed. The `paddingTop` pushes content down below the status bar, growing the header visually.

---

## Phase 0: Outline & Research

**Unknowns to Research:**
1. Current state of dark mode support across all 25+ components (audit findings)
2. Service worker update detection pattern with Vite PWA plugin (best practices)
3. Graceful update flow for PWA (when to show modal, how to trigger refresh)
4. localStorage key naming convention and cleanup strategy

**Tasks:**
- Grep all components for hardcoded colors without `dark:` variants
- Document which color utility classes are missing dark mode support
- Research Vite PWA plugin documentation for update detection
- Document current ThemeContext implementation and persistence mechanism
- List all admin components that may need dark-mode support

**Output**: research.md with audit findings, service worker integration points, dark mode color mapping.

## Phase 1: Design & Contracts

**1. Data Model:**
- UpdateNotification entity (optional — may just use localStorage flag)
- Component color audit results (mapping of which need fixes)

**2. UI Contracts:**
- UpdateNotificationModal: props, behavior on update click, dismissal rules
- UpdateNotificationToast: auto-dismiss timing, message format
- ThemeContext: ensure dark preference persists and applies on load
- All audited components: dark mode color requirements

**3. Quickstart Validation:**
- Toggle light/dark on all 5 main pages, verify text readable
- Install PWA, trigger update via service worker, verify modal appears
- Click update button, verify page reloads with new design
- Verify toast appears post-update

**4. Agent Context Update:**
- Update CLAUDE.md with plan reference

## Phase 2: Implementation (via /speckit-tasks)

High-level groups:
- **Group A**: Global CSS fixes (index.css dark mode support)
- **Group B**: Component audit & fixes (25+ components, ensure dark: variants)
- **Group C**: UpdateNotificationModal & toast components (new)
- **Group D**: Service worker integration & update detection hook
- **Group E**: Testing & validation

## Complexity Tracking

Moderate complexity:
- Audit is large (25+ components) but mostly grep & Tailwind class additions
- Service worker integration requires understanding Vite PWA plugin
- Update flow has subtle timing (cache invalidation, page reload, toast)

No constitution violations.

## Execution Order

1. **Phase 0 research**: Complete audit, document all hardcoded colors
2. **Phase 1 design**: Create data model, contracts, quickstart
3. **Group A** (Phase 2): Global CSS dark mode fixes
4. **Group B** (Phase 2): Component fixes (batch by file/feature area)
5. **Group C** (Phase 2): New modal/toast components
6. **Group D** (Phase 2): Service worker integration
7. **Group E** (Phase 2): Testing & validation

## Definition of Done

- [ ] All 25+ audited components have dark-mode variants for colors (0 hardcoded light-only colors)
- [ ] All global CSS classes (.btn-*, .card-*, section-title, page-header) support dark mode
- [ ] Text contrast meets WCAG AA 4.5:1 in both light and dark (accessibility audit tool confirms)
- [ ] UpdateNotificationModal appears when service worker detects update
- [ ] Clicking "Actualizar" refreshes PWA to latest version (verified on test device)
- [ ] Toast notification displays 4 seconds after update
- [ ] Theme preference persists in localStorage and applies on app reload
- [ ] No FOUC or jarring style shift on theme toggle or update
- [ ] All existing tests pass (pnpm test)
- [ ] Verified on iOS 14+ Safari, Android 8+ Chrome, desktop (light/dark modes)
