import FilterBar from '@/components/ui/FilterBar';
import KpiStrip from '@/components/ui/KpiStrip';
import { config } from '@/lib/config';
import { isDefaultFilters, type TabFilters } from '@/store/useFilterStore';

const AGE_GROUPS = ['3-6 YO', '7-9 YO', '10-15 YO', 'Adult'];

interface Props {
  count: number;
  topReasons: [string, number][];
  availableYears: number[];
  filters: TabFilters;
  cancellationReasons: string[];
  sortOrder: 'newest' | 'oldest';
  setFilters: (filters: Partial<TabFilters>) => void;
  setSortOrder: (order: 'newest' | 'oldest') => void;
  onClear: () => void;
}

export default function CancellationSummaryFilters({
  count,
  topReasons,
  availableYears,
  filters,
  cancellationReasons,
  sortOrder,
  setFilters,
  setSortOrder,
  onClear,
}: Props) {
  return (
    <>
      <KpiStrip
        items={[
          { label: 'Total cancellations', value: count },
          ...topReasons.map(([reason, reasonCount]) => ({
            label: reason || 'No reason given',
            value: reasonCount,
          })),
        ]}
      />
      <FilterBar
        availableYears={availableYears}
        selectedYear={filters.year}
        onYearChange={(year) => setFilters({ year })}
        searchValue={filters.searchTerm}
        onSearchChange={(searchTerm) => setFilters({ searchTerm })}
        searchPlaceholder="Search by name, reason, age category, date, or notes..."
        selects={[
          {
            id: 'cancellations-month',
            label: 'Month',
            value: filters.month,
            onChange: (month) => setFilters({ month }),
            options: [...config.months],
            allLabel: 'All Months',
          },
          {
            id: 'cancellations-reason',
            label: 'Reason',
            value: filters.reason,
            onChange: (reason) => setFilters({ reason }),
            options: cancellationReasons,
            allLabel: 'All Reasons',
          },
          {
            id: 'cancellations-age-group',
            label: 'Age Group',
            value: filters.ageGroup,
            onChange: (ageGroup) => setFilters({ ageGroup }),
            options: AGE_GROUPS,
            allLabel: 'All Ages',
          },
        ]}
        sortSelect={{
          id: 'cancellations-sort',
          label: 'Sort By',
          value: sortOrder,
          onChange: (value) => setSortOrder(value as 'newest' | 'oldest'),
          options: [
            { value: 'newest', label: 'Newest First' },
            { value: 'oldest', label: 'Oldest First' },
          ],
        }}
        hasActiveFilters={!isDefaultFilters(filters, 'cancellations')}
        onClear={onClear}
      />
    </>
  );
}
