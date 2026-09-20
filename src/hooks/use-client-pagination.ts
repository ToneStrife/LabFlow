import { useEffect, useMemo, useState } from "react";

export const PAGE_SIZE_OPTIONS = [10, 15, 25, 50] as const;

interface UseClientPaginationOptions {
  initialPageSize?: number;
  /** Cambia este valor (búsqueda, filtros, sede…) para volver a la página 1. */
  resetKey?: string | number;
}

export function useClientPagination<T>(
  items: T[],
  { initialPageSize = 15, resetKey }: UseClientPaginationOptions = {}
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const currentPage = Math.min(Math.max(1, page), pageCount);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  return {
    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    pageItems,
    total,
    from,
    to,
  };
}
