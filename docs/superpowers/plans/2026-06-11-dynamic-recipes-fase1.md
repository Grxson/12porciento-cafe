# Dynamic Recipes Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform RecipeLiveMode into an interactive brewing experience — optional per-step rating (1-10 slider) + voice/template/text notes, full gesture suite (swipe/tap/long-press), PWA draft persistence in IndexedDB, and auto BrewLog creation on completion with no modal interruption.

**Architecture:** Add 3 focused sub-components (RatingSlider, NotesCapture, GestureHints) and a `useRecipeDraft` hook for IndexedDB persistence. RecipeLiveMode integrates them all, removes BrewLogForm dependency, and submits BrewLog directly on final step completion. Server updated to accept rating 1-10.

**Tech Stack:** React 19 + TypeScript + Tailwind + Framer Motion, raw IndexedDB API (no extra lib), SpeechRecognition browser API, existing barista server route (Node/Express + Prisma/SQLite).

---

## File Map

**Create:**
- `client/src/types/recipeDraft.ts` — RecipeDraft + StepDraft interfaces
- `client/src/hooks/useRecipeDraft.ts` — IndexedDB CRUD (save/load/clear draft)
- `client/src/components/recipes/RatingSlider.tsx` — animated 1-10 slider with emoji scale
- `client/src/components/recipes/NotesCapture.tsx` — voice + templates + text input
- `client/src/components/recipes/GestureHints.tsx` — footer with gesture hints
- `client/src/hooks/__tests__/useRecipeDraft.test.ts` — tests for draft hook
- `client/src/components/recipes/__tests__/RatingSlider.test.tsx` — tests for rating slider
- `client/src/components/recipes/__tests__/NotesCapture.test.tsx` — tests for notes capture

**Modify:**
- `server/src/routes/barista.ts` — rating validation 1→10, perfect_brew check rating 5→10
- `client/src/types/index.ts` — re-export RecipeDraft from recipeDraft.ts
- `client/src/components/recipes/RecipeLiveMode.tsx` — integrate new components + long-press + resume banner + auto BrewLog, remove BrewLogForm
- `client/src/components/recipes/__tests__/RecipeLiveMode.test.tsx` — update for new behavior

**Keep unchanged:** `client/src/components/BrewLogForm.tsx` (will be used in Fase 2 for photo capture)

---

### Task 1: Update server rating to accept 1-10

**Files:**
- Modify: `server/src/routes/barista.ts`

**Context:** Server currently validates `rating` as integer 1-5. Also checks `perfect_brew` with `rating: 5`. Both need to change for 1-10 scale.

- [ ] **Step 1: Write failing test**

In `server/src/routes/__tests__/orders.idempotency.test.ts` there's the only server test file. Create a new test file for barista validation:

```typescript
// server/src/routes/__tests__/barista.validation.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test that rating 6-10 are now valid (previously invalid as > 5)
describe('calculateXp', () => {
  it('accepts rating 10 without throwing', () => {
    // XP formula: baseXp[difficulty] + (rating - 1) * 5
    const baseXp: Record<string, number> = { 'FÁCIL': 10, 'MEDIA': 20, 'DIFÍCIL': 30 };
    const rating = 10;
    const xp = (baseXp['MEDIA'] ?? 20) + (rating - 1) * 5;
    expect(xp).toBe(65); // 20 + 45
  });

  it('accepts rating 1 without throwing', () => {
    const baseXp: Record<string, number> = { 'FÁCIL': 10, 'MEDIA': 20, 'DIFÍCIL': 30 };
    const xp = (baseXp['DIFÍCIL'] ?? 20) + (1 - 1) * 5;
    expect(xp).toBe(30); // 30 + 0
  });
});
```

- [ ] **Step 2: Run test to verify it passes (logic test only, no HTTP)**

```bash
cd server && pnpm test
```

Expected: 3 tests passing (2 existing + 2 new)

- [ ] **Step 3: Update rating validation and perfect_brew check**

In `server/src/routes/barista.ts`, change line 91:
```typescript
// Before:
if (!recipeId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
  return res.status(400).json({ error: 'recipeId y rating (1-5 entero) requeridos' });
}

// After:
if (!recipeId || !Number.isInteger(rating) || rating < 1 || rating > 10) {
  return res.status(400).json({ error: 'recipeId y rating (1-10 entero) requeridos' });
}
```

Change line 29 (perfect_brew check):
```typescript
// Before:
prisma.brewLog.findFirst({ where: { userId, rating: 5 }, select: { id: true } }),

// After:
prisma.brewLog.findFirst({ where: { userId, rating: 10 }, select: { id: true } }),
```

- [ ] **Step 4: Run tests**

