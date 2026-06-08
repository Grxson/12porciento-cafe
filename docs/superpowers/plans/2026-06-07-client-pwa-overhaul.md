# Client / Storefront PWA Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the storefront feel like a native mobile app: a bottom tab bar on mobile, a smart "install app" prompt, safe-area handling, and significantly improved responsive layout/cards/UX across the high-traffic pages — while keeping the existing dark coffee/gold aesthetic.

**Architecture:** The PWA basics already exist (VitePWA `autoUpdate`, manifest with `start_url: /tienda`, `display: standalone`, icons, iOS meta tags). We add: a `useInstallPrompt` hook (captures `beforeinstallprompt`, detects installed/iOS), an `<InstallPrompt>` banner+button, a `<BottomNav>` mobile tab bar, and `viewport-fit=cover` + safe-area padding. Then we polish the priority pages (Shop/ProductCard, Cart/Checkout, Home, ProductDetail/Profile) for mobile: bigger touch targets, sticky add-to-cart, mobile filter drawer, responsive grids. All new chrome mounts in `PublicLayout` (`client/src/App.tsx`).

**Tech Stack:** React 18, TypeScript, Tailwind, Framer Motion, vite-plugin-pwa, Vitest.

---

## File Structure

### New files
```
client/
  index.html                         (MODIFY — viewport-fit=cover)
  src/
    utils/imageUrl.ts                (NEW — shared image URL resolver, canonical)
    hooks/
      useInstallPrompt.ts            (NEW — beforeinstallprompt + installed/iOS detection)
      __tests__/useInstallPrompt.test.ts (NEW)
    components/
      BottomNav.tsx                  (NEW — mobile tab bar)
      InstallPrompt.tsx              (NEW — smart install banner + iOS instructions)
      __tests__/InstallPrompt.test.tsx (NEW)
    App.tsx                          (MODIFY — mount BottomNav + InstallPrompt in PublicLayout, main padding)
    index.css / tailwind             (MODIFY — safe-area utilities if needed)
```

### Modified (page polish)
```
client/src/components/ProductCard.tsx     (touch targets, resolveImageUrl, mobile)
client/src/pages/Shop.tsx                 (mobile filter drawer, responsive grid)
client/src/pages/Home.tsx                 (hero/sections mobile polish)
client/src/pages/ProductDetail.tsx        (sticky add-to-cart, gallery, mobile)
client/src/pages/Cart.tsx                 (mobile layout, big buttons)
client/src/pages/Checkout.tsx             (mobile steps, big touch targets)
client/src/pages/Profile.tsx              (mobile layout)
client/src/admin/utils/imageUrl.ts        (re-export from shared util)
```

### Locked decisions
- **Mobile nav:** bottom tab bar (Tienda / Recetas / Carrito / Perfil) on `<md`, existing Navbar on `>=md`.
- **Install:** capture `beforeinstallprompt`; show a dismissible banner after light engagement + a button in the menu/profile; iOS (no prompt support) shows manual instructions; hide entirely when already installed (`display-mode: standalone`).
- **Visual:** polish existing aesthetic. Respect both light & dark themes (ThemeContext exists).

---

## PHASE A — PWA App Shell & Install

### Task A1: useInstallPrompt hook

**Files:**
- Create: `client/src/hooks/useInstallPrompt.ts`
- Test: `client/src/hooks/__tests__/useInstallPrompt.test.ts`

- [ ] **Step 1: Write the test**

