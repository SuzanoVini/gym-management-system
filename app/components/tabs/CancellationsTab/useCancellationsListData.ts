import { useMemo } from 'react';
import type { TabFilters } from '@/store/useFilterStore';
import type { Cancellation } from '@/types';

function getSortTimestamp(cancellation: Cancellation): number {
  const dateValue = cancellation.date ? new Date(cancellation.date).getTime() : 0;
  if (dateValue) {
    return dateValue;
  }
  return cancellation.created_at ? new Date(cancellation.created_at).getTime() : 0;
}

interface ListDataOptions {
  cancellations: Cancellation[];
  filters: TabFilters;
  sortOrder: 'newest' | 'oldest';
  currentPage: number;
  itemsPerPage: number;
}

export function useCancellationsListData({
  cancellations,
  filters,
  sortOrder,
  currentPage,
  itemsPerPage,
}: ListDataOptions) {
  const filteredAndSearchedCancellations = useMemo(() => {
    let filtered = cancellations.filter((cancellation) => {
      const matchesMonth = filters.month === 'all' || cancellation.month === filters.month;
      const matchesReason = filters.reason === 'all' || cancellation.reason === filters.reason;
      const matchesAgeGroup =
        filters.ageGroup === 'all' || cancellation.age_group === filters.ageGroup;
      const matchesYear = filters.year === 'all' || String(cancellation.year) === filters.year;
      return matchesMonth && matchesReason && matchesAgeGroup && matchesYear;
    });
    if (filters.searchTerm.trim()) {
      const search = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (cancellation) =>
          cancellation.name.toLowerCase().includes(search) ||
          cancellation.reason?.toLowerCase().includes(search) ||
          cancellation.date?.includes(search) ||
          cancellation.age_group?.toLowerCase().includes(search) ||
          cancellation.notes?.toLowerCase().includes(search)
      );
    }
    return filtered;
  }, [cancellations, filters]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const cancellation of cancellations) {
      if (cancellation.year) {
        years.add(cancellation.year);
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [cancellations]);

  const sortedCancellations = [...filteredAndSearchedCancellations].sort((a, b) => {
    const dateA = getSortTimestamp(a);
    const dateB = getSortTimestamp(b);
    if (dateA === dateB) {
      return 0;
    }
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });
  const totalPages = Math.ceil(sortedCancellations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCancellations = sortedCancellations.slice(startIndex, endIndex);
  const reasonCounts = filteredAndSearchedCancellations.reduce(
    (counts, cancellation) => {
      if (cancellation.reason) {
        counts[cancellation.reason] = (counts[cancellation.reason] || 0) + 1;
      }
      return counts;
    },
    {} as Record<string, number>
  );
  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return {
    filteredAndSearchedCancellations,
    availableYears,
    sortedCancellations,
    totalPages,
    startIndex,
    endIndex,
    paginatedCancellations,
    topReasons,
  };
}
