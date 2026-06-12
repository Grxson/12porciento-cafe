// client/src/hooks/__tests__/useBrewQueue.test.ts
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
