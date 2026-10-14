import { useCallback } from 'react';
import { useFilterStore } from '@/store/useFilterStore';

export function useHoldsFilters() {
  const filters = useFilterStore((state) => state.filtersByTab.holds);
  const setFiltersForTab = useFilterStore((state) => state.setFilters);
  const clearFiltersForTab = useFilterStore((state) => state.clearFilters);
  const setFilters = useCallback(
    (partial: Partial<typeof filters>) => setFiltersForTab('holds', partial),
    [setFiltersForTab]
  );
  const clearFilters = useCallback(() => clearFiltersForTab('holds'), [clearFiltersForTab]);
  return { filters, setFilters, clearFilters };
}
