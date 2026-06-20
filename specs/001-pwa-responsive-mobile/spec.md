# Feature Specification: PWA Responsive Mobile Fixes

**Feature Branch**: `001-pwa-responsive-mobile`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "mejorar significativamente la forma responsiva de la PWA. Encontramos inconsistencias cuando la descargamos en un móvil. En iPhones no se ajusta a la pantalla y hay cosas que no se ven o son imposibles de dar clic."

## User Scenarios & Testing

### User Story 1 - View App on iPhone with Proper Layout (Priority: P1)

iPhone users download PWA and can view all UI elements without overflow, cropping, or horizontal scroll. All content fits within viewport. Text and buttons are appropriately sized for touch interaction.

**Why this priority**: iOS/iPhone is a critical platform. Layout breaking on iPhone prevents core functionality and creates immediate churn.

**Independent Test**: User installs PWA on iPhone, navigates all main pages (home, recipes, cart, profile, barista), verifies no horizontal overflow, all buttons clickable, no layout shifts.

**Acceptance Scenarios**:

1. **Given** PWA installed on iPhone (all viewport sizes: SE to Pro Max), **When** user navigates to home page, **Then** all content visible without horizontal scroll, viewport meta tag respected
2. **Given** PWA on mobile, **When** user interacts with buttons/inputs, **Then** touch targets ≥44px²
3. **Given** PWA on iPhone, **When** user loads pages with long content, **Then** no unexpected layout shifts or text cutoff

---

### User Story 2 - Fix Android Mobile Inconsistencies (Priority: P1)

Android users see consistent responsive UI across device brands/sizes. Layout adapts properly to notches, safe areas, and orientation changes.

**Why this priority**: Android has diverse devices. Inconsistencies hurt usability across device ecosystem.

**Independent Test**: Tested on 2+ Android devices (small/large phones), verify layout consistency, safe area handling, orientation changes work smoothly.

**Acceptance Scenarios**:

1. **Given** PWA on Android phones (various sizes), **When** navigating pages, **Then** layout matches design consistently across devices
2. **Given** mobile in landscape, **When** rotating to portrait, **Then** layout adapts smoothly, no jumps or cutoff content

---

### User Story 3 - Fix Cart Drawer and Modal Interactions (Priority: P2)

Mobile users can open/close drawers and modals without elements becoming unclickable. Modals don't overflow screen. Swipe gestures work correctly.

**Why this priority**: User reported cart/modals are unclickable—critical UX blocker.

**Independent Test**: Open cart drawer on mobile, verify all buttons clickable. Open modals (BrewLogForm, ConfirmDialog, etc.), verify form inputs accessible, close button works.

**Acceptance Scenarios**:

1. **Given** mobile user opens cart drawer, **When** drawer slides in, **Then** all items, quantities, buttons are visible and clickable
2. **Given** modal open on mobile, **When** user interacts with form fields, **Then** no overflow, keyboard doesn't hide critical elements
3. **Given** bottom navigation active, **When** modal open, **Then** modal z-index correct, backdrop doesn't interfere

---

### User Story 4 - Ensure Proper Viewport/Meta Tag Configuration (Priority: P1)

All HTML pages have correct viewport meta tag. Safe areas on notched devices (iPhone 13+, Android) respected. No zooming disabled where it shouldn't be.

**Why this priority**: Improper viewport tags cause iOS/Android rendering issues. This is foundational.

**Independent Test**: Inspect HTML head, verify viewport meta tag set correctly. Load on iPhone 14/15 Pro (notch), verify content not hidden behind notch.

**Acceptance Scenarios**:

1. **Given** PWA loads, **When** inspecting HTML head, **Then** viewport meta tag is `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
2. **Given** iPhone with notch/Dynamic Island, **When** loading app, **Then** safe areas respected, no content behind notch

---

### Edge Cases

- What happens on foldable devices (Galaxy Z Fold)?
- How does app render with system text size scaling enabled (both OS levels)?
- What if user has browser zoom active (should still work)?
- How do keyboard pop-ups on iOS/Android affect layout (modals, bottom nav)?

## Requirements

### Functional Requirements

- **FR-001**: App MUST render correctly on all mobile viewports (320px minimum width up to 1200px)
- **FR-002**: App MUST have correct viewport meta tag set (`viewport-fit=cover` for notches, `initial-scale=1`)
- **FR-003**: All interactive elements MUST have touch targets ≥44×44px on mobile
- **FR-004**: Drawers and modals MUST not overflow viewport; content MUST be scrollable if needed
- **FR-005**: App MUST handle safe areas correctly (notches, Dynamic Island on iOS; system gestures on Android)
- **FR-006**: Responsive layout MUST adapt to landscape/portrait orientation changes without layout shift
- **FR-007**: Bottom navigation MUST remain accessible and not obscured on mobile
- **FR-008**: Recipe cards, recipe steps, checkout flow MUST be fully usable on mobile screens
- **FR-009**: Cart drawer swipe gesture MUST work smoothly on mobile (if implemented)
- **FR-010**: Form inputs MUST not be covered by mobile keyboard; page MUST scroll/shift appropriately

### Key Entities

- **Mobile Viewport**: Device screen dimensions, safe areas, notches, Dynamic Island (iOS 14+)
- **Touch Targets**: Interactive UI elements (buttons, links, inputs) with size/spacing requirements
- **Drawer/Modal**: Overlay components that must size correctly and not overflow
- **Responsive Breakpoints**: CSS breakpoints for sm/md/lg/xl screens (Tailwind default or custom)
- **Safe Area**: iOS/Android safe zones for content (notches, system UI, gesture areas)

## Success Criteria

### Measurable Outcomes

- **SC-001**: PWA displays correctly on iPhone SE through Pro Max without horizontal scroll (100% of tested devices)
- **SC-002**: PWA displays correctly on Android phones (5-7" to 6.7" screens) with consistent layout (100% tested device coverage)
- **SC-003**: All buttons/interactive elements have ≥44×44px touch targets on mobile (100% of interactive elements)
- **SC-004**: Modal/drawer content never overflows viewport; forms remain accessible with keyboard open (100% of modals)
- **SC-005**: Page layout transitions smoothly on orientation change; no visible shifts or content loss (100% viewport sizes)
- **SC-006**: Cart drawer opens/closes smoothly; all items, buttons clickable (100% functional test)
- **SC-007**: Recipe live mode, checkout, barista profile fully usable on smallest supported viewport (320px) (100% of flows)

## Assumptions

- **Viewport assumption**: Minimum supported viewport width is 320px (iPhone SE); maximum is 1200px (tablets)
- **Touch target assumption**: Mobile-first responsive design using standard Tailwind breakpoints (sm/md/lg/xl)
- **Safe area assumption**: iOS safe areas handled via CSS env() variables (viewport-fit=cover); Android safe areas standard
- **Existing stack reused**: Tailwind CSS, Shadcn/ui components, React responsive patterns already in place
- **Platform support**: iOS 14+, Android 8+ (reflect current PWA compatibility in CLAUDE.md)
- **No new CSS framework**: Fixes will use existing Tailwind/Shadcn structure; no new styling library added
- **Testing environment**: Developers will test on physical devices or emulators (iOS Simulator, Android Studio Emulator)