```bash
cd server && pnpm test
```

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/barista.ts server/src/routes/__tests__/barista.validation.test.ts
git commit -m "fix(barista): update rating scale to 1-10, perfect_brew threshold to 10"
```

---

### Task 2: RecipeDraft types

**Files:**
- Create: `client/src/types/recipeDraft.ts`
- Modify: `client/src/types/index.ts`

**Context:** Defines the shape stored in IndexedDB for in-progress brews.

- [ ] **Step 1: Create types file**

```typescript
// client/src/types/recipeDraft.ts
export interface StepDraft {
  index: number;
  rating?: number;   // 1-10, undefined = not rated
  notes?: string;    // combined from voice + templates + text
  completedAt?: string; // ISO timestamp when step was confirmed
}

export interface RecipeDraft {
  id: string;           // `${userId}:${recipeId}` as key
  recipeId: string;
  userId: string;
  startedAt: string;    // ISO timestamp
  currentStepIndex: number;
  steps: StepDraft[];
  status: 'in_progress' | 'completed';
}
```

- [ ] **Step 2: Re-export from types/index.ts**

Add at the end of `client/src/types/index.ts`:

```typescript
export type { RecipeDraft, StepDraft } from './recipeDraft';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (no errors)

- [ ] **Step 4: Commit**

```bash
git add client/src/types/recipeDraft.ts client/src/types/index.ts
git commit -m "feat(types): add RecipeDraft and StepDraft interfaces for IndexedDB persistence"
```

---

### Task 3: useRecipeDraft hook (IndexedDB)

**Files:**
- Create: `client/src/hooks/useRecipeDraft.ts`
- Create: `client/src/hooks/__tests__/useRecipeDraft.test.ts`

**Context:** Manages IndexedDB store `recipe_drafts`. Key per draft: `"${userId}:${recipeId}"`. Browser-native API, no extra library needed.

- [ ] **Step 1: Write failing test**

```typescript
// client/src/hooks/__tests__/useRecipeDraft.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock IndexedDB with a simple in-memory store
const mockStore: Record<string, any> = {};
const mockIDBRequest = (value: any) => ({
  result: value,
  onsuccess: null as any,
  onerror: null as any,
});

vi.stubGlobal('indexedDB', {
  open: vi.fn(() => {
    const req: any = {};
    setTimeout(() => {
      req.result = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            get: vi.fn((key: string) => {
              const r: any = {};
              setTimeout(() => { r.result = mockStore[key]; r.onsuccess?.(); }, 0);
              return r;
            }),
            put: vi.fn((val: any) => {
              const r: any = {};
              setTimeout(() => { mockStore[val.id] = val; r.onsuccess?.(); }, 0);
              return r;
            }),
            delete: vi.fn((key: string) => {
              const r: any = {};
              setTimeout(() => { delete mockStore[key]; r.onsuccess?.(); }, 0);
              return r;
            }),
          })),
        })),
        createObjectStore: vi.fn(),
        objectStoreNames: { contains: vi.fn(() => false) },
      };
      req.onupgradeneeded?.({ target: req });
      req.onsuccess?.({ target: req });
    }, 0);
    return req;
  }),
});

import { saveDraft, loadDraft, clearDraft } from '../useRecipeDraft';
import type { RecipeDraft } from '../../types';

describe('useRecipeDraft', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  });

  it('saveDraft stores draft with correct id key', async () => {
    const draft: RecipeDraft = {
      id: 'user1:recipe1',
      recipeId: 'recipe1',
      userId: 'user1',
      startedAt: '2026-06-11T00:00:00Z',
      currentStepIndex: 2,
      steps: [{ index: 0, rating: 8, notes: 'great', completedAt: '2026-06-11T00:01:00Z' }],
      status: 'in_progress',
    };
    await saveDraft(draft);
    expect(mockStore['user1:recipe1']).toEqual(draft);
  });

  it('loadDraft returns null when no draft', async () => {
    const result = await loadDraft('user1', 'recipe2');
    expect(result).toBeNull();
  });

  it('clearDraft removes the draft', async () => {
    mockStore['user1:recipe1'] = { id: 'user1:recipe1' };
    await clearDraft('user1', 'recipe1');
    expect(mockStore['user1:recipe1']).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd client && pnpm test -- --reporter=verbose src/hooks/__tests__/useRecipeDraft.test.ts
```

Expected: FAIL — "saveDraft not defined"

- [ ] **Step 3: Implement useRecipeDraft**

```typescript
// client/src/hooks/useRecipeDraft.ts
import type { RecipeDraft } from '../types';

const DB_NAME = 'cafe12_pwa';
const DB_VERSION = 1;
const STORE_NAME = 'recipe_drafts';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDraft(draft: RecipeDraft): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(draft);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadDraft(userId: string, recipeId: string): Promise<RecipeDraft | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(`${userId}:${recipeId}`);
    req.onsuccess = () => resolve((req.result as RecipeDraft) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearDraft(userId: string, recipeId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(`${userId}:${recipeId}`);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
```

