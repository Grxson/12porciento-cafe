import { renderHook, act, waitFor } from '@testing-library/react';
import { useModuleList } from '../useModuleList';

describe('useModuleList', () => {
  it('loads items on mount', async () => {
    const mockApi = { list: vi.fn().mockResolvedValue({ data: { data: [{ id: '1', name: 'Test' }] } }) };
    const { result } = renderHook(() => useModuleList(mockApi.list));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([{ id: '1', name: 'Test' }]);
  });

  it('creates item', async () => {
    const mockApi = {
      list: vi.fn().mockResolvedValue({ data: { data: [] } }),
      create: vi.fn().mockResolvedValue({ data: { data: { id: '2', name: 'New' } } }),
    };
    const { result } = renderHook(() => useModuleList(mockApi.list, mockApi.create));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create({ name: 'New' });
    });

    expect(result.current.items).toContainEqual(expect.objectContaining({ name: 'New' }));
  });

  it('deletes item', async () => {
    const mockApi = {
      list: vi.fn().mockResolvedValue({ data: { data: [{ id: '1', name: 'Test' }] } }),
      delete: vi.fn().mockResolvedValue({}),
    };
    const { result } = renderHook(() => useModuleList(mockApi.list, undefined, undefined, mockApi.delete));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.delete('1');
    });

    expect(result.current.items).not.toContainEqual(expect.objectContaining({ id: '1' }));
  });

  it('filters items', async () => {
    const mockApi = { list: vi.fn().mockResolvedValue({ data: { data: [{ id: '1', status: 'ACTIVE' }, { id: '2', status: 'INACTIVE' }] } }) };
    const { result } = renderHook(() => useModuleList(mockApi.list));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.setFilters({ status: 'ACTIVE' });
    });

    expect(result.current.items).toEqual([{ id: '1', status: 'ACTIVE' }]);
  });
});