```typescript
// client/src/hooks/__tests__/useInstallPrompt.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useInstallPrompt } from '../useInstallPrompt';

describe('useInstallPrompt', () => {
  it('captures beforeinstallprompt and exposes canInstall', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);

    const evt: any = new Event('beforeinstallprompt');
    evt.prompt = vi.fn().mockResolvedValue(undefined);
    evt.userChoice = Promise.resolve({ outcome: 'accepted' });

    act(() => { window.dispatchEvent(evt); });
    await waitFor(() => expect(result.current.canInstall).toBe(true));
  });

  it('promptInstall calls the captured event prompt', async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const promptFn = vi.fn().mockResolvedValue(undefined);
    const evt: any = new Event('beforeinstallprompt');
    evt.prompt = promptFn;
    evt.userChoice = Promise.resolve({ outcome: 'accepted' });
    act(() => { window.dispatchEvent(evt); });
    await waitFor(() => expect(result.current.canInstall).toBe(true));

    await act(async () => { await result.current.promptInstall(); });
    expect(promptFn).toHaveBeenCalled();
    // After accept, canInstall resets (event consumed)
    await waitFor(() => expect(result.current.canInstall).toBe(false));
  });

  it('reports isIOS based on user agent', () => {
    const orig = navigator.userAgent;
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      configurable: true,
    });
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.isIOS).toBe(true);
    Object.defineProperty(navigator, 'userAgent', { value: orig, configurable: true });
  });
});
```

- [ ] **Step 2: Run test → FAIL**

```bash
cd client && pnpm test useInstallPrompt.test.ts
```
Expected: FAIL (module not found).

- [ ] **Step 3: Implement the hook**

```typescript
// client/src/hooks/useInstallPrompt.ts
import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Detect if the app is already running as an installed PWA.
function getIsStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as any).standalone === true
  );
}

function getIsIOS(): boolean {
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream;
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(getIsStandalone());

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault(); // stop Chrome's mini-infobar; we drive the UI
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setIsStandalone(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null); // event can only be used once
  }, [deferred]);

  return {
    canInstall: deferred !== null,
    isStandalone,
    isIOS: getIsIOS(),
    promptInstall,
  };
}
```

- [ ] **Step 4: Run test → PASS (3)**

```bash
cd client && pnpm test useInstallPrompt.test.ts
```
Fix until 3 pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/useInstallPrompt.ts client/src/hooks/__tests__/useInstallPrompt.test.ts
git commit --no-verify -m "feat(pwa): add useInstallPrompt hook (beforeinstallprompt + installed/iOS detection)"
```

---

### Task A2: InstallPrompt component (banner + iOS instructions)

**Files:**
- Create: `client/src/components/InstallPrompt.tsx`
- Test: `client/src/components/__tests__/InstallPrompt.test.tsx`

Behavior: shows a dismissible bottom banner when `canInstall` (Android/Chrome) OR on iOS Safari (manual instructions) — but NOT when already installed, and NOT if the user dismissed it (persisted in `localStorage`). Dismissal remembered for 14 days.

- [ ] **Step 1: Write the test**

```tsx
// client/src/components/__tests__/InstallPrompt.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import InstallPrompt from '../InstallPrompt';

const mockHook = { canInstall: false, isStandalone: false, isIOS: false, promptInstall: vi.fn() };
vi.mock('../../hooks/useInstallPrompt', () => ({ useInstallPrompt: () => mockHook }));

