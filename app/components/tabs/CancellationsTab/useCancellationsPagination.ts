import { useEffect, useState } from 'react';
import type { TabFilters } from '@/store/useFilterStore';

export function useCancellationsPagination(filters: TabFilters) {
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset page whenever filters or order changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortOrder]);

  return { sortOrder, setSortOrder, currentPage, setCurrentPage, itemsPerPage, setItemsPerPage };
}
