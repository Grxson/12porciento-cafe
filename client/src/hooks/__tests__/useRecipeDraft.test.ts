import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock IndexedDB with a simple in-memory store
const mockStore: Record<string, any> = {};

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
