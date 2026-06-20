# Quickstart: Validation Scenarios

**Purpose**: Prove the feature works end-to-end. Run these scenarios after implementation.

---

## Scenario 1: Light Mode Theme Displays Correctly

**Setup**: App running at localhost:5173, browser light mode

**Steps**:
1. Open browser DevTools → Settings → Disable "Emulate CSS media feature prefers-color-scheme" (use OS preference)
2. Set OS to light mode (browser settings or system)
3. Load app at http://localhost:5173
4. Navigate through: Home → Shop → Gallery → Recipes → Cart (logged in) → Barista Profile

**Verification**:
- ✅ All text readable (no invisible text on light background)
- ✅ All buttons clearly visible with good color contrast
- ✅ Card backgrounds are light (coffee-100 or white)
- ✅ Section titles appear in coffee-900 (dark) text
- ✅ All form inputs have appropriate light-mode styling
- ✅ No hardcoded cream/dark text that becomes unreadable

**Pass Criteria**: All items above verified on all pages

---

## Scenario 2: Dark Mode Theme Displays Correctly

**Setup**: App running, browser dark mode

**Steps**:
1. Open browser DevTools → Settings → Check "Emulate CSS media feature prefers-color-scheme" → select "prefers-color-scheme: dark"
2. OR: Toggle dark mode button in app UI (if present in ThemeContext)
3. Load app or toggle to dark mode
4. Navigate through: Home → Shop → Gallery → Recipes → Cart → Barista Profile

**Verification**:
- ✅ All text readable (cream/light text on dark backgrounds)
- ✅ All buttons visible with good contrast
- ✅ Card backgrounds are dark (coffee-900 or coffee-800)
- ✅ Section titles appear in cream/light text
- ✅ All form inputs have appropriate dark-mode styling
- ✅ No hardcoded light colors that become invisible on dark

**Pass Criteria**: All items above verified on all pages

---

## Scenario 3: Theme Persistence (localStorage)

**Setup**: App running at localhost:5173

**Steps**:
1. Load app, note current theme
2. Toggle theme manually (if toggle button present) or via DevTools emulation
3. Open DevTools → Application → localStorage → find `theme-preference` key
4. Verify value is 'light' or 'dark'
5. Close browser tab completely
6. Re-open same URL in new tab
7. Check theme — should match what was set

**Verification**:
- ✅ localStorage has `theme-preference` key with value 'light' or 'dark'
- ✅ After reload, theme persists (no reset to system default)
- ✅ Theme applies immediately on load (no white flash/FOUC)

**Pass Criteria**: Theme persists across page reloads

---

## Scenario 4: PWA Update Notification Modal Appears

**Setup**: PWA installed on mobile device or simulator

**Prerequisites**:
- PWA already installed
- Service worker registered
- You'll simulate an update by deploying new code and rebuilding the PWA manifest

**Steps**:
1. Install PWA on iOS simulator or Android emulator (or physical device)
2. Deploy new version of app (modify `vite.config.ts` PWA version or change asset hash)
3. Load PWA app (open from home screen)
4. Modal should appear: "Actualización disponible"
5. Verify buttons: "Actualizar" and "Ahora no"

**Verification**:
- ✅ Modal appears within 2 seconds of app load (not instant, but quick)
- ✅ Modal text is clear and in Spanish
- ✅ Buttons are clickable and properly sized (≥44px touch targets)
- ✅ Modal respects dark/light theme of device
- ✅ Backdrop behind modal (or not) doesn't block interaction

**Pass Criteria**: Modal appears and is interactive

---

## Scenario 5: PWA Update Refresh (Click "Actualizar")

**Setup**: PWA with update notification modal open (from Scenario 4)

**Steps**:
1. Have modal visible with new version available
2. Click "Actualizar" button
3. Wait for page to reload (should happen automatically)
4. After reload, look for toast notification: "Hemos actualizado el diseño de la app ✨"
5. Verify app shows new design (or at least confirms refresh happened)

**Verification**:
- ✅ Clicking button triggers immediate action (no lag)
- ✅ Page reloads (browser refresh happens automatically)
- ✅ Toast appears after reload (4 seconds, then auto-dismisses)
- ✅ New version is loaded (check DevTools Network to confirm new assets fetched, not cached)
- ✅ No jarring style shift or FOUC during transition

**Pass Criteria**: Update flow completes cleanly; toast appears; new assets loaded

---

