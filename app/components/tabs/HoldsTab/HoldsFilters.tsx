import FilterBar from '@/components/ui/FilterBar';
import { config } from '@/lib/config';
import { isDefaultFilters, type TabFilters } from '@/store/useFilterStore';

interface HoldsFiltersProps {
  filters: TabFilters;
  holdReasons: string[];
  availableYears: number[];
  sortOrder: 'newest' | 'oldest';
  onFiltersChange: (filters: Partial<TabFilters>) => void;
  onSortChange: (sort: 'newest' | 'oldest') => void;
  onClear: () => void;
}

export default function HoldsFilters({
  filters,
  holdReasons,
  availableYears,
  sortOrder,
  onFiltersChange,
  onSortChange,
  onClear,
}: HoldsFiltersProps) {
  return (
    <FilterBar
      availableYears={availableYears}
      selectedYear={filters.year}
      onYearChange={(year) => onFiltersChange({ year })}
      searchValue={filters.searchTerm}
      onSearchChange={(searchTerm) => onFiltersChange({ searchTerm })}
      searchPlaceholder="Search by name, reason, or dates..."
      selects={[
        {
          id: 'holds-month',
          label: 'Month',
          value: filters.month,
          onChange: (month) => onFiltersChange({ month }),
          options: [...config.months],
          allLabel: 'All Months',
        },
        {
          id: 'holds-reason',
          label: 'Reason',
          value: filters.reason,
          onChange: (reason) => onFiltersChange({ reason }),
          options: holdReasons,
          allLabel: 'All Reasons',
        },
        {
          id: 'holds-status',
          label: 'Status',
          value: filters.holdStatus,
          onChange: (holdStatus) => onFiltersChange({ holdStatus }),
          options: [
            { value: 'active', label: 'Active' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'ended', label: 'Ended' },
          ],
          allLabel: 'All Status',
        },
      ]}
      sortSelect={{
        id: 'holds-sort',
        label: 'Sort By',
        value: sortOrder,
        onChange: (value) => onSortChange(value as 'newest' | 'oldest'),
        options: [
          { value: 'newest', label: 'Newest First' },
          { value: 'oldest', label: 'Oldest First' },
        ],
      }}
      hasActiveFilters={!isDefaultFilters(filters, 'holds')}
      onClear={onClear}
    />
  );
}
