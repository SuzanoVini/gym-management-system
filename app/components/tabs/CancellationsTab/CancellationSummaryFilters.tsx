import FilterBar from '@/components/ui/FilterBar';
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="section-container border-l-4 border-red-600">
          <div className="text-sm text-gray-600">Total Cancellations</div>
          <div className="text-3xl font-bold mt-1">{count}</div>
        </div>
        {topReasons.map(([reason, reasonCount], idx) => (
          <div
            key={reason}
            className={`section-container border-l-4 ${idx === 0 ? 'border-orange-600' : idx === 1 ? 'border-yellow-600' : idx === 2 ? 'border-blue-600' : 'border-gray-600'}`}
          >
            <div className="text-sm text-gray-600">{reason || 'No Reason'}</div>
            <div className="text-3xl font-bold mt-1">{reasonCount}</div>
          </div>
        ))}
      </div>
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
