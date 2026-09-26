import FilterBar from '@/components/ui/FilterBar';
import type { useIntroListView } from '@/hooks/useIntroListView';
import { config } from '@/lib/config';
import { isDefaultFilters, type TabFilters } from '@/store/useFilterStore';

export default function IntroFilters({
  filters,
  setFilters,
  clearFiltersForTab,
  view,
  staffMembers,
  classTypes,
}: {
  filters: TabFilters;
  setFilters: (partial: Partial<TabFilters>) => void;
  clearFiltersForTab: (tab: 'intros') => void;
  view: ReturnType<typeof useIntroListView>;
  staffMembers: string[];
  classTypes: string[];
}) {
  const { availableYears, sortOrder, setSortOrder } = view;
  return (
    <FilterBar
      availableYears={availableYears}
      selectedYear={filters.year}
      onYearChange={(year) => setFilters({ year })}
      searchValue={filters.searchTerm}
      onSearchChange={(searchTerm) => setFilters({ searchTerm })}
      searchPlaceholder="Search by name, email, or phone..."
      selects={[
        {
          id: 'intros-month',
          label: 'Month',
          value: filters.month,
          onChange: (month) => setFilters({ month }),
          options: [...config.months],
          allLabel: 'All Months',
        },
        {
          id: 'intros-staff',
          label: 'Staff',
          value: filters.staff,
          onChange: (staff) => setFilters({ staff }),
          options: staffMembers,
          allLabel: 'All Staff',
        },
        {
          id: 'intros-class',
          label: 'Class',
          value: filters.class,
          onChange: (cls) => setFilters({ class: cls }),
          options: classTypes,
          allLabel: 'All Classes',
        },
      ]}
      sortSelect={{
        id: 'intros-sort',
        label: 'Sort By',
        value: sortOrder,
        onChange: (value) => setSortOrder(value as 'newest' | 'oldest'),
        options: [
          { value: 'newest', label: 'Newest First' },
          { value: 'oldest', label: 'Oldest First' },
        ],
      }}
      hasActiveFilters={!isDefaultFilters(filters, 'intros')}
      onClear={() => clearFiltersForTab('intros')}
    />
  );
}
