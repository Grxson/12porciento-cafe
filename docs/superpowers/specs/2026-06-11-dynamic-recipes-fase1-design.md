# Dynamic Recipes - Fase 1: Interactive Live Experience

> **Status:** Design approved  
> **Date:** 2026-06-11  
> **Scope:** Phase 1 only (rating + notes + gestures). Phase 2 (photo + offline + comparison + achievements) separate.

## Overview

Enhance RecipeLiveMode with optional in-live rating, note-taking, and advanced gestures. Transform recipe preparation from a passive step-by-step guide into an interactive, playful brewing experience. Data collected during recipe automatically creates BrewLog at completion (replaces post-recipe BrewLogForm modal).

## Goals

- Make recipe preparation more engaging and interactive
- Collect brewing feedback in-context (not post-hoc)
- Reduce friction: no modal interruption at the end
- PWA-first: persistent draft state if user pauses/resumes
- Gesture-based: swipe, tap, long-press for full control

## User Stories

### Story 1: Rate Step-by-Step
As a barista, I want to rate each step as I execute it, so I can track which steps affect my final result.

**Acceptance Criteria:**
- Rating slider (1-10) available on each step, optional
- Visual feedback (emoji scale: 😐 to 🔥)
- Rating persists if user navigates away
- User can change rating on return

### Story 2: Take Quick Notes
As a barista, I want to jot down observations while brewing (temperature off, grind too fine, etc.), so I can remember what happened.

**Acceptance Criteria:**
- Voice-to-text capture button (hands-free while brewing)
- Quick-template buttons (preset tags: "muy caliente", "amargo", "perfecto", "+custom")
- Free-text input as fallback
- All three methods available simultaneously
- Notes optional, not required

### Story 3: Gesture Control
As a barista, I want full control via gestures so I don't have to look at buttons while brewing.

**Acceptance Criteria:**
- Swipe left/right: navigate steps
- Tap "Completado" button: mark step done
- Long-press step area: quick menu (rating, notes, timer)
- Gesture hints visible (footer indicators)

### Story 4: Persistent Draft State
As a barista, if I pause mid-recipe, I want to resume later without losing progress.

**Acceptance Criteria:**
- All step progress, ratings, notes saved to IndexedDB
- User closes app mid-step
- Returns later, sees "Resume Brew" option
- Clicks resume, returns to exact step with all prior data
- Can still edit prior steps' ratings/notes

### Story 5: Auto BrewLog Creation
As a barista, I want the brew log created automatically when I finish, with no modal interruption.

**Acceptance Criteria:**
- User completes final step
- BrewLog created server-side with: recipeId, userId, all ratings (average or per-step?), notes
- Toast confirmation, no modal
- Auto-redirect to Barista profile or recipe page

## Architecture

### Data Model

**New client-side draft state (IndexedDB):**
```typescript
interface RecipeDraft {
  id: string; // UUID
  recipeId: string;
  userId: string;
  startedAt: string; // ISO timestamp
  currentStepIndex: number;
  steps: {
    index: number;
    rating?: number; // 1-10
    notes?: string; // combined from voice + templates + free text
    completedAt?: string;
  }[];
  overallRating?: number; // user can rate whole recipe at end
  status: 'in_progress' | 'completed';
}
```

**Backend BrewLog (already exists):**
```typescript
interface BrewLog {
  id: string;
  userId: string;
  recipeId: string;
  recipe: { id: string; title: string; method: string };
  rating: number; // 1-10 (average or final rating from user)
  notes?: string; // combined notes from all steps
  photoUrl?: string; // Fase 2
  xpEarned: number;
  createdAt: string;
}
```

### Components

**Enhanced RecipeLiveMode:**
- Existing layout preserved (header, step content, navigation)
- New sections overlaid:
  - Rating slider (below step description)
  - Notes capture (voice + templates + text)
  - Gesture hint footer
  - "Resume" banner if draft exists

**New Sub-Components:**
- `RatingSlider` — slider input with emoji scale
- `NotesCapture` — voice button + template buttons + text input
- `GestureHints` — footer showing available gestures
- `ResumeBanner` — shows if user resuming draft

### Data Flow

```
User opens recipe
  ↓
Check IndexedDB for draft (same user + recipe)
  ↓
If draft exists: show "Resume" banner
If no draft: create new draft in IndexedDB
  ↓
User browses steps (swipe gestures)
  ↓
On each step:
  - Optional: set rating (slider)
  - Optional: add notes (voice/templates/text)
  - Data saved to draft immediately (IndexedDB)
  ↓
User taps "Completado" or swipes to next
  ↓
Mark step complete in draft
  ↓
Final step completed
  ↓
User sees "Registrar este Brew" button
  ↓
POST /api/barista/brew-logs
  Body: {
    recipeId,
    rating: (average of step ratings OR single overall rating),
    notes: (concatenated notes from all steps)
  }
  ↓
Server creates BrewLog, checks achievements
  ↓
Toast: "¡Brew registrado! +30 XP"
  ↓
Clear draft from IndexedDB
  ↓
Redirect to Barista profile or close RecipeLiveMode
```

### Integration Points

**With RecipeLiveMode:**
- Keep existing step navigation, timer, video/content logic
- Wrap step content with new rating + notes sections
- Add gesture handlers (long-press for menu)
- Add "Resume" banner if draft exists

