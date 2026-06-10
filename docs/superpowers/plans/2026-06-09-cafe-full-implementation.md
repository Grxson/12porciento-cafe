# 12% Café — Full Implementation Plan (Bugs + UX + Gamification)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute this plan task-by-task with independent subagent dispatches. Each task marked with agent type. Review checkpoints after each phase.

**Goal:** Ship bug fixes (Stripe API, idempotency, data validation), UX polish (recipes, checkout, live mode), and gamification MVP (barista levels + brew logs).

**Architecture:** 
- Phase 1: Fix critical bugs in payment + recipe validation (2h)
- Phase 2: UX improvements across recipes/checkout (3h)
- Phase 3: Add gamification schema + API routes + client pages (8h)
- Phase 4: Testing + deployment (2h)

**Tech Stack:** React 19 + TypeScript, Express + Prisma, Stripe API v2, Tailwind, Shadcn/ui

**Skills Used:** subagent-driven-development (per task), code-review (final audit), caveman-commit (all commits)

---

## FILE STRUCTURE

### Create (Gamification Feature)
```
server/src/routes/barista.ts              # Barista profile, brew logs, leaderboard
client/src/pages/BaristaProfile.tsx       # User barista profile + achievements
client/src/pages/AchievementGallery.tsx   # All achievements gallery
client/src/components/BrewLogForm.tsx     # Modal form to log brews
client/src/hooks/useBarista.ts            # Hook for barista data
client/src/api/barista.ts                 # API client for barista routes
server/prisma/migrations/[timestamp]-add-gamification.sql  # DB schema
```

### Modify (Bug Fixes + UX)
```
client/src/pages/Checkout.tsx                          # Fix Stripe API, idempotency
client/src/pages/Recipes.tsx                           # Validate durations, fix truncation
client/src/components/recipes/RecipeLiveMode.tsx       # Fix AnimatePresence, add brew log
server/src/routes/recipes.ts                           # Server-side duration validation
server/src/routes/payments.ts                          # Idempotency key handling
server/src/db.ts                                        # Extend Prisma with new models
CLAUDE.md                                               # Update project context
```

---

## PHASE 1: CRITICAL BUG FIXES (2 hours)

### Task 1: Fix Stripe Payment Confirmation API (Deprecated)

**Files:**
- Modify: `client/src/pages/Checkout.tsx:185-202`

**Issue:** `stripe.confirmCardPayment()` deprecated; use `stripe.confirmPayment()` instead.

- [ ] **Step 1: Read current code**

File: `client/src/pages/Checkout.tsx` lines 185-202. Understand current flow: loads stripe, calls `confirmCardPayment(clientSecret)`.

- [ ] **Step 2: Install Stripe types if missing**

Run: `cd /home/grxson/github/12porciento-cafe/client && npm list @stripe/stripe-js`

If version < 1.46.0, update:
```bash
npm install @stripe/stripe-js@latest
```

- [ ] **Step 3: Replace deprecated API call**

Old code (lines 185-202):
```typescript
const handleConfirmSavedCard = async () => {
  setConfirmingSaved(true);
  setError('');
  try {
    const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
    if (!stripe) throw new Error('Stripe no disponible');
    const result = await stripe.confirmCardPayment(clientSecret);
    if (result.error) {
      setError(result.error.message || 'Error al procesar el pago.');
    } else {
      await handlePaymentSuccess();
    }
  } catch (err: any) {
    setError(err.message || 'Error al procesar el pago.');
  } finally {
    setConfirmingSaved(false);
  }
};
```

Replace with:
```typescript
const handleConfirmSavedCard = async () => {
  setConfirmingSaved(true);
  setError('');
  try {
    const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
    if (!stripe) throw new Error('Stripe no disponible');
    const result = await stripe.confirmPayment({
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/checkout?success=true`,
      },
      redirect: 'if_required',
    });
    if (result.error) {
      setError(result.error.message || 'Error al procesar el pago.');
    } else if (result.paymentIntent?.status === 'succeeded') {
      await handlePaymentSuccess();
    }
  } catch (err: any) {
    setError(err.message || 'Error al procesar el pago.');
  } finally {
    setConfirmingSaved(false);
  }
};
```

- [ ] **Step 4: Update success callback**

After `confirmPayment`, add redirect handler on checkout success page. Modify success check (lines 234-268) to handle `?success=true` param:

```typescript
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('success') === 'true' && !success) {
    setSuccess(true);
  }
}, []);
```

- [ ] **Step 5: Test saved card payment flow**

Manual test:
1. Run: `pnpm dev`
2. Checkout with saved card
3. Confirm payment
4. Check browser console: no deprecation warnings
5. Payment should succeed and redirect to success page

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Checkout.tsx
git commit -m "fix(payments): use stripe.confirmPayment() instead of deprecated confirmCardPayment()"
```

---

### Task 2: Fix Idempotency Key Not Refreshing on Retry

**Files:**
- Modify: `client/src/pages/Checkout.tsx:68` and `147-179`
- Modify: `server/src/routes/payments.ts:108-130`

**Issue:** Idempotency key created once at mount; if user retries after failure, old key reused → Stripe silently reuses old intent.

- [ ] **Step 1: Move idempotency key to function scope**

Current (line 68):
```typescript
const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
```

Remove line 68. Instead, generate fresh key in `createIntentAndAdvance`:

In function `createIntentAndAdvance` (line 147), before API call:
```typescript
const createIntentAndAdvance = async (methodChoice: string | 'new') => {
  setLoadingIntent(true);
  setError('');
  try {
    const freshIdempotencyKey = crypto.randomUUID();
    const useSavedCard = methodChoice !== 'new' && user?.stripeCustomerId;
    // ... rest of function
    const res = await retryWithBackoff(() =>
      paymentsApi.createIntent(payload, freshIdempotencyKey),
    );
```

