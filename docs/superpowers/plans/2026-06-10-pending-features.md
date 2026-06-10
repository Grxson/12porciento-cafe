# Pending Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 5 pending features in one PR: AchievementGallery page, admin barista leaderboard widget, Recipes filter chips, Web Audio timer beep, and loading skeletons.

**Architecture:** All changes are additive. New server endpoint for achievements list, new client page for `/logros`, UI-only changes for filter chips and skeletons, audio replacement in two files.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Node/Express, Prisma/SQLite, jsonwebtoken

---

## File Map

**Create:**
- `client/src/pages/AchievementGallery.tsx` — `/logros` page, UserRoute

**Modify:**
- `server/src/routes/barista.ts` — add `GET /achievements` (optional-auth, returns all achievements + unlockedAt per user)
- `server/src/routes/dashboard.ts` — add `prisma.brewLog.count()` to stats query
- `client/src/types/index.ts` — add `AchievementWithUnlock`, add `totalBrews` to `DashboardStats`
- `client/src/api/barista.ts` — add `getAchievements()`
- `client/src/App.tsx` — add `/logros` UserRoute
- `client/src/components/Navbar.tsx` — add "Logros" to `links` array
- `client/src/admin/Dashboard.tsx` — add 5th stat card + barista leaderboard widget
- `client/src/pages/Recipes.tsx` — add filter chips + replace base64 WAV with Web Audio
- `client/src/components/recipes/RecipeLiveMode.tsx` — replace base64 WAV with Web Audio
- `client/src/pages/BaristaProfile.tsx` — replace spinner with skeleton
- `client/src/pages/Leaderboard.tsx` — replace spinner with skeleton rows

---

## Task 1: Server — achievements endpoint

**Files:**
- Modify: `server/src/routes/barista.ts`

- [ ] **Step 1: Add jwt import to barista.ts**

Add to the imports at the top of `server/src/routes/barista.ts`:

```typescript
import jwt from 'jsonwebtoken';
```

- [ ] **Step 2: Add GET /achievements route**

Insert before the last `export default router;` line in `server/src/routes/barista.ts`:

```typescript
router.get('/achievements', async (req: Request, res: Response) => {
  try {
    let userId: string | null = null;
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { id: string; role: string };
        if (payload.role === 'USER') userId = payload.id;
      } catch {}
    }

    const achievements = await prisma.achievement.findMany({
      orderBy: { xpReward: 'asc' },
    });

    const unlockMap = new Map<string, string>();
    if (userId) {
      const unlocks = await prisma.achievementUnlock.findMany({
        where: { userId },
        select: { achievementId: true, unlockedAt: true },
      });
      unlocks.forEach((u) => unlockMap.set(u.achievementId, u.unlockedAt.toISOString()));
    }

    const result = achievements.map((a) => ({
      ...a,
      unlockedAt: unlockMap.get(a.id) ?? null,
    }));

    res.json({ achievements: result });
  } catch {
    res.status(500).json({ error: 'Error al obtener logros' });
  }
});
```

- [ ] **Step 3: Add totalBrews to dashboard stats**

In `server/src/routes/dashboard.ts`, add `prisma.brewLog.count()` to the `Promise.all` destructuring:

```typescript
const [
  totalOrders,
  ordersThisMonth,
  ordersThisWeek,
  revenueAggregate,
  revenueMonthAggregate,
  activeSubscriptions,
  totalProducts,
  lowStockProducts,
  recentOrders,
  pendingReviews,
  totalBrews,
] = await Promise.all([
  prisma.order.count(),
  prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
  prisma.order.count({ where: { createdAt: { gte: startOfWeek } } }),
  prisma.order.aggregate({ _sum: { total: true } }),
  prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: startOfMonth } } }),
  prisma.subscription.count({ where: { status: 'ACTIVE' } }),
  prisma.product.count({ where: { isActive: true } }),
  prisma.product.findMany({ where: { stock: { lte: 10 }, isActive: true }, select: { name: true, stock: true } }),
  prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { items: { include: { product: { select: { name: true } } } } },
  }),
  prisma.review.count({ where: { isApproved: false } }),
  prisma.brewLog.count(),
]);
```

