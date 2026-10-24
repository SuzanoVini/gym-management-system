import { Plus, RotateCcw, Settings, Trash2, Upload } from 'lucide-react';
import type { RefObject } from 'react';
import FilterBar from '@/components/ui/FilterBar';
import KpiStrip from '@/components/ui/KpiStrip';
import PaginationBar from '@/components/ui/PaginationBar';
import Table from '@/components/ui/Table';
import { config } from '@/lib/config';
import { isDefaultFilters, type TabFilters } from '@/store/useFilterStore';
import type { Signup } from '@/types';

interface SignupMetrics {
  total: number;
  integrity: number;
  legacy: number;
  special: number;
  asp: number;
  withPackage: number;
}

interface SignupTabContentProps {
  filters: TabFilters;
  membershipTypes: string[];
  availableYears: number[];
  sortOrder: 'newest' | 'oldest';
  onSortOrderChange: (value: 'newest' | 'oldest') => void;
  onFiltersChange: (filters: Partial<TabFilters>) => void;
  onClearFilters: () => void;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  sortedSignups: Signup[];
  paginatedSignups: Signup[];
  startIndex: number;
  endIndex: number;
  selectedIds: Set<string>;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  onClearSelection: () => void;
  onDeleteSelected: () => Promise<void>;
  metrics: SignupMetrics;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onCSVImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
  undoCount: number | null;
  onUndoImport: () => Promise<void>;
  onOpenSettings: () => void;
  onOpenAddSignup: () => void;
  loading: boolean;
  columns: ReturnType<typeof import('./SignupColumns').createSignupColumns>;
  onSelectId: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClearSelectedIds: (ids: string[]) => void;
}

function SignupHeader({
  filters,
  fileInputRef,
  onCSVImport,
  undoCount,
  onUndoImport,
  onOpenSettings,
  onOpenAddSignup,
}: Pick<
  SignupTabContentProps,
  | 'filters'
  | 'fileInputRef'
  | 'onCSVImport'
  | 'undoCount'
  | 'onUndoImport'
  | 'onOpenSettings'
  | 'onOpenAddSignup'
>) {
  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="page-title">
          {filters.year === 'all' ? 'All Sign-ups' : `${filters.year} Sign-ups`}
        </h1>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onOpenSettings} className="btn btn-secondary">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={onCSVImport}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary-blue"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
          {undoCount !== null && (
            <button
              type="button"
              onClick={() => {
                void onUndoImport();
              }}
              className="btn btn-secondary"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Undo Import ({undoCount})</span>
            </button>
          )}
          <button type="button" onClick={onOpenAddSignup} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            <span>Add Sign-up</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function SignupMetricsCards({ metrics }: { metrics: SignupMetrics }) {
  return (
    <KpiStrip
      items={[
        { label: 'Total sign-ups', value: metrics.total },
        { label: 'Integrity', value: metrics.integrity },
        { label: 'Legacy', value: metrics.legacy },
        { label: 'Special', value: metrics.special },
        { label: 'ASP', value: metrics.asp },
        { label: 'With package', value: metrics.withPackage },
      ]}
    />
  );
}

function SignupFilterControls({
  filters,
  membershipTypes,
  availableYears,
  sortOrder,
  onSortOrderChange,
  onFiltersChange,
  onClearFilters,
}: Pick<
  SignupTabContentProps,
  | 'filters'
  | 'membershipTypes'
  | 'availableYears'
  | 'sortOrder'
  | 'onSortOrderChange'
  | 'onFiltersChange'
  | 'onClearFilters'
>) {
  return (
    <FilterBar
      availableYears={availableYears}
      selectedYear={filters.year}
      onYearChange={(year) => onFiltersChange({ year })}
      searchValue={filters.searchTerm}
      onSearchChange={(searchTerm) => onFiltersChange({ searchTerm })}
      searchPlaceholder="Search by name, membership type, dates, or notes..."
      selects={[
        {
          id: 'signups-month',
          label: 'Month',
          value: filters.month,
          onChange: (month) => onFiltersChange({ month }),
          options: [...config.months],
          allLabel: 'All Months',
        },
        {
          id: 'signups-membership',
          label: 'Membership Type',
          value: filters.membership,
          onChange: (membership) => onFiltersChange({ membership }),
          options: membershipTypes,
          allLabel: 'All Types',
        },
      ]}
      sortSelect={{
        id: 'signups-sort',
        label: 'Sort By',
        value: sortOrder,
        onChange: (value) => onSortOrderChange(value as 'newest' | 'oldest'),
        options: [
          { value: 'newest', label: 'Newest First' },
          { value: 'oldest', label: 'Oldest First' },
        ],
      }}
      hasActiveFilters={!isDefaultFilters(filters, 'signups')}
      onClear={onClearFilters}
    />
  );
}

function SignupTableSection({
  sortedSignups,
  paginatedSignups,
  selectedIds,
  onDeleteSelected,
  columns,
  loading,
  onSelectId,
  onSelectAll,
  onClearSelectedIds,
}: Pick<
  SignupTabContentProps,
  | 'sortedSignups'
  | 'paginatedSignups'
  | 'selectedIds'
  | 'onDeleteSelected'
  | 'columns'
  | 'loading'
  | 'onSelectId'
  | 'onSelectAll'
  | 'onClearSelectedIds'
>) {
  return (
    <div className="bg-white rounded-[var(--radius-card)] border border-[var(--border)] overflow-hidden">
      <div className="px-6 py-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">All Sign-ups ({sortedSignups.length})</h2>
        {selectedIds.size > 0 && (
          <button
            type="button"
            onClick={() => {
              void onDeleteSelected();
            }}
            className="flex items-center space-x-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Selected ({selectedIds.size})</span>
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <Table
          data={paginatedSignups}
          columns={columns}
          loading={loading}
          selectedIds={selectedIds}
          onSelectId={onSelectId}
          onSelectAll={onSelectAll}
          onClearSelection={onClearSelectedIds}
          emptyMessage="No sign-ups found matching your criteria"
        />
      </div>
    </div>
  );
}

export function SignupTabContent(props: SignupTabContentProps) {
  return (
    <div className="space-y-6">
      <SignupHeader {...props} />
      <SignupMetricsCards metrics={props.metrics} />
      <SignupFilterControls {...props} />
      <PaginationBar
        id="signups-items-per-page"
        currentPage={props.currentPage}
        totalPages={props.totalPages}
        itemsPerPage={props.itemsPerPage}
        totalItems={props.sortedSignups.length}
        startIndex={props.startIndex}
        endIndex={props.endIndex}
        onPageChange={props.onPageChange}
        onItemsPerPageChange={props.onItemsPerPageChange}
        selectedCount={props.selectedIds.size}
        onClearSelection={props.onClearSelection}
      />
      <SignupTableSection {...props} />
    </div>
  );
}