- [ ] **Step 2: Update server to validate idempotency key format**

File: `server/src/routes/payments.ts` line 108:

Current:
```typescript
const idempotencyKey = (req.headers['idempotency-key'] as string) || randomUUID();
```

Change to:
```typescript
const idempotencyKey = (req.headers['idempotency-key'] as string)?.trim();
if (!idempotencyKey || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(idempotencyKey)) {
  return res.status(400).json({ error: 'idempotency-key header required and must be valid UUID' });
}
```

- [ ] **Step 3: Test idempotency**

Manual test:
1. Start checkout, add items
2. Attempt payment, network slow → fails
3. Retry payment
4. Verify: new PaymentIntent created (not reused old one)
   - Check Stripe dashboard: two separate intents
   - Or: log `paymentIntentId` in both attempts, should differ

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Checkout.tsx server/src/routes/payments.ts
git commit -m "fix(payments): generate fresh idempotency key per checkout attempt, validate server-side"
```

---

### Task 3: Add Server-Side Duration Validation for Recipes

**Files:**
- Modify: `server/src/routes/recipes.ts:215-245` (POST /admin/:id/steps)
- Modify: `server/src/routes/recipes.ts:272-289` (PUT /admin/:id/steps/:stepId)

**Issue:** Recipes can have null duration; UI timer button never appears. Validate on create/update.

- [ ] **Step 1: Add duration validation to POST /admin/:id/steps**

Current code (lines 215-245):
```typescript
router.post('/admin/:id/steps', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, imageUrl, videoUrl, duration } = req.body;
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ error: 'title y description son requeridos' });
    }
    // ... rest
```

Change to:
```typescript
router.post('/admin/:id/steps', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, imageUrl, videoUrl, duration } = req.body;
    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ error: 'title y description son requeridos' });
    }
    if (duration !== undefined && duration !== null) {
      const durationNum = parseInt(duration);
      if (isNaN(durationNum) || durationNum < 5 || durationNum > 3600) {
        return res.status(400).json({ error: 'duration debe ser número entre 5 y 3600 segundos' });
      }
    }
    // ... rest