Then add `totalBrews` to the `res.json(...)` call:

```typescript
res.json({
  totalOrders,
  ordersThisMonth,
  ordersThisWeek,
  totalRevenue,
  revenueThisMonth,
  activeSubscriptions,
  totalProducts,
  lowStockProducts,
  recentOrders,
  pendingReviews,
  totalBrews,
});
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/barista.ts server/src/routes/dashboard.ts
git commit -m "feat(barista): add GET /achievements endpoint + totalBrews to dashboard stats"
```

---

## Task 2: Client types + API

**Files:**
- Modify: `client/src/types/index.ts`
- Modify: `client/src/api/barista.ts`

- [ ] **Step 1: Add AchievementWithUnlock type and totalBrews to DashboardStats**

In `client/src/types/index.ts`, add after the `Achievement` interface (around line 235):

```typescript
export interface AchievementWithUnlock extends Achievement {
  unlockedAt: string | null;
}
```

Also update `DashboardStats` to include `totalBrews`:

```typescript
export interface DashboardStats {
  totalOrders: number;
  ordersThisMonth: number;
  ordersThisWeek: number;
  totalRevenue: number;
  revenueThisMonth: number;
  activeSubscriptions: number;
  totalProducts: number;
  totalBrews: number;
  pendingReviews: number;
  lowStockProducts: { name: string; stock: number }[];
  recentOrders: Order[];
}
```

- [ ] **Step 2: Add getAchievements to baristaApi**

In `client/src/api/barista.ts`, add to the `baristaApi` object:

```typescript
getAchievements: () =>
  api.get('/barista/achievements'),
```

- [ ] **Step 3: Commit**

```bash
git add client/src/types/index.ts client/src/api/barista.ts
git commit -m "feat(barista): add AchievementWithUnlock type + getAchievements API method"
```

---

## Task 3: AchievementGallery page + routing + nav

**Files:**
- Create: `client/src/pages/AchievementGallery.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/Navbar.tsx`

- [ ] **Step 1: Create AchievementGallery.tsx**

