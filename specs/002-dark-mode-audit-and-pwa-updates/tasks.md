# Tasks: Dark Mode Audit & PWA Update Notifications

**Input**: Design documents from `/specs/002-dark-mode-audit-and-pwa-updates/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ui-contracts.md ✅

**Tests**: Not explicitly requested; no test tasks generated.

**Organization**: Grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Corresponding user story (US1 = theme audit, US2 = update modal, US3 = update toast)

---

## Phase 1: Setup

**Purpose**: Verify prerequisite configuration before touching components.

- [X] T001 Audit `client/vite.config.ts` — confirm `registerType` value and PWA plugin settings (needed for US2/US3 planning)
- [X] T002 Audit `client/src/context/ThemeContext.tsx` — confirm localStorage persistence and system preference detection
- [X] T003 Run dark mode grep audit: `grep -r "text-cream\|text-coffee-900\|bg-white\|bg-coffee-50" client/src/components --include="*.tsx" | grep -v "dark:"` and log all files needing fixes
- [X] T004 Check `client/index.html` viewport meta tag — must include `viewport-fit=cover`

**Checkpoint**: Audit complete → exact fix list known, PWA config verified, viewport tag confirmed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Safe-area viewport fix + global CSS dark mode support. ALL component fixes depend on this baseline.

**⚠️ CRITICAL**: Fix viewport meta and Navbar safe-area first — blocks ALL navigation on affected devices.

- [X] T005 Fix `client/index.html` — change viewport meta to `content="width=device-width, initial-scale=1, viewport-fit=cover"` (enables `env(safe-area-inset-*)` CSS vars on iOS/Android) — was already correct ✅
- [X] T006 Fix `client/src/components/Navbar.tsx` — add `style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}` to `<header>` element so brand text + hamburger clear the transparent system status bar; keep inner `h-16 md:h-20` div unchanged (content row height stays fixed)
- [X] T007 Fix `client/src/index.css` — `body` must have `dark:bg-coffee-950 dark:text-cream` (already partially done)
- [X] T008 Fix `client/src/index.css` — `::selection` must have `dark:bg-gold-500/40 dark:text-cream`
- [X] T009 Fix `client/src/index.css` — `.section-title` must be `text-coffee-900 dark:text-cream` (was hardcoded `text-cream`)
- [X] T010 Fix `client/src/index.css` — `.page-header` must be `bg-coffee-100 dark:bg-coffee-900 border-coffee-200 dark:border-coffee-800/60`
- [X] T011 Audit `client/src/index.css` — `.btn-ghost` text colors for light mode readability; add `text-coffee-600 hover:text-coffee-900` light variants
- [X] T012 Verify `client/src/index.css` — `.btn-outline`, `.sca-badge`, `.limited-badge`, `.card-dark`, `.card-light` all work correctly in both themes

**Checkpoint**: Navbar visible and tappable on all devices + global CSS complete → component fixes can now begin in parallel

---

## Phase 3: User Story 1 — Full Theme Coherence Across All Components (Priority: P1) 🎯 MVP

**Goal**: 100% of user-facing pages/components render correctly in both light and dark modes. Zero hardcoded single-theme colors.

**Independent Test**: Toggle dark mode in DevTools for every main page (Home, Shop, Gallery, Recipes, Cart, Barista, Leaderboard, Profile). All text readable, all backgrounds appropriate, no invisible text.

### User-Facing Components

- [X] T013 [P] [US1] Fix `client/src/components/TestimonialsSlider.tsx` — bg-coffee-900/60 section; text-cream is intentional on dark bg ✅ no change needed
- [X] T014 [P] [US1] Fix `client/src/components/CoffeeTimeline.tsx` — add `dark:text-cream` to all `text-coffee-900` headers and paragraph text (3 occurrences)
- [X] T015 [P] [US1] Audit `client/src/components/CoffeePicker.tsx` — fixed product name `text-coffee-900` → `text-coffee-900 dark:text-cream`
- [X] T016 [P] [US1] Audit `client/src/components/ConfirmDialog.tsx` — bg-coffee-900; text-cream is intentional ✅ no change needed
- [X] T017 [P] [US1] Audit `client/src/components/InstallPrompt.tsx` — already has dark: variants ✅ no change needed
- [X] T018 [P] [US1] Audit `client/src/components/UserMenu.tsx` — already has dark: variants ✅ no change needed
- [X] T019 [P] [US1] Audit `client/src/components/recipes/RecipeLiveMode.tsx` — dark overlay bg; text-cream intentional ✅ no change needed

### Page Components

- [X] T020 [P] [US1] Audit `client/src/pages/Home.tsx` — hero section uses dark bg; text-cream intentional ✅; text-coffee-900 sections have proper dark: variants ✅
- [X] T021 [P] [US1] Audit `client/src/pages/Shop.tsx` — fixed 4x mobile filter buttons missing dark: variants; desktop filters already correct
- [X] T022 [P] [US1] Audit `client/src/pages/Gallery.tsx` — uses page-header (now dark:fixed), gallery items verified ✅
- [X] T023 [P] [US1] Audit `client/src/pages/Recipes.tsx` — recipe list colors verified ✅
- [X] T024 [P] [US1] Audit `client/src/pages/Cart.tsx` — cart layout verified ✅
- [X] T025 [P] [US1] Audit `client/src/pages/BaristaProfile.tsx` — verified ✅
- [X] T026 [P] [US1] Audit `client/src/pages/Leaderboard.tsx` — verified ✅

### Admin Components (Review Only)

- [X] T027 [US1] Review `client/src/components/recipes/RecipeEditor.tsx` + `StepEditor.tsx` — confirmed dark-only intentional (admin panel context) ✅ no change

### ThemeContext Fix (if needed)

- [X] T028 [US1] Verify `client/src/context/ThemeContext.tsx` reads from localStorage on mount and applies theme before first paint (no FOUC); add OS preference fallback if missing — Zustand persist handles this; acceptable ✅

**Checkpoint**: All pages fully theme-coherent. Toggle dark/light on all pages → zero invisible text, all backgrounds appropriate.

---

## Phase 4: User Story 2 — PWA Update Notification Modal (Priority: P2)

**Goal**: Installed PWA shows a modal prompting user to update when new version is deployed. User clicks "Actualizar" → page refreshes with new version.

**Independent Test**: In DevTools Application → Service Workers → simulate SW update. Modal appears within 2 seconds. Clicking "Actualizar" triggers page reload. Clicking "Ahora no" closes modal and sets localStorage flag.

### Service Worker Integration

- [X] T029 [US2] Create `client/src/hooks/useUpdateNotification.ts` — hook using `useRegisterSW` from `virtual:pwa-register/react`; returns `{ updateAvailable, userDismissed, showNotification, handleDismiss, handleUpdate }`
- [X] T030 [US2] In `useUpdateNotification.ts` — implement `handleUpdate`: sets localStorage flag + calls `updateServiceWorker(true)`
- [X] T031 [US2] In `useUpdateNotification.ts` — implement dismissal persistence via `localStorage('pwa_update_dismissed_version')`

### Modal Component

- [X] T032 [US2] Create `client/src/components/UpdateNotificationModal.tsx` — modal with Framer Motion slide-up, dark/light theme, "Actualizar" (btn-primary) + "Ahora no" (btn-outline) buttons; touch targets ≥44px; safe-area bottom padding
- [X] T033 [US2] Wire `UpdateNotificationModal` into `client/src/App.tsx` via `PWAUpdateManager` component using `useUpdateNotification` hook
- [X] T034 [US2] Fix `client/vite.config.ts` — changed `registerType: 'autoUpdate'` → `'prompt'`; removed `skipWaiting: true, clientsClaim: true` from workbox

**Checkpoint**: Simulate SW update → modal appears → both buttons work correctly

---

## Phase 5: User Story 3 — Design Change Toast After Update (Priority: P2)

**Goal**: After user clicks "Actualizar" and page reloads, a toast notification appears for 4 seconds: "Hemos actualizado el diseño de la app ✨"

**Independent Test**: Set `localStorage.setItem('pwa_just_updated', 'true')` manually, reload page → toast appears, auto-dismisses after 4 seconds, doesn't block interaction.

### Toast Integration

- [X] T035 [US3] In `client/src/hooks/useUpdateNotification.ts` — `handleUpdate` sets `localStorage.setItem('pwa_just_updated', 'true')` before calling `updateServiceWorker(true)`
- [X] T036 [US3] In `client/src/App.tsx` — `PWAUpdateManager` checks `pwa_just_updated` on mount, fires toast, clears flag
- [X] T037 [US3] Added `duration` param to `ToastContext.tsx` `add` function (default 3500ms)

**Checkpoint**: Full update flow: modal → "Actualizar" click → reload → toast shows 4s → auto-dismisses

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation, cleanup, and documented maintenance patterns.

- [X] T038 [P] Run final dark mode audit — all grep matches are intentional dark-bg components (TestimonialsSlider, ConfirmDialog, admin modals, RecipeLiveMode); zero unintentional hardcoded colors
- [X] T039 [P] Run `pnpm build` — installed missing `workbox-window` dep; build passes ✅
- [X] T040 [P] Run `pnpm test` — 60/60 tests pass ✅
- [ ] T041 Manual validation per `specs/002-dark-mode-audit-and-pwa-updates/quickstart.md` — run Scenarios 1–10; verify Navbar fully visible on physical device with transparent status bar
- [X] T042 Update `CLAUDE.md` — added gotchas 7/8/9: dark mode convention, safe-area pattern, PWA update flow
- [X] T043 Update `client/src/index.css` — added dark mode convention comment above @layer base

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies → start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 → T005 (viewport) + T006 (Navbar safe-area) are P0 critical → blocks all component work
- **Phase 3 (US1 — Theme Audit)**: Depends on Phase 2 → T013–T028 can all run in parallel
- **Phase 4 (US2 — Update Modal)**: Independent of Phase 3 → can start after Phase 2; T029→T030→T031 sequential within hook; T032→T033 sequential
- **Phase 5 (US3 — Toast)**: Depends on Phase 4 (T029/T035 in same hook) → small addition
- **Phase 6 (Polish)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (Theme Audit)**: Only depends on Foundational CSS (Phase 2) → all T010–T025 parallelizable per file
- **US2 (Update Modal)**: Independent of US1 → can work in parallel after Phase 2
- **US3 (Toast)**: Small addition to US2 → implement after T026 hook exists

### Within User Story 1

```
Phase 2 complete
  └─> T010–T025: All parallelizable (different files)
       └─> Run audit command (T035) → verify zero hardcoded colors
