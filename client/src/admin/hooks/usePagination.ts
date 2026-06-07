import { useState, useMemo, useCallback } from 'react';

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const [size, setPageSize] = useState(pageSize);

  // Memoize totalPages to avoid stale closures
  const totalPages = useMemo(() => {
    return Math.ceil(items.length / size);
  }, [items.length, size]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * size;
    return items.slice(start, start + size);
  }, [items, page, size]);

  // Wrapper for setPageSize that resets page to 1 when size changes
  const handleSetPageSize = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  const goToPage = useCallback((p: number) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setPage((p) => totalPages === 0 ? 1 : Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(p - 1, 1));
  }, []);

  return {
    page,
    pageSize: size,
    totalPages,
    pageItems,
    goToPage,
    nextPage,
    prevPage,
    setPageSize: handleSetPageSize,
  };
}