```typescript
import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import { baristaApi } from '../api';
import type { AchievementWithUnlock } from '../types';

const rarityConfig: Record<string, { label: string; color: string }> = {
  COMMON:    { label: 'Común',     color: 'text-coffee-400 bg-coffee-800/60' },
  RARE:      { label: 'Raro',      color: 'text-blue-400 bg-blue-900/30' },
  EPIC:      { label: 'Épico',     color: 'text-purple-400 bg-purple-900/30' },
  LEGENDARY: { label: 'Legendario', color: 'text-gold-400 bg-gold-500/10' },
};

function AchievementSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-coffee-900 border border-coffee-800 p-5 space-y-3">
          <div className="shimmer-dark w-10 h-10 rounded-full" />
          <div className="shimmer-dark h-4 w-3/4" />
          <div className="shimmer-dark h-3 w-full" />
          <div className="shimmer-dark h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export default function AchievementGallery() {
  const [achievements, setAchievements] = useState<AchievementWithUnlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    baristaApi.getAchievements()
      .then((res) => setAchievements(res.data.achievements))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unlocked = achievements.filter((a) => a.unlockedAt !== null).length;

  return (
    <div className="min-h-screen bg-coffee-950 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs text-gold-500 uppercase tracking-[0.3em] mb-3">Colección</p>
          <h1 className="font-serif text-4xl text-cream mb-2">Mis Logros</h1>
          {!loading && (
            <p className="text-coffee-400 text-sm">
              {unlocked} / {achievements.length} desbloqueados
            </p>
          )}
        </div>

        {loading ? (
          <AchievementSkeleton />
        ) : achievements.length === 0 ? (
          <p className="text-center text-coffee-500 py-12">No hay logros disponibles aún.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {achievements.map((a) => {
              const rarity = rarityConfig[a.rarity] ?? rarityConfig.COMMON;
              const isUnlocked = a.unlockedAt !== null;
              return (
                <div
                  key={a.id}
                  className={`bg-coffee-900 border p-5 transition-colors ${
                    isUnlocked ? 'border-gold-500/30' : 'border-coffee-800'
                  }`}
                >
                  <div className="relative w-12 h-12 flex items-center justify-center mb-3">
                    <span
                      className={`text-3xl select-none ${isUnlocked ? '' : 'grayscale opacity-40'}`}
                    >
                      {a.icon}
                    </span>
                    {!isUnlocked && (
                      <Lock className="absolute -bottom-1 -right-1 w-4 h-4 text-coffee-600" />
                    )}
                  </div>

                  <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 ${rarity.color}`}>
                    {rarity.label}
                  </span>

                  <h3 className={`font-serif text-base mt-2 mb-1 ${isUnlocked ? 'text-cream' : 'text-coffee-600'}`}>
                    {a.name}
                  </h3>
                  <p className="text-coffee-500 text-xs leading-relaxed mb-3">{a.description}</p>

                  {isUnlocked ? (
                    <div className="text-xs text-gold-500">
                      +{a.xpReward} XP · {new Date(a.unlockedAt!).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  ) : (
                    <div className="text-xs text-coffee-600">+{a.xpReward} XP al desbloquear</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add route in App.tsx**

In `client/src/App.tsx`, add the import after the Leaderboard import:

```typescript
import AchievementGallery from './pages/AchievementGallery';
```

Add the route after the leaderboard route:

```typescript
<Route
  path="/logros"
  element={
    <UserRoute>
      <PublicLayout><AchievementGallery /></PublicLayout>
    </UserRoute>
  }
/>
```

- [ ] **Step 3: Add "Logros" to Navbar**

In `client/src/components/Navbar.tsx`, update the `links` array:

```typescript
const links = [
  { to: '/tienda', label: 'Tienda' },
  { to: '/recetas', label: 'Recetas' },
  { to: '/leaderboard', label: 'Ranking' },
  { to: '/logros', label: 'Logros' },
  { to: '/suscripciones', label: 'Suscripciones' },
  { to: '/nosotros', label: 'Nosotros' },
  { to: '/quiz', label: 'Quiz' },
];
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/AchievementGallery.tsx client/src/App.tsx client/src/components/Navbar.tsx
git commit -m "feat(barista): add AchievementGallery page at /logros"
```

---

## Task 4: Admin Dashboard — barista widget + stat card

**Files:**
- Modify: `client/src/admin/Dashboard.tsx`

- [ ] **Step 1: Add barista imports + state**

In `client/src/admin/Dashboard.tsx`, update the existing api import (line 12) to include baristaApi:

```typescript
import { dashboardApi, baristaApi } from '../api';
```

Inside the `Dashboard` component, after the existing state declarations, add:

```typescript
const [topBaristas, setTopBaristas] = useState<{
  userId: string;
  level: number;
  totalXp: number;
  totalBrews: number;
  user: { id: string; name: string };
}[]>([]);
```

Add a second `useEffect` after the existing one:

```typescript
useEffect(() => {
  baristaApi.getLeaderboard(10)
    .then((res) => setTopBaristas(res.data.data))
    .catch(() => {});
}, []);
```

- [ ] **Step 2: Add "Brews registrados" stat card**

The `cards` array currently has 4 items. The grid is `xl:grid-cols-4`. Change both:

Replace `xl:grid-cols-4` with `xl:grid-cols-5` in the stat cards grid div:

```typescript
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
```

Add a 5th card to the `cards` array (after the last item in the array):

```typescript
{
  label: 'Brews registrados',
  value: stats.totalBrews ?? 0,
  sub: 'En el sistema',
  icon: Coffee,
  trend: null,
  accent: false,
},
```

Also add `Coffee` to the lucide-react import:

```typescript
import {
  TrendingUp, ShoppingBag, Users, Star, AlertTriangle, ArrowUpRight,
  Package, Gift, Tag, Plus, Coffee,
} from 'lucide-react';
```

- [ ] **Step 3: Add barista leaderboard widget**

Add this section at the end of the returned JSX, after the bottom row closing `</div>` (before the outer closing `</div>`):

```typescript
{/* Barista leaderboard */}
<div className="bg-coffee-900 border border-coffee-800 p-6">
  <h2 className="font-serif text-xl text-cream mb-5 flex items-center gap-2">
    <Coffee className="w-4 h-4 text-gold-500/60" />
    Top Baristas
  </h2>
  {topBaristas.length === 0 ? (
    <p className="text-coffee-500 text-sm">Sin brews registrados aún.</p>
  ) : (
    <div className="space-y-2">
      {topBaristas.map((b, i) => (
        <Link
          key={b.userId}
          to={`/perfil/barista/${b.userId}`}
          className="flex items-center justify-between py-2.5 border-b border-coffee-800 last:border-0 hover:bg-coffee-800/30 -mx-2 px-2 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-coffee-500 text-xs w-5 text-right">{i + 1}</span>
            <div>
              <p className="text-cream text-sm font-medium">{b.user.name}</p>
              <p className="text-coffee-500 text-xs">{b.totalBrews} brews</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-gold-500 text-xs font-semibold">Nv. {b.level}</span>
            <p className="text-coffee-500 text-xs">{b.totalXp} XP</p>
          </div>
        </Link>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 4: Commit**

```bash
git add client/src/admin/Dashboard.tsx
git commit -m "feat(admin): add barista leaderboard widget + totalBrews stat card to dashboard"
```

---

## Task 5: Recipes filter chips

**Files:**
- Modify: `client/src/pages/Recipes.tsx`

- [ ] **Step 1: Add filter chips JSX**

In `client/src/pages/Recipes.tsx`, after the method filter buttons `</div>` (around line 219), insert:

```typescript
{(methodFilter !== 'TODOS' || search !== '') && (
  <div className="flex flex-wrap gap-2 items-center mb-4 -mt-6">
    {methodFilter !== 'TODOS' && (
      <button
        onClick={() => setMethodFilter('TODOS')}
        className="flex items-center gap-1.5 px-3 py-1 bg-coffee-800 border border-gold-500/30 text-cream text-xs hover:bg-coffee-700 transition-colors"
      >
        {methodFilter}
        <span className="text-coffee-400 hover:text-cream">×</span>
      </button>
    )}
    {search !== '' && (
      <button
        onClick={() => setSearch('')}
        className="flex items-center gap-1.5 px-3 py-1 bg-coffee-800 border border-gold-500/30 text-cream text-xs hover:bg-coffee-700 transition-colors"
      >
        "{search}"
        <span className="text-coffee-400 hover:text-cream">×</span>
      </button>
    )}
    {methodFilter !== 'TODOS' && search !== '' && (
      <button
        onClick={() => { setMethodFilter('TODOS'); setSearch(''); }}
        className="text-xs text-coffee-500 hover:text-coffee-300 underline transition-colors"
      >
        Limpiar todo
      </button>
    )}
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/Recipes.tsx
git commit -m "feat(recipes): add active filter chips with clear controls"
```

---

## Task 6: Web Audio timer beep

**Files:**
- Modify: `client/src/components/recipes/RecipeLiveMode.tsx`
- Modify: `client/src/pages/Recipes.tsx`

The same silent base64 WAV is used in two places.

- [ ] **Step 1: Replace audio in RecipeLiveMode.tsx**

In `client/src/components/recipes/RecipeLiveMode.tsx`, replace lines ~39-44:

```typescript
          if (typeof Audio !== 'undefined') {
            new Audio(
              'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA=='
            )
              .play()
              .catch(() => {});
          }
```

With:

```typescript
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
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

- [ ] **Step 2: Replace audio in Recipes.tsx**

In `client/src/pages/Recipes.tsx`, replace lines ~145-147:

```typescript
          if (typeof Audio !== 'undefined') {
            new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==').play().catch(() => {});
          }
```

With:

```typescript
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
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

- [ ] **Step 3: Commit**

```bash
git add client/src/components/recipes/RecipeLiveMode.tsx client/src/pages/Recipes.tsx
git commit -m "fix(audio): replace silent base64 WAV with Web Audio API beep in timer"
```

---

## Task 7: Loading skeletons

**Files:**
- Modify: `client/src/pages/Recipes.tsx`
- Modify: `client/src/pages/BaristaProfile.tsx`
- Modify: `client/src/pages/Leaderboard.tsx`

Note: `Shop.tsx` already has a `ShopSkeleton` component — no change needed there.

- [ ] **Step 1: Recipes skeleton**

In `client/src/pages/Recipes.tsx`, replace the `if (loading)` block (around lines 176-182):

```typescript
if (loading) {
  return (
    <div className="min-h-screen bg-coffee-950 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12 space-y-3">
          <div className="shimmer-dark h-3 w-32 mx-auto" />
          <div className="shimmer-dark h-9 w-48 mx-auto" />
          <div className="shimmer-dark h-4 w-64 mx-auto" />
        </div>
        <div className="shimmer-dark h-10 w-full mb-10" />
        <div className="flex gap-2 justify-center mb-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shimmer-dark h-7 w-20" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-coffee-900 border border-coffee-800 p-6 space-y-3">
              <div className="flex gap-3">
                <div className="shimmer-dark h-5 w-16" />
                <div className="shimmer-dark h-5 w-12" />
              </div>
              <div className="shimmer-dark h-7 w-2/3" />
              <div className="shimmer-dark h-4 w-full" />
              <div className="shimmer-dark h-4 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: BaristaProfile skeleton**

In `client/src/pages/BaristaProfile.tsx`, replace the `if (loading)` block (lines 12-18):

```typescript
if (loading) {
  return (
    <div className="min-h-screen bg-coffee-950 pt-20 pb-24">
      <div className="max-w-2xl mx-auto px-4 space-y-6">
        <div className="flex items-center gap-4 pt-6">
          <div className="shimmer-dark w-16 h-16 rounded-full" />
          <div className="space-y-2 flex-1">
            <div className="shimmer-dark h-6 w-40" />
            <div className="shimmer-dark h-4 w-24" />
          </div>
        </div>
        <div className="shimmer-dark h-3 w-full rounded-full" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-coffee-900 border border-coffee-800 p-4 space-y-2">
              <div className="shimmer-dark h-7 w-12" />
              <div className="shimmer-dark h-3 w-full" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-coffee-900 border border-coffee-800 p-4 space-y-2">
              <div className="shimmer-dark h-4 w-3/4" />
              <div className="shimmer-dark h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Leaderboard skeleton**

In `client/src/pages/Leaderboard.tsx`, replace the loading spinner block (lines ~39-43):

```typescript
{loading && (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center justify-between py-3 border-b border-coffee-800">
        <div className="flex items-center gap-4">
          <div className="shimmer-dark w-6 h-4" />
          <div className="shimmer-dark w-8 h-8 rounded-full" />
          <div className="space-y-1">
            <div className="shimmer-dark h-4 w-32" />
            <div className="shimmer-dark h-3 w-20" />
          </div>
        </div>
        <div className="space-y-1 text-right">
          <div className="shimmer-dark h-4 w-16" />
          <div className="shimmer-dark h-3 w-12" />
        </div>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Recipes.tsx client/src/pages/BaristaProfile.tsx client/src/pages/Leaderboard.tsx
git commit -m "feat(ux): replace loading spinners with skeleton screens in Recipes, BaristaProfile, Leaderboard"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run type check**

```bash
cd /home/grxson/github/12porciento-cafe && pnpm --filter client tsc --noEmit
```

Expected: no errors

- [ ] **Step 2: Run tests**

```bash
pnpm --filter client test --run
```

Expected: all passing (no changes to tested components except RecipeLiveMode timer — mock AudioContext if test fails)

- [ ] **Step 3: Start dev server and verify manually**

```bash
pnpm dev
```

Verify in browser:
1. `/logros` — shows achievement cards, locked/unlocked states
2. `/admin/dashboard` — shows 5 stat cards including "Brews registrados" + top baristas widget
3. `/recetas` — filter + search active → chips appear, X clears each filter
4. `/recetas` → open recipe → start timer → timer reaches 0 → beep plays (open browser console, no AudioContext errors)
5. `/recetas` (loading) → skeleton grid shows instead of spinner
6. `/perfil/barista/:id` (loading) → skeleton shows
7. `/leaderboard` (loading) → skeleton rows show

- [ ] **Step 4: Final commit if any cleanup needed**

```bash
git add -p  # stage any cleanup
git commit -m "chore: post-feature cleanup"
```
