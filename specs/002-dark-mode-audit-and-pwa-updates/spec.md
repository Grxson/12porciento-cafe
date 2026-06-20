# Feature Specification: Dark Mode Audit & PWA Update Notifications

**Feature Branch**: `002-dark-mode-audit-and-pwa-updates`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User requirement to audit and fix dark/light theme inconsistencies across the app, and implement a PWA update notification system to inform users of design changes.

## User Scenarios & Testing

### User Story 1 - All App Components Support Both Light and Dark Themes (Priority: P1)

Users switching between light and dark theme see consistent color schemes across all pages and components. No hardcoded colors that don't adapt to theme. No text that becomes invisible due to theme mismatch.

**Why this priority**: Dark mode inconsistencies are jarring and reduce usability. Users expect theme to work everywhere.

**Independent Test**: Toggle dark mode on all pages (Home, Shop, Gallery, Recipes, Cart, Barista, Leaderboard, Profile). Verify all text readable, all backgrounds appropriate, all component colors adapt smoothly.

**Acceptance Scenarios**:

1. **Given** user in light mode, **When** navigating any page, **Then** all text has sufficient contrast against light background (WCAG AA 4.5:1 ratio)
2. **Given** user switches to dark mode, **When** viewing same page, **Then** all text has sufficient contrast against dark background (WCAG AA 4.5:1 ratio), no hardcoded light-only colors visible
3. **Given** dark mode active, **When** viewing section titles, buttons, cards, forms, badges, **Then** all elements have appropriate dark-mode variants applied
4. **Given** user on mobile with dark mode, **When** opening drawers/modals (cart, brew log, confirm dialog), **Then** modals also respect dark mode styling

---

### User Story 1b - Fix Navbar Hidden Under Transparent Status Bar (Priority: P1)

On Android and iOS devices with transparent system status bar (e.g., Android with overlay navigation, older iPhones without notch), the fixed Navbar renders its content *under* the status bar. The brand text "12% / DOCE POR CIENTO" is partially hidden and the menu icon is unreachable. Users cannot tap Navbar elements when they are behind the system HUD.

**Evidence**: Reported by user on physical Android device (screenshots provided). Status bar transparent overlay causes Navbar top content to be obscured. Menu icon (hamburger) at top-right is completely behind the HUD and unclickable.

**Root Cause**: `Navbar` uses `fixed top-0` but does not apply `padding-top: env(safe-area-inset-top, 0px)`. Also `index.html` may lack `viewport-fit=cover` required for safe area CSS variables to work on iOS.

**Why this priority**: Any user on affected device cannot access Navbar navigation. Complete blocker for affected users.

**Independent Test**: Open PWA on Android device with transparent status bar or iOS device. Verify Navbar brand text and hamburger menu icon are NOT obscured by system status bar. All Navbar elements tappable.

**Acceptance Scenarios**:

1. **Given** PWA on Android with transparent status bar, **When** app loads, **Then** Navbar brand text fully visible below system status bar (not overlapping)
2. **Given** PWA on iPhone (any model), **When** app loads, **Then** Navbar content clears notch/Dynamic Island/status bar — no element is under the system HUD
3. **Given** any device, **When** rotating to landscape, **Then** Navbar adjusts to new safe-area-inset-top value; no content hidden
4. **Given** PWA in standalone mode (installed, no browser chrome), **When** app loads, **Then** content respects full safe area including top, bottom, left, right

---

### User Story 2 - PWA Users Receive Update Notifications (Priority: P2)

When app is updated with design changes, installed PWA users see a prominent notification modal instructing them to update. Modal is dismissible. Notification repeats on app reload if not yet updated.

**Why this priority**: Design changes require users to see new versions. Without notifications, cached PWA users miss updates.

**Independent Test**: Install PWA on test device. Deploy app update. Verify notification appears on next app load or after cache invalidation. Confirm user can click "Update" button to refresh and apply new changes.

**Acceptance Scenarios**:

1. **Given** PWA app is installed and has a service worker, **When** app update is deployed, **Then** user sees modal notification on next visit or app foreground event
2. **Given** update notification modal displayed, **When** user clicks "Actualizar" button, **Then** service worker skips cached version and fetches latest, page reloads with new design
3. **Given** user dismisses notification, **When** page reloaded, **Then** notification reappears (persists until user updates)
4. **Given** PWA app updated and page reloaded, **When** user is viewing app, **Then** no jarring style shift—fade or smooth transition to new design

---

### User Story 3 - Design Change Toast Notification (Priority: P2)

