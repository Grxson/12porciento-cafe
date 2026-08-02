# 12% Café Client Performance Mitigation Plan

**Timeline:** 88 hours (~3-4 weeks at 30h/week)  
**Phases:** 0 → 4 (P0 → P3 priorities)  
**Key Metrics:** LCP <2.5s, CLS <0.1, Bundle <350KB gzip

---

## PHASE 0: Critical Path (Week 1 — 24 hours)

### P0-1: html2canvas + jsPDF Dynamic Import

**Files:** `client/src/components/MonthlyWrap.tsx`, `client/src/lib/recipePdf.ts`  
**Effort:** 4h

**Now:** Top-level imports, always bundled (500KB+ total)  
**Fix:** React.lazy() + dynamic import on demand

```tsx
// MonthlyWrap.tsx
const html2canvas = React.lazy(() => import('html2canvas').then((m) => ({ default: m.default })));
// Load only when handleShare() called
```

**Saves:** 120KB gzip on initial bundle  
**Test:** `npm run build`, verify vendor chunk size reduced

---

### P0-2: Image Lazy Loading

**Files:** `client/src/components/ProductCard.tsx`, `client/src/pages/Shop.tsx`, `client/src/pages/BaristaProfile.tsx`, `client/src/components/ui/MediaFrame.tsx`  
**Effort:** 6h

**Now:** All product images load eagerly  
**Fix:**

- Add `loading="lazy"` to `<img>` tags
- Replace MediaFrame data: URI placeholder with native `loading="lazy"`
- Add `decoding="async"` to prevent render blocking

```tsx
// ProductCard.tsx line 43
<img
  src={image}
  alt={name}
  loading="lazy"
  decoding="async"
  className="h-full w-full object-cover"
/>
```

**Saves:** 200-400KB on first load  
**Test:** DevTools Network tab, verify images load on scroll

---

### P0-3: Socket.io Graceful Offline

**Files:** `client/src/lib/socket.ts`  
**Effort:** 4h

**Now:** Connects unconditionally, drains battery on poor signal  
**Fix:**

- Check `navigator.onLine` before connect
- Only reconnect on `online` event (not auto-retry)
- No backoff loop for offline

```ts
// socket.ts
if (navigator.onLine) {
  socket.connect();
}

window.addEventListener('online', () => {
  socket.connect();
});

window.addEventListener('offline', () => {
  socket.disconnect();
});

socket.io.opts.reconnection = false; // Manual control
```

**Impact:** Stop battery drain  
**Test:** Disable network in DevTools, verify socket doesn't spam reconnect

---

### P0-4: Shop Filter Memoization

**Files:** `client/src/pages/Shop.tsx`  
**Effort:** 3h

**Now:** displayedFlavors array re-mapped every render  
**Fix:**

```tsx
// Shop.tsx line 100-293
const displayedFlavors = useMemo(() => {
  return certifications
    .filter((c) => selectedFlavors.has(c.id))
    .map((c) => ({ ...c, active: true }));
}, [certifications, selectedFlavors]);
```

**Impact:** Reduce Shop page re-renders from 15+ to 1  
**Test:** React DevTools Profiler, verify render count dropped

---

### P0-5: Scroll Animation Debounce

**Files:** `client/src/components/ScrollReveal.tsx`, `client/src/pages/Home.tsx`  
**Effort:** 4h

**Now:** useInView(amount: 0.15) fires 60+ times during scroll  
**Fix:**

```tsx
// ScrollReveal.tsx
const ref = useRef(null);
const inView = useInView(ref, {
  amount: 0.15,
  once: true, // ← Only fire once
});
```

Alternative: Replace useInView with Intersection Observer + throttle
**Impact:** Drop Home page scroll jank  
**Test:** Lighthouse Performance score, verify CLS <0.1

---

## PHASE 1: High Priority (Week 2-3 — 32 hours)

### P1-1: Product List API Caching

**Files:** `client/src/sw.ts`  
**Effort:** 3h

**Now:** Shop product list never caches  
**Fix:** Add StaleWhileRevalidate (SWR) with 3-day expiry

