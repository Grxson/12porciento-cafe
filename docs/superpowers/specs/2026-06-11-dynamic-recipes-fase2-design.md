# Dynamic Recipes - Fase 2: Photo, Offline-First, Comparison, Milestones

> **Status:** Design approved
> **Date:** 2026-06-11
> **Depends on:** Fase 1 (RecipeLiveMode interactive experience, useRecipeDraft, BrewLog 1-10 scale)
> **Scope:** All 4 features shipped together.

## Overview

Build on Fase 1's interactive RecipeLiveMode with four capabilities:

1. **Photo capture** — optional photo of the final brew, camera-or-gallery, graceful on camera-less devices.
2. **Offline-first** — precached recipes + offline brew submission queue + offline photo queue with Background Sync.
3. **Comparison** — list of past attempts per recipe + side-by-side comparator of two brews on the profile.
4. **Accumulated milestones** — method-specific and streak achievements unlocked when a brew syncs to the server.

## Goals

- Let users capture and revisit their brewing results.
- Make the entire brew flow work without connectivity, syncing automatically when back online.
- Give users a sense of progress by comparing attempts over time.
- Reward consistency and method mastery with new achievements.

## Feature 1: Photo Capture

### User Story
As a barista finishing a recipe, I want to optionally snap a photo of my result, so I can remember and compare brews. On a device without a camera, I can still pick an image from storage.

### Design
- In `RecipeLiveMode`, on the final step (next to "Registrar este Brew"), add an optional photo control.
- Use a file input: `<input type="file" accept="image/*" capture="environment">`.
  - On mobile: opens rear camera.
  - On desktop / camera-less devices: falls back to the OS file picker. The `capture` attribute is a hint, not a requirement — browsers ignore it when no camera exists.
- Show a thumbnail preview after selection, with a remove (X) button.
- Upload via the existing `uploadsApi.upload(file)` → returns a `/api/uploads/{id}.webp` URL.
- The resulting `photoUrl` is passed to `submitBrewLog({ ..., photoUrl })`.
- **Offline behavior:** if upload fails due to no connectivity, store the raw image blob in the brew queue (Feature 2) and upload it during sync before the BrewLog POST.

### Acceptance Criteria
- Photo control is optional; brew can be registered with no photo.
- Camera opens on capable mobile devices; file picker fallback elsewhere.
- Preview + remove works.
- Online: photo uploads, URL attached to BrewLog.
- Offline: blob queued, uploaded on sync, URL attached before BrewLog POST.

## Feature 2: Offline-First

### User Story
As a barista in a kitchen with poor signal, I want to view recipes and register brews offline, and have everything sync automatically when I'm back online.

### Architecture

**Recipe precache (read path):**
- Extend the existing Workbox `runtimeCaching` in `client/vite.config.ts`.
- The current config uses `NetworkFirst` for all `/api/` requests (5s timeout, 24h expiration). This already provides basic offline read of previously-visited API responses.
- Add a dedicated cache rule for `/api/recipes` and `/api/recipes/:slug` with `StaleWhileRevalidate` and a longer expiration (7 days, maxEntries 100) so recipe content is reliably available offline after first visit.

**Brew submission queue (write path):**
- New IndexedDB store `brew_queue` in the existing `cafe12_pwa` database (created in Fase 1).
- Queue entry shape:
  ```typescript
  interface QueuedBrew {
    id: string;            // uuid
    recipeId: string;
    rating: number;
    notes?: string;
    photoBlob?: Blob;      // raw image, if photo was taken offline
    photoUrl?: string;     // if already uploaded
    createdAt: string;     // when the brew was completed (client time)
    status: 'pending' | 'syncing' | 'failed';
  }
  ```
- On `submitBrewLog`: attempt the network POST. If it fails due to offline/network error, write a `QueuedBrew` and resolve locally (UI shows the brew as "Pendiente de sincronizar").
- **Sync trigger:** use the Background Sync API (`registration.sync.register('brew-sync')`) where available; also run a sync pass on `window` `online` event and on app load. Background Sync handler:
  1. For each pending entry: if `photoBlob` exists, upload it first → get `photoUrl`.
  2. POST the BrewLog with `photoUrl`.
  3. On success, remove from queue. On failure, mark `failed` and retry next pass.
- **Idempotency:** include a client-generated `clientBrewId` (the queue entry `id`) in the POST so a retry after a partial success doesn't double-create. Server stores it and rejects duplicates. (See Server Changes.)