## Scenario 6: PWA Dismissal & Re-showing Modal

**Setup**: PWA with update available

**Steps**:
1. Modal appears with update available
2. Click "Ahora no" (dismiss button)
3. Modal closes
4. Refresh page (reload PWA)
5. Check if modal reappears

**Verification**:
- ✅ Clicking dismiss closes modal cleanly
- ✅ localStorage has `pwa_update_notification_state` with `userDismissed` timestamp
- ✅ After reload, modal doesn't reappear (dismissal is remembered)
- ✅ If new version released later, modal reappears (new update overrides old dismissal)

**Pass Criteria**: Dismissal prevents re-show of same update version

---

## Scenario 7: Theme Consistency on Mobile

**Setup**: PWA installed on iOS or Android, dark mode enabled on device

**Steps**:
1. Open PWA in standalone mode (home screen icon)
2. Navigate all main sections
3. Check system status bar, navigation bar (safe areas)
4. Rotate device (portrait ↔ landscape)
5. Toggle system dark mode (Settings → Display)
6. Verify app theme updates

**Verification**:
- ✅ App respects device dark mode setting (if using `prefers-color-scheme`)
- ✅ Safe areas (notches, gesture zones) don't interfere with content
- ✅ Content doesn't overflow on rotation
- ✅ All text readable in current theme
- ✅ Bottom navigation visible and clickable

**Pass Criteria**: Mobile theme display and rotation work correctly

---

## Scenario 8: No Hardcoded Colors (Audit Verification)

**Setup**: Codebase ready for review

**Steps**:
1. Run audit command: `grep -r "text-cream\|text-coffee-900" client/src/components --include="*.tsx" | grep -v "dark:"`
2. Review any matches — these are potential hardcoded colors
3. Verify each is intentional or has `dark:` variant elsewhere
4. Run: `grep -r "bg-coffee-50\|bg-coffee-900\|bg-white" client/src/components --include="*.tsx" | grep -v "dark:"`
5. Same review

**Verification**:
- ✅ No hardcoded light-only text that would be invisible in dark mode
- ✅ No hardcoded dark-only backgrounds that would be jarring in light mode
- ✅ All colors have appropriate `dark:` variants or are intentional (e.g., admin-only sections)

**Pass Criteria**: Audit finds no unintentional hardcoded colors

---

## Scenario 9: Touch Target Sizes on Mobile

**Setup**: PWA on mobile, dark mode

**Steps**:
1. Open any interactive element: button, link, form input
2. Use browser DevTools element inspector
3. Check computed dimensions (width × height)
4. Verify all touch targets are ≥44×44 pixels

**Verification**:
- ✅ All buttons: ≥44px width, ≥44px height
- ✅ All form inputs: ≥44px height, adequate width
- ✅ Links/interactive areas: ≥44px tap target
- ✅ BottomNav tabs: ≥48px minimum height (from earlier PWA responsive fixes)

**Pass Criteria**: All touch targets meet 44px minimum

---

## Scenario 10: Full User Flow (Light→Dark→Update)

**Setup**: PWA on device, user logged in

**Steps**:
1. Load PWA in light mode — browse recipes, add to cart
2. Simulate new app update available (deploy new version)
3. Modal appears — click "Actualizar"
4. Page reloads with new design, toast shows
5. Verify cart items still there (data persisted)
6. Toggle to dark mode
7. Verify all content still readable and styled correctly

**Verification**:
- ✅ Light mode browsing works smoothly
- ✅ Update modal appears and triggers refresh
- ✅ Toast shows, design updated visually
- ✅ User data (cart, profile) persists across update
- ✅ Dark mode toggle works after update
- ✅ Dark mode has correct colors, contrast, readability

**Pass Criteria**: Full flow from light mode → update → dark mode works without data loss

---

## Quick Validation Checklist

After implementation, run this quick checklist:

- [ ] Light mode: all pages render, text readable
- [ ] Dark mode: all pages render, text readable
- [ ] Theme preference persists in localStorage
- [ ] PWA update modal appears when new version deployed
- [ ] Clicking "Actualizar" refreshes page and shows toast
- [ ] Dismissal state persists (don't re-show same version)
- [ ] No hardcoded colors found in audit
- [ ] All touch targets ≥44px on mobile
- [ ] Dark mode works on iOS Safari PWA
- [ ] Dark mode works on Android Chrome PWA

**Pass Criteria**: All items checked ✅
