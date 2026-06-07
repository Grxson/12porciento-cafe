import { renderHook, act } from '@testing-library/react';
import { usePagination } from '../usePagination';

describe('usePagination', () => {
  it('paginates items', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1) }));
    const { result } = renderHook(() => usePagination(items, 10));

    expect(result.current.pageItems).toHaveLength(10);
    expect(result.current.pageItems[0]).toEqual({ id: '1' });
    expect(result.current.totalPages).toBe(3);
  });

  it('navigates pages', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1) }));
    const { result } = renderHook(() => usePagination(items, 10));

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.page).toBe(2);
    expect(result.current.pageItems[0]).toEqual({ id: '11' });
  });

  it('changes page size', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1) }));
    const { result } = renderHook(() => usePagination(items, 10));

    act(() => {
      result.current.setPageSize(20);
    });

    expect(result.current.pageSize).toBe(20);
    expect(result.current.pageItems).toHaveLength(20);
    expect(result.current.totalPages).toBe(2);
  });
});
