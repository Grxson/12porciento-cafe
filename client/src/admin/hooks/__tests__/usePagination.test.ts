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

  it('navigates to previous page', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1) }));
    const { result } = renderHook(() => usePagination(items, 10));

    // Move to page 2 first
    act(() => {
      result.current.nextPage();
    });
    expect(result.current.page).toBe(2);

    // Then go back to page 1
    act(() => {
      result.current.prevPage();
    });

    expect(result.current.page).toBe(1);
    expect(result.current.pageItems[0]).toEqual({ id: '1' });
  });

  it('clamps goToPage to valid range', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1) }));
    const { result } = renderHook(() => usePagination(items, 10));

    // Try to go to page 0 (should clamp to 1)
    act(() => {
      result.current.goToPage(0);
    });
    expect(result.current.page).toBe(1);

    // Try to go to page 999 (should clamp to totalPages = 3)
    act(() => {
      result.current.goToPage(999);
    });
    expect(result.current.page).toBe(3);
  });

  it('handles prevPage at first page', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1) }));
    const { result } = renderHook(() => usePagination(items, 10));

    // Already at page 1, prevPage should not go below 1
    act(() => {
      result.current.prevPage();
    });

    expect(result.current.page).toBe(1);
  });

  it('resets page to 1 when pageSize changes', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1) }));
    const { result } = renderHook(() => usePagination(items, 10));

    // Go to page 3
    act(() => {
      result.current.goToPage(3);
    });
    expect(result.current.page).toBe(3);

    // Change page size to 20 — should reset to page 1
    act(() => {
      result.current.setPageSize(20);
    });

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.totalPages).toBe(2);
  });

  it('handles empty items array', () => {
    const items: any[] = [];
    const { result } = renderHook(() => usePagination(items, 10));

    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(0);
    expect(result.current.pageItems).toHaveLength(0);
  });
});