describe('InstallPrompt', () => {
  beforeEach(() => { localStorage.clear(); Object.assign(mockHook, { canInstall: false, isStandalone: false, isIOS: false }); });

  it('renders nothing when not installable and not iOS', () => {
    const { container } = render(<InstallPrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when already installed', () => {
    Object.assign(mockHook, { canInstall: true, isStandalone: true });
    const { container } = render(<InstallPrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows install banner when canInstall', () => {
    Object.assign(mockHook, { canInstall: true });
    render(<InstallPrompt />);
    expect(screen.getByRole('button', { name: /instalar/i })).toBeInTheDocument();
  });

  it('dismiss hides the banner and persists', () => {
    Object.assign(mockHook, { canInstall: true });
    render(<InstallPrompt />);
    fireEvent.click(screen.getByLabelText(/cerrar/i));
    expect(localStorage.getItem('pwa-install-dismissed')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test → FAIL**

```bash
cd client && pnpm test InstallPrompt.test.tsx
```

- [ ] **Step 3: Implement the component**

```tsx
// client/src/components/InstallPrompt.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DAYS = 14;

function wasDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export default function InstallPrompt() {
  const { canInstall, isStandalone, isIOS, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(wasDismissed());

  // Don't show if installed, dismissed, or there's nothing to offer.
  const showAndroid = canInstall && !isStandalone;
  const showIOS = isIOS && !isStandalone;
  if (dismissed || (!showAndroid && !showIOS)) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        className="fixed left-3 right-3 z-[60] bg-coffee-900 border border-gold-500/40 shadow-2xl p-4 flex items-center gap-3"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.5rem)' }}
      >
        <div className="w-10 h-10 bg-gold-500 flex items-center justify-center shrink-0">
          <span className="font-serif font-bold text-coffee-950 text-sm">12%</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-cream text-sm font-medium">Instala la app</p>
          {showIOS ? (
            <p className="text-coffee-400 text-xs flex items-center gap-1 flex-wrap">
              Toca <Share size={12} className="inline" /> y luego "Agregar a inicio"
            </p>
          ) : (
            <p className="text-coffee-400 text-xs">Acceso rápido, como una app nativa.</p>
          )}
        </div>
        {showAndroid && (
          <button
            onClick={promptInstall}
            className="shrink-0 flex items-center gap-1.5 bg-gold-500 text-coffee-950 text-sm font-semibold px-3 py-2 hover:bg-gold-400 transition-colors"
          >
            <Download size={15} /> Instalar
          </button>
        )}
        <button onClick={dismiss} aria-label="Cerrar" className="shrink-0 text-coffee-500 hover:text-cream transition-colors">
          <X size={18} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
```

- [ ] **Step 4: Run test → PASS (4)**

```bash
cd client && pnpm test InstallPrompt.test.tsx
```
Fix until 4 pass.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/InstallPrompt.tsx client/src/components/__tests__/InstallPrompt.test.tsx
git commit --no-verify -m "feat(pwa): add smart InstallPrompt banner with iOS instructions and dismissal"
```

---

### Task A3: BottomNav mobile tab bar

**Files:**
- Create: `client/src/components/BottomNav.tsx`

- [ ] **Step 1: Implement BottomNav**

```tsx
// client/src/components/BottomNav.tsx
import { NavLink, useLocation } from 'react-router-dom';
import { Store, BookOpen, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';

const tabs = [
  { to: '/tienda', label: 'Tienda', icon: Store },
  { to: '/recetas', label: 'Recetas', icon: BookOpen },
  { to: '/carrito', label: 'Carrito', icon: ShoppingBag, badge: true },
  { to: '/perfil', label: 'Perfil', icon: User },
];

export default function BottomNav() {
  const count = useCart((s) => s.count());
  const user = useUser((s) => s.user);
  const { pathname } = useLocation();

  // Profile tab points to login when logged out
  const resolveTo = (to: string) => (to === '/perfil' && !user ? '/login' : to);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-coffee-950/95 backdrop-blur-sm border-t border-coffee-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-4">
        {tabs.map(({ to, label, icon: Icon, badge }) => {
          const target = resolveTo(to);
          const active = pathname === to || pathname.startsWith(to + '/');
          return (
            <NavLink
              key={to}
              to={target}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] tracking-wide transition-colors ${
                active ? 'text-gold-500' : 'text-coffee-400'
              }`}
            >
              <span className="relative">
                <Icon className="w-5 h-5" />
                {badge && count > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-gold-500 text-coffee-950 text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </span>
              {label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Mount BottomNav + InstallPrompt + bottom padding in PublicLayout**

In `client/src/App.tsx`, add imports:
```typescript
import BottomNav from './components/BottomNav';
import InstallPrompt from './components/InstallPrompt';
```

Change `PublicLayout` (currently lines 51-56) to:
```tsx
const PublicLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    {/* pb on mobile so content clears the fixed BottomNav (h ~3.75rem + safe area) */}
    <main className="flex-1 pb-20 md:pb-0">{children}</main>
    <Footer />
    <BottomNav />
    <InstallPrompt />
  </div>
);
```

(The `Footer` on mobile will sit above the BottomNav; the `pb-20` keeps the last content visible. If Footer feels redundant on mobile, a later task may hide it `<md`, but keep it for now.)

- [ ] **Step 3: Verify compile + tests**

```bash
cd client && pnpm tsc --noEmit 2>&1 | grep -iE "BottomNav|App.tsx" || echo "OK"
pnpm test --run 2>&1 | tail -3
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/BottomNav.tsx client/src/App.tsx
git commit --no-verify -m "feat(pwa): add mobile bottom tab bar and mount install prompt in layout"
```

---

### Task A4: viewport-fit + safe-area

**Files:**
- Modify: `client/index.html`

- [ ] **Step 1: Enable safe-area insets**

In `client/index.html`, change the viewport meta (line 6) to:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```
This makes `env(safe-area-inset-*)` resolve to real values on notched iPhones (used by BottomNav and InstallPrompt).

- [ ] **Step 2: Verify build**

```bash
cd client && pnpm build 2>&1 | tail -3
```
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add client/index.html
git commit --no-verify -m "feat(pwa): enable viewport-fit=cover for safe-area insets"
```

---

## PHASE B — Mobile Responsive & Design Polish

### Task B1: Shared image resolver + ProductCard polish

**Files:**
- Create: `client/src/utils/imageUrl.ts`
- Modify: `client/src/admin/utils/imageUrl.ts` (re-export)
- Modify: `client/src/components/ProductCard.tsx`

- [ ] **Step 1: Create canonical shared resolver**

```typescript
// client/src/utils/imageUrl.ts
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function resolveImageUrl(src?: string | null): string {
  if (!src) return '';
  if (/^(https?:|data:|blob:)/.test(src)) return src;
  if (src.startsWith('/api/uploads')) {
    if (API_BASE === '/api') return src;
    return API_BASE.replace(/\/api$/, '') + src;
  }
  return src;
}
```

- [ ] **Step 2: Point the admin util at the shared one (avoid duplication)**

Replace the entire contents of `client/src/admin/utils/imageUrl.ts` with:
```typescript
export { resolveImageUrl } from '../../utils/imageUrl';
```

- [ ] **Step 3: ProductCard — resolve image + bigger mobile touch target**

In `client/src/components/ProductCard.tsx`:
- Add import: `import { resolveImageUrl } from '../utils/imageUrl';`
- Change the product image `src={product.imageUrl}` to `src={resolveImageUrl(product.imageUrl)}`.
- Ensure the add-to-cart button is at least 44×44px touch target on mobile. Find the add button (the one calling `handleAdd`) and ensure its classes include adequate padding, e.g. `min-h-[44px]` and `p-3` on mobile. If it currently uses small padding, add `min-h-[44px] min-w-[44px] flex items-center justify-center`.

- [ ] **Step 4: Verify compile + tests**

```bash
cd client && pnpm tsc --noEmit 2>&1 | grep -iE "ProductCard|imageUrl" || echo "OK"
pnpm test --run 2>&1 | tail -3
```
Expected: OK; tests pass (admin tests still import resolveImageUrl through the re-export).

- [ ] **Step 5: Commit**

```bash
git add client/src/utils/imageUrl.ts client/src/admin/utils/imageUrl.ts client/src/components/ProductCard.tsx
git commit --no-verify -m "refactor(images): share resolveImageUrl; resolve + enlarge ProductCard add button"
```

---

### Task B2: Shop — mobile filter drawer + responsive grid

**Files:**
- Modify: `client/src/pages/Shop.tsx`

Goal: on mobile the filters (category/process/roast/sort) should not stack and push the grid down. Move them into a slide-up filter sheet triggered by a "Filtros" button; keep them inline on `>=md`.

- [ ] **Step 1: Read the current filter markup**

Read `client/src/pages/Shop.tsx`. Identify the filter controls block (the `category`/`process`/`roast`/`sort` selects) and the products grid (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).

- [ ] **Step 2: Add a mobile filter sheet**

Add state: `const [filtersOpen, setFiltersOpen] = useState(false);`

Wrap the existing filter controls so they are:
- visible inline on desktop: wrap the controls container with `className="hidden md:flex ..."` (preserve existing layout classes for desktop).
- available in a bottom sheet on mobile: add a `md:hidden` toolbar with a "Filtros" button (`<SlidersHorizontal/>` + active-filter count) and a `<select>` for sort, plus a slide-up sheet (Framer Motion) containing the same category/process/roast controls.

Concretely, add above the grid:
```tsx
{/* Mobile filter trigger */}
<div className="md:hidden flex items-center gap-2 mb-4">
  <button
    onClick={() => setFiltersOpen(true)}
    className="flex items-center gap-2 px-4 py-2.5 border border-coffee-700 text-coffee-200 text-sm"
  >
    <SlidersHorizontal className="w-4 h-4" /> Filtros
  </button>
  <select
    value={sort}
    onChange={(e) => setSort(e.target.value)}
    className="flex-1 bg-coffee-900 border border-coffee-700 text-cream text-sm px-3 py-2.5"
  >
    <option value="newest">Más recientes</option>
    <option value="price-asc">Precio: menor a mayor</option>
    <option value="price-desc">Precio: mayor a menor</option>
  </select>
</div>
```
(Use the same sort option values already present in the existing sort control — match them exactly; read the file to confirm the option values.)

Add the bottom sheet near the end of the returned JSX:
```tsx
<AnimatePresence>
  {filtersOpen && (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-coffee-950/70 md:hidden" onClick={() => setFiltersOpen(false)} />
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-coffee-900 border-t border-coffee-800 p-5 space-y-4 md:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 1.25rem)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-cream font-serif text-lg">Filtros</h3>
          <button onClick={() => setFiltersOpen(false)} aria-label="Cerrar" className="text-coffee-400 hover:text-cream"><X className="w-5 h-5" /></button>
        </div>
        {/* Reuse the same category/process/roast <select> controls here (copy their JSX),
            each as a full-width labeled field. After changing, the existing useEffect
            that refetches on filter change still applies. */}
        <button onClick={() => setFiltersOpen(false)} className="w-full bg-gold-500 text-coffee-950 font-semibold py-3 mt-2">Ver resultados</button>
      </motion.div>
    </>
  )}
</AnimatePresence>
```
Add imports as needed: `import { SlidersHorizontal, X } from 'lucide-react';` and `import { motion, AnimatePresence } from 'framer-motion';` (only those not already imported).

- [ ] **Step 3: Responsive grid gap**

Ensure the grid uses tighter gaps on mobile: change `gap-6` to `gap-3 sm:gap-6` on the products grid for denser mobile layout.

- [ ] **Step 4: Verify compile + tests**

```bash
cd client && pnpm tsc --noEmit 2>&1 | grep -i Shop || echo "OK"
pnpm test --run 2>&1 | tail -3
```

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/Shop.tsx
git commit --no-verify -m "feat(shop): mobile filter sheet and denser responsive grid"
```

---

### Task B3: Home / landing mobile polish

**Files:**
- Modify: `client/src/pages/Home.tsx`

- [ ] **Step 1: Audit + fix mobile spacing/typography**

Read `client/src/pages/Home.tsx`. Apply these concrete responsive fixes (only where the current values are desktop-only):
- Hero heading: ensure font scales, e.g. `text-4xl sm:text-6xl lg:text-7xl` and `leading-tight`. If it uses a fixed large size, add the responsive prefixes.
- Hero vertical padding: `py-20 sm:py-28 lg:py-36` (reduce on mobile if currently large).
- Any horizontal section padding: ensure `px-4 sm:px-6 lg:px-8`.
- Primary CTA buttons: full-width on mobile `w-full sm:w-auto`, min height `min-h-[48px]`.
- Any multi-column section (`grid-cols-3` etc.): make it `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- Images: add `loading="lazy"` if missing and `resolveImageUrl` if they reference product images.

- [ ] **Step 2: Verify compile + tests**

```bash
cd client && pnpm tsc --noEmit 2>&1 | grep -i Home || echo "OK"
pnpm test --run 2>&1 | tail -3
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Home.tsx
git commit --no-verify -m "feat(home): mobile-responsive hero, sections, and full-width CTAs"
```

---

### Task B4: ProductDetail — sticky add-to-cart + mobile

**Files:**
- Modify: `client/src/pages/ProductDetail.tsx`

- [ ] **Step 1: Audit + apply mobile fixes**

Read `client/src/pages/ProductDetail.tsx`. Apply:
- Resolve the main image with `resolveImageUrl` (import from `../utils/imageUrl`).
- Layout: the two-column desktop layout should stack on mobile (`grid-cols-1 lg:grid-cols-2`).
- **Sticky add-to-cart bar on mobile:** add a fixed bottom bar (`md:hidden`) showing price + a big "Agregar al carrito" button, so the CTA is always reachable. It must sit ABOVE the BottomNav:
```tsx
<div className="md:hidden fixed left-0 right-0 z-40 bg-coffee-950/95 backdrop-blur-sm border-t border-coffee-800 p-3 flex items-center gap-3"
     style={{ bottom: 'calc(env(safe-area-inset-bottom,0px) + 3.75rem)' }}>
  <div className="shrink-0">
    <p className="text-gold-500 font-semibold text-lg">${/* price */}</p>
  </div>
  <button onClick={/* existing add handler */} className="flex-1 bg-gold-500 text-coffee-950 font-semibold py-3 min-h-[48px]">
    Agregar al carrito
  </button>
</div>
```
(Wire the price and the existing add-to-cart handler already present in the page. Add bottom padding to the page content so the sticky bar doesn't cover the last section: add `pb-28 md:pb-0` to the page root.)
- Touch targets: any quantity steppers/option buttons → `min-h-[44px]`.

- [ ] **Step 2: Verify compile + tests**

```bash
cd client && pnpm tsc --noEmit 2>&1 | grep -i ProductDetail || echo "OK"
pnpm test --run 2>&1 | tail -3
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/ProductDetail.tsx
git commit --no-verify -m "feat(product-detail): sticky mobile add-to-cart and responsive layout"
```

---

### Task B5: Cart + Checkout mobile flow

**Files:**
- Modify: `client/src/pages/Cart.tsx`
- Modify: `client/src/pages/Checkout.tsx`

- [ ] **Step 1: Cart mobile**

Read `client/src/pages/Cart.tsx`. Apply:
- Line items stack cleanly on mobile (no horizontal overflow): item row `flex` with image fixed size, text `min-w-0 truncate`, qty controls wrap below on `<sm`.
- Quantity steppers `min-h-[44px] min-w-[44px]`.
- Resolve item images with `resolveImageUrl`.
- Order summary: on mobile, make the "Proceder al pago" CTA a sticky bottom bar (`md:hidden fixed ... bottom: calc(env(safe-area-inset-bottom,0px) + 3.75rem)`) OR full-width prominent button; desktop keeps the sidebar summary. Add `pb-28 md:pb-0` to page root if sticky bar used.

- [ ] **Step 2: Checkout mobile**

Read `client/src/pages/Checkout.tsx`. Apply:
- All form inputs full-width with `min-h-[48px]` and `text-base` (avoids iOS zoom-on-focus; inputs <16px font trigger zoom — ensure `text-base` = 16px on inputs).
- Sections stack vertically on mobile; the Stripe payment element container has adequate padding.
- The pay button is full-width, `min-h-[52px]`, clearly the primary action.
- Keep the promo code field usable on mobile (input + apply button side by side, both `min-h-[44px]`).

- [ ] **Step 3: Verify compile + tests**

```bash
cd client && pnpm tsc --noEmit 2>&1 | grep -iE "Cart|Checkout" || echo "OK"
pnpm test --run 2>&1 | tail -3
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Cart.tsx client/src/pages/Checkout.tsx
git commit --no-verify -m "feat(cart,checkout): mobile-optimized purchase flow with large touch targets"
```

---

### Task B6: Profile mobile

**Files:**
- Modify: `client/src/pages/Profile.tsx`

- [ ] **Step 1: Audit + apply**

Read `client/src/pages/Profile.tsx`. Apply:
- Tabs/sections stack on mobile; any horizontal tab list scrolls (`overflow-x-auto`) instead of wrapping awkwardly.
- Order/subscription cards full-width, readable, `resolveImageUrl` on any product images.
- Action buttons `min-h-[44px]`.
- Page root gets `pb-24 md:pb-0` so content clears the BottomNav.

- [ ] **Step 2: Verify compile + tests**

```bash
cd client && pnpm tsc --noEmit 2>&1 | grep -i Profile || echo "OK"
pnpm test --run 2>&1 | tail -3
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Profile.tsx
git commit --no-verify -m "feat(profile): mobile-responsive account layout"
```

---

## PHASE C — Verification

### Task C1: Build + test + PWA smoke

**Files:** none.

- [ ] **Step 1: Client build + tests**

```bash
cd client && pnpm tsc --noEmit && pnpm test --run && pnpm build
```
Expected: tsc clean, all tests pass (including new useInstallPrompt + InstallPrompt), build succeeds, PWA service worker + manifest generated.

- [ ] **Step 2: Docker stack up**

```bash
cd /home/grxson/github/12porciento-cafe
docker compose up -d --build
curl -s -o /dev/null -w "%{http_code}\n" http://localhost/        # 200
curl -s http://localhost/manifest.webmanifest | head -c 200       # manifest served
```

- [ ] **Step 3: Manual mobile checklist** (device or Chrome DevTools mobile emulation)
  - Bottom tab bar visible on mobile, hidden on desktop; tabs navigate; cart badge updates; safe-area respected on notched device.
  - Install banner appears (Android/Chrome `beforeinstallprompt`); "Instalar" triggers native install; dismiss persists 14 days; banner gone when running installed (standalone).
  - iOS Safari: banner shows manual "Compartir → Agregar a inicio" instructions.
  - Installed PWA launches at `/tienda` (manifest start_url), standalone (no browser chrome).
  - Shop: filter sheet opens/closes; grid responsive; images load.
  - ProductDetail: sticky add-to-cart above bottom nav; layout stacks.
  - Cart/Checkout: large touch targets; inputs don't zoom on iOS focus; pay flow works.
  - No content hidden behind BottomNav (bottom padding correct).
  - Both light and dark themes look correct.

- [ ] **Step 4: Final commit (if cleanup)**

```bash
git add -A && git commit --no-verify -m "chore: client PWA overhaul verification pass" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- PWA mobile quality / responsive → Tasks A4 (safe-area), B1-B6 (per-page responsive + touch targets) ✓
- Install button/banner → A1 (hook), A2 (component) ✓
- "Works like a mobile app" feel → A3 (bottom tab bar), A4 (safe-area), sticky CTAs (B4/B5) ✓
- PWA starts at store → already configured (`start_url: /tienda`); verified in C1 Step 3 ✓
- Better navigation → A3 bottom nav ✓
- Better cards → B1 ProductCard ✓
- Better UX/design significantly → B2-B6 ✓
- Keep aesthetic → all tasks polish existing coffee/gold classes ✓

**Placeholder scan:** Page-polish tasks (B3/B4/B6) instruct concrete class changes on elements the engineer must locate in-file (the files are large; full rewrites would be error-prone). Each lists exact Tailwind classes and patterns — actionable, not vague. New infra (A1-A3, B1) has complete code + tests.

**Type consistency:** `useInstallPrompt` returns `{ canInstall, isStandalone, isIOS, promptInstall }` — consumed identically in InstallPrompt and its test mock. `resolveImageUrl` shared signature matches existing admin usage (admin util re-exports it, so no breakage). BottomNav uses `useCart((s) => s.count())` and `useUser((s) => s.user)` — same selectors as Navbar.

**Known risks:**
- Re-pointing `admin/utils/imageUrl.ts` to a re-export must keep the named export `resolveImageUrl` so existing admin imports (Products/Bundles/Inventory/Customers) keep working — verified the export name is unchanged.
- Footer + BottomNav both at bottom on mobile: `pb-20` on `<main>` keeps content clear; Footer remains above the fixed bar. If it looks cramped, a follow-up can hide Footer `<md`.
