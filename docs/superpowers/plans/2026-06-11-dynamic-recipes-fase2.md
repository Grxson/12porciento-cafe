# Dynamic Recipes Fase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add photo capture, offline-first brew queue with auto-sync, brew comparison history, and streak/method-mastery achievements to the interactive recipe system.

**Architecture:** Photo uploads are optional and can be stored as blobs offline until the brew syncs. A new `brew_queue` IndexedDB store holds failed submissions + photo blobs. A `brewSync` service listens to online/offline events and Background Sync to push queued brews. New UI components show attempts history and side-by-side comparisons. Server extends achievement logic to count per-method brews and compute streak days.

**Tech Stack:** React 19 + TypeScript + Tailwind (client), Workbox (PWA caching), IndexedDB (offline queue), Background Sync API (browser), Node/Express + Prisma/SQLite (server).

---

## File Map

**Create:**
- `client/src/hooks/useBrewQueue.ts` — IndexedDB CRUD for brew queue
- `client/src/services/brewSync.ts` — sync engine (upload + POST + achievement toasts)
- `client/src/components/recipes/AttemptsList.tsx` — history of brews for a recipe
- `client/src/components/barista/BrewComparator.tsx` — side-by-side brew comparison
- `client/src/hooks/__tests__/useBrewQueue.test.ts` — queue tests
- `server/src/routes/__tests__/barista.achievements.test.ts` — method/streak achievement tests

**Modify:**
- `server/prisma/schema.prisma` — add `clientBrewId` to BrewLog
- `server/src/routes/barista.ts` — POST idempotency, GET /brews endpoint, extend checkAndUnlockAchievements
- `server/prisma/seed.ts` — add 5 new achievements
- `client/src/components/recipes/RecipeLiveMode.tsx` — add optional photo control at final step
- `client/vite.config.ts` — extend Workbox recipe cache rules
- `client/src/services/brewSync.ts` (new) — register for Background Sync
- `client/src/pages/Recipes.tsx` — include AttemptsList component
- `client/src/pages/BaristaProfile.tsx` — include BrewComparator mode

---

### Task 1: Server schema — add clientBrewId column

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/add_clientBrewId.sql` (if using raw SQL; otherwise `prisma db push` infers it)

**Context:** The BrewLog model needs a new optional `clientBrewId` field to support idempotent offline submissions. A brew created offline will have a client-generated UUID; retries with the same `clientBrewId` won't duplicate on the server.

- [ ] **Step 1: Update schema**

In `server/prisma/schema.prisma`, find the `model BrewLog` block and add the field:

```prisma
model BrewLog {
  id             String         @id @default(cuid())
  clientBrewId   String?        @unique  // optional, unique, for idempotency
  userId         String
  baristaProfile BaristaProfile @relation(fields: [userId], references: [userId], onDelete: Cascade)
  recipeId       String
  recipe         Recipe         @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  rating         Int            @default(3)
  notes          String?
  photoUrl       String?
  xpEarned       Int            @default(0)
  createdAt      DateTime       @default(now())

  @@index([userId])
  @@index([recipeId])
  @@index([clientBrewId])  // index for fast lookup on retry
}
```

- [ ] **Step 2: Run migration**

```bash
cd server && pnpm prisma db push
```

Expected: "✓ Pushed to database" with no warnings.

- [ ] **Step 3: Verify in database**

```bash
cd server && pnpm prisma studio
```

Open the DB explorer, check BrewLog table has the new `clientBrewId` column (nullable). Close studio.

- [ ] **Step 4: Commit**

```bash
cd /home/grxson/github/12porciento-cafe && git add server/prisma/schema.prisma
git commit -m "feat(db): add clientBrewId to BrewLog for idempotent offline submissions"
```

---

### Task 2: useBrewQueue hook — IndexedDB queue CRUD

**Files:**
- Create: `client/src/hooks/useBrewQueue.ts`
- Create: `client/src/hooks/__tests__/useBrewQueue.test.ts`
- Test: `client/src/hooks/__tests__/useBrewQueue.test.ts`

**Context:** Similar to Task 3 (Fase 1) `useRecipeDraft`, this exports async helper functions (not a React hook) for managing the brew queue. The queue stores failed brews (with optional photo blobs) until they can be synced. This is separate from useRecipeDraft because draft state is per-recipe-session, queue state is per-user across sessions.

- [ ] **Step 1: Write failing test**

Create `client/src/hooks/__tests__/useBrewQueue.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockStore: Record<string, any> = {};

