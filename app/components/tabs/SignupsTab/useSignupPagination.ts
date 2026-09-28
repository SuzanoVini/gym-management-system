import { useEffect, useState } from 'react';
import type { TabFilters } from '@/store/useFilterStore';
import type { Signup } from '@/types';

export function useSignupPagination(
  filters: TabFilters,
  sortOrder: 'newest' | 'oldest',
  rows: Signup[]
) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-runs whenever filters/sortOrder change, to reset to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortOrder]);

  const totalPages = Math.ceil(rows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSignups = rows.slice(startIndex, endIndex);
  return {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedSignups,
  };
}
