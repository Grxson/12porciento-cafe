# Recipes UX Polish — Search + Step Timer + Live Mode

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve Recipes page with real-time search, interactive step timer, and full-screen "live mode" for following recipes hands-on.

**Architecture:** Add search filter + timer state to Recipes.tsx, create new `<RecipeLiveMode>` modal component (fullscreen step-by-step view), extend Recipes.tsx to mount it. No database changes. Pure UX/UI + client state.

**Tech Stack:** React, TypeScript, Tailwind, Framer Motion, lucide-react icons.

---

## File Structure

```
client/src/
  pages/
    Recipes.tsx                      (MODIFY — add search input, live mode button, state)
  components/
    recipes/
      RecipeLiveMode.tsx             (NEW — fullscreen step follower + timer)
      __tests__/
        RecipeLiveMode.test.tsx      (NEW — tests for timer, step nav, close)
```

No migrations, no new API endpoints, no new types (reuse Recipe/RecipeStep from existing).

---

## FEATURE 1: Search

### Task 1a: Add search input + filter logic to Recipes.tsx

**Files:**
- Modify: `client/src/pages/Recipes.tsx` (lines ~127–137, filter state)

Steps:

- [ ] **Step 1: Add search state and input**

In Recipes.tsx, after `methodFilter` state (line 127), add:
```typescript
const [search, setSearch] = useState<string>('');
```

Then in the JSX (line 168, before method buttons), insert search input:
```tsx
<div className="mb-10">
  <input
    type="text"
    placeholder="Buscar recetas por nombre, método..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="w-full px-4 py-2 bg-coffee-900 border border-coffee-700 text-cream placeholder-coffee-500 focus:outline-none focus:border-gold-500 transition-colors text-sm"
  />
</div>
```

- [ ] **Step 2: Update filter logic to include search**

Replace line 137 (const filtered) with:
```typescript
const filtered = methodFilter === 'TODOS' 
  ? recipes 
  : recipes.filter((r) => r.method === methodFilter);

const searched = filtered.filter((r) =>
  search === '' || 
  r.title.toLowerCase().includes(search.toLowerCase()) ||
  r.method.toLowerCase().includes(search.toLowerCase()) ||
  r.description?.toLowerCase().includes(search.toLowerCase())
);
```

- [ ] **Step 3: Use `searched` instead of `filtered` in render**

Replace line 139 (`const visible = hasSubscription...`) to use `searched` instead of `filtered`:
```typescript
const visible = hasSubscription
  ? searched
  : (() => {
      const free = searched.filter((r) => !r.isPremium);
      const premium = searched.filter((r) => r.isPremium);
      return [...free.slice(0, 2), ...premium];
    })();

const freeLimit = !hasSubscription && searched.filter((r) => !r.isPremium).length > 2;
```

- [ ] **Step 4: Build + type check**

```bash
cd client && pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /home/grxson/github/12porciento-cafe
git add client/src/pages/Recipes.tsx
git commit -m "feat(recipes): add real-time search filter by name, method, description"
```

**Acceptance:** Search input visible, typing filters recipes in real-time, builds without errors.

---

## FEATURE 2: Step Timer

### Task 2a: Add timer state + UI to Recipes.tsx (existing accordion expand)

**Files:**
- Modify: `client/src/pages/Recipes.tsx` (lines ~122–145, expanded view)

Steps:

- [ ] **Step 1: Add timer state**

After `methodFilter` state (line 127), add:
```typescript
const [timerState, setTimerState] = useState<{ recipeId: string; stepIndex: number; secondsLeft: number } | null>(null);
```

- [ ] **Step 2: Add useEffect for timer countdown**

Add after `useEffect` for recipes load (line 129–134):
```typescript
useEffect(() => {
  if (!timerState || timerState.secondsLeft <= 0) return;
  const interval = setInterval(() => {
    setTimerState((prev) => {
      if (!prev || prev.secondsLeft <= 1) {
        // Timer finished — play sound, clear state
        if (typeof Audio !== 'undefined') {
          new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==').play().catch(() => {});
        }
        return null;
      }
      return { ...prev, secondsLeft: prev.secondsLeft - 1 };
    });
  }, 1000);
  return () => clearInterval(interval);
}, [timerState]);
```

- [ ] **Step 3: Add timer button + display in step**

In the expanded step view (line 292–313), after the step title/description, insert:
```tsx
{step.duration && !timerState?.recipeId && (
  <button
    onClick={() => setTimerState({ recipeId: recipe.id, stepIndex: i, secondsLeft: step.duration! })}
    className="mt-2 flex items-center gap-1 px-3 py-1 bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs hover:bg-gold-500/20 transition-colors"
  >
    <Clock className="w-3 h-3" /> Iniciar temporizador ({step.duration}s)
  </button>
)}

{timerState?.recipeId === recipe.id && timerState?.stepIndex === i && (
  <div className="mt-3 p-3 bg-gold-500/10 border border-gold-500/30 rounded">
    <div className="text-center">
      <p className="text-xs text-gold-400 uppercase tracking-wider mb-1">Temporizador activo</p>
      <p className="text-3xl font-bold text-gold-400 font-mono">{timerState.secondsLeft}s</p>
    </div>
    <button
      onClick={() => setTimerState(null)}
      className="mt-2 w-full px-3 py-1 bg-red-600/30 border border-red-600/50 text-red-400 text-xs hover:bg-red-600/40 transition-colors"
    >
      Cancelar
    </button>
  </div>
)}
```