**Offline UI indicators:**
- A small badge "Pendiente de sincronizar" on queued brews in BaristaProfile / attempts list.
- A global offline indicator (optional, low priority): a thin banner when `navigator.onLine === false`.

### Acceptance Criteria
- Recipes viewed once are available offline.
- A brew completed offline is queued, not lost, and the UI confirms it locally.
- When connectivity returns, queued brews (and their photos) upload automatically.
- No duplicate BrewLogs are created on retry (idempotency via clientBrewId).
- Queued brews show a "pending sync" badge.

## Feature 3: Comparison

### User Story
As a barista, I want to see all my past attempts at a recipe and compare two of them side by side, so I can see how I've improved.

### Design

**Attempts list (on recipe view):**
- In the recipe detail (the page that opens RecipeLiveMode — `client/src/pages/Recipes.tsx` recipe card / detail area), add a "Tus intentos" section for logged-in users.
- Fetches the user's brews for that recipe and lists them chronologically: rating (`/10`), notes excerpt, photo thumbnail, date.
- Pending (un-synced) brews appear here too, flagged.

**Side-by-side comparator (on BaristaProfile):**
- In `BaristaProfile`, add a "Comparar intentos" mode.
- User selects two brews (from any recipe, or filtered by recipe).
- Render them side by side: rating diff (e.g. "7 → 9, +2"), notes side by side, photos side by side, dates.

**Server endpoint:**
- New: `GET /api/barista/:userId/brews?recipeId=<id>` — returns the user's BrewLogs, optionally filtered by recipe, ordered by `createdAt desc`.
  - Public read (consistent with the existing `GET /:userId/profile` which is public). Returns the same brewLog shape already used (with recipe relation).
  - Supports pagination via `?limit` (default 20, max 100) to keep payloads small.

### Acceptance Criteria
- Recipe view shows the logged-in user's attempts for that recipe.
- Profile comparator lets the user pick two brews and see a clear rating/notes/photo diff.
- Endpoint returns brews filtered by recipe, paginated, ordered newest-first.
- Pending offline brews are included in the attempts list, flagged.

## Feature 4: Accumulated Milestones

### User Story
As a barista, I want to unlock achievements for mastering a method and for brewing consistently, so I feel rewarded for my habits.

### Design

**New seeded achievements** (added to `server/prisma/seed.ts`):
- `v60_5` — "Maestro del V60" — 5 brews with method V60 — icon ☕ — RARE — 40 XP
- `aeropress_5` — "As del AeroPress" — 5 brews with method AeroPress — icon 🔌 — RARE — 40 XP
- `espresso_5` — "Espresso Pro" — 5 brews with method Espresso — icon ⚡ — RARE — 40 XP
- `streak_3` — "Racha de 3 días" — brewed 3 distinct days in a row — icon 🔥 — RARE — 50 XP
- `streak_7` — "Racha de 7 días" — brewed 7 distinct days in a row — icon 🏆 — EPIC — 120 XP

(Method names match the existing `recipe.method` values used in the seed — verify exact strings at implementation time.)