```ts
// sw.ts line 40+
{
  urlPattern: /api\/products/,
  handler: 'StaleWhileRevalidate',
  options: {
    cacheName: 'products-cache',
    expiration: { maxEntries: 100, maxAgeSeconds: 259200 } // 3 days
  }
}
```

**Test:** Offline mode, Shop page loads cached results

---

### P1-2: Recipe Offline Indicator Badge

**Files:** `client/src/pages/RecipeDetail.tsx`  
**Effort:** 2h

**Now:** fromCache flag set but not shown  
**Fix:**

```tsx
{
  fromCache && (
    <span className="inline-block bg-amber-100 text-amber-900 px-2 py-1 text-xs rounded">
      Versión en caché (sin conexión)
    </span>
  );
}
```

**Test:** Disable network, view recipe, verify badge appears

---

### P1-3: Checkout Form Offline Drafts

**Files:** `client/src/pages/Checkout.tsx`  
**Effort:** 5h

**Now:** Form data lost on reload  
**Fix:** Auto-save to IndexedDB, restore on mount

```tsx
// Checkout.tsx
useEffect(() => {
  const timeout = setTimeout(() => {
    idb.saveCheckoutDraft(formData);
  }, 1000); // Debounce
  return () => clearTimeout(timeout);
}, [formData]);

useEffect(() => {
  idb.loadCheckoutDraft().then((draft) => {
    if (draft) setFormData(draft);
  });
}, []);
```

**Test:** Fill form, go offline, reload, verify data persists

---

### P1-4: Modal Max-Height Fix

**Files:** `client/src/components/BrewingGuideModal.tsx`, `MonthlyWrap.tsx`, `BrewLogForm.tsx`  
**Effort:** 4h

**Now:** Modals overflow on 330px screens  
**Fix:**

```tsx
// Add to modal div
<div className="max-h-[min(90dvh,_600px)] overflow-y-auto">
```

**Test:** Simulate 320px mobile, verify modal scrolls internally

---

### P1-5: Socket.io Update Detection

**Files:** `client/src/lib/socket.ts`, `useUpdateNotification.ts`  
**Effort:** 3h

**Now:** No indication service worker updated  
**Fix:** Emit 'sw-updated' event from SW, listen in app

```ts
// sw.ts on update
self.skipWaiting();
self.clients.matchAll().then((clients) => {
  clients.forEach((c) => c.postMessage({ type: 'SW_UPDATED' }));
});
```

**Test:** Deploy SW update, verify client detects it

---

### P1-6: Navbar Scroll Listener Throttle

**Files:** `client/src/components/Navbar.tsx`  
**Effort:** 3h

**Now:** Scroll listener fires every frame despite passive:true  
**Fix:** Use RequestAnimationFrame debounce

```tsx
let rafId: number;
const handleScroll = () => {
  rafId = requestAnimationFrame(() => {
    // Do scroll logic
  });
};
window.addEventListener('scroll', handleScroll, { passive: true });
```

**Test:** Mobile DevTools, verify scroll FPS stays at 60

---

### P1-7: Prefers-Reduced-Motion Fix

**Files:** `client/src/components/ScrollReveal.tsx`, `Home.tsx` animations  
**Effort:** 3h

**Now:** Animations play despite user accessibility preference  
**Fix:** Check `useReducedMotion()` at component level

```tsx
const reduceMotion = useReducedMotion();
<motion.div initial={reduceMotion ? {} : { opacity: 0 }} />;
```

**Test:** Enable "Reduce motion" in OS, verify no animations

---

### P1-8: User Profile Offline Support

**Files:** `client/src/pages/BaristaProfile.tsx`, `sw.ts`  
**Effort:** 3h

**Now:** Profile page fails offline  
**Fix:** Cache user profile fetch in SW

```ts
// sw.ts
{
  urlPattern: /api\/user\/(profile|me)/,
  handler: 'NetworkFirst',
  options: { networkTimeoutSeconds: 3 }
}
```

**Test:** Load profile, go offline, reload, verify data visible