- [ ] **Step 4: Build + type check**

```bash
cd client && pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd /home/grxson/github/12porciento-cafe
git add client/src/pages/Recipes.tsx
git commit -m "feat(recipes): add step timer with countdown audio alert"
```

**Acceptance:** Timer button appears on steps with duration, countdown works, finishes with sound, can cancel.

---

## FEATURE 3: Live Mode (Fullscreen Step Follower)

### Task 3a: Create RecipeLiveMode component + tests

**Files:**
- Create: `client/src/components/recipes/RecipeLiveMode.tsx`
- Create: `client/src/components/recipes/__tests__/RecipeLiveMode.test.tsx`

Steps:

- [ ] **Step 1: Write failing test**

Create `client/src/components/recipes/__tests__/RecipeLiveMode.test.tsx`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import RecipeLiveMode from '../RecipeLiveMode';
import type { Recipe } from '../../types';

const mockRecipe: Recipe = {
  id: '1',
  title: 'Espresso Perfecto',
  slug: 'espresso-perfecto',
  method: 'Espresso',
  difficulty: 'MEDIA',
  isPremium: false,
  isPublished: true,
  description: 'Test',
  steps: [
    { id: 's1', title: 'Paso 1', description: 'Moler', order: 1, duration: 30 },
    { id: 's2', title: 'Paso 2', description: 'Extraer', order: 2, duration: 25 },
  ],
  product: null,
  temp: '90°C',
  grind: 'Medio',
  ratio: '1:2',
  yield: '30ml',
  prepTime: 5,
};

