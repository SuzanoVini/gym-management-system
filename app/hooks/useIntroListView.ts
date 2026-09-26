import { useEffect, useMemo, useState } from 'react';
import { canonicalizeStaffName } from '@/lib/utils/canonicalizeStaffName';
import type { TabFilters } from '@/store/useFilterStore';
import type { Intro } from '@/types';

export function useIntroListView(intros: Intro[], filters: TabFilters, staffMembers: string[]) {
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-runs whenever filters/sortOrder change, to reset to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortOrder]);

  // Filter and search intros
  const filteredIntros = useMemo(() => {
    return intros.filter((intro: Intro) => {
      const matchesSearch =
        !filters.searchTerm ||
        intro.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        intro.email?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        intro.phone?.includes(filters.searchTerm);

      const matchesMonth = filters.month === 'all' || intro.month === filters.month;
      const matchesStaff =
        filters.staff === 'all' ||
        canonicalizeStaffName(intro.staff ?? '', staffMembers) === filters.staff;
      const matchesClass = filters.class === 'all' || intro.class === filters.class;
      const matchesYear = filters.year === 'all' || String(intro.year) === filters.year;

      return matchesSearch && matchesMonth && matchesStaff && matchesClass && matchesYear;
    });
  }, [intros, filters, staffMembers]);

  const sortedIntros = useMemo(() => {
    const parseDateStr = (s: string): number => {
      const parts = s.split('-');
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
    };
    const getSortTimestamp = (intro: Intro): number => {
      const dateValue = intro.date ? parseDateStr(intro.date) : 0;
      if (dateValue) {
        return dateValue;
      }
      return intro.created_at ? new Date(intro.created_at).getTime() : 0;
    };
    return [...filteredIntros].sort((a, b) => {
      const dateA = getSortTimestamp(a);
      const dateB = getSortTimestamp(b);
      if (dateA === dateB) {
        return 0;
      }
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [filteredIntros, sortOrder]);

  const totalPages = Math.ceil(sortedIntros.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedIntros = sortedIntros.slice(startIndex, endIndex);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const intro of intros) {
      if (intro.year) {
        years.add(intro.year);
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [intros]);

  // Calculate metrics
  const metrics = {
    total: filteredIntros.length,
    attended: filteredIntros.filter((i) => i.attended === 'Yes').length,
    signedUp: filteredIntros.filter((i) => i.signed_up === 'Yes').length,
  };

  return {
    sortOrder,
    setSortOrder,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    filteredIntros,
    sortedIntros,
    totalPages,
    startIndex,
    endIndex,
    paginatedIntros,
    availableYears,
    metrics,
  };
}