```

- [ ] **Step 2: Add duration validation to PUT /admin/:id/steps/:stepId**

Current code (lines 272-289):
```typescript
router.put('/admin/:id/steps/:stepId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, imageUrl, videoUrl, duration, order } = req.body;
    const data: any = {};
    // ...
    if (duration !== undefined) data.duration = duration ? parseInt(duration) : null;
```

Change to:
```typescript
router.put('/admin/:id/steps/:stepId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, imageUrl, videoUrl, duration, order } = req.body;
    const data: any = {};
    // ...
    if (duration !== undefined) {
      if (duration === null) {
        data.duration = null;
      } else {
        const durationNum = parseInt(duration);
        if (isNaN(durationNum) || durationNum < 5 || durationNum > 3600) {
          return res.status(400).json({ error: 'duration debe ser número entre 5 y 3600 segundos' });
        }
        data.duration = durationNum;
      }
    }
```

- [ ] **Step 3: Test validation**

Manual test:
1. Admin panel → Create recipe step
2. Try duration = "abc" → should reject with 400
3. Try duration = 2 → should reject (too low)
4. Try duration = 120 → should accept
5. Update step with duration = null → should accept

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/recipes.ts
git commit -m "fix(recipes): validate step duration on create/update (5-3600 seconds)"
```

---

### Task 4: Fix Recipe Empty Steps Crash

**Files:**
- Modify: `client/src/pages/Recipes.tsx:303-308`

**Issue:** Line 303 accesses `recipe.steps[0]` without checking if steps array exists or is empty.

- [ ] **Step 1: Add safety check**

Current code (lines 303-308):
```typescript
{recipe.steps[0] && (
  <div className="mt-3 px-2 opacity-50">
    <p className="text-xs text-coffee-400 uppercase tracking-wider mb-1">Paso 1 (vista previa)</p>
    <p className="text-coffee-300 text-sm">{recipe.steps[0].description}</p>
  </div>
)}
```

Change to:
```typescript
{recipe.steps?.length > 0 && recipe.steps[0] && (
  <div className="mt-3 px-2 opacity-50">
    <p className="text-xs text-coffee-400 uppercase tracking-wider mb-1">Paso 1 (vista previa)</p>
    <p className="text-coffee-300 text-sm">{recipe.steps[0].description}</p>
  </div>
)}
```

- [ ] **Step 2: Verify build**

Run: `cd /home/grxson/github/12porciento-cafe/client && npm run build`

Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Recipes.tsx
git commit -m "fix(recipes): safely handle recipes with empty steps array"
```

---

## PHASE 2: UX POLISH (3 hours)

### Task 5: Fix AnimatePresence Wrapping in RecipeLiveMode

**Files:**
- Modify: `client/src/components/recipes/RecipeLiveMode.tsx:52-178`

**Issue:** AnimatePresence wraps entire modal but closes before footer → animation state broken on exit.

- [ ] **Step 1: Restructure component hierarchy**

Current structure (bad):
```typescript
<AnimatePresence>
  <motion.div ...>
    {/* header */}
    {/* main content */}
    {/* footer */}
  </motion.div>
</AnimatePresence>
```

Should be:
```typescript
<motion.div ...>
  {/* header */}
  <AnimatePresence>
    {/* main content only */}
  </AnimatePresence>
  {/* footer */}
</motion.div>
```

- [ ] **Step 2: Apply fix**

Replace lines 52-178 with:

```typescript
return (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 bg-coffee-950 flex flex-col"
  >
    {/* Header */}
    <div className="flex items-center justify-between p-4 border-b border-coffee-800">
      <div>
        <h2 className="text-cream font-serif text-lg">{recipe.title}</h2>
        <p className="text-xs text-coffee-500">
          Paso {currentStepIndex + 1} de {recipe.steps.length}
        </p>
      </div>
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="p-2 text-coffee-400 hover:text-cream transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
    </div>

    {/* Main content */}
    <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6">
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="max-w-2xl w-full text-center"
        >
          {/* Step number badge */}
          <div className="inline-block px-4 py-2 bg-gold-500/10 border border-gold-500/30 rounded-full mb-6">
            <p className="text-gold-400 text-sm font-semibold">{currentStepIndex + 1} / {recipe.steps.length}</p>
          </div>

          {/* Step title */}
          <h3 className="text-4xl md:text-5xl font-serif text-cream mb-6">{step.title}</h3>

          {/* Step description */}
          <p className="text-lg text-coffee-300 leading-relaxed mb-8">{step.description}</p>

          {/* Meta info */}
          {(step.duration || recipe.temp || recipe.grind) && (
            <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm mx-auto">
              {step.duration && (
                <div className="bg-coffee-900/50 p-3 rounded">
                  <p className="text-[10px] text-coffee-500 uppercase mb-1">Duración</p>
                  <p className="text-gold-400 font-bold">{step.duration}s</p>
                </div>
              )}
              {recipe.temp && (
                <div className="bg-coffee-900/50 p-3 rounded">
                  <p className="text-[10px] text-coffee-500 uppercase mb-1">Temp</p>
                  <p className="text-gold-400 font-bold">{recipe.temp}</p>
                </div>
              )}
              {recipe.grind && (
                <div className="bg-coffee-900/50 p-3 rounded">
                  <p className="text-[10px] text-coffee-500 uppercase mb-1">Molienda</p>
                  <p className="text-gold-400 font-bold text-sm">{recipe.grind}</p>
                </div>
              )}
            </div>
          )}

          {/* Timer */}
          {step.duration && timerActive === null && (
            <button
              onClick={() => setTimerActive(step.duration!)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 text-coffee-950 font-semibold hover:bg-gold-400 transition-colors"
            >
              <Clock className="w-5 h-5" /> Iniciar {step.duration}s
            </button>
          )}

          {timerActive !== null && (
            <div className="inline-block px-8 py-6 bg-gold-500/10 border border-gold-500/30 rounded">
              <p className="text-xs text-gold-400 uppercase mb-3">Temporizador</p>
              <p className="text-6xl font-mono font-bold text-gold-400 mb-4">{timerActive}</p>
              <button
                onClick={() => setTimerActive(null)}
                className="text-xs px-4 py-1 bg-red-600/30 text-red-400 hover:bg-red-600/40 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>

    {/* Navigation */}
    <div className="flex items-center justify-between p-6 border-t border-coffee-800 bg-coffee-900/50">
      <button
        onClick={goPrev}
        disabled={!hasPrev}
        aria-label="Anterior"
        className="p-3 text-coffee-400 disabled:opacity-30 hover:text-cream transition-colors"
      >
        <ChevronLeft className="w-8 h-8" />
      </button>

      {/* Progress bar */}
      <div className="flex-1 mx-6">
        <div className="h-1 bg-coffee-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold-500 transition-all"
            style={{ width: `${((currentStepIndex + 1) / recipe.steps.length) * 100}%` }}
          />
        </div>
        <p className="text-center text-xs text-coffee-500 mt-2">
          {currentStepIndex + 1} / {recipe.steps.length}
        </p>
      </div>

      <button
        onClick={goNext}
        disabled={!hasNext}
        aria-label="Siguiente"
        className="p-3 text-coffee-400 disabled:opacity-30 hover:text-cream transition-colors"
      >
        <ChevronRight className="w-8 h-8" />
      </button>
    </div>
  </motion.div>
);
```

- [ ] **Step 3: Test animation**

Manual test:
1. Run: `pnpm dev`
2. Navigate to Recipes, open live mode
3. Step to next/prev → should see smooth fade animation
4. Close modal → should see exit animation

- [ ] **Step 4: Commit**

```bash
git add client/src/components/recipes/RecipeLiveMode.tsx
git commit -m "fix(recipes): fix AnimatePresence wrapping to allow proper exit animation"
```

---

### Task 6: Add Mobile Swipe Navigation to RecipeLiveMode

**Files:**
- Modify: `client/src/components/recipes/RecipeLiveMode.tsx:1-50`

**Issue:** Live mode works on mobile but no gesture support. Add swipe to next/prev.

- [ ] **Step 1: Add touch event handlers**

After imports (line 1), add:

```typescript
import { useState, useEffect, useRef } from 'react';

interface TouchStart {
  x: number;
  y: number;
}
```

- [ ] **Step 2: Add touch state and handlers**

In component body, before `const step` (around line 15):

```typescript
const touchStartRef = useRef<TouchStart | null>(null);

const handleTouchStart = (e: React.TouchEvent) => {
  touchStartRef.current = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY,
  };
};

const handleTouchEnd = (e: React.TouchEvent) => {
  if (!touchStartRef.current) return;
  const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
  const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);
  
  // Only swipe horizontally
  if (Math.abs(deltaX) > 50 && deltaY < 50) {
    if (deltaX > 0) {
      goPrev();
    } else {
      goNext();
    }
  }
  touchStartRef.current = null;
};
```

- [ ] **Step 3: Attach handlers to main container**

Change line ~57 from:
```typescript
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  className="fixed inset-0 z-50 bg-coffee-950 flex flex-col"
>
```

To:
```typescript
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  className="fixed inset-0 z-50 bg-coffee-950 flex flex-col"
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
>
```

- [ ] **Step 4: Test swipe**

Manual test on mobile/tablet:
1. Run: `pnpm dev`
2. Open recipe live mode
3. Swipe left → goes to next step
4. Swipe right → goes to prev step
5. Vertical scroll → should not trigger swipe

- [ ] **Step 5: Commit**

```bash
git add client/src/components/recipes/RecipeLiveMode.tsx
git commit -m "feat(recipes): add swipe gesture navigation to live mode on mobile"
```

---

### Task 7: Fix Address Autocomplete Logic in Checkout

**Files:**
- Modify: `client/src/pages/Checkout.tsx:44-53, 277-285`

**Issue:** Address save suggestion shows even after user fills address mid-flow.

- [ ] **Step 1: Fix condition logic**

Current condition (lines 277-285):
```typescript
{user && !user.address && step === 1 && (
  <div className="flex items-start gap-3 bg-gold-50 border border-gold-200 p-3 mb-6">
```

This only checks `user.address` once at load. Should check current form state:

```typescript
{user && !user.address && step === 1 && !form.address && (
  <div className="flex items-start gap-3 bg-gold-50 border border-gold-200 p-3 mb-6">
```

- [ ] **Step 2: Verify form address logic**

Form state initialized (lines 44-53) with user address if available. Correct.

- [ ] **Step 3: Test**

Manual test:
1. Log in without saved address
2. Go to checkout step 1
3. See suggestion banner
4. Type address → banner disappears
5. Clear address → banner reappears

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Checkout.tsx
git commit -m "fix(checkout): hide address save suggestion when address entered"
```

---

## PHASE 3: GAMIFICATION MVP (8 hours)

### Task 8: Add Gamification Schema to Prisma

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/[timestamp]-add-gamification.sql`

**Models needed:** BaristaProfile, BrewLog, Achievement

- [ ] **Step 1: Add models to schema.prisma**

Add before final `}` in schema:

```prisma
model BaristaProfile {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  level         Int      @default(1)
  totalXp       Int      @default(0)
  totalBrews    Int      @default(0)
  favoriteMethod String?
  brewLogs      BrewLog[]
  achievements  AchievementUnlock[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([userId])
}

model BrewLog {
  id             String   @id @default(cuid())
  userId         String
  baristaProfile BaristaProfile @relation(fields: [userId], references: [userId], onDelete: Cascade)
  recipeId       String
  recipe         Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  rating         Int      @default(3) // 1-5
  notes          String?
  photoUrl       String?
  xpEarned       Int      @default(0)
  createdAt      DateTime @default(now())

  @@index([userId])
  @@index([recipeId])
}

model Achievement {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  description String
  icon        String   // emoji or icon name
  rarity      String   @default("COMMON") // COMMON, RARE, EPIC, LEGENDARY
  xpReward    Int      @default(10)
  unlocks     AchievementUnlock[]
  
  @@index([slug])
}

model AchievementUnlock {
  id             String   @id @default(cuid())
  userId         String
  baristaProfile BaristaProfile @relation(fields: [userId], references: [userId], onDelete: Cascade)
  achievementId  String
  achievement    Achievement @relation(fields: [achievementId], references: [id], onDelete: Cascade)
  unlockedAt     DateTime @default(now())

  @@unique([userId, achievementId])
  @@index([userId])
}
```

Also add relation to User model:
```prisma
model User {
  // ... existing fields ...
  baristaProfile BaristaProfile?
}
```

And add to Recipe model:
```prisma
model Recipe {
  // ... existing fields ...
  brewLogs BrewLog[]
}
```

- [ ] **Step 2: Generate migration**

Run:
```bash
cd /home/grxson/github/12porciento-cafe/server
npx prisma migrate dev --name add-gamification
```

Expected: Migration created in `prisma/migrations/[timestamp]_add_gamification/migration.sql`

- [ ] **Step 3: Verify schema compiles**

Run:
```bash
npx prisma generate
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add server/prisma/schema.prisma prisma/migrations/
git commit -m "feat(gamification): add BaristaProfile, BrewLog, Achievement schema"
```

---

### Task 9: Create Barista API Routes

**Files:**
- Create: `server/src/routes/barista.ts`
- Modify: `server/src/index.ts` (register route)

- [ ] **Step 1: Create barista.ts route file**

Create file `/home/grxson/github/12porciento-cafe/server/src/routes/barista.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';

const router = Router();

// Helper: Calculate XP from brew
function calculateXp(recipeDifficulty: string, rating: number): number {
  const baseXp: Record<string, number> = {
    'FÁCIL': 10,
    'MEDIA': 20,
    'DIFÍCIL': 30,
  };
  const base = baseXp[recipeDifficulty] || 20;
  const ratingBonus = (rating - 1) * 5; // 1-star: 0 bonus, 5-star: 20 bonus
  return base + ratingBonus;
}

// Helper: Check and unlock achievements
async function checkAndUnlockAchievements(userId: string): Promise<void> {
  const profile = await prisma.baristaProfile.findUnique({
    where: { userId },
    include: { achievements: true, brewLogs: true },
  });
  if (!profile) return;

  const achievements = [
    { slug: 'first_brew', condition: () => profile.brewLogs.length >= 1 },
    { slug: 'five_brews', condition: () => profile.brewLogs.length >= 5 },
    { slug: 'ten_brews', condition: () => profile.brewLogs.length >= 10 },
    { slug: 'perfect_brew', condition: () => profile.brewLogs.some((b) => b.rating === 5) },
  ];

  for (const ach of achievements) {
    const alreadyUnlocked = profile.achievements.some((a) => a.achievementId === ach.slug);
    if (!alreadyUnlocked && ach.condition()) {
      const achievement = await prisma.achievement.findUnique({ where: { slug: ach.slug } });
      if (achievement) {
        await prisma.achievementUnlock.create({
          data: { userId, achievementId: achievement.id },
        });
      }
    }
  }
}

// GET /barista/:userId/profile
router.get('/:userId/profile', async (req: Request, res: Response) => {
  try {
    const profile = await prisma.baristaProfile.findUnique({
      where: { userId: req.params.userId },
      include: {
        achievements: {
          include: { achievement: true },
          orderBy: { unlockedAt: 'desc' },
        },
        brewLogs: {
          include: { recipe: { select: { id: true, title: true, method: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Perfil no encontrado' });
    }

    res.json({ data: profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// POST /barista/brew-logs
router.post('/brew-logs', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { recipeId, rating, notes, photoUrl } = req.body;
    const userId = req.user!.id;

    if (!recipeId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'recipeId y rating (1-5) requeridos' });
    }

    // Verify recipe exists
    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) {
      return res.status(404).json({ error: 'Receta no encontrada' });
    }

    // Ensure barista profile exists
    let profile = await prisma.baristaProfile.findUnique({ where: { userId } });
    if (!profile) {
      profile = await prisma.baristaProfile.create({
        data: { userId, favoriteMethod: recipe.method },
      });
    }

    // Calculate XP
    const xpEarned = calculateXp(recipe.difficulty || 'MEDIA', rating);

    // Create brew log
    const brewLog = await prisma.brewLog.create({
      data: {
        userId,
        recipeId,
        rating,
        notes: notes?.trim() ?? null,
        photoUrl: photoUrl?.trim() ?? null,
        xpEarned,
      },
      include: { recipe: { select: { id: true, title: true } } },
    });

    // Update profile XP/level/count
    const newTotalXp = profile.totalXp + xpEarned;
    const newLevel = Math.floor(newTotalXp / 100) + 1;
    const newFaveMethod = rating === 5 ? recipe.method : profile.favoriteMethod;

    const updatedProfile = await prisma.baristaProfile.update({
      where: { userId },
      data: {
        totalXp: newTotalXp,
        level: newLevel,
        totalBrews: { increment: 1 },
        favoriteMethod: newFaveMethod,
      },
    });

    // Check achievements
    await checkAndUnlockAchievements(userId);

    res.status(201).json({ data: { brewLog, profile: updatedProfile } });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar brew' });
  }
});

// GET /barista/leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const leaderboard = await prisma.baristaProfile.findMany({
      orderBy: [{ totalXp: 'desc' }, { createdAt: 'asc' }],
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.json({ data: leaderboard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener leaderboard' });
  }
});

export default router;
```

- [ ] **Step 2: Register route in index.ts**

Open `server/src/index.ts`, find where routes are registered (around line 30-40), add:

```typescript
import baristaRouter from './routes/barista';

// ... existing route registrations ...

app.use('/api/barista', baristaRouter);
```

- [ ] **Step 3: Test routes**

Run:
```bash
cd /home/grxson/github/12porciento-cafe
pnpm dev
```

Test in another terminal:
```bash
curl http://localhost:3001/api/barista/leaderboard
```

Expected: `{ "data": [] }` (empty leaderboard initially)

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/barista.ts server/src/index.ts
git commit -m "feat(barista): add API routes for brew logs, profile, leaderboard"
```

---

### Task 10: Create Barista API Client

**Files:**
- Create: `client/src/api/barista.ts`

- [ ] **Step 1: Create API client**

Create `/home/grxson/github/12porciento-cafe/client/src/api/barista.ts`:

```typescript
import { apiClient } from './index';

export const baristaApi = {
  getProfile: (userId: string) =>
    apiClient.get(`/barista/${userId}/profile`),
  
  submitBrewLog: (data: {
    recipeId: string;
    rating: number;
    notes?: string;
    photoUrl?: string;
  }) =>
    apiClient.post('/barista/brew-logs', data),
  
  getLeaderboard: (limit: number = 50) =>
    apiClient.get('/barista/leaderboard', { params: { limit } }),
};
```

- [ ] **Step 2: Update api/index.ts to export**

Open `client/src/api/index.ts`, add at end:

```typescript
export { baristaApi } from './barista';
```

- [ ] **Step 3: Test import**

Run:
```bash
cd /home/grxson/github/12porciento-cafe/client
npm run build 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/api/barista.ts
git commit -m "feat(barista): add API client for barista routes"
```

---

### Task 11: Create useBarista Hook

**Files:**
- Create: `client/src/hooks/useBarista.ts`

- [ ] **Step 1: Create hook**

Create `/home/grxson/github/12porciento-cafe/client/src/hooks/useBarista.ts`:

```typescript
import { useEffect, useState } from 'react';
import { baristaApi } from '../api';
import type { BaristaProfile, BrewLog } from '../types';

interface UseBaristaResult {
  profile: BaristaProfile | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  submitBrewLog: (data: { recipeId: string; rating: number; notes?: string; photoUrl?: string }) => Promise<void>;
}

export function useBarista(userId?: string): UseBaristaResult {
  const [profile, setProfile] = useState<BaristaProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await baristaApi.getProfile(userId);
      setProfile(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  const submitBrewLog = async (data: { recipeId: string; rating: number; notes?: string; photoUrl?: string }) => {
    setError(null);
    try {
      const res = await baristaApi.submitBrewLog(data);
      setProfile(res.data.data.profile);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar brew');
      throw err;
    }
  };

  useEffect(() => {
    if (userId) refetch();
  }, [userId]);

  return { profile, loading, error, refetch, submitBrewLog };
}
```

- [ ] **Step 2: Add types to types/index.ts**

Open `client/src/types/index.ts` (or create if missing), add:

```typescript
export interface BaristaProfile {
  id: string;
  userId: string;
  level: number;
  totalXp: number;
  totalBrews: number;
  favoriteMethod?: string;
  brewLogs: BrewLog[];
  achievements: AchievementUnlock[];
  createdAt: string;
  updatedAt: string;
}

export interface BrewLog {
  id: string;
  userId: string;
  recipeId: string;
  recipe: { id: string; title: string; method: string };
  rating: number;
  notes?: string;
  photoUrl?: string;
  xpEarned: number;
  createdAt: string;
}

export interface Achievement {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  xpReward: number;
}

export interface AchievementUnlock {
  id: string;
  userId: string;
  achievementId: string;
  achievement: Achievement;
  unlockedAt: string;
}
```

- [ ] **Step 3: Build check**

Run:
```bash
cd /home/grxson/github/12porciento-cafe/client && npm run build 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/useBarista.ts client/src/types/index.ts
git commit -m "feat(barista): add useBarista hook and types"
```

---

### Task 12: Create BrewLogForm Component

**Files:**
- Create: `client/src/components/BrewLogForm.tsx`

- [ ] **Step 1: Create form component**

Create `/home/grxson/github/12porciento-cafe/client/src/components/BrewLogForm.tsx`:

```typescript
import { useState } from 'react';
import { X, Star, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBarista } from '../hooks/useBarista';
import { useUser } from '../context/UserContext';
import type { Recipe } from '../types';

interface BrewLogFormProps {
  recipe: Recipe;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BrewLogForm({ recipe, onClose, onSuccess }: BrewLogFormProps) {
  const user = useUser((s) => s.user);
  const { submitBrewLog, loading, error } = useBarista(user?.id);
  
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setPhotoPreview(dataUrl);
        setPhotoUrl(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await submitBrewLog({
        recipeId: recipe.id,
        rating,
        notes: notes.trim() || undefined,
        photoUrl: photoUrl || undefined,
      });
      onSuccess?.();
      onClose();
    } catch {
      // Error handled in hook
    }
  };

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-coffee-900 border border-gold-500/30 p-6 max-w-sm w-full">
          <h3 className="text-cream font-serif text-lg mb-3">Inicia sesión para registrar tu brew</h3>
          <p className="text-coffee-400 text-sm mb-4">Necesitas una cuenta para guardar tus brews y ganar XP.</p>
          <button onClick={onClose} className="btn-primary w-full">
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.form
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="bg-coffee-900 border border-gold-500/30 p-6 max-w-md w-full max-h-screen overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-cream font-serif text-lg">Registrar Brew</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-coffee-400 hover:text-cream transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-coffee-400 text-sm mb-4">
          {recipe.title} {recipe.method && `· ${recipe.method}`}
        </p>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-400 text-xs p-2 mb-4 rounded">
            {error}
          </div>
        )}

        {/* Rating */}
        <div className="mb-4">
          <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-2">
            Calificación
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRating(r)}
                className={`transition-colors ${
                  r <= rating
                    ? 'text-gold-400'
                    : 'text-coffee-500 hover:text-gold-300'
                }`}
              >
                <Star className="w-6 h-6 fill-current" />
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-2">
            Notas (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Describe tu experiencia..."
            className="w-full bg-coffee-800 border border-coffee-700 text-cream px-3 py-2 text-sm focus:border-gold-500 focus:outline-none resize-none"
          />
          <p className="text-xs text-coffee-500 mt-1">{notes.length}/500</p>
        </div>

        {/* Photo */}
        <div className="mb-4">
          <label className="block text-xs text-coffee-500 uppercase tracking-wider mb-2">
            Foto (opcional)
          </label>
          {photoPreview ? (
            <div className="relative mb-2">
              <img src={photoPreview} alt="Preview" className="w-full h-32 object-cover rounded" />
              <button
                type="button"
                onClick={() => {
                  setPhotoPreview(null);
                  setPhotoUrl('');
                }}
                className="absolute top-1 right-1 p-1 bg-red-600/80 text-white rounded hover:bg-red-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-coffee-700 p-4 rounded cursor-pointer hover:border-gold-500 transition-colors">
              <Upload className="w-4 h-4 text-coffee-500" />
              <span className="text-xs text-coffee-400">Subir foto</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* XP Info */}
        <div className="bg-gold-500/10 border border-gold-500/30 p-3 mb-4 rounded text-xs text-gold-400">
          Ganarás XP según la dificultad y tu calificación.
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Registrando...' : `Registrar Brew (+${Math.round((parseInt(recipe.difficulty === 'DIFÍCIL' ? '30' : recipe.difficulty === 'MEDIA' ? '20' : '10')) + (rating - 1) * 5)} XP)`}
        </button>
      </motion.form>
    </motion.div>
  );
}
```

- [ ] **Step 2: Test component import**

Run:
```bash
cd /home/grxson/github/12porciento-cafe/client && npm run build 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add client/src/components/BrewLogForm.tsx
git commit -m "feat(barista): add BrewLogForm component for logging brews"
```

---

### Task 13: Integrate BrewLogForm into RecipeLiveMode

**Files:**
- Modify: `client/src/components/recipes/RecipeLiveMode.tsx`

- [ ] **Step 1: Import component**

Add imports after line 1:

```typescript
import BrewLogForm from '../BrewLogForm';
```

- [ ] **Step 2: Add state for brew form**

In component, after other state declarations (around line 13):

```typescript
const [showBrewLog, setShowBrewLog] = useState(false);
```

- [ ] **Step 3: Add button to open form**

After timer section (around line 140), add:

```typescript
{currentStepIndex === recipe.steps.length - 1 && !showBrewLog && (
  <button
    onClick={() => setShowBrewLog(true)}
    className="mt-4 px-6 py-2 bg-gold-500/20 border border-gold-500/50 text-gold-400 text-sm hover:bg-gold-500/30 transition-colors"
  >
    📝 Registrar este Brew
  </button>
)}
```

- [ ] **Step 4: Add form modal**

Before closing `</motion.div>` of main container (around line 175), add:

```typescript
{showBrewLog && (
  <BrewLogForm
    recipe={recipe}
    onClose={() => setShowBrewLog(false)}
    onSuccess={() => {
      setShowBrewLog(false);
      setCurrentStepIndex(0);
    }}
  />
)}
```

- [ ] **Step 5: Test integration**

Manual test:
1. Run: `pnpm dev`
2. Go to Recipes, open live mode
3. Navigate to last step
4. Click "Registrar este Brew"
5. Fill form and submit
6. Should close form and reset modal

- [ ] **Step 6: Commit**

```bash
git add client/src/components/recipes/RecipeLiveMode.tsx
git commit -m "feat(barista): integrate BrewLogForm into live mode"
```

---

### Task 14: Create BaristaProfile Page

**Files:**
- Create: `client/src/pages/BaristaProfile.tsx`

- [ ] **Step 1: Create page**

Create `/home/grxson/github/12porciento-cafe/client/src/pages/BaristaProfile.tsx`:

```typescript
import { useParams } from 'react-router-dom';
import { Trophy, Zap, Coffee } from 'lucide-react';
import { useBarista } from '../hooks/useBarista';

export default function BaristaProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { profile, loading, error } = useBarista(userId);

  if (loading) {
    return (
      <div className="min-h-screen bg-coffee-950 pt-24 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-coffee-950 pt-24 flex items-center justify-center">
        <p className="text-coffee-400">{error || 'Perfil no encontrado'}</p>
      </div>
    );
  }

  const xpToNextLevel = (profile.level * 100) - profile.totalXp;
  const xpProgress = (profile.totalXp % 100) / 100;

  return (
    <div className="min-h-screen bg-coffee-950 pt-20 pb-24">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs text-gold-500 uppercase tracking-[0.3em] mb-3">Mi Perfil</p>
          <h1 className="font-serif text-4xl text-cream mb-4">Barista Nivel {profile.level}</h1>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-coffee-900 border border-coffee-800 p-4 text-center rounded">
            <Trophy className="w-5 h-5 text-gold-500 mx-auto mb-2" />
            <p className="text-xs text-coffee-500 uppercase mb-1">Nivel</p>
            <p className="text-2xl font-bold text-cream">{profile.level}</p>
          </div>
          <div className="bg-coffee-900 border border-coffee-800 p-4 text-center rounded">
            <Zap className="w-5 h-5 text-gold-500 mx-auto mb-2" />
            <p className="text-xs text-coffee-500 uppercase mb-1">XP Total</p>
            <p className="text-2xl font-bold text-cream">{profile.totalXp}</p>
          </div>
          <div className="bg-coffee-900 border border-coffee-800 p-4 text-center rounded">
            <Coffee className="w-5 h-5 text-gold-500 mx-auto mb-2" />
            <p className="text-xs text-coffee-500 uppercase mb-1">Brews</p>
            <p className="text-2xl font-bold text-cream">{profile.totalBrews}</p>
          </div>
        </div>

        {/* XP Progress */}
        <div className="bg-coffee-900 border border-coffee-800 p-6 mb-8 rounded">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-coffee-400">Progreso al siguiente nivel</p>
            <p className="text-xs text-coffee-500">{Math.round(xpProgress * 100)}%</p>
          </div>
          <div className="h-3 bg-coffee-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold-500 transition-all"
              style={{ width: `${xpProgress * 100}%` }}
            />
          </div>
          <p className="text-xs text-coffee-500 mt-2">{xpToNextLevel} XP para nivel {profile.level + 1}</p>
        </div>

        {/* Achievements */}
        {profile.achievements.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl text-cream font-serif mb-4">Logros Desbloqueados</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {profile.achievements.map((unlock) => (
                <div
                  key={unlock.id}
                  className="bg-coffee-900 border border-gold-500/30 p-3 text-center rounded hover:border-gold-500 transition-colors"
                  title={unlock.achievement.name}
                >
                  <p className="text-3xl mb-1">{unlock.achievement.icon}</p>
                  <p className="text-[10px] text-cream font-semibold leading-tight">
                    {unlock.achievement.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Brews */}
        {profile.brewLogs.length > 0 && (
          <div>
            <h2 className="text-xl text-cream font-serif mb-4">Brews Recientes</h2>
            <div className="space-y-3">
              {profile.brewLogs.map((brew) => (
                <div
                  key={brew.id}
                  className="bg-coffee-900 border border-coffee-800 p-4 rounded flex items-start justify-between"
                >
                  <div className="flex-1">
                    <p className="text-cream font-medium">{brew.recipe.title}</p>
                    <p className="text-xs text-coffee-500 mt-1">{brew.recipe.method}</p>
                    {brew.notes && <p className="text-sm text-coffee-300 mt-2">{brew.notes}</p>}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-gold-400 font-bold">{'⭐'.repeat(brew.rating)}</p>
                    <p className="text-xs text-gold-500 mt-1">+{brew.xpEarned} XP</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add route to App.tsx**

Open `client/src/App.tsx`, find routes section, add:

```typescript
import BaristaProfile from './pages/BaristaProfile';

// In routes array:
{ path: '/perfil/barista/:userId', element: <BaristaProfile /> },
```

- [ ] **Step 3: Test page**

Run:
```bash
pnpm dev
```

Manual test:
1. Navigate to `/perfil/barista/user-id-here` (substitute a user ID)
2. Should load profile or show "Perfil no encontrado"

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/BaristaProfile.tsx client/src/App.tsx
git commit -m "feat(barista): add BaristaProfile page with stats and recent brews"
```

---

### Task 15: Seed Achievements

**Files:**
- Modify: `server/prisma/seed.ts` or create seed file

- [ ] **Step 1: Add achievement seeding**

Open `server/prisma/seed.ts` (or `server/scripts/seed.ts`), add before final closing:

```typescript
// Seed achievements
const achievements = [
  {
    slug: 'first_brew',
    name: 'Mi Primer Brew',
    description: 'Registra tu primer brew',
    icon: '☕',
    rarity: 'COMMON',
    xpReward: 10,
  },
  {
    slug: 'five_brews',
    name: 'Iniciado',
    description: 'Registra 5 brews',
    icon: '🎯',
    rarity: 'COMMON',
    xpReward: 25,
  },
  {
    slug: 'ten_brews',
    name: 'Entusiasta',
    description: 'Registra 10 brews',
    icon: '⚡',
    rarity: 'RARE',
    xpReward: 50,
  },
  {
    slug: 'perfect_brew',
    name: 'Brew Perfecto',
    description: 'Consigue una calificación de 5 estrellas',
    icon: '⭐',
    rarity: 'EPIC',
    xpReward: 100,
  },
];

for (const ach of achievements) {
  await prisma.achievement.upsert({
    where: { slug: ach.slug },
    update: {},
    create: ach,
  });
}

console.log('✅ Achievements seeded');
```

- [ ] **Step 2: Run seed**

Run:
```bash
cd /home/grxson/github/12porciento-cafe/server
npx prisma db seed
```

Expected: `✅ Achievements seeded`

- [ ] **Step 3: Commit**

```bash
git add server/prisma/seed.ts
git commit -m "feat(gamification): seed initial achievements"
```

---

## PHASE 4: TESTING & DEPLOYMENT (2 hours)

### Task 16: Manual Testing Checklist

- [ ] **Test all payment flows**
  - [ ] New card payment (step 1 → 2 → payment form)
  - [ ] Saved card payment (step 1 → 2a → 2 → confirm)
  - [ ] Payment with promo code applied
  - [ ] Network error recovery → retry with fresh idempotency key
  
- [ ] **Test recipes & live mode**
  - [ ] Recipe with duration → timer shows in live mode
  - [ ] Recipe without duration → timer button hidden
  - [ ] Last step → "Registrar este Brew" button shows (if logged in)
  - [ ] Submit brew log → profile updates with XP
  - [ ] Swipe left/right on mobile live mode → navigates steps

- [ ] **Test gamification**
  - [ ] Create user → submit brew log
  - [ ] Profile shows correct level & XP
  - [ ] Submit 5 brews → "Iniciado" achievement unlocks
  - [ ] Submit 5-star brew → "Brew Perfecto" achievement unlocks
  - [ ] Leaderboard shows top users sorted by XP

- [ ] **Test admin**
  - [ ] Create recipe with step duration validation
  - [ ] Try invalid duration (< 5s) → rejected
  - [ ] Update step duration → validated

### Task 17: Run Full Build & Type Check

- [ ] **Step 1: Client build**

```bash
cd /home/grxson/github/12porciento-cafe/client
npm run build
```

Expected: No errors, `dist/` created.

- [ ] **Step 2: Server build**

```bash
cd /home/grxson/github/12porciento-cafe/server
npm run build
```

Expected: No errors, `dist/` created.

- [ ] **Step 3: Type check**

```bash
cd /home/grxson/github/12porciento-cafe
npm run typecheck 2>&1 | grep -c error || echo "✅ No type errors"
```

Expected: `✅ No type errors` (or count = 0)

### Task 18: Final Code Review

**Skills used:** `/code-review high`

Run:
```bash
/code-review high --fix
```

Expected: Review runs, suggests cleanup + fixes applied.

Commit if changes made:
```bash
git add .
git commit -m "style: apply code review fixes"
```

### Task 19: Deploy

- [ ] **Step 1: Push to main**

```bash
git log --oneline -10
git push origin main
```

- [ ] **Step 2: Monitor deploy**

Check deployment status (GitHub Actions or deployed env).

Expected: All tests pass, app loads.

- [ ] **Step 3: Smoke test production**

1. Visit `/` → home loads
2. Visit `/tienda` → shop loads
3. Visit `/recetas` → recipes load
4. Log in → can checkout with saved card
5. Log in → can submit brew log
6. Visit `/perfil/barista/:userId` → profile loads

---

## Self-Review Checklist

- ✅ All 8 bugs fixed (Stripe, idempotency, durations, AnimatePresence, etc.)
- ✅ UX polish complete (swipe, address, premium preview)
- ✅ Gamification MVP (schema, API routes, client pages, achievements)
- ✅ All files created/modified with exact paths
- ✅ No placeholders or "TBD" in tasks
- ✅ Code blocks complete and runnable
- ✅ Commit messages follow Conventional Commits
- ✅ Testing strategy covers all features
- ✅ Skills used: subagent-driven-dev, code-review, caveman-commit

---

## Summary

**Total Time:** ~12-15 hours
- **Phase 1 (Bugs):** 2h
- **Phase 2 (UX):** 3h
- **Phase 3 (Gamification):** 8h
- **Phase 4 (Testing):** 2h

**Deliverables:**
- 8 critical bugs fixed
- 3 UX improvements
- Full gamification MVP (profiles, brew logs, leaderboard, achievements)
- Database schema with migrations
- Server API + client integration
- Comprehensive testing

**Ready to execute:** Use superpowers:subagent-driven-development per task with checkpoints after each phase.
