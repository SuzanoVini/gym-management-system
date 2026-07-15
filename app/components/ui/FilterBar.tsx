'use client';

import { X } from 'lucide-react';
import YearFilter from '@/components/ui/YearFilter';

export interface FilterSelectConfig {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  // A plain string is used as both the option value and its display label.
  options: Array<string | { value: string; label: string }>;
  allLabel: string;
}

export interface SortSelectConfig {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

interface FilterBarProps {
  availableYears: number[];
  selectedYear: string;
  onYearChange: (year: string) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  selects: FilterSelectConfig[];
  sortSelect?: SortSelectConfig;
  hasActiveFilters: boolean;
  onClear: () => void;
}

// Tailwind needs statically-visible class names, so cell count maps to a fixed set of classes
// rather than an interpolated `md:grid-cols-${n}`.
const GRID_COLS_CLASS: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
};

export default function FilterBar({
  availableYears,
  selectedYear,
  onYearChange,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  selects,
  sortSelect,
  hasActiveFilters,
  onClear,
}: FilterBarProps) {
  const cellCount = selects.length + (sortSelect ? 1 : 0);
  const gridColsClass = GRID_COLS_CLASS[Math.min(cellCount, 5)] ?? 'md:grid-cols-4';

  return (
    <div className="section-container">
      <YearFilter
        availableYears={availableYears}
        selectedYear={selectedYear}
        onYearChange={onYearChange}
      />
      <div className="mb-4">
        <input
          type="text"
          aria-label="Search"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="form-input"
        />
      </div>
      <div className={`grid grid-cols-1 ${gridColsClass} gap-4`}>
        {selects.map((select) => (
          <div key={select.id}>
            <label className="form-label" htmlFor={select.id}>
              {select.label}
            </label>
            <select
              id={select.id}
              value={select.value}
              onChange={(e) => select.onChange(e.target.value)}
              className="form-select"
            >
              <option value="all">{select.allLabel}</option>
              {select.options.map((option) => {
                const opt = typeof option === 'string' ? { value: option, label: option } : option;
                return (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                );
              })}
            </select>
          </div>
        ))}
        {sortSelect && (
          <div>
            <label className="form-label" htmlFor={sortSelect.id}>
              {sortSelect.label}
            </label>
            <select
              id={sortSelect.id}
              value={sortSelect.value}
              onChange={(e) => sortSelect.onChange(e.target.value)}
              className="form-select"
            >
              {sortSelect.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {hasActiveFilters && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors duration-150"
          >
            <X className="w-3.5 h-3.5" />
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
