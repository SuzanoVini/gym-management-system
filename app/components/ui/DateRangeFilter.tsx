'use client';

export interface DateRangeOption {
  value: string;
  label: string;
}

interface DateRangeFilterProps {
  /** Unique per usage so the start/end date input ids don't collide across tabs. */
  idPrefix: string;
  options: DateRangeOption[];
  dateRange: string;
  onSelectRange: (value: string) => void;
  tempStartDate: string;
  tempEndDate: string;
  onTempStartDateChange: (value: string) => void;
  onTempEndDateChange: (value: string) => void;
  onApplyCustomDates: () => void;
  customRangeBoxClassName?: string;
}

export default function DateRangeFilter({
  idPrefix,
  options,
  dateRange,
  onSelectRange,
  tempStartDate,
  tempEndDate,
  onTempStartDateChange,
  onTempEndDateChange,
  onApplyCustomDates,
  customRangeBoxClassName = 'mt-4 section-nested',
}: DateRangeFilterProps) {
  return (
    <>
      {/* One segmented track; on a phone it scrolls sideways in its own row instead of wrapping. */}
      <div className="flex max-w-full gap-1 overflow-x-auto rounded-md bg-[var(--raised)] p-1 sm:inline-flex sm:flex-wrap">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={dateRange === option.value}
            onClick={() => onSelectRange(option.value)}
            className={`whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              dateRange === option.value
                ? 'bg-[var(--surface)] text-[var(--accent-ink)] ring-1 ring-[var(--accent-100)]'
                : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {dateRange === 'custom' && (
        <div className={customRangeBoxClassName}>
          <p className="text-sm font-medium text-gray-700 mb-3">Custom date range</p>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="form-label" htmlFor={`${idPrefix}-start-date`}>
                Start Date
              </label>
              <input
                id={`${idPrefix}-start-date`}
                type="date"
                value={tempStartDate}
                onChange={(e) => onTempStartDateChange(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="form-label" htmlFor={`${idPrefix}-end-date`}>
                End Date
              </label>
              <input
                id={`${idPrefix}-end-date`}
                type="date"
                value={tempEndDate}
                onChange={(e) => onTempEndDateChange(e.target.value)}
                className="form-input"
              />
            </div>
            <button type="button" onClick={onApplyCustomDates} className="btn btn-primary">
              Apply Filter
            </button>
          </div>
        </div>
      )}
    </>
  );
}