**Server logic** (extend `checkAndUnlockAchievements` in `server/src/routes/barista.ts`):
- Method counts: `prisma.brewLog.count({ where: { userId, recipe: { method: 'V60' } } })` (via relation filter) for each tracked method.
- Streak: fetch the distinct `createdAt` dates (day granularity) for the user, compute the longest current consecutive-day run ending today (or the brew's day). Helper: pull recent brew dates ordered desc, normalize to YYYY-MM-DD in the server timezone, walk backwards counting consecutive days.
- Add these candidates to the existing `candidates` array with their `met` booleans. The existing unlock/XP/level logic handles the rest.

**Real-time surfacing:**
- These unlock when a brew is created/synced. The existing `submitBrewLog` already returns `newAchievements`, and the staggered toast logic (Fase 1) already displays them. No new client toast code needed — just ensure the offline sync path also surfaces achievements when a queued brew finally posts (show toasts on successful sync).

### Acceptance Criteria
- 5 new achievements seeded.
- Method-mastery achievements unlock at 5 brews of that method.
- Streak achievements unlock at 3 and 7 consecutive brewing days.
- Achievements unlocked during offline sync surface their toasts when the brew posts.
- Existing achievement infrastructure (XP, level, dedupe) is reused, not duplicated.

## Server Changes Summary

1. **Idempotency for brew creation:** accept optional `clientBrewId` in `POST /barista/brew-logs`. Add a nullable unique `clientBrewId` column to `BrewLog` (Prisma). If a brew with that `clientBrewId` already exists, return the existing one (200) instead of creating a duplicate.
   - Migration: use `prisma db push` (project convention for non-interactive CI).
2. **New endpoint:** `GET /barista/:userId/brews?recipeId=&limit=` — paginated brew list, optional recipe filter.
3. **Extended `checkAndUnlockAchievements`:** method counts + streak computation.
4. **Seed:** 5 new achievements.

## Client Changes Summary

1. **Photo control** in RecipeLiveMode final step (reuse uploadsApi, offline blob fallback).
2. **`brew_queue` IndexedDB store** + queue helpers (enqueue, list, remove, mark status) — new file `client/src/hooks/useBrewQueue.ts` (plain async functions, same pattern as useRecipeDraft).
3. **Sync engine** — `client/src/services/brewSync.ts`: runs on `online` event, app load, and Background Sync. Uploads photos then posts brews, surfaces achievement toasts.
4. **Service worker Background Sync** registration — extend the existing vite-plugin-pwa setup. Where Background Sync is unavailable (Firefox/Safari), fall back to the `online`-event sync pass.
5. **Workbox recipe cache rule** in vite.config.ts.
6. **Attempts list component** — `client/src/components/recipes/AttemptsList.tsx`, shown in recipe view.
7. **Comparator** — `client/src/components/barista/BrewComparator.tsx`, shown in BaristaProfile.
8. **Pending-sync badges** in attempts list / profile.

## Data Flow: Offline Brew

```
User finishes recipe offline, optionally takes photo
  ↓
submitBrewLog() tries network POST → fails (offline)
  ↓
Enqueue QueuedBrew { ...data, photoBlob?, clientBrewId, status: 'pending' }
  ↓
UI shows brew locally with "Pendiente de sincronizar"
  ↓
[Later] connectivity returns → 'online' event / Background Sync 'brew-sync'
  ↓
brewSync: for each pending →
    upload photoBlob (if any) → photoUrl
    POST /barista/brew-logs { ...data, photoUrl, clientBrewId }
    server: clientBrewId seen? → return existing (no dup) : create
  ↓
On success: remove from queue, surface XP + achievement toasts
On failure: mark 'failed', retry next pass
```

## Testing Strategy

### Unit
- `useBrewQueue`: enqueue/list/remove/mark round-trip (IndexedDB mock, same pattern as useRecipeDraft test).
- Streak computation helper: consecutive days, gaps, single day, today-anchored.
- Method-count achievement candidate logic.
- Photo control: renders, preview, remove, optional (no photo path).

### Integration
- `brewSync`: queued brew with photoBlob → uploads then posts → removed from queue. Mock uploadsApi + baristaApi.
- Idempotency: posting same clientBrewId twice → one BrewLog (server test).
- New endpoint: returns filtered, paginated brews (server test).

### Manual (Browser, PWA)
- Offline golden path: DevTools offline → complete recipe + photo → see "pending" → go online → auto-sync → toast + brew appears.
- Camera on mobile device; file picker on desktop.
- Attempts list shows history; comparator diffs two brews.
- Unlock v60_5 by logging 5 V60 brews; unlock streak_3 across 3 days (can fake via seed/clock).

## Constraints & Assumptions

- Background Sync API only in Chromium; Firefox/Safari use `online`-event fallback. Both paths must work.
- Photos stored as Blobs in IndexedDB while queued; cleared after successful upload.
- BrewLog schema gains nullable `clientBrewId` (unique). Existing rows have NULL — fine.
- Streak timezone: compute in server timezone consistently (document the chosen zone).
- Method strings must match existing `recipe.method` seed values exactly.

## Out of Scope (future)

- Conflict resolution beyond idempotency (e.g., editing a queued brew).
- Social sharing of brews/photos.
- Cross-device queue sync (queue is per-device).
- Server-side image transcoding changes (reuse existing uploads pipeline).

## Success Criteria

- ✅ Optional photo capture, camera-or-gallery, graceful fallback.
- ✅ Recipes viewable offline; brews queued offline and auto-synced.
- ✅ No duplicate brews on retry (clientBrewId idempotency).
- ✅ Attempts list per recipe + side-by-side comparator.
- ✅ 5 new achievements (method mastery + streaks) unlock correctly, including via offline sync.
- ✅ All tests passing; no regressions to Fase 1.