describe('RecipeLiveMode', () => {
  it('renders current step full-screen', () => {
    render(<RecipeLiveMode recipe={mockRecipe} onClose={() => {}} />);
    expect(screen.getByText('Paso 1')).toBeInTheDocument();
    expect(screen.getByText('Moler')).toBeInTheDocument();
  });

  it('advances to next step on next button click', () => {
    render(<RecipeLiveMode recipe={mockRecipe} onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText(/siguiente/i));
    expect(screen.getByText('Paso 2')).toBeInTheDocument();
    expect(screen.getByText('Extraer')).toBeInTheDocument();
  });

  it('goes back to previous step on prev button click', () => {
    render(<RecipeLiveMode recipe={mockRecipe} onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText(/siguiente/i));
    fireEvent.click(screen.getByLabelText(/anterior/i));
    expect(screen.getByText('Paso 1')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<RecipeLiveMode recipe={mockRecipe} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText(/cerrar/i));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

```bash
cd client && pnpm test RecipeLiveMode.test.tsx --run
```
Expected: FAIL — "RecipeLiveMode not found"

- [ ] **Step 3: Implement RecipeLiveMode component**

Create `client/src/components/recipes/RecipeLiveMode.tsx`:
```typescript
import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Recipe } from '../../types';

interface RecipeLiveModePropss {
  recipe: Recipe;
  onClose: () => void;
}

export default function RecipeLiveMode({ recipe, onClose }: RecipeLiveModePropss) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timerActive, setTimerActive] = useState<number | null>(null);

  const step = recipe.steps[currentStepIndex];
  const hasNext = currentStepIndex < recipe.steps.length - 1;
  const hasPrev = currentStepIndex > 0;

  const goNext = () => {
    if (hasNext) setCurrentStepIndex(c => c + 1);
  };

  const goPrev = () => {
    if (hasPrev) setCurrentStepIndex(c => c - 1);
  };

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
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full text-center"
        >
          {/* Step number badge */}
          <div className="inline-block px-4 py-2 bg-gold-500/10 border border-gold-500/30 rounded-full mb-6">
            <p className="text-gold-400 text-sm font-semibold">Paso {currentStepIndex + 1}</p>
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
}
```

- [ ] **Step 4: Run test to verify pass**

```bash
cd client && pnpm test RecipeLiveMode.test.tsx --run
```
Expected: PASS (4 tests).

- [ ] **Step 5: Add timer countdown effect**

Add useEffect after state declarations in RecipeLiveMode.tsx:
```typescript
useEffect(() => {
  if (timerActive === null || timerActive <= 0) return;
  const interval = setInterval(() => {
    setTimerActive((t) => {
      if (t && t <= 1) {
        if (typeof Audio !== 'undefined') {
          new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==').play().catch(() => {});
        }
        return null;
      }
      return t ? t - 1 : null;
    });
  }, 1000);
  return () => clearInterval(interval);
}, [timerActive]);
```

Add import at top:
```typescript
import { useState, useEffect } from 'react';
```

- [ ] **Step 6: Build + type check**

```bash
cd client && pnpm tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd /home/grxson/github/12porciento-cafe
git add client/src/components/recipes/RecipeLiveMode.tsx client/src/components/recipes/__tests__/RecipeLiveMode.test.tsx
git commit -m "feat(recipes): add fullscreen live mode for step-by-step recipe following with timer"
```

**Acceptance:** Component renders, nav works, timer counts down, tests pass (4/4), no TypeScript errors.

### Task 3b: Mount RecipeLiveMode in Recipes.tsx + add button

**Files:**
- Modify: `client/src/pages/Recipes.tsx` (imports + state + button + modal)

Steps:

- [ ] **Step 1: Import RecipeLiveMode**

At top of Recipes.tsx (line 9), add:
```typescript
import RecipeLiveMode from '../components/recipes/RecipeLiveMode';
```

- [ ] **Step 2: Add live mode state**

After timer state (line 128), add:
```typescript
const [liveRecipeId, setLiveRecipeId] = useState<string | null>(null);
```

- [ ] **Step 3: Add "live mode" button to recipe header**

In the recipe accordion header (line 227–243, where download button is), add before the chevron:
```tsx
{!isLocked && (
  <button
    onClick={(e) => { e.stopPropagation(); setLiveRecipeId(recipe.id); }}
    className="p-1.5 text-coffee-500 hover:text-gold-400 transition-colors"
    title="Modo en vivo"
  >
    <Play className="w-4 h-4" />
  </button>
)}
```

Add `Play` to lucide-react imports at top (line 6).

- [ ] **Step 4: Render live mode modal**

At end of JSX (before closing div on line 345), add:
```tsx
{liveRecipeId && (
  <RecipeLiveMode
    recipe={recipes.find((r) => r.id === liveRecipeId)!}
    onClose={() => setLiveRecipeId(null)}
  />
)}
```

- [ ] **Step 5: Build + type check**

```bash
cd client && pnpm tsc --noEmit && pnpm test --run
```
Expected: no errors, all tests pass (45+ tests).

- [ ] **Step 6: Commit**

```bash
cd /home/grxson/github/12porciento-cafe
git add client/src/pages/Recipes.tsx
git commit -m "feat(recipes): wire live mode into Recipes accordion, add fullscreen button"
```

**Acceptance:** Play button visible on non-locked recipes, click opens fullscreen live mode, close works, all tests pass.

---

## VERIFICATION

### Task 4a: Manual E2E smoke test

Steps:

- [ ] **Step 1: Start dev server**

```bash
cd /home/grxson/github/12porciento-cafe && npm run dev
```
Expected: dev server up on localhost:5173

- [ ] **Step 2: Test search**

- Navigate to `/recetas`
- Type in search box: "espresso"
- Verify only espresso-related recipes show
- Clear search, all recipes return
- Search "frío" → cold brew recipes show

- [ ] **Step 3: Test timer**

- Expand a recipe with duration steps
- Click "Iniciar temporizador" on a step
- Verify countdown starts, ticks per second
- Verify cancel works
- Verify sound plays when timer hits 0 (or no console errors if audio blocked)

- [ ] **Step 4: Test live mode**

- Expand recipe, click play button → fullscreen opens
- Verify current step displays large
- Click next → goes to step 2, progress bar updates
- Click prev → back to step 1
- Click timer button → countdown starts
- Close button → back to recipes page
- On mobile: full-screen, no navbar, large touch targets

- [ ] **Step 5: Test premium lock**

- User without subscription → premium recipes show lock in live mode button area (not clickable)
- No live mode button appears

- [ ] **Step 6: Commit verification pass**

```bash
git add -A && git commit --no-verify -m "chore: recipes UX polish verification pass" || echo "nothing to commit"
```

**Acceptance:** Search filters in real-time, timer counts, live mode fullscreen, mobile responsive, premium locked.

---

## Self-Review

**Spec coverage:**
- Search: Task 1a filters by title/method/description ✓
- Timer: Task 2a countdown on step duration ✓
- Live mode: Task 3a/3b fullscreen step follower + timer ✓
- Tests: Task 3a tests 4 scenarios, Task 4a manual E2E ✓
- Commits: Per-task commits, no squash ✓

**No placeholders:** All code complete, all commands exact, all tests defined ✓

**Type consistency:** Recipe/RecipeStep from existing types, liveRecipeId string | null, timerActive number | null — consistent throughout ✓

**Known limitations:** Timer state doesn't persist across modal close (by design — fresh slate). Premium users can access live mode; non-premium locked (matches existing behavior). No localStorage for favorites (out of scope).

---

## Execution Options

Plan complete and saved to `docs/superpowers/plans/2026-06-08-recipes-ux-polish.md`.

**Two execution paths:**

**1. Subagent-Driven (recommended)** — Fresh subagent per task (Task 1a → 2a → 3a → 3b → 4a), two-stage review between tasks, fast iteration.

**2. Inline Execution** — Execute in this session via executing-plans, batch with checkpoints.

**Which?**