**With BrewLogForm:**
- Remove/archive existing modal
- On final step completion: directly POST to `/api/barista/brew-logs`
- No intermediate modal step

**With Barista System:**
- Existing BrewLog schema unchanged
- New `rating` field (already exists, was from modal)
- New `notes` field (already exists, was from modal)
- XP calculation unchanged
- Achievements triggered on BrewLog creation (unchanged)

**With PWA/IndexedDB:**
- New store: `recipe_drafts`
- Key: `${userId}:${recipeId}`
- Persist automatically on every step change
- Clean up on completion

## UX Details

### Rating Slider
- Range: 1-10
- Visual scale: emoji from 😐 (boring) to 🔥 (excellent)
- Default: unset (no prefill)
- User can change rating by dragging or tapping value
- Persists immediately to IndexedDB

### Notes Capture
- Three input methods simultaneously available:
  1. **Voice button:** Click 🎤, record voice while brewing, auto-transcribe (SpeechRecognition API or Web Audio API + transcription service)
  2. **Quick templates:** Pre-defined buttons ("muy caliente", "amargo", "perfecto", "+")
  3. **Text input:** Traditional text field as fallback
- All entries concatenated into single `notes` field
- Persists immediately to IndexedDB

### Gestures
- **Swipe left/right:** Navigate between steps (existing, unchanged)
- **Tap "Completado":** Mark current step done, move to next
- **Long-press on step content:** Show quick menu overlay with rating + notes shortcuts
- Footer hints: visual indicators (👉 Swipe, ☝️ Long-press, ✋ Tap)

### Resume Experience
- If draft exists for user + recipe, show banner at top:
  ```
  ↻ Brew in progress from [time ago]. Continue?
  [Resume] [Start Over]
  ```
- Resume: load draft, position on last incomplete step
- Start Over: create new draft, wipe prior data

### Final Step
- Show "Registrar este Brew" button prominently
- On click:
  - POST all data to `/api/barista/brew-logs`
  - Show loading state
  - On success: toast + redirect
  - On error: show error toast, allow retry
- After successful creation: clear IndexedDB draft

## Technical Decisions

### IndexedDB for Draft State
- Why: Survives app closure, no server sync overhead, fast reads/writes
- Storage: Simple key-value store (`${userId}:${recipeId}` → RecipeDraft)
- Cleanup: Auto-delete on BrewLog completion, or on user request "Start Over"
- Offline: Works fully offline (Fase 2 will handle offline-first for recipe content itself)

### Voice Transcription
- Fase 1: Use browser's built-in `SpeechRecognition` API (works in Chrome, Edge, Firefox)
- Fallback: Text input if speech not available
- No server call needed; transcription happens client-side
- Fase 2: Evaluate server-side transcription for better accuracy

### Rating: Per-Step vs Overall
- Fase 1: Per-step rating (slider on each step)
- BrewLog.rating: Average of all step ratings (or let user override at end)
- Fase 2: Add "Rate overall" at the end if user wants to override

### Notes: Concatenation
- All voice + template + text notes combined into single `notes` field
- Format: `"[Voice: 'agua muy caliente'] [Template: 'amargo'] [Text: 'ajustaré molienda']"`
- Searchable, readable in BrewLog history

## Testing Strategy

### Unit Tests
- `RecipeDraft` CRUD in IndexedDB
- Rating slider value changes
- Notes capture (voice mock, template selection, text input)
- Draft persistence on step change
- Resume logic (load draft, position on last step)

### Integration Tests
- Full recipe flow: start → rate steps → add notes → finish → create BrewLog
- Resume flow: pause mid-recipe → close app → return → resume draft
- Error handling: failed BrewLog creation, retry logic
- Edge cases: empty notes, all ratings skipped, rapid step navigation

### Manual Testing (Browser)
- Golden path: complete recipe with ratings + notes, verify BrewLog created
- Resume: start recipe, close browser, reopen, resume, complete
- Gestures: swipe navigation, tap to confirm, long-press menu
- Voice: speak notes, verify transcription captures correctly
- Templates: click preset buttons, verify concatenation
- Offline: complete recipe with no internet (IndexedDB only), then reconnect to upload

## Constraints & Assumptions

- SpeechRecognition API available (graceful fallback to text if not)
- IndexedDB available (standard in modern browsers)
- BrewLog schema unchanged (rating + notes already exist)
- User authenticated (requireUserAuth middleware)
- Recipe locked/gated logic unchanged

## Success Criteria

- ✅ Rating slider renders and persists per-step
- ✅ Voice capture transcribes correctly
- ✅ Notes templates concat properly
- ✅ Draft state survives app closure
- ✅ Resume flow works end-to-end
- ✅ BrewLog created on completion (no modal)
- ✅ Gestures (swipe, tap, long-press) responsive and discoverable
- ✅ No breaking changes to existing recipe flow
- ✅ All tests passing (unit + integration + browser smoke)

## Out of Scope (Fase 2+)

- Photo capture
- Offline recipe viewing (Service Worker, full PWA cache)
- Brew comparison (history view)
- Real-time achievements (micro-unlocks during recipe)
- Server-side voice transcription
- Advanced analytics on step ratings

## Notes

- Fase 1 is purely UX/interaction enhancement. No schema migration needed.
- BrewLog schema unchanged; `rating` and `notes` fields already exist.
- PWA draft persistence is foundation for Fase 2 offline features.
- Voice transcription gracefully degrades to text input if unavailable.
