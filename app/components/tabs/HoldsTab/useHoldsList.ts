import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TabFilters } from '@/store/useFilterStore';
import type { Hold } from '@/types';
import { filterHolds, getAvailableHoldYears, getHoldStatus, sortHolds } from './hold-data';

export function useHoldsList(holds: Hold[], filters: TabFilters) {
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally resets page when filters or sort change
  useEffect(() => setCurrentPage(1), [filters, sortOrder]);
  const statusForHold = useCallback(getHoldStatus, []);
  const filteredHolds = useMemo(
    () => filterHolds(holds, filters, statusForHold),
    [filters, holds, statusForHold]
  );
  const availableYears = useMemo(() => getAvailableHoldYears(holds), [holds]);
  const sortedHolds = useMemo(
    () => sortHolds(filteredHolds, sortOrder),
    [filteredHolds, sortOrder]
  );
  const totalPages = Math.ceil(sortedHolds.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHolds = sortedHolds.slice(startIndex, endIndex);
  const statusCounts = {
    active: filteredHolds.filter((hold) => statusForHold(hold.start, hold.end) === 'active').length,
    upcoming: filteredHolds.filter((hold) => statusForHold(hold.start, hold.end) === 'upcoming')
      .length,
    ended: filteredHolds.filter((hold) => statusForHold(hold.start, hold.end) === 'ended').length,
  };
  return {
    sortOrder,
    setSortOrder,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedHolds,
    sortedHolds,
    filteredHolds,
    availableYears,
    statusCounts,
  };
}