---

## PHASE 2: Medium Priority (Week 4-5 — 20 hours)

### P2-1: Custom Offline Page

**Files:** `client/src/pages/Offline.tsx`, `sw.ts`  
**Effort:** 4h

**Now:** Navigation fallback only redirects to home  
**Fix:** Create offline page showing cached content status

```ts
// sw.ts
navigateFallback: '/offline',
```

**UI:** List cached recipes, show sync status

---

### P2-2: Framer Motion Code-Split

**Files:** `client/vite.config.ts`, routing structure  
**Effort:** 6h

**Now:** 1187 motion instances across 93 components (all in bundle)  
**Fix:** Lazy-load animation-heavy pages (MonthlyWrap, RecipeLiveMode)

- Move animations to lazy-loaded chunks
- Simple fade-in for above-fold content only
  **Impact:** ~60KB gzip savings

---

### P2-3: TestimonialsSlider CLS Fix

**Files:** `client/src/components/TestimonialsSlider.tsx`  
**Effort:** 2h

**Now:** min-h-[200px] causes layout shift  
**Fix:**

```tsx
// Calculate actual height on load
const [height, setHeight] = useState(200);
<div style={{ minHeight: height }}>
  <p onLoad={() => setHeight(/* measure */)}>
```

---

### P2-4: Auth Form Landscape Handling

**Files:** `client/src/components/AuthShell.tsx`, `index.css`  
**Effort:** 3h

**Now:** 100dvh causes reflow on mobile keyboard  
**Fix:** Detect landscape, use smaller min-height

```css
@media (max-height: 600px) {
  .auth-shell {
    min-height: auto;
  }
}
```

---

### P2-5: Toast + Notification Consolidation

**Files:** `client/src/lib/socket.ts`, `useUpdateNotification.ts`  
**Effort:** 5h

**Now:** Multiple notification sources conflict  
**Fix:** Single notification queue (Toast context)

---

## PHASE 3: Nice-to-Have (Backlog — 12 hours)

### P3-1: Dynamic Splash Screens

Generate splash screens for all device sizes via script instead of hardcoding 6.

### P3-2: Update Modal Timeline

Show "Available since 2 hours ago" in UpdateNotificationModal.

### P3-3: Socket.io Graceful Degradation

Emit 'connection-error' event with UI badge when reconnect fails.

---

## Rollout Strategy

### Week 1 (P0 items):

1. Deploy html2canvas + jsPDF dynamic import behind `perf-bundle-v1` flag
2. Enable lazy image loading for 50% of users, monitor Lighthouse score
3. Ship socket.io connectivity check (non-breaking)
4. **Measurement:** Bundle size before/after, LCP, CLS

### Week 2-3 (P1 items):

1. Deploy product caching + offline indicators incrementally
2. Monitor crash logs for checkout form IDB errors
3. Enable modal max-height fix for all users
4. **Measurement:** Time-to-interactive, Cache hit rates, offline session count

### Week 4-5 (P2 items):

1. Gradual Framer Motion code-split (50% → 100%)
2. Monitor jank reports on Android devices
3. **Measurement:** Performance score per device class

### Week 6+ (P3 items):

Backlog, deploy as capacity allows.

---

## Testing Checklist Per Phase

- [ ] Lighthouse score maintained (no regression)
- [ ] Core Web Vitals: LCP <2.5s, CLS <0.1, FID <100ms
- [ ] Bundle size analysis (before/after)
- [ ] Offline functionality smoke test
- [ ] Mobile device testing (iOS Safari, Android Chrome)
- [ ] Network throttle testing (Slow 3G, 4G)
- [ ] Accessibility check (prefers-reduced-motion, dark mode)

---

## Success Criteria

**End of Phase 0:** Bundle reduced 15%, LCP <3s  
**End of Phase 1:** LCP <2.5s, offline features working, no regressions  
**End of Phase 2:** CLS <0.1, animations smooth on Android  
**End of Phase 3:** Polish + backlog resolved

---

**Generated:** 2026-08-02  
**Next review:** Weekly during implementation