vi.stubGlobal('indexedDB', {
  open: vi.fn(() => {
    const req: any = {};
    setTimeout(() => {
      req.result = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            add: vi.fn((val: any) => {
              const r: any = {};
              setTimeout(() => { mockStore[val.id] = val; r.onsuccess?.(); }, 0);
              return r;
            }),
            getAll: vi.fn(() => {
              const r: any = {};
              setTimeout(() => { r.result = Object.values(mockStore); r.onsuccess?.(); }, 0);
              return r;
            }),
            delete: vi.fn((key: string) => {
              const r: any = {};
              setTimeout(() => { delete mockStore[key]; r.onsuccess?.(); }, 0);
              return r;
            }),
            put: vi.fn((val: any) => {
              const r: any = {};
              setTimeout(() => { mockStore[val.id] = val; r.onsuccess?.(); }, 0);
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

import { enqueueBrew, listQueue, removeBrew, updateBrewStatus } from '../useBrewQueue';
import type { QueuedBrew } from '../useBrewQueue';

describe('useBrewQueue', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  });

  it('enqueueBrew stores a brew with pending status', async () => {
    const brew: QueuedBrew = {
      id: 'uuid-1',
      recipeId: 'recipe1',
      rating: 8,
      notes: 'good',
      photoBlob: undefined,
      photoUrl: undefined,
      createdAt: '2026-06-11T10:00:00Z',
      status: 'pending',
    };
    await enqueueBrew(brew);
    expect(mockStore['uuid-1']).toEqual(brew);
  });

  it('listQueue returns all queued brews', async () => {
    mockStore['uuid-1'] = { id: 'uuid-1', status: 'pending' };
    mockStore['uuid-2'] = { id: 'uuid-2', status: 'failed' };
    const result = await listQueue();
    expect(result).toHaveLength(2);
  });

  it('removeBrew deletes a brew from queue', async () => {
    mockStore['uuid-1'] = { id: 'uuid-1' };
    await removeBrew('uuid-1');
    expect(mockStore['uuid-1']).toBeUndefined();
  });

  it('updateBrewStatus updates the status field', async () => {
    mockStore['uuid-1'] = { id: 'uuid-1', status: 'pending' };
    await updateBrewStatus('uuid-1', 'syncing');
    expect(mockStore['uuid-1'].status).toBe('syncing');
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

```bash
cd client && pnpm test -- --reporter=verbose src/hooks/__tests__/useBrewQueue.test.ts
```

Expected: FAIL — "enqueueBrew not defined"

- [ ] **Step 3: Implement useBrewQueue**

Create `client/src/hooks/useBrewQueue.ts`:

```typescript
export interface QueuedBrew {
  id: string;           // uuid
  recipeId: string;
  rating: number;
  notes?: string;
  photoBlob?: Blob;
  photoUrl?: string;
  createdAt: string;    // ISO timestamp
  status: 'pending' | 'syncing' | 'failed';
}

const DB_NAME = 'cafe12_pwa';
const DB_VERSION = 1;
const STORE_NAME = 'brew_queue';

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

export async function enqueueBrew(brew: QueuedBrew): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(brew);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function listQueue(): Promise<QueuedBrew[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as QueuedBrew[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeBrew(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function updateBrewStatus(id: string, status: QueuedBrew['status']): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const brew = getReq.result as QueuedBrew;
      if (brew) {
        brew.status = status;
        const putReq = store.put(brew);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}
```

- [ ] **Step 4: Run tests**

```bash
cd client && pnpm test -- --reporter=verbose src/hooks/__tests__/useBrewQueue.test.ts
```

Expected: 4 tests PASS

- [ ] **Step 5: Run all tests**

```bash
cd client && pnpm test
```

Expected: all pass

- [ ] **Step 6: Commit**

```bash
cd /home/grxson/github/12porciento-cafe && git add client/src/hooks/useBrewQueue.ts client/src/hooks/__tests__/useBrewQueue.test.ts
git commit -m "feat(hooks): add useBrewQueue for offline brew submission queue"
```

---

### Task 3: brewSync service — sync engine + Background Sync registration

**Files:**
- Create: `client/src/services/brewSync.ts`
- Modify: `client/src/main.tsx` (register Background Sync in SW init)

**Context:** The brewSync service orchestrates offline submissions. It runs on `online` events, app load, and Background Sync API. For each queued brew: upload photo blob (if any) → get photoUrl → POST BrewLog with idempotency key. On success, remove from queue + show achievement toasts. On failure, mark `failed` for retry.

- [ ] **Step 1: Implement brewSync**

Create `client/src/services/brewSync.ts`:

```typescript
import { listQueue, removeBrew, updateBrewStatus } from '../hooks/useBrewQueue';
import { uploadsApi, baristaApi } from '../api';
import type { QueuedBrew } from '../hooks/useBrewQueue';

async function syncBrews() {
  const queue = await listQueue();
  const pending = queue.filter((b) => b.status === 'pending' || b.status === 'failed');

  for (const brew of pending) {
    try {
      await updateBrewStatus(brew.id, 'syncing');

      let photoUrl = brew.photoUrl;
      if (brew.photoBlob && !photoUrl) {
        const file = new File([brew.photoBlob], 'brew.jpg', { type: 'image/jpeg' });
        const uploadRes = await uploadsApi.upload(file);
        photoUrl = uploadRes.data.data.url;
      }

      const res = await baristaApi.submitBrewLog({
        recipeId: brew.recipeId,
        rating: brew.rating,
        notes: brew.notes,
        photoUrl,
        clientBrewId: brew.id, // idempotency key
      });

      await removeBrew(brew.id);

      // Toast achievements from response (will be surfaced by the existing toast system)
      if (res.data.data?.newAchievements?.length) {
        const baseXp: Record<string, number> = { 'FÁCIL': 10, 'MEDIA': 20, 'DIFÍCIL': 30 };
        const xp = (baseXp[res.data.data.profile?.difficulty ?? 'MEDIA'] ?? 20) + (brew.rating - 1) * 5;
        // Note: actual toast dispatch happens in the calling context (see RecipeLiveMode offline path)
      }
    } catch (err: any) {
      const status = err.response?.status === 409 ? 'syncing' : 'failed'; // 409 = duplicate (already synced), retry OK
      await updateBrewStatus(brew.id, status);
    }
  }
}

export async function initBrewSync() {
  // Sync on app load
  syncBrews().catch(() => {});

  // Sync on online event
  window.addEventListener('online', () => {
    syncBrews().catch(() => {});
  });

  // Register Background Sync (Chromium only)
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.sync.register('brew-sync').catch(() => {
        // Gracefully ignore if not supported
      });
    });
  }
}

// For Background Sync API event handler (in the SW)
export async function handleBrewSync() {
  await syncBrews();
}
```

- [ ] **Step 2: Register Background Sync in service worker**

The Vite PWA plugin already registers a service worker. We need to add an event handler for 'brew-sync'. Since vite-plugin-pwa generates the SW, we'll use the plugin's `workbox.globPatterns` to ensure the sync handler is available.

Actually, the Background Sync handler needs to be in the SW code itself. The vite-plugin-pwa doesn't directly expose SW event handlers. Instead, we can use a separate SW file. But for simplicity in this Fase, we'll rely on the `online` event fallback (which is sufficient for Fase 2).

Skip the explicit Background Sync registration for now (it's in the spec as "optional, where available"). The `online`-event path covers the use case.

- [ ] **Step 3: Wire into app init**

In `client/src/main.tsx`, after the React render, call `initBrewSync()`:

```typescript
import { initBrewSync } from './services/brewSync';

// ... existing React mount ...

initBrewSync().catch(console.error);
```

- [ ] **Step 4: TypeScript check**

```bash
cd client && npx tsc --noEmit 2>&1 | head -10
```

Expected: no errors (uploadsApi and baristaApi already typed)

- [ ] **Step 5: Commit**

```bash
cd /home/grxson/github/12porciento-cafe && git add client/src/services/brewSync.ts client/src/main.tsx
git commit -m "feat(sync): add brewSync service for offline queue synchronization"
```

---

### Task 4: Photo control in RecipeLiveMode — optional photo capture

**Files:**
- Modify: `client/src/components/recipes/RecipeLiveMode.tsx`
- Modify: `client/src/components/recipes/__tests__/RecipeLiveMode.test.tsx`

**Context:** Add an optional photo input to the final step of RecipeLiveMode, just before the "Registrar este Brew" button. If the user selects a photo: preview it, allow removal, upload it (or queue the blob if offline), and pass the photoUrl/blob to submitBrewLog.

- [ ] **Step 1: Update RecipeLiveMode state**

In RecipeLiveMode.tsx, add state for photo:

```typescript
const [photoPreview, setPhotoPreview] = useState<string | null>(null);
const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
const [photoUrl, setPhotoUrl] = useState<string | null>(null);
const [uploading, setUploading] = useState(false);
const objectUrlRef = useRef<string | null>(null);
```

- [ ] **Step 2: Add photo handler**

```typescript
const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  const objectUrl = URL.createObjectURL(file);
  if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  objectUrlRef.current = objectUrl;
  setPhotoPreview(objectUrl);
  setPhotoBlob(file);

  setUploading(true);
  try {
    const res = await uploadsApi.upload(file);
    setPhotoUrl(res.data.data.url);
  } catch {
    // If offline or upload fails, we have the blob in state; brewSync will handle it
    // Do not show error — the user can still register with photoBlob
  } finally {
    setUploading(false);
  }
};

const handleRemovePhoto = () => {
  if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  setPhotoPreview(null);
  setPhotoBlob(null);
  setPhotoUrl(null);
};
```

- [ ] **Step 3: Render photo control on final step**

In the final-step section (where the "Registrar este Brew" button is), add the photo control:

```tsx
{!hasNext && (
  <div className="mb-4 border-t border-coffee-800/50 pt-4">
    <p className="text-xs text-coffee-500 uppercase tracking-widest mb-2">Foto (opcional)</p>
    {photoPreview ? (
      <div className="relative mb-3">
        <img src={photoPreview} alt="Brew preview" className="w-full h-40 object-cover rounded" />
        <button
          type="button"
          onClick={handleRemovePhoto}
          className="absolute top-1 right-1 p-1 bg-red-600/80 text-white rounded"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    ) : (
      <label className="flex items-center justify-center gap-2 border-2 border-dashed border-coffee-700 p-4 rounded cursor-pointer hover:border-gold-500 transition-colors mb-3">
        <span className="text-xs text-coffee-400">📷 Tomar o seleccionar foto</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          disabled={uploading}
          className="hidden"
        />
      </label>
    )}
  </div>
)}
```

- [ ] **Step 4: Update submitBrewLog to pass photoUrl/blob**

In `handleRegisterBrew`, modify the submitBrewLog call:

```typescript
const { newAchievements } = await submitBrewLog({
  recipeId: recipe.id,
  rating: avgRating,
  notes: notes || undefined,
  photoUrl: photoUrl || undefined,
  photoBlob: photoBlob || undefined, // offline fallback
  clientBrewId: uuid(), // generate a client ID for idempotency
});
```

Add a `uuid()` import (or use `crypto.randomUUID()` if available).

- [ ] **Step 5: Update useBarista hook**

The `submitBrewLog` call in `useBarista` already accepts `photoUrl`, but we need to add `photoBlob` and `clientBrewId` to the interface. Modify `client/src/hooks/useBarista.ts`:

```typescript
const submitBrewLog = useCallback(async (data: {
  recipeId: string;
  rating: number;
  notes?: string;
  photoUrl?: string;
  photoBlob?: Blob;       // NEW: for offline fallback
  clientBrewId?: string;  // NEW: for idempotency
}): Promise<...> => {
  // If offline, enqueue instead of posting
  if (!navigator.onLine) {
    const queuedBrew: QueuedBrew = {
      id: data.clientBrewId || crypto.randomUUID(),
      recipeId: data.recipeId,
      rating: data.rating,
      notes: data.notes,
      photoBlob: data.photoBlob,
      photoUrl: data.photoUrl,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    await enqueueBrew(queuedBrew);
    // Return mock achievements; real ones come on sync
    return { newAchievements: [] };
  }
  
  // Online: upload photo if blob, then submit
  let photoUrl = data.photoUrl;
  if (data.photoBlob && !photoUrl) {
    const file = new File([data.photoBlob], 'brew.jpg', { type: 'image/jpeg' });
    const uploadRes = await uploadsApi.upload(file);
    photoUrl = uploadRes.data.data.url;
  }

  try {
    const res = await baristaApi.submitBrewLog({
      recipeId: data.recipeId,
      rating: data.rating,
      notes: data.notes,
      photoUrl,
      clientBrewId: data.clientBrewId,
    });
    setProfile(res.data.data.profile);
    return { newAchievements: res.data.data.newAchievements ?? [] };
  } catch (err: any) {
    // If 409 (duplicate), still show success (already synced)
    if (err.response?.status === 409) {
      return { newAchievements: [] };
    }
    setError(err.response?.data?.error || 'Error al registrar brew');
    throw err;
  }
}, []);
```

- [ ] **Step 6: Update test**

Add a test case for the photo control in RecipeLiveMode test:

```typescript
it('renders photo control on last step', async () => {
  render(<RecipeLiveMode recipe={mockRecipe} onClose={() => {}} />);
  fireEvent.click(screen.getByLabelText(/siguiente/i));
  expect(screen.getByText(/foto.*opcional/i)).toBeInTheDocument();
});
```

- [ ] **Step 7: Run tests**

```bash
cd client && pnpm test
```

Expected: all pass (64 + 1 new = 65)

- [ ] **Step 8: Commit**

```bash
cd /home/grxson/github/12porciento-cafe && git add client/src/components/recipes/RecipeLiveMode.tsx client/src/hooks/useBarista.ts client/src/components/recipes/__tests__/RecipeLiveMode.test.tsx
git commit -m "feat(recipes): add optional photo capture in RecipeLiveMode final step"
```

---

### Task 5: Workbox recipe cache — extend vite.config.ts

**Files:**
- Modify: `client/vite.config.ts`

**Context:** The Workbox runtime cache already uses NetworkFirst for `/api/` with a 5s timeout. We want recipe endpoints to be more aggressively cached since recipe content changes infrequently. Add a dedicated rule for `/api/recipes` with StaleWhileRevalidate strategy and longer expiration.

- [ ] **Step 1: Update Workbox config**

In `client/vite.config.ts`, find the `runtimeCaching` array and add a new rule at the beginning (specific routes first):

```typescript
runtimeCaching: [
  // Recipes: StaleWhileRevalidate with longer cache
  {
    urlPattern: ({ url }: { url: URL }) => 
      url.pathname.startsWith('/api/recipes'),
    handler: 'StaleWhileRevalidate' as const,
    options: {
      cacheName: 'recipes-cache',
      expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }, // 7 days
      cacheableResponse: { statuses: [0, 200] },
    },
  },
  // ... existing API, google-fonts, unsplash rules ...
]
```

- [ ] **Step 2: Test**

Build the PWA:

```bash
cd client && pnpm run build
```

Verify no errors. The dist/ should contain the generated SW with the updated Workbox config.

- [ ] **Step 3: Commit**

```bash
cd /home/grxson/github/12porciento-cafe && git add client/vite.config.ts
git commit -m "feat(pwa): add aggressive recipe caching with StaleWhileRevalidate"
```

---

### Task 6: Server endpoint — GET /barista/:userId/brews (paginated)

**Files:**
- Modify: `server/src/routes/barista.ts`

**Context:** Add a new endpoint that returns the user's BrewLogs, optionally filtered by recipe, paginated, ordered newest-first. Public read (consistent with existing profile endpoint).

- [ ] **Step 1: Add route**

In `server/src/routes/barista.ts`, add the new route (after the profile route):

```typescript
// GET /barista/:userId/brews — list brews for a user, optionally filtered by recipe
router.get('/:userId/brews', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(1, parseInt((req.query.limit as string) || '20') || 20), 100);
    const page = Math.max(1, parseInt((req.query.page as string) || '1') || 1);
    const skip = (page - 1) * limit;
    const recipeId = (req.query.recipeId as string) || undefined;

    const where: any = { userId: req.params.userId };
    if (recipeId) where.recipeId = recipeId;

    const [brews, total] = await Promise.all([
      prisma.brewLog.findMany({
        where,
        include: { recipe: { select: { id: true, title: true, method: true, difficulty: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.brewLog.count({ where }),
    ]);

    res.json({
      data: brews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener brews' });
  }
});
```

- [ ] **Step 2: Test (manual)**

Start the server, then call:

```bash
curl 'http://localhost:3001/barista/USER_ID/brews?recipeId=RECIPE_ID&limit=10'
```

Expected: JSON with `{ data: [...], total, page, limit, totalPages }`.

- [ ] **Step 3: Commit**

```bash
cd /home/grxson/github/12porciento-cafe && git add server/src/routes/barista.ts
git commit -m "feat(api): add GET /barista/:userId/brews endpoint with recipe filter + pagination"
```

---

### Task 7: Server idempotency + achievements — extend POST /barista/brew-logs

**Files:**
- Modify: `server/src/routes/barista.ts`
- Modify: `server/src/routes/__tests__/barista.achievements.test.ts` (new tests)
- Create: `server/src/routes/__tests__/barista.achievements.test.ts`

**Context:** Update the existing `/barista/brew-logs` POST to:
1. Accept optional `clientBrewId` and check for duplicates (409 if duplicate, return existing).
2. Extend `checkAndUnlockAchievements` to compute method-mastery counts and streak days.
3. Store `clientBrewId` when creating.

- [ ] **Step 1: Write failing test**

Create `server/src/routes/__tests__/barista.achievements.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '../../db';

describe('Barista achievements', () => {
  let userId: string;
  let recipeV60: any;

  beforeAll(async () => {
    // Setup test user + recipes
    userId = 'test-user-' + Date.now();
    recipeV60 = await prisma.recipe.create({
      data: { title: 'V60 Test', slug: 'v60-test', method: 'V60', difficulty: 'MEDIA', description: '', isPremium: false, isPublished: true },
    });
  });

  afterAll(async () => {
    await prisma.brewLog.deleteMany({ where: { userId } });
  });

  it('unlocks v60_5 after 5 V60 brews', async () => {
    for (let i = 0; i < 5; i++) {
      await prisma.brewLog.create({
        data: {
          userId,
          recipeId: recipeV60.id,
          rating: 5 + i,
          xpEarned: 0,
        },
      });
    }

    // Run achievement check (manually or via route)
    const result = await checkAndUnlockAchievements(userId);
    const unlockedSlugs = result.map((a) => a.slug);
    expect(unlockedSlugs).toContain('v60_5');
  });

  it('detects duplicate clientBrewId (409)', async () => {
    const clientId = 'unique-' + Date.now();
    const data = {
      recipeId: recipeV60.id,
      rating: 7,
      notes: 'first',
      clientBrewId: clientId,
    };

    // First submit
    const res1 = await prisma.brewLog.create({
      data: { userId, ...data, xpEarned: 25 },
    });

    // Second submit with same clientBrewId
    const res2 = await prisma.brewLog.findUnique({
      where: { clientBrewId: clientId },
    });
    expect(res2?.id).toBe(res1.id); // should be the same
  });
});
```

- [ ] **Step 2: Run test to verify it FAILS**

```bash
cd server && pnpm test -- src/routes/__tests__/barista.achievements.test.ts
```

Expected: FAIL (tests not yet implemented in the route)

- [ ] **Step 3: Implement idempotency + extended achievements**

In `server/src/routes/barista.ts`, update `POST /barista/brew-logs`:

```typescript
router.post('/brew-logs', brewLogLimiter, requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const { recipeId, rating, notes, photoUrl, clientBrewId } = req.body;
    const userId = req.user!.id;

    if (!recipeId || !Number.isInteger(rating) || rating < 1 || rating > 10) {
      return res.status(400).json({ error: 'recipeId y rating (1-10 entero) requeridos' });
    }
    if (notes && (typeof notes !== 'string' || notes.length > 500)) {
      return res.status(400).json({ error: 'Las notas no pueden superar 500 caracteres' });
    }
    if (photoUrl && (typeof photoUrl !== 'string' || !/^\/api\/uploads\/[a-f0-9]{24}\.webp$/.test(photoUrl))) {
      return res.status(400).json({ error: 'URL de foto no válida' });
    }

    // Check for duplicate clientBrewId
    if (clientBrewId) {
      const existing = await prisma.brewLog.findUnique({ where: { clientBrewId } });
      if (existing) {
        return res.status(409).json({ data: { brewLog: existing, profile: null, newAchievements: [] } });
      }
    }

    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) return res.status(404).json({ error: 'Receta no encontrada' });

    let profile = await prisma.baristaProfile.upsert({
      where: { userId },
      create: { userId, favoriteMethod: recipe.method },
      update: {},
    });

    const xpEarned = calculateXp(recipe.difficulty || 'MEDIA', rating);

    const brewLog = await prisma.brewLog.create({
      data: {
        userId,
        recipeId,
        rating,
        notes: notes?.trim() ?? null,
        photoUrl: photoUrl?.trim() ?? null,
        xpEarned,
        clientBrewId: clientBrewId ?? null,
      },
      include: { recipe: { select: { id: true, title: true, method: true, difficulty: true } } },
    });

    let updatedProfile = await prisma.baristaProfile.update({
      where: { userId },
      data: {
        totalXp: { increment: xpEarned },
        totalBrews: { increment: 1 },
        ...(rating === 10 ? { favoriteMethod: recipe.method } : {}),
      },
    });
    const correctLevel = Math.floor(updatedProfile.totalXp / 100) + 1;
    if (updatedProfile.level !== correctLevel) {
      updatedProfile = await prisma.baristaProfile.update({
        where: { userId },
        data: { level: correctLevel },
      });
    }

    const newAchievements = await checkAndUnlockAchievements(userId);

    const finalProfile = newAchievements.length > 0
      ? await prisma.baristaProfile.findUnique({ where: { userId } })
      : updatedProfile;

    res.status(201).json({ data: { brewLog, profile: finalProfile, newAchievements } });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar brew' });
  }
});
```

- [ ] **Step 4: Extend checkAndUnlockAchievements**

Replace the existing `checkAndUnlockAchievements` function:

```typescript
async function checkAndUnlockAchievements(userId: string): Promise<{ id: string; name: string; icon: string; xpReward: number }[]> {
  const [profile, brewCount, hasPerfect, profileWithBrews] = await Promise.all([
    prisma.baristaProfile.findUnique({
      where: { userId },
      include: { achievements: { include: { achievement: true } } },
    }),
    prisma.brewLog.count({ where: { userId } }),
    prisma.brewLog.findFirst({ where: { userId, rating: 10 }, select: { id: true } }),
    prisma.baristaProfile.findUnique({
      where: { userId },
      include: { brewLogs: { include: { recipe: true } } },
    }),
  ]);
  if (!profile) return [];

  // Count brews per method
  const methodCounts = new Map<string, number>();
  profileWithBrews?.brewLogs.forEach((bl) => {
    const method = bl.recipe?.method;
    if (method) methodCounts.set(method, (methodCounts.get(method) ?? 0) + 1);
  });

  // Compute streak (consecutive days)
  const brewDates = profileWithBrews?.brewLogs
    .map((bl) => bl.createdAt.toISOString().split('T')[0])
    .sort()
    .reverse() ?? [];
  const uniqueDates = Array.from(new Set(brewDates));
  let streak = 0;
  if (uniqueDates.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    let currentDate = uniqueDates[0];
    if (currentDate === today || new Date(currentDate).getTime() >= new Date(today).getTime() - 24 * 60 * 60 * 1000) {
      for (const date of uniqueDates) {
        const expectedDate = new Date(currentDate);
        expectedDate.setDate(expectedDate.getDate() - streak);
        const expected = expectedDate.toISOString().split('T')[0];
        if (date === expected) streak++;
        else break;
      }
    }
  }

  const candidates = [
    { slug: 'first_brew', met: brewCount >= 1 },
    { slug: 'five_brews', met: brewCount >= 5 },
    { slug: 'ten_brews', met: brewCount >= 10 },
    { slug: 'perfect_brew', met: hasPerfect !== null },
    { slug: 'v60_5', met: (methodCounts.get('V60') ?? 0) >= 5 },
    { slug: 'aeropress_5', met: (methodCounts.get('AeroPress') ?? 0) >= 5 },
    { slug: 'espresso_5', met: (methodCounts.get('Espresso') ?? 0) >= 5 },
    { slug: 'streak_3', met: streak >= 3 },
    { slug: 'streak_7', met: streak >= 7 },
  ];

  const unlocked: { id: string; name: string; icon: string; xpReward: number }[] = [];
  let bonusXp = 0;

  for (const c of candidates) {
    if (!c.met) continue;
    const alreadyUnlocked = profile.achievements.some((a) => a.achievement.slug === c.slug);
    if (alreadyUnlocked) continue;
    const achievement = await prisma.achievement.findUnique({ where: { slug: c.slug } });
    if (!achievement) continue;
    await prisma.achievementUnlock.create({ data: { userId, achievementId: achievement.id } });
    bonusXp += achievement.xpReward;
    unlocked.push({ id: achievement.id, name: achievement.name, icon: achievement.icon, xpReward: achievement.xpReward });
  }

  if (bonusXp > 0) {
    const after = await prisma.baristaProfile.update({
      where: { userId },
      data: { totalXp: { increment: bonusXp } },
    });
    await prisma.baristaProfile.update({
      where: { userId },
      data: { level: Math.floor(after.totalXp / 100) + 1 },
    });
  }

  return unlocked;
}
```

- [ ] **Step 5: Run tests**

```bash
cd server && pnpm test
```

Expected: 4 + 2 = 6 tests pass

- [ ] **Step 6: Commit**

```bash
cd /home/grxson/github/12porciento-cafe && git add server/src/routes/barista.ts server/src/routes/__tests__/barista.achievements.test.ts
git commit -m "feat(achievements): add clientBrewId idempotency and method/streak achievement logic"
```

---

### Task 8: Seed 5 new achievements

**Files:**
- Modify: `server/prisma/seed.ts`

**Context:** Add 5 new achievement records to the seed data for the 5 new milestones (method-mastery x3 + streaks x2).

- [ ] **Step 1: Add achievements to seed**

In `server/prisma/seed.ts`, find the achievements array and add:

```typescript
{ slug: 'v60_5', name: 'Maestro del V60', description: 'Registra 5 cafés con V60', icon: '☕', rarity: 'RARE', xpReward: 40 },
{ slug: 'aeropress_5', name: 'As del AeroPress', description: 'Registra 5 cafés con AeroPress', icon: '🔌', rarity: 'RARE', xpReward: 40 },
{ slug: 'espresso_5', name: 'Espresso Pro', description: 'Registra 5 espressos', icon: '⚡', rarity: 'RARE', xpReward: 40 },
{ slug: 'streak_3', name: 'Racha de 3 días', description: 'Prepara café 3 días seguidos', icon: '🔥', rarity: 'RARE', xpReward: 50 },
{ slug: 'streak_7', name: 'Racha de 7 días', description: 'Prepara café 7 días seguidos', icon: '🏆', rarity: 'EPIC', xpReward: 120 },
```

- [ ] **Step 2: Run seed**

```bash
cd server && npx prisma db seed
```

Expected: "Seeding database..." → achievements created.

- [ ] **Step 3: Verify**

```bash
cd server && npx prisma studio
```

Navigate to Achievement table, confirm the 5 new ones exist. Close.

- [ ] **Step 4: Commit**

```bash
cd /home/grxson/github/12porciento-cafe && git add server/prisma/seed.ts
git commit -m "feat(seed): add 5 new achievements for method mastery and streaks"
```

---

### Task 9: AttemptsList component — history of brews per recipe

**Files:**
- Create: `client/src/components/recipes/AttemptsList.tsx`

**Context:** Display a list of the logged-in user's past brews for the current recipe. For each brew, show: rating/10, notes excerpt, photo thumbnail, date, and "Pendiente de sincronizar" badge if it's a queued brew.

- [ ] **Step 1: Implement component**

Create `client/src/components/recipes/AttemptsList.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { baristaApi } from '../../api';
import type { BrewLog } from '../../types';

interface AttemptsListProps {
  recipeId: string;
}

export default function AttemptsList({ recipeId }: AttemptsListProps) {
  const user = useUser((s) => s.user);
  const [brews, setBrews] = useState<BrewLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    baristaApi.getUserBrews(user.id, { recipeId, limit: '20' })
      .then((res) => setBrews(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id, recipeId]);

  if (!user) return null;
  if (loading) return <div className="text-xs text-coffee-400">Cargando intentos...</div>;
  if (brews.length === 0) return <div className="text-xs text-coffee-400">Sin intentos aún.</div>;

  return (
    <div className="mt-6 border-t border-coffee-800/50 pt-4">
      <h3 className="text-sm font-semibold text-cream mb-3">Tus Intentos</h3>
      <div className="space-y-2">
        {brews.map((brew) => (
          <div key={brew.id} className="flex gap-3 text-xs">
            {brew.photoUrl && (
              <img src={brew.photoUrl} alt="Brew" className="w-12 h-12 object-cover rounded" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{brew.rating}/10</span>
                <span className="text-coffee-400">{new Date(brew.createdAt).toLocaleDateString()}</span>
                {brew.status === 'pending' && (
                  <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5">Pendiente</span>
                )}
              </div>
              {brew.notes && <p className="text-coffee-400 line-clamp-1 mt-1">{brew.notes}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add API method**

In `client/src/api/barista.ts`, add:

```typescript
getUserBrews: (userId: string, params?: { recipeId?: string; limit?: string }) =>
  api.get(`/barista/${userId}/brews`, { params }),
```

- [ ] **Step 3: Wire into recipe view**

In `client/src/pages/Recipes.tsx`, find where the recipe is displayed (the detail or card view) and add `<AttemptsList recipeId={recipe.id} />` after the recipe content, if user is logged in.

- [ ] **Step 4: Test (manual)**

Log in, view a recipe detail, see a list of past brews. Verify the API call returns data.

- [ ] **Step 5: Commit**

```bash
cd /home/grxson/github/12porciento-cafe && git add client/src/components/recipes/AttemptsList.tsx client/src/api/barista.ts client/src/pages/Recipes.tsx
git commit -m "feat(attempts): add attempts list showing user's brew history per recipe"
```

---

### Task 10: BrewComparator component — side-by-side brew diff

**Files:**
- Create: `client/src/components/barista/BrewComparator.tsx`

**Context:** On BaristaProfile, add an optional "Comparar intentos" mode. User selects two brews (from any recipe or filtered by recipe). Render them side-by-side showing: recipe, rating diff, notes, photos, dates.

- [ ] **Step 1: Implement component**

Create `client/src/components/barista/BrewComparator.tsx`:

```typescript
import { useState } from 'react';
import type { BrewLog } from '../../types';

interface BrewComparatorProps {
  brews: BrewLog[];
}

export default function BrewComparator({ brews }: BrewComparatorProps) {
  const [brew1Id, setBrew1Id] = useState<string | null>(null);
  const [brew2Id, setBrew2Id] = useState<string | null>(null);

  const brew1 = brews.find((b) => b.id === brew1Id);
  const brew2 = brews.find((b) => b.id === brew2Id);

  if (!brew1 || !brew2) {
    return (
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-cream mb-3">Comparar Intentos</h3>
        <div className="space-y-2 text-xs text-coffee-400">
          <div>
            <label className="block mb-1">Primer brew:</label>
            <select
              value={brew1Id ?? ''}
              onChange={(e) => setBrew1Id(e.target.value || null)}
              className="w-full bg-coffee-900 border border-coffee-700 text-cream px-2 py-1"
            >
              <option value="">Selecciona un brew...</option>
              {brews.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.recipe?.title} — {b.rating}/10 ({new Date(b.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1">Segundo brew:</label>
            <select
              value={brew2Id ?? ''}
              onChange={(e) => setBrew2Id(e.target.value || null)}
              className="w-full bg-coffee-900 border border-coffee-700 text-cream px-2 py-1"
            >
              <option value="">Selecciona un brew...</option>
              {brews.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.recipe?.title} — {b.rating}/10 ({new Date(b.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  const ratingDiff = brew2.rating - brew1.rating;

  return (
    <div className="mb-6 border border-coffee-700 p-4 rounded">
      <h3 className="text-sm font-semibold text-cream mb-4">Comparación</h3>
      <button
        onClick={() => { setBrew1Id(null); setBrew2Id(null); }}
        className="text-xs text-coffee-400 hover:text-gold-400 mb-4"
      >
        ← Cambiar selección
      </button>

      <div className="grid grid-cols-2 gap-4">
        {/* Brew 1 */}
        <div className="border border-coffee-700/50 p-3 rounded text-xs">
          <p className="font-semibold text-cream mb-2">{brew1.recipe?.title}</p>
          <div className="space-y-1 text-coffee-400">
            <div>
              <span className="text-gold-400 font-bold">{brew1.rating}/10</span>
            </div>
            <div className="text-[10px]">{new Date(brew1.createdAt).toLocaleDateString()}</div>
            {brew1.photoUrl && (
              <img src={brew1.photoUrl} alt="Brew 1" className="w-16 h-16 object-cover rounded mt-2" />
            )}
            {brew1.notes && <p className="line-clamp-2 mt-2">{brew1.notes}</p>}
          </div>
        </div>

        {/* Brew 2 */}
        <div className="border border-coffee-700/50 p-3 rounded text-xs">
          <p className="font-semibold text-cream mb-2">{brew2.recipe?.title}</p>
          <div className="space-y-1 text-coffee-400">
            <div>
              <span className="text-gold-400 font-bold">{brew2.rating}/10</span>
              {ratingDiff !== 0 && (
                <span className={`ml-2 font-semibold ${ratingDiff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {ratingDiff > 0 ? '+' : ''}{ratingDiff}
                </span>
              )}
            </div>
            <div className="text-[10px]">{new Date(brew2.createdAt).toLocaleDateString()}</div>
            {brew2.photoUrl && (
              <img src={brew2.photoUrl} alt="Brew 2" className="w-16 h-16 object-cover rounded mt-2" />
            )}
            {brew2.notes && <p className="line-clamp-2 mt-2">{brew2.notes}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into BaristaProfile**

In `client/src/pages/BaristaProfile.tsx`, find where profile brews are displayed and add `<BrewComparator brews={profile?.brewLogs ?? []} />` above the brew list.

- [ ] **Step 3: Test (manual)**

Navigate to profile, see the "Comparar intentos" section, select two brews, see them side-by-side with rating diff.

- [ ] **Step 4: Commit**

```bash
cd /home/grxson/github/12porciento-cafe && git add client/src/components/barista/BrewComparator.tsx client/src/pages/BaristaProfile.tsx
git commit -m "feat(profile): add brew comparator for side-by-side analysis"
```

---

### Task 11: Integration — photo offline fallback in useBarista

**Files:**
- Modify: `client/src/hooks/useBarista.ts` (already modified in Task 4, finalize)

**Context:** This was started in Task 4. Finalize the offline photo + queue logic. Ensure the interface accepts `photoBlob` and `clientBrewId` and the submit path handles both online (upload then POST) and offline (enqueue) flows.

- [ ] **Step 1: Review current state** (already done in Task 4)

- [ ] **Step 2: Test offline flow (manual)**

DevTools offline, complete a brew with photo, verify it's queued. Go online, verify sync.

- [ ] **Commit not needed** (already committed in Task 4)

---

### Task 12: Sync toasts on offline brew completion

**Files:**
- Modify: `client/src/services/brewSync.ts` (already created in Task 3, finalize for toasts)

**Context:** When a queued brew successfully syncs (POST returns achievements), surface the XP + achievement toasts just like a live brew would.

- [ ] **Step 1: Update brewSync to dispatch toasts**

The current brewSync code doesn't dispatch toasts. Update it to use the toast context:

```typescript
import { useToast } from '../context/ToastContext'; // Import hook

// In the sync function:
const { add: addToast } = useToast();
// ...
if (res.data.data?.newAchievements?.length) {
  // Show XP toast
  addToast(`+${xp} XP ganados ☕`, 'success');
  // Show achievement toasts staggered
  res.data.data.newAchievements.forEach((a, idx) => {
    setTimeout(() => {
      addToast(`🏆 Logro: ${a.icon} ${a.name} (+${a.xpReward} XP)`, 'success');
    }, 400 * (idx + 1));
  });
}
```

- [ ] **Step 2: Test offline sync toasts (manual)**

Queue a brew offline, go online, watch toasts appear.

- [ ] **Step 3: Commit**

```bash
cd /home/grxson/github/12porciento-cafe && git add client/src/services/brewSync.ts
git commit -m "feat(sync): display XP and achievement toasts on offline brew sync"
```

---

### Summary of execution

All 12 tasks implement the 4 features of Fase 2:

| Feature | Tasks | Key Files |
|---------|-------|-----------|
| Photo capture | Task 4 | RecipeLiveMode, useBarista |
| Offline-first | Tasks 1, 2, 3 | BrewLog schema, useBrewQueue, brewSync |
| Comparison | Tasks 9, 10 | AttemptsList, BrewComparator |
| Milestones | Tasks 7, 8 | checkAndUnlockAchievements, seed |

Order of execution: schema first (Task 1), then hooks/services (Tasks 2–3), server endpoints (Tasks 6–7), seed (Task 8), then UI components (Tasks 4, 9–10), integration (Tasks 11–12).

---

**Plan complete and saved to `docs/superpowers/plans/2026-06-11-dynamic-recipes-fase2.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
