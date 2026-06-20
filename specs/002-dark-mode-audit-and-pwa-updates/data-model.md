# Data Model: Dark Mode & PWA Updates

## Entities

### Theme Preference
**Entity**: User's light/dark mode setting

**Fields:**
- `preference: 'light' | 'dark' | 'system'` — User's explicit choice (or inherit from OS)
- `appliedAt: timestamp` — When preference was last changed
- `persistent: boolean` — Whether to save to localStorage (default: true)

**Storage:** localStorage key `theme-preference`

**Validation Rules:**
- Value must be one of: 'light', 'dark', 'system'
- Default on new install: `'system'` (inherit from OS dark mode preference)

**State Transitions:**
```
app_load
  ├─> read localStorage('theme-preference')
  ├─> if null: use system preference
  └─> apply to document.documentElement.classList ('dark' class)

user_toggle_theme
  ├─> update state
  ├─> write to localStorage('theme-preference')
  └─> toggle document.documentElement.classList
```

---

### PWA Update Notification
**Entity**: Notification state for PWA updates

**Fields:**
- `updateAvailable: boolean` — Does service worker have new version?
- `userDismissed: timestamp | null` — When user dismissed modal (null = not dismissed)
- `updateApplied: boolean` — Has user clicked "Actualizar" and refreshed?
- `dismissedUpdateVersion: string | null` — Version ID of dismissed update (to prevent re-showing same update)

**Storage:** localStorage key `pwa_update_notification_state` (JSON)

**Validation Rules:**
- `updateAvailable` synced with service worker state (auto-populated)
- `userDismissed` timestamp should be recent (< 1 day old)
- If `dismissedUpdateVersion` changes (new SW version), reset `userDismissed` to null

**State Transitions:**
```
app_load
  ├─> check service worker for new version
  ├─> if updateAvailable && !userDismissed:
  │   └─> show UpdateNotificationModal
  └─> else: continue normally

user_dismiss_modal
  ├─> set userDismissed = now()
  └─> save to localStorage

service_worker_update_detected
  ├─> set dismissedUpdateVersion = newVersionHash
  ├─> set userDismissed = null (force re-show if user dismissed old)
  └─> trigger show modal again

user_click_actualizar
  ├─> trigger SW skip_waiting() + clients.claim()
  ├─> page reloads (automatic)
  ├─> after reload: show UpdateNotificationToast
  └─> set updateApplied = true
```

---

## Component Data Contracts

### ThemeContext
**Type**: React Context for global theme management

**API**:
```typescript
interface ThemeContextType {
  dark: boolean;  // true = dark mode active
  preference: 'light' | 'dark' | 'system';
  toggle: () => void;  // Switch theme
  setPreference: (pref: 'light' | 'dark' | 'system') => void;
}
```

**Responsibility:**
- Manage theme state across app
- Persist preference to localStorage
- Apply `.dark` class to document.documentElement
- Handle system preference detection (prefers-color-scheme media query)

---

### UpdateNotificationContext (NEW)
**Type**: React Context for update notification state

**API**:
```typescript
interface UpdateNotificationContextType {
  updateAvailable: boolean;
  userDismissed: boolean;
  onDismiss: () => void;
  onUpdate: () => void;  // Trigger SW refresh + reload
}
```

**Responsibility:**
- Detect service worker updates
- Track user dismissal state
- Persist dismissal to localStorage
- Trigger page refresh on update

---

### UpdateNotificationModal (NEW COMPONENT)
**Props**:
```typescript
interface UpdateNotificationModalProps {
  open: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
  message?: string;  // Default: "Hemos detectado una nueva versión. ¿Deseas actualizar?"
}
```

**Rendering**:
- Modal overlay with fixed positioning
- Title: "Actualización disponible"
- Message text
- Two buttons: "Actualizar" (primary), "Ahora no" (secondary)
- Non-dismissible via backdrop click (users must choose a button)

**Styling**: Respects dark/light theme (uses Tailwind dark: classes)

---

### UpdateNotificationToast (NEW COMPONENT)
**Props**:
```typescript
interface UpdateNotificationToastProps {
  visible: boolean;
  message?: string;  // Default: "Hemos actualizado el diseño de la app ✨"
  duration?: number;  // Default: 4000ms
  onDismiss: () => void;
}
```

**Rendering**:
- Toast notification at bottom-right or top
- Auto-dismiss after `duration` milliseconds
- Doesn't block interaction (positioned behind modals)

**Styling**: Uses existing Toast component from app's ToastContext

---

### useUpdateNotification (NEW HOOK)
**Return Type**:
```typescript
interface UseUpdateNotificationReturn {
  updateAvailable: boolean;
  userDismissed: boolean;
  showNotification: boolean;  // Derived: updateAvailable && !userDismissed
  handleDismiss: () => void;
  handleUpdate: () => void;
}
```

**Responsibility:**
- Register service worker update listener
- Track dismissal state
- Provide convenient interface for components

---

## CSS Color Mapping

### Light Mode (Default, no `.dark` class)

```css
/* Backgrounds */
background: coffee-50 (page)
background: coffee-100 (cards, sections)
background: coffee-200 (secondary areas, borders)

/* Text */
color: coffee-900 (primary text, headings)
color: coffee-700 (secondary text)
color: coffee-600 (tertiary text, muted)

/* Accents */
accent: gold-500 (buttons, hover, selected)
```

### Dark Mode (`.dark` class present)

```css
/* Backgrounds */
background: coffee-950 (page, equivalent to coffee-50)
background: coffee-900 (cards, sections, equivalent to coffee-100)
background: coffee-800 (secondary areas, borders, equivalent to coffee-200)

/* Text */
color: cream (primary text, headings, equivalent to coffee-900)
color: coffee-300 (secondary text, equivalent to coffee-700)
color: coffee-400 (tertiary text, muted, equivalent to coffee-600)

/* Accents */
accent: gold-500 (same on both; works as light accent on dark bg)
```

### Status Colors (Both Modes)
```
error: red-500 (light) / red-400 (dark)
success: green-500 (light) / green-400 (dark)
warning: yellow-500 (light) / yellow-400 (dark)
```

---

## Validation & Constraints

**Theme Preference Constraints:**
- Valid values: 'light', 'dark', 'system'
- Default: 'system' (respect OS preference)
- Persisted: localStorage survives PWA install/reinstall
- No async operations (sync toggle for < 50ms response)

**Update Notification Constraints:**
- Modal is non-dismissible by backdrop (user must click a button)
- Update check happens on app load, not continuously (save battery)
- Notification persists across page loads until user updates
- Modal reappears if new version released after dismissal

**Color Transition Constraints:**
- No hardcoded colors without `dark:` variants
- Text contrast must meet WCAG AA (4.5:1 ratio) on both light and dark
- Theme toggle must not cause FOUC (flash of unstyled content)
- No animation lag on theme switch (< 50ms)

---

## Relations & Dependencies

```
ThemeContext
  └─> persists to: localStorage('theme-preference')
  └─> affects: all 25+ components via Tailwind dark: classes

UpdateNotificationContext
  └─> depends on: Service Worker API
  └─> persists to: localStorage('pwa_update_notification_state')
  └─> triggers: UpdateNotificationModal & UpdateNotificationToast
  └─> listens to: SW 'controllerchange' event

UpdateNotificationModal
  └─> consumes: UpdateNotificationContext
  └─> displays: UpdateNotificationToast on success

useUpdateNotification hook
  └─> integrates with: Service Worker, UpdateNotificationContext
  └─> used by: UpdateNotificationModal, App root component
```
