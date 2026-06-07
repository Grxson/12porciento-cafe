import { useState, useMemo } from 'react';

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const [size, setPageSize] = useState(pageSize);

  const totalPages = Math.ceil(items.length / size);
  const pageItems = useMemo(() => {
    const start = (page - 1) * size;
    return items.slice(start, start + size);
  }, [items, page, size]);

  return {
    page,
    pageSize: size,
    totalPages,
    pageItems,
    goToPage: (p: number) => setPage(Math.max(1, Math.min(p, totalPages))),
    nextPage: () => setPage((p) => Math.min(p + 1, totalPages)),
    prevPage: () => setPage((p) => Math.max(p - 1, 1)),
    setPageSize,
  };
}