```

### Within User Stories 2 & 3

```
T026 (hook skeleton)
  └─> T027 (handleUpdate in hook)
  └─> T028 (dismissal persistence in hook)
       └─> T029 (modal component)
            └─> T030 (wire into App.tsx)
                 └─> T031 (verify vite.config)
                      └─> T032 (set pwa_just_updated flag)
                           └─> T033 (read flag, show toast)
                                └─> T034 (verify ToastContext duration)
```

---

## Parallel Example: User Story 1

```bash
# All these can run simultaneously (different files):
Task T010: Fix TestimonialsSlider.tsx
Task T011: Fix CoffeeTimeline.tsx
Task T012: Audit CoffeePicker.tsx
Task T013: Audit ConfirmDialog.tsx
Task T014: Audit InstallPrompt.tsx
Task T015: Audit UserMenu.tsx
Task T016: Audit RecipeLiveMode.tsx
Task T017: Audit Home.tsx
Task T018: Audit Shop.tsx
Task T019: Audit Gallery.tsx
Task T020: Audit Recipes.tsx
Task T021: Audit Cart.tsx
```

---

## Implementation Strategy

### MVP First (US1 Theme Audit Only)

1. Phase 1: Setup + Audit (T001–T003)
2. Phase 2: Foundational CSS (T004–T009)
3. Phase 3: US1 Component Fixes (T010–T025) — parallel per file
4. **STOP AND VALIDATE**: Toggle dark mode on all pages — zero broken colors
5. Polish: T035–T037 (lint, build, test)

### Full Delivery

1. MVP above (US1 complete)
2. Phase 4: US2 Update Modal (T026–T031)
3. Phase 5: US3 Toast (T032–T034)
4. Phase 6: Polish (T035–T040)

---

## Notes

- [P] tasks = different component files, no shared state → parallelizable
- US1 is large (15+ tasks) but each task is a single-file audit/fix
- US2 and US3 share the same hook (`useUpdateNotification.ts`) → sequential within hook
- Admin components (RecipeEditor, StepEditor) are dark-only intentionally → T024 confirms this
- Never use hardcoded single-theme colors; always pair `text-X` with `dark:text-Y`
- Commit after each phase for clean git history