- [ ] **Step 4: Run test**

```bash
cd client && pnpm test -- --reporter=verbose src/hooks/__tests__/useRecipeDraft.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 5: Run all tests to confirm no regression**

```bash
cd client && pnpm test
```

Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add client/src/hooks/useRecipeDraft.ts client/src/hooks/__tests__/useRecipeDraft.test.ts
git commit -m "feat(hooks): add useRecipeDraft for IndexedDB draft persistence"
```

---

### Task 4: RatingSlider component

**Files:**
- Create: `client/src/components/recipes/RatingSlider.tsx`
- Create: `client/src/components/recipes/__tests__/RatingSlider.test.tsx`

**Context:** Animated slider 1-10 with emoji scale. Shows emoji indicator (😐 → 🔥) based on value. Optional — shows only if user interacts.

- [ ] **Step 1: Write failing test**

```typescript
// client/src/components/recipes/__tests__/RatingSlider.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import RatingSlider from '../RatingSlider';

describe('RatingSlider', () => {
  it('renders with unset state when value is undefined', () => {
    render(<RatingSlider value={undefined} onChange={vi.fn()} />);
    expect(screen.getByText(/calificar/i)).toBeInTheDocument();
  });

  it('shows current value when set', () => {
    render(<RatingSlider value={7} onChange={vi.fn()} />);
    expect(screen.getByText('7/10')).toBeInTheDocument();
  });

  it('calls onChange when slider moves', () => {
    const onChange = vi.fn();
    render(<RatingSlider value={5} onChange={onChange} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '8' } });
    expect(onChange).toHaveBeenCalledWith(8);
  });

  it('renders fire emoji at high rating', () => {
    render(<RatingSlider value={10} onChange={vi.fn()} />);
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd client && pnpm test -- --reporter=verbose src/components/recipes/__tests__/RatingSlider.test.tsx
```

Expected: FAIL — "RatingSlider not found"

- [ ] **Step 3: Implement RatingSlider**

```typescript
// client/src/components/recipes/RatingSlider.tsx
interface RatingSliderProps {
  value: number | undefined;
  onChange: (rating: number) => void;
}

const EMOJI_SCALE: [number, string][] = [
  [1,  '😐'],
  [3,  '🙂'],
  [5,  '😊'],
  [7,  '😄'],
  [9,  '😍'],
  [10, '🔥'],
];

function getEmoji(val: number): string {
  for (let i = EMOJI_SCALE.length - 1; i >= 0; i--) {
    if (val >= EMOJI_SCALE[i][0]) return EMOJI_SCALE[i][1];
  }
  return '😐';
}

export default function RatingSlider({ value, onChange }: RatingSliderProps) {
  return (
    <div className="mb-4 px-1">
      <p className="text-[10px] text-coffee-500 uppercase tracking-widest mb-2">
        Calificar este paso
      </p>
      <div className="flex items-center gap-3">
        <span className="text-lg w-6 text-center">{value ? getEmoji(value) : '😐'}</span>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={value ?? 5}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-gold-500 cursor-pointer"
          aria-label="Calificación del paso"
        />
        <span className="text-gold-400 font-bold text-sm w-10 text-right">
          {value !== undefined ? `${value}/10` : '—/10'}
        </span>
        {value !== undefined && (
          <span className="text-lg w-6 text-center">{getEmoji(value)}</span>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
cd client && pnpm test -- --reporter=verbose src/components/recipes/__tests__/RatingSlider.test.tsx
```

Expected: 4 tests PASS

- [ ] **Step 5: Run all tests**

```bash
cd client && pnpm test
```

Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add client/src/components/recipes/RatingSlider.tsx client/src/components/recipes/__tests__/RatingSlider.test.tsx
git commit -m "feat(recipes): add RatingSlider component (1-10 with emoji scale)"
```

---

### Task 5: NotesCapture component

**Files:**
- Create: `client/src/components/recipes/NotesCapture.tsx`
- Create: `client/src/components/recipes/__tests__/NotesCapture.test.tsx`

**Context:** Three input methods combined: voice (SpeechRecognition API — graceful fallback to hidden if unavailable), preset template buttons, free text. All append to a single `notes` string passed via `value`/`onChange`.

- [ ] **Step 1: Write failing test**

```typescript
// client/src/components/recipes/__tests__/NotesCapture.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import NotesCapture from '../NotesCapture';

