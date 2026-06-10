# 12% Café — Pending Features Design

**Date:** 2026-06-10  
**Scope:** 5 features in one PR — AchievementGallery, admin barista widget, Recipes filter chips, timer audio, loading skeletons  
**Branch strategy:** single PR off main

---

## 1. AchievementGallery (`/logros`)

### Server

**New endpoint:** `GET /api/achievements`  
- Auth: optional (uses `req.headers.authorization` if present to attach unlock status)
- Returns all `Achievement` rows from DB
- If user token present: joins `AchievementUnlock` for that user, adds `unlockedAt: Date | null` per achievement
- Response shape:
  ```ts
  {
    achievements: {
      id: string;
      slug: string;
      name: string;
      description: string;
      icon: string;
      rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
      xpReward: number;
      unlockedAt: string | null; // ISO date or null
    }[]
  }
  ```
- Route added to `server/src/routes/barista.ts` (no new file needed)
- Mounted at existing `/api/barista` prefix → full path `GET /api/barista/achievements`

### Client API

Add to `client/src/api/barista.ts`:
```ts
getAchievements: () => api.get('/barista/achievements'),
```

### Page: `AchievementGallery.tsx`

Location: `client/src/pages/AchievementGallery.tsx`  
Route: `/logros` — wrapped in `UserRoute` (logged-in only)

**Layout:**
- Header: "Mis Logros" + counter `X / Y desbloqueados`
- Responsive grid (2 cols mobile, 3-4 cols desktop)
- Skeleton grid while loading (4 placeholder cards)

**Achievement card:**
- Unlocked: icon (emoji, full color), name, description, rarity badge (colored), XP earned, unlock date
- Locked: icon (grayscale + lock overlay), name, description, rarity badge (muted), XP reward shown as "reward"
- Rarity colors: COMMON=gray, RARE=blue, EPIC=purple, LEGENDARY=gold

**Nav additions:**
- Navbar desktop: add "Logros" link after "Ranking"
- BottomNav: no change (already at 5 items / grid-cols-5 — 6th would be too tight on mobile). Logros accessible on mobile via BaristaProfile page.

---

## 2. Admin Dashboard — Barista Widget

### Server changes (`server/src/routes/dashboard.ts`)

Add to `Promise.all` in `GET /admin/stats`:
```ts
prisma.brewLog.count()
```

Add `totalBrews: number` to response.

Add `DashboardStats` type update in `client/src/types/index.ts`.

### Client changes (`client/src/admin/Dashboard.tsx`)

**Stat card:** Add 5th card "Brews registrados" showing `stats.totalBrews`. Grid changes from `xl:grid-cols-4` to `xl:grid-cols-5` (or wrap to new row — pick what fits).

**Leaderboard widget:** New section at bottom of Dashboard, after the low-stock panel.
- Calls `GET /api/barista/leaderboard?limit=10` directly from Dashboard useEffect (not a new hook)
- Table: rank (#), name, level badge, XP, total brews
- Each row links to `/perfil/barista/:userId`
- Loading: spinner (matches Dashboard style — no skeleton here, admin context)
- Empty state: "Sin brews registrados aún"

---

## 3. Recipes — Active Filter Chips

File: `client/src/pages/Recipes.tsx`

**Placement:** Between search bar and recipe grid, only renders when `methodFilter !== 'TODOS'` OR `search !== ''`.

**Chips:**
- Method chip: `[☕ V60  ×]` — click sets `methodFilter('TODOS')`
- Search chip: `["espresso"  ×]` — click sets `setSearch('')`
- "Limpiar todo" button: only when both chips active simultaneously

**Styling:** small pill, `bg-coffee-800 border border-gold-500/30 text-cream text-xs`, X button inside.

---

## 4. Timer Audio — Web Audio API

File: `client/src/components/recipes/RecipeLiveMode.tsx`

Replace lines ~39-41 (`new Audio('data:audio/wav...')`) with:

```ts
function playTimerBeep() {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.6);
}
```

Called where old `Audio` was. Works offline (PWA). No file dependency.

---

## 5. Loading Skeletons

Pattern: `bg-coffee-800 animate-pulse rounded` blocks matching the shape of real content.

| File | Skeleton shape |
|------|---------------|
| `client/src/pages/Recipes.tsx` | Grid of 3-4 recipe card placeholders (image rect + 2 text lines) |
| `client/src/pages/BaristaProfile.tsx` | Avatar circle + 3 stat blocks + 5 list rows |
| `client/src/pages/Leaderboard.tsx` | 5 table row placeholders |
| `client/src/pages/AchievementGallery.tsx` | 4 card placeholders (built-in from the start) |
| `client/src/pages/Shop.tsx` | Grid of 4 product card placeholders |

No new components — inline JSX conditionals on existing `loading` state booleans.

---

## Files to Create

- `client/src/pages/AchievementGallery.tsx`

## Files to Modify

- `server/src/routes/barista.ts` — add `GET /achievements` endpoint
- `client/src/api/barista.ts` — add `getAchievements()`
- `client/src/types/index.ts` — add `Achievement` type + `totalBrews` to `DashboardStats`
- `client/src/App.tsx` — add `/logros` route (UserRoute)
- `client/src/components/Navbar.tsx` — add "Logros" link
- `client/src/components/BottomNav.tsx` — add "Logros" entry
- `server/src/routes/dashboard.ts` — add `brewLog.count()` to stats
- `client/src/admin/Dashboard.tsx` — barista widget + 5th stat card
- `client/src/pages/Recipes.tsx` — filter chips
- `client/src/components/recipes/RecipeLiveMode.tsx` — Web Audio beep
- `client/src/pages/BaristaProfile.tsx` — skeleton
- `client/src/pages/Leaderboard.tsx` — skeleton
- `client/src/pages/Shop.tsx` — skeleton

## Out of Scope

- AchievementGallery for unauthenticated users
- Admin CRUD for achievements
- Community features (upvotes, feeds)
- PWA offline brew logs