After PWA updates, app shows a brief toast message (e.g., "Hemos actualizado el diseño de la app ✨") to inform user of changes. Toast auto-dismisses after 4 seconds.

**Why this priority**: Provides user feedback that update was successful and explains the visual change they're seeing.

**Independent Test**: After PWA update, verify toast appears, displays appropriate message, and dismisses automatically without blocking interaction.

**Acceptance Scenarios**:

1. **Given** user refreshes PWA with updated design, **When** page loads, **Then** toast notification appears briefly (4sec) showing design update message
2. **Given** toast displayed, **When** user continues interacting with app, **Then** toast doesn't block content, auto-dismisses cleanly
3. **Given** multiple updates in succession, **When** each triggers notification, **Then** toasts stack or queue appropriately (don't overlap excessively)

---

### Edge Cases

- User has browser cache disabled—should still see update notification
- User on very slow connection—modal should not timeout, allow them time to click update
- User has dark mode forced by OS but never explicitly toggled in-app—dark theme should activate automatically
- PWA in standalone mode vs browser tab—both should respect OS/user theme preference
- Notification appears on background tab—should still show when tab comes to foreground

## Requirements

### Functional Requirements

- **FR-001**: All React components MUST have dark-mode variants via Tailwind `dark:` prefix for all color classes
- **FR-002**: All CSS utility classes (btn-*, card-*, section-title, page-header, etc.) MUST support both light and dark modes
- **FR-003**: No component MUST have hardcoded light-only or dark-only colors (e.g., `text-cream` without `dark:` variant where applicable)
- **FR-004**: Text contrast MUST meet WCAG AA standard (4.5:1 ratio) in both light and dark modes
- **FR-005**: App MUST detect PWA updates (service worker new version available) and prompt user to refresh
- **FR-006**: Update notification modal MUST be prominently displayed and not dismissible except by updating
- **FR-007**: Clicking "Actualizar" button MUST skip cache, fetch latest assets, and reload page
- **FR-008**: After update, toast notification MUST display (auto-dismiss after 4 seconds) with "Hemos actualizado el diseño de la app ✨"
- **FR-009**: Notification MUST persist across page reloads until user updates (localStorage flag or service worker cache version check)
- **FR-010**: Dark/light theme preference MUST persist in localStorage and apply on app launch

### Key Entities

- **Theme Context**: Global React context tracking light/dark mode, toggles between states
- **Service Worker**: Detects new app version, signals PWA to update
- **Update Notification Modal**: UI component prompting user to refresh and update
- **Toast Notification**: Brief feedback message after update
- **CSS Variables & Tailwind Config**: Dark mode color mappings (coffee-*, gold-*, etc.)
- **Component Color Audit**: Inventory of all hardcoded colors and their theme applicability

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of user-facing pages (Home, Shop, Gallery, Recipes, Cart, Barista, etc.) render correctly in both light and dark modes
- **SC-002**: 0 hardcoded light-only or dark-only colors in component className attributes (audit via grep/linting)
- **SC-003**: All text meets WCAG AA 4.5:1 contrast ratio in both light and dark modes (verified via accessibility audit tool)
- **SC-004**: PWA update notification appears on next visit after app deployment (100% of test devices)
- **SC-005**: User clicking "Actualizar" successfully refreshes PWA to latest version (100% of test installations)
- **SC-006**: Toast notification displays for 4 seconds post-update and auto-dismisses without breaking interaction (100% of test cases)
- **SC-007**: No visual style shift or FOUC (flash of unstyled content) on design update (smooth fade or transition)

## Assumptions

- **Theme storage**: localStorage or similar persists user theme preference across sessions
- **Service worker**: PWA service worker is configured and working (existing setup in codebase)
- **Tailwind dark mode**: Tailwind configured with `mode: 'class'` in tailwind.config.js (or selector-based), allowing `.dark` class toggle
- **Component library**: Shadcn/ui components already support dark mode via Tailwind; custom components need audit
- **No breaking changes**: Fixes will use existing color palette (coffee-*, gold-*, cream); no new colors added
- **Testing**: Fixes verified on both physical devices and browser DevTools dark mode simulation
- **Maintenance**: Linting rule or checklist to prevent future hardcoded-color regressions

## Non-Functional Requirements

- **Performance**: Theme toggle MUST respond < 50ms (instant visual switch)
- **Accessibility**: All text/background pairs MUST pass WCAG AA contrast checker
- **Compatibility**: Dark mode MUST work on iOS 14+, Android 8+, modern browsers (Chrome, Safari, Firefox)
- **PWA**: Update notification MUST work offline (cached modal, no external API calls required)