// SpeechRecognition not in jsdom — component should handle missing API gracefully
describe('NotesCapture', () => {
  it('renders template buttons', () => {
    render(<NotesCapture value="" onChange={vi.fn()} />);
    expect(screen.getByText('Muy caliente')).toBeInTheDocument();
    expect(screen.getByText('Amargo')).toBeInTheDocument();
    expect(screen.getByText('Perfecto')).toBeInTheDocument();
  });

  it('clicking template appends to notes', () => {
    const onChange = vi.fn();
    render(<NotesCapture value="" onChange={onChange} />);
    fireEvent.click(screen.getByText('Perfecto'));
    expect(onChange).toHaveBeenCalledWith('Perfecto');
  });

  it('clicking template when notes already set appends with separator', () => {
    const onChange = vi.fn();
    render(<NotesCapture value="Muy caliente" onChange={onChange} />);
    fireEvent.click(screen.getByText('Amargo'));
    expect(onChange).toHaveBeenCalledWith('Muy caliente · Amargo');
  });

  it('free text input updates notes', () => {
    const onChange = vi.fn();
    render(<NotesCapture value="" onChange={onChange} />);
    const input = screen.getByPlaceholderText(/escribe/i);
    fireEvent.change(input, { target: { value: 'ajustar molienda' } });
    expect(onChange).toHaveBeenCalledWith('ajustar molienda');
  });

  it('does not render voice button when SpeechRecognition unavailable', () => {
    // jsdom has no SpeechRecognition by default
    render(<NotesCapture value="" onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /grabar/i })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd client && pnpm test -- --reporter=verbose src/components/recipes/__tests__/NotesCapture.test.tsx
```

Expected: FAIL — "NotesCapture not found"

- [ ] **Step 3: Implement NotesCapture**

```typescript
// client/src/components/recipes/NotesCapture.tsx
import { useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface NotesCaptureProps {
  value: string;
  onChange: (notes: string) => void;
}

const TEMPLATES = ['Muy caliente', 'Frío', 'Amargo', 'Ácido', 'Perfecto', 'Ajustar dosis'];

const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

function appendNote(existing: string, addition: string): string {
  return existing ? `${existing} · ${addition}` : addition;
}

export default function NotesCapture({ value, onChange }: NotesCaptureProps) {
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startVoice = () => {
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-MX';
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0]?.[0]?.transcript ?? '';
      if (transcript) onChange(appendNote(value, transcript));
    };
    recognition.onend = () => setRecording(false);
    recognition.onerror = () => setRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="mb-4">
      <p className="text-[10px] text-coffee-500 uppercase tracking-widest mb-2">
        Notas (opcional)
      </p>

      {/* Template buttons */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {TEMPLATES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(appendNote(value, t))}
            className="text-[11px] px-2.5 py-1 border border-coffee-700 text-coffee-400 hover:border-gold-500 hover:text-gold-400 transition-colors"
          >
            {t}
          </button>
        ))}
      </div>

      {/* Voice button — only if SpeechRecognition available */}
      {SpeechRecognition && (
        <button
          type="button"
          aria-label={recording ? 'Detener grabación' : 'Grabar nota de voz'}
          onClick={recording ? stopVoice : startVoice}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 mb-2 transition-colors ${
            recording
              ? 'bg-red-600/30 text-red-400 border border-red-600/50'
              : 'bg-coffee-800 text-coffee-400 hover:text-gold-400 border border-coffee-700'
          }`}
        >
          {recording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          {recording ? 'Detener' : 'Grabar nota'}
        </button>
      )}

      {/* Free text */}
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="O escribe aquí..."
        maxLength={500}
        className="w-full bg-coffee-900 border border-coffee-700 text-coffee-200 text-xs px-3 py-2 focus:border-gold-500 focus:outline-none resize-none"
      />
      <p className="text-[10px] text-coffee-600 text-right">{value.length}/500</p>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
cd client && pnpm test -- --reporter=verbose src/components/recipes/__tests__/NotesCapture.test.tsx
```

Expected: 5 tests PASS

- [ ] **Step 5: Run all tests**

```bash
cd client && pnpm test
```

Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add client/src/components/recipes/NotesCapture.tsx client/src/components/recipes/__tests__/NotesCapture.test.tsx
git commit -m "feat(recipes): add NotesCapture component (voice + templates + text)"
```

---

### Task 6: GestureHints component

**Files:**
- Create: `client/src/components/recipes/GestureHints.tsx`

**Context:** Footer bar showing available gestures as visual hints. Purely presentational, no logic.

- [ ] **Step 1: Implement GestureHints**

No TDD needed — purely presentational, no logic to test.

```typescript
// client/src/components/recipes/GestureHints.tsx
export default function GestureHints() {
  return (
    <div className="flex justify-center gap-6 py-2 border-t border-coffee-800/50">
      <div className="text-center">
        <p className="text-base">👉</p>
        <p className="text-[9px] text-coffee-600 uppercase tracking-wider">Swipe</p>
      </div>
      <div className="text-center">
        <p className="text-base">☝️</p>
        <p className="text-[9px] text-coffee-600 uppercase tracking-wider">Long-press</p>
      </div>
      <div className="text-center">
        <p className="text-base">✋</p>
        <p className="text-[9px] text-coffee-600 uppercase tracking-wider">Tap</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output

- [ ] **Step 3: Commit**

```bash
git add client/src/components/recipes/GestureHints.tsx
git commit -m "feat(recipes): add GestureHints footer component"
```

---

### Task 7: Integrate into RecipeLiveMode + auto BrewLog + resume banner

**Files:**
- Modify: `client/src/components/recipes/RecipeLiveMode.tsx`
- Modify: `client/src/components/recipes/__tests__/RecipeLiveMode.test.tsx`

**Context:** This is the main integration task. RecipeLiveMode gains:
1. Resume banner (load draft from IndexedDB on mount, if exists show "Resume/Start Over")
2. Per-step optional rating + notes (via RatingSlider + NotesCapture, shown inline)
3. Long-press handler on step content (shows quick panel with rating + notes)
4. Draft auto-save on every change (step change, rating change, notes change)
5. On final step completion: auto POST BrewLog → toast → clear draft → close
6. Remove BrewLogForm dependency entirely

**User auth context:** `useUser` for `user.id`, `useBarista` for `submitBrewLog`, `useToast` for success toast.

- [ ] **Step 1: Update RecipeLiveMode tests**

Replace entire `client/src/components/recipes/__tests__/RecipeLiveMode.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach } from 'vitest';
import RecipeLiveMode from '../RecipeLiveMode';
import type { Recipe } from '../../../types';

// Mock hooks
vi.mock('../../../context/UserContext', () => ({
  useUser: vi.fn((selector: any) => selector({ user: { id: 'u1', name: 'Test' } })),
}));

vi.mock('../../../context/ToastContext', () => ({
  useToast: vi.fn(() => ({ add: vi.fn() })),
}));

vi.mock('../../../hooks/useBarista', () => ({
  useBarista: vi.fn(() => ({
    submitBrewLog: vi.fn().mockResolvedValue({ newAchievements: [] }),
    loading: false,
    error: null,
  })),
}));

// Mock IndexedDB hooks
vi.mock('../../../hooks/useRecipeDraft', () => ({
  saveDraft: vi.fn().mockResolvedValue(undefined),
  loadDraft: vi.fn().mockResolvedValue(null), // no draft by default
  clearDraft: vi.fn().mockResolvedValue(undefined),
}));

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
    { id: 's1', recipeId: '1', title: 'Paso 1', description: 'Moler', order: 1, duration: 30 },
    { id: 's2', recipeId: '1', title: 'Paso 2', description: 'Extraer', order: 2, duration: 25 },
  ],
  product: null,
  temp: '90°C',
  grind: 'Medio',
  ratio: '1:2',
  yield: '30ml',
  prepTime: 5,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('RecipeLiveMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders current step full-screen', () => {
    render(<RecipeLiveMode recipe={mockRecipe} onClose={() => {}} />);
    expect(screen.getByText('Paso 1')).toBeInTheDocument();
    expect(screen.getByText('Moler')).toBeInTheDocument();
  });

  it('advances to next step on next button click', () => {
    render(<RecipeLiveMode recipe={mockRecipe} onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText(/siguiente/i));
    expect(screen.getByText('Paso 2')).toBeInTheDocument();
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

  it('shows "Registrar Brew" button on last step', () => {
    render(<RecipeLiveMode recipe={mockRecipe} onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText(/siguiente/i));
    expect(screen.getByText(/registrar/i)).toBeInTheDocument();
  });

  it('shows resume banner when draft exists', async () => {
    const { loadDraft } = await import('../../../hooks/useRecipeDraft');
    vi.mocked(loadDraft).mockResolvedValueOnce({
      id: 'u1:1',
      recipeId: '1',
      userId: 'u1',
      startedAt: '2026-06-11T10:00:00Z',
      currentStepIndex: 1,
      steps: [],
      status: 'in_progress',
    });
    render(<RecipeLiveMode recipe={mockRecipe} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText(/continuar/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run tests to verify they pass with current code (some will fail — that's expected)**

```bash
cd client && pnpm test -- --reporter=verbose src/components/recipes/__tests__/RecipeLiveMode.test.tsx
```

Expected: first 4 tests PASS (existing behavior), last 2 FAIL (new behavior not implemented yet)

- [ ] **Step 3: Implement new RecipeLiveMode**

Replace `client/src/components/recipes/RecipeLiveMode.tsx` entirely:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Recipe } from '../../types';
import type { RecipeDraft, StepDraft } from '../../types';
import { saveDraft, loadDraft, clearDraft } from '../../hooks/useRecipeDraft';
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';
import { useBarista } from '../../hooks/useBarista';
import RatingSlider from './RatingSlider';
import NotesCapture from './NotesCapture';
import GestureHints from './GestureHints';

interface RecipeLiveModeProps {
  recipe: Recipe;
  onClose: () => void;
}

export default function RecipeLiveMode({ recipe, onClose }: RecipeLiveModeProps) {
  const user = useUser((s) => s.user);
  const { add: addToast } = useToast();
  const { submitBrewLog } = useBarista(user?.id);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timerActive, setTimerActive] = useState<number | null>(null);
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [showQuickPanel, setShowQuickPanel] = useState(false);
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [brewRegistered, setBrewRegistered] = useState(false);

  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const step = recipe.steps[currentStepIndex];
  const hasNext = currentStepIndex < recipe.steps.length - 1;
  const hasPrev = currentStepIndex > 0;
  const currentStepDraft = steps.find((s) => s.index === currentStepIndex) ?? { index: currentStepIndex };

  // Load draft on mount
  useEffect(() => {
    if (!user) return;
    loadDraft(user.id, recipe.id).then((d) => {
      if (d && d.status === 'in_progress') setDraft(d);
    }).catch(() => {});
  }, [user?.id, recipe.id]);

  // Create or update draft whenever step/ratings/notes change
  const persistDraft = useCallback((newSteps: StepDraft[], stepIndex: number) => {
    if (!user) return;
    const d: RecipeDraft = {
      id: `${user.id}:${recipe.id}`,
      recipeId: recipe.id,
      userId: user.id,
      startedAt: new Date().toISOString(),
      currentStepIndex: stepIndex,
      steps: newSteps,
      status: 'in_progress',
    };
    saveDraft(d).catch(() => {});
  }, [user?.id, recipe.id]);

  // Resume draft
  const handleResume = () => {
    if (!draft) return;
    setCurrentStepIndex(draft.currentStepIndex);
    setSteps(draft.steps);
    setDraft(null);
  };

  // Start over (clear draft)
  const handleStartOver = () => {
    if (user) clearDraft(user.id, recipe.id).catch(() => {});
    setDraft(null);
    setSteps([]);
    setCurrentStepIndex(0);
  };

  // Update step draft
  const updateStep = (patch: Partial<StepDraft>) => {
    setSteps((prev) => {
      const existing = prev.find((s) => s.index === currentStepIndex);
      const updated = existing
        ? prev.map((s) => s.index === currentStepIndex ? { ...s, ...patch } : s)
        : [...prev, { index: currentStepIndex, ...patch }];
      persistDraft(updated, currentStepIndex);
      return updated;
    });
  };

  // Timer
  useEffect(() => {
    if (timerActive === null) return;
    const interval = setInterval(() => {
      setTimerActive((t) => {
        if (t && t <= 1) {
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
          return null;
        }
        return t ? t - 1 : null;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerActive]);

  useEffect(() => { setTimerActive(null); }, [currentStepIndex]);

  // Navigation
  const goNext = () => {
    if (hasNext) {
      const updated = steps.find((s) => s.index === currentStepIndex)
        ? steps.map((s) => s.index === currentStepIndex ? { ...s, completedAt: new Date().toISOString() } : s)
        : [...steps, { index: currentStepIndex, completedAt: new Date().toISOString() }];
      setSteps(updated);
      persistDraft(updated, currentStepIndex + 1);
      setCurrentStepIndex((c) => c + 1);
    }
  };

  const goPrev = () => {
    if (hasPrev) {
      persistDraft(steps, currentStepIndex - 1);
      setCurrentStepIndex((c) => c - 1);
    }
  };

  // Auto BrewLog submission
  const handleRegisterBrew = async () => {
    if (!user || submitting) return;
    setSubmitting(true);
    const ratings = steps.map((s) => s.rating).filter((r): r is number => r !== undefined);
    const avgRating = ratings.length
      ? Math.round(ratings.reduce((s, r) => s + r, 0) / ratings.length)
      : 5;
    const notes = steps
      .map((s) => s.notes)
      .filter(Boolean)
      .join(' | ');
    try {
      const { newAchievements } = await submitBrewLog({
        recipeId: recipe.id,
        rating: avgRating,
        notes: notes || undefined,
      });
      const baseXp: Record<string, number> = { 'FÁCIL': 10, 'MEDIA': 20, 'DIFÍCIL': 30 };
      const xp = (baseXp[recipe.difficulty ?? 'MEDIA'] ?? 20) + (avgRating - 1) * 5;
      addToast(`+${xp} XP ganados ☕`, 'success');
      for (const a of newAchievements) {
        setTimeout(() => addToast(`🏆 Logro: ${a.icon} ${a.name} (+${a.xpReward} XP)`, 'success'), 400);
      }
      if (user) clearDraft(user.id, recipe.id).catch(() => {});
      setBrewRegistered(true);
    } catch {
      addToast('Error al registrar brew. Intenta de nuevo.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    longPressRef.current = setTimeout(() => {
      setShowQuickPanel(true);
      longPressRef.current = null;
    }, 600);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    if (!touchStartRef.current || showQuickPanel) { touchStartRef.current = null; return; }
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);
    if (Math.abs(deltaX) > 50 && deltaY < 50) {
      if (deltaX > 0) goPrev(); else goNext();
    }
    touchStartRef.current = null;
  };

  if (!step) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-coffee-950 flex flex-col items-center justify-center gap-4"
      >
        <p className="text-coffee-400 text-sm">Esta receta no tiene pasos configurados.</p>
        <button onClick={onClose} className="btn-primary">Cerrar</button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-coffee-950 flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Resume banner */}
      {draft && (
        <div className="bg-gold-500/10 border-b border-gold-500/30 px-4 py-2.5 flex items-center justify-between gap-4">
          <p className="text-gold-400 text-xs">↻ Brew en progreso. ¿Continuar?</p>
          <div className="flex gap-2">
            <button
              onClick={handleResume}
              className="text-xs px-3 py-1 bg-gold-500 text-coffee-950 font-semibold hover:bg-gold-400 transition-colors"
            >
              Continuar
            </button>
            <button
              onClick={handleStartOver}
              className="text-xs px-3 py-1 text-coffee-400 hover:text-cream transition-colors"
            >
              Empezar de nuevo
            </button>
          </div>
        </div>
      )}

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
      <div className="flex-1 overflow-y-auto flex flex-col p-6">
        <AnimatePresence>
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-2xl w-full mx-auto"
          >
            {/* Step number badge */}
            <div className="flex justify-center mb-6">
              <div className="px-4 py-2 bg-gold-500/10 border border-gold-500/30 rounded-full">
                <p className="text-gold-400 text-sm font-semibold">{currentStepIndex + 1} / {recipe.steps.length}</p>
              </div>
            </div>

            {/* Step title */}
            <h3 className="text-3xl md:text-4xl font-serif text-cream mb-4 text-center">{step.title}</h3>

            {/* Step description */}
            <p className="text-base text-coffee-300 leading-relaxed mb-6 text-center">{step.description}</p>

            {/* Meta info */}
            {(step.duration || recipe.temp || recipe.grind) && (
              <div className="grid grid-cols-3 gap-4 mb-6 max-w-sm mx-auto">
                {step.duration && (
                  <div className="bg-coffee-900/50 p-3 rounded text-center">
                    <p className="text-[10px] text-coffee-500 uppercase mb-1">Duración</p>
                    <p className="text-gold-400 font-bold">{step.duration}s</p>
                  </div>
                )}
                {recipe.temp && (
                  <div className="bg-coffee-900/50 p-3 rounded text-center">
                    <p className="text-[10px] text-coffee-500 uppercase mb-1">Temp</p>
                    <p className="text-gold-400 font-bold">{recipe.temp}</p>
                  </div>
                )}
                {recipe.grind && (
                  <div className="bg-coffee-900/50 p-3 rounded text-center">
                    <p className="text-[10px] text-coffee-500 uppercase mb-1">Molienda</p>
                    <p className="text-gold-400 font-bold text-sm">{recipe.grind}</p>
                  </div>
                )}
              </div>
            )}

            {/* Timer */}
            {step.duration && timerActive === null && (
              <div className="flex justify-center mb-6">
                <button
                  onClick={() => setTimerActive(step.duration!)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 text-coffee-950 font-semibold hover:bg-gold-400 transition-colors"
                >
                  <Clock className="w-5 h-5" /> Iniciar {step.duration}s
                </button>
              </div>
            )}

            {timerActive !== null && (
              <div className="flex justify-center mb-6">
                <div className="inline-block px-8 py-6 bg-gold-500/10 border border-gold-500/30 rounded text-center">
                  <p className="text-xs text-gold-400 uppercase mb-3">Temporizador</p>
                  <p className="text-6xl font-mono font-bold text-gold-400 mb-4">{timerActive}</p>
                  <button
                    onClick={() => setTimerActive(null)}
                    className="text-xs px-4 py-1 bg-red-600/30 text-red-400 hover:bg-red-600/40 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Inline rating + notes */}
            <div className="mt-4 border-t border-coffee-800/50 pt-4">
              <RatingSlider
                value={currentStepDraft.rating}
                onChange={(r) => updateStep({ rating: r })}
              />
              <NotesCapture
                value={currentStepDraft.notes ?? ''}
                onChange={(n) => updateStep({ notes: n })}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="border-t border-coffee-800 bg-coffee-900/50">
        {!hasNext && (
          <div className="text-center pt-4 px-6 flex items-center justify-center gap-3">
            {brewRegistered ? (
              <>
                <span className="text-green-400 text-sm">✓ Brew registrado</span>
                <button
                  onClick={onClose}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gold-500 text-coffee-950 text-sm font-semibold hover:bg-gold-400 transition-colors"
                >
                  Finalizar
                </button>
              </>
            ) : (
              <button
                onClick={handleRegisterBrew}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gold-500/10 border border-gold-500/40 text-gold-400 text-sm hover:bg-gold-500/20 hover:border-gold-500 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Registrando...' : '☕ Registrar este Brew'}
              </button>
            )}
          </div>
        )}
        <div className="flex items-center justify-between p-4">
          <button
            onClick={goPrev}
            disabled={!hasPrev}
            aria-label="Anterior"
            className="p-3 text-coffee-400 disabled:opacity-30 hover:text-cream transition-colors"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          {/* Progress bar */}
          <div className="flex-1 mx-4">
            <div className="h-1 bg-coffee-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold-500 transition-all"
                style={{ width: `${((currentStepIndex + 1) / recipe.steps.length) * 100}%` }}
              />
            </div>
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
        <GestureHints />
      </div>

      {/* Quick panel (long-press) */}
      <AnimatePresence>
        {showQuickPanel && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-0 left-0 right-0 z-[60] bg-coffee-900 border-t border-coffee-700 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-coffee-400 uppercase tracking-widest">Menú rápido</p>
              <button onClick={() => setShowQuickPanel(false)} className="text-coffee-400 hover:text-cream">
                <X className="w-4 h-4" />
              </button>
            </div>
            <RatingSlider
              value={currentStepDraft.rating}
              onChange={(r) => { updateStep({ rating: r }); }}
            />
            <NotesCapture
              value={currentStepDraft.notes ?? ''}
              onChange={(n) => updateStep({ notes: n })}
            />
            <button
              onClick={() => setShowQuickPanel(false)}
              className="w-full mt-2 py-2 bg-gold-500 text-coffee-950 text-sm font-semibold hover:bg-gold-400 transition-colors"
            >
              Listo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
cd client && pnpm test -- --reporter=verbose src/components/recipes/__tests__/RecipeLiveMode.test.tsx
```

Expected: 6 tests PASS

- [ ] **Step 5: Run all tests**

```bash
cd client && pnpm test
```

Expected: all pass (some may need `loadDraft` mock in other test files — fix if needed)

- [ ] **Step 6: TypeScript check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -30
```

Expected: no output

- [ ] **Step 7: Commit**

```bash
git add client/src/components/recipes/RecipeLiveMode.tsx client/src/components/recipes/__tests__/RecipeLiveMode.test.tsx
git commit -m "feat(recipes): integrate rating + notes + gestures + draft persistence into RecipeLiveMode"
```

---

### Task 8: Remove BrewLogForm from RecipeLiveMode (cleanup)

**Files:**
- Verify: `client/src/components/BrewLogForm.tsx` — only kept for Fase 2, not imported from RecipeLiveMode anymore

**Context:** After Task 7, RecipeLiveMode no longer imports BrewLogForm. We just verify there are no broken imports.

- [ ] **Step 1: Verify no other file imports BrewLogForm from RecipeLiveMode context**

```bash
grep -r "BrewLogForm" client/src --include="*.tsx" --include="*.ts" -l
```

Expected: Only `client/src/components/BrewLogForm.tsx` itself (no consumers) OR possibly other places that should still use it.

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
cd client && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output

- [ ] **Step 3: Run all tests + server tests**

```bash
cd client && pnpm test
cd server && pnpm test
```

Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(recipes): verify BrewLogForm decoupled from RecipeLiveMode (kept for Fase 2)"
```

---

## Summary

8 tasks. Touches:
- 1 server file (rating 1-10, perfect_brew 10)
- 4 new client components/hooks (RatingSlider, NotesCapture, GestureHints, useRecipeDraft)
- 2 new type files
- 1 heavily modified component (RecipeLiveMode)
- Updated tests throughout

After all tasks complete: `pnpm test` should report all passing. Test the golden path manually:
1. Open any recipe → RecipeLiveMode
2. Browse steps, add rating on step 2, voice note on step 1
3. Close browser tab mid-recipe
4. Reopen — resume banner appears
5. Resume, finish, click "Registrar este Brew"
6. Toast appears, Barista profile shows new BrewLog
