'use client';

import { Download, Edit2, Plus, Settings, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import Table from '@/components/ui/Table';
import YearFilter from '@/components/ui/YearFilter';
import { useCancellations } from '@/hooks/useCancellations';
import { type CancellationCsvRecord, parseCancellationsCSV } from '@/lib/csv';
import { supabase } from '@/lib/supabase/client';
import { exportToCSV } from '@/lib/supabase/utils';
import { useFilterStore } from '@/store/useFilterStore';
import { type SelectionTabKey, useSelectionStore } from '@/store/useSelectionStore';
import { useUIStore } from '@/store/useUIStore';
import type { Cancellation } from '@/types';
import { CancellationModals } from './modals/CancellationModals';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const AGE_GROUPS = ['3-6 YO', '7-9 YO', '10-15 YO', 'Adult'];

export default function CancellationsTab() {
  const { cancellations, loading, error, removeCancellation, refresh } = useCancellations();
  const { openModal, closeModal } = useUIStore();
  const { filters, setFilters } = useFilterStore();
  const selectionTab: SelectionTabKey = 'cancellations';
  const selectedIds = useSelectionStore((state) => state.selectedIdsByTab[selectionTab]);
  const toggleSelection = useSelectionStore((state) => state.toggleSelection);
  const selectAll = useSelectionStore((state) => state.selectAll);
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const setSelectedCancellation = useSelectionStore((state) => state.setSelectedCancellation);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreviewData, setImportPreviewData] = useState<CancellationCsvRecord[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importYear, setImportYear] = useState<number>(new Date().getFullYear());
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setImportFile(file);
    parseCancellationsCSV(
      file,
      (data) => {
        setImportPreviewData(data);
        openModal('importPreview');
      },
      importYear
    );
    event.target.value = '';
  };

  const handleImportYearChange = (year: number) => {
    setImportYear(year);
    if (importFile) {
      parseCancellationsCSV(importFile, setImportPreviewData, year);
    }
  };

  const confirmCSVImport = async () => {
    if (!importPreviewData || importPreviewData.length === 0) {
      alert('No data to import');
      return;
    }

    try {
      // setLoading(true); // Use useUIStore's setLoading
      const newRecords = importPreviewData.filter((row) => {
        if (!row.name || !row.month) {
          return false;
        }
        const isDuplicate = cancellations.some(
          (c) =>
            c.name.toLowerCase().trim() === row.name.toLowerCase().trim() &&
            c.month === row.month &&
            c.date === row.date
        );
        return !isDuplicate;
      });

      const duplicateCount = importPreviewData.length - newRecords.length;

      if (newRecords.length === 0) {
        alert(`All ${duplicateCount} records are duplicates. Nothing to import.`);
        closeModal('importPreview');
        setImportPreviewData([]);
        setImportFile(null);
        // setLoading(false);
        return;
      }

      const { error } = await supabase.from('cancellations').insert(newRecords);

      if (error) {
        console.error('Error bulk importing:', error);
        alert(`Error importing: ${error.message}`);
      } else {
        await refresh(); // Refresh cancellations after import
        closeModal('importPreview');
        setImportPreviewData([]);
        setImportFile(null);
        alert(
          `✅ Successfully imported ${newRecords.length} records!\n${duplicateCount > 0 ? `Skipped ${duplicateCount} duplicates.` : ''}`
        );
      }
    } catch (error) {
      console.error('Fatal error importing CSV:', error);
      alert(`Error importing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      alert('Please select cancellations to delete');
      return;
    }
    if (selectedIds.size > 1000) {
      alert('⚠️ Maximum 1000 items at once. Please select fewer items.');
      return;
    }
    if (!confirm(`Delete ${selectedIds.size} selected cancellations?`)) {
      return;
    }

    try {
      // setLoading(true);
      const idsToDelete = Array.from(selectedIds);
      const batchSize = 50;

      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const { error } = await supabase.from('cancellations').delete().in('id', batch);
        if (error) {
          throw error;
        }
      }

      await refresh();
      clearSelection(selectionTab);
      setCurrentPage(1);
      alert(`✅ Deleted ${idsToDelete.length} cancellations`);
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting cancellations');
    } finally {
      // setLoading(false);
    }
  };

  const handleExportCancellations = () => {
    const exportData = filteredAndSearchedCancellations.map((cancellation) => ({
      Name: cancellation.name,
      Month: cancellation.month,
      Date: cancellation.date,
      Reason: cancellation.reason,
      'Age Category': cancellation.age_group,
      Notes: cancellation.notes,
    }));

    exportToCSV(exportData, 'cancellations');
    alert('✅ Cancellations exported successfully!');
  };

  const filteredAndSearchedCancellations = useMemo(() => {
    let filtered = cancellations;

    // Apply existing filters
    filtered = filtered.filter((cancellation) => {
      const matchesMonth = filters.month === 'all' || cancellation.month === filters.month;
      const matchesReason = filters.reason === 'all' || cancellation.reason === filters.reason;
      const matchesAgeGroup =
        filters.ageGroup === 'all' || cancellation.age_group === filters.ageGroup;
      const matchesYear = filters.year === 'all' || String(cancellation.year) === filters.year;
      return matchesMonth && matchesReason && matchesAgeGroup && matchesYear;
    });

    // Apply search filter
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
    const current = new Date().getFullYear();
    const years = new Set<number>([current, current - 1, current - 2]);
    for (const cancellation of cancellations) {
      if (cancellation.year) {
        years.add(cancellation.year);
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [cancellations]);

  const getSortTimestamp = (cancellation: Cancellation) => {
    const dateValue = cancellation.date ? new Date(cancellation.date).getTime() : 0;
    if (dateValue) {
      return dateValue;
    }
    return cancellation.created_at ? new Date(cancellation.created_at).getTime() : 0;
  };

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
    (acc, c) => {
      if (c.reason) {
        acc[c.reason] = (acc[c.reason] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const topReasons = Object.entries(reasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) {
      return '-';
    }
    try {
      const date = new Date(dateStr);
      if (Number.isNaN(date.getTime())) {
        return '-';
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '-';
    }
  };

  const columns = [
    {
      key: 'month' as keyof Cancellation,
      label: 'Month',
      render: (value: unknown, _item: Cancellation) => (
        <div className="font-medium text-gray-900">{value as string}</div>
      ),
    },
    {
      key: 'name' as keyof Cancellation,
      label: 'Name',
      render: (value: unknown, _item: Cancellation) => (
        <div className="font-medium text-gray-900">{value as string}</div>
      ),
    },
    {
      key: 'date' as keyof Cancellation,
      label: 'Date',
      render: (value: unknown, _item: Cancellation) => formatDate(value as string),
    },
    {
      key: 'reason' as keyof Cancellation,
      label: 'Reason',
      render: (value: unknown, _item: Cancellation) => (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          {(value as string) || '-'}
        </span>
      ),
    },
    {
      key: 'age_group' as keyof Cancellation,
      label: 'Age Group',
      render: (value: unknown, _item: Cancellation) => (
        <div className="text-sm">{(value as string) || '-'}</div>
      ),
    },
    {
      key: 'notes' as keyof Cancellation,
      label: 'Notes',
      render: (value: unknown, _item: Cancellation) => (
        <div className="text-sm text-gray-500 max-w-xs truncate">{(value as string) || '-'}</div>
      ),
    },
    {
      key: 'actions' as keyof Cancellation,
      label: 'Actions',
      render: (_value: unknown, cancellation: Cancellation) => (
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => {
              setSelectedCancellation(cancellation);
              openModal('editCancellation');
            }}
            className="btn-icon hover:text-blue-600"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => removeCancellation(cancellation.id, cancellation.name)}
            className="btn-icon hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error: {error.message}</div>
        <button type="button" onClick={refresh} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="section-container">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Cancellations</h2>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => openModal('settings')}
              className="btn btn-secondary"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleCSVImport}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-secondary-blue"
            >
              <Upload className="w-4 h-4" />
              <span>Import CSV</span>
            </button>
            <button type="button" onClick={handleExportCancellations} className="btn btn-primary">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={() => openModal('addCancellation')}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              <span>Add Cancellation</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="section-container border-l-4 border-red-600">
          <div className="text-sm text-gray-600">Total Cancellations</div>
          <div className="text-3xl font-bold mt-1">{filteredAndSearchedCancellations.length}</div>
        </div>
        {topReasons.map(([reason, count], idx) => (
          <div
            key={reason}
            className={`section-container border-l-4 ${
              idx === 0
                ? 'border-orange-600'
                : idx === 1
                  ? 'border-yellow-600'
                  : idx === 2
                    ? 'border-blue-600'
                    : 'border-gray-600'
            }`}
          >
            <div className="text-sm text-gray-600">{reason || 'No Reason'}</div>
            <div className="text-3xl font-bold mt-1">{count}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <input
          type="text"
          placeholder="Search by name, reason, age category, date, or notes..."
          value={filters.searchTerm}
          onChange={(e) => setFilters({ searchTerm: e.target.value })}
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
        />
      </div>

      <div className="section-container">
        <YearFilter
          availableYears={availableYears}
          selectedYear={filters.year}
          onYearChange={(year) => setFilters({ year })}
        />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="form-label" htmlFor="cancellations-sort">
              Sort By
            </label>
            <select
              id="cancellations-sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="form-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="cancellations-month">
              Month
            </label>
            <select
              id="cancellations-month"
              value={filters.month}
              onChange={(e) => setFilters({ month: e.target.value })}
              className="form-select"
            >
              <option value="all">All Months</option>
              {MONTHS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="cancellations-reason">
              Reason
            </label>
            <select
              id="cancellations-reason"
              value={filters.reason}
              onChange={(e) => setFilters({ reason: e.target.value })}
              className="form-select"
            >
              <option value="all">All Reasons</option>
              {/* Reasons will be loaded in CancellationModals */}
              {/* {cancellationReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))} */}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="cancellations-age-group">
              Age Group
            </label>
            <select
              id="cancellations-age-group"
              value={filters.ageGroup}
              onChange={(e) => setFilters({ ageGroup: e.target.value })}
              className="form-select"
            >
              <option value="all">All Ages</option>
              {AGE_GROUPS.map((age) => (
                <option key={age} value={age}>
                  {age}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="section-container">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <label
              className="text-sm font-medium text-gray-700"
              htmlFor="cancellations-items-per-page"
            >
              Show:
            </label>
            <select
              id="cancellations-items-per-page"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="form-select"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
            </select>
            <span className="text-sm text-gray-600">per page</span>
          </div>
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, sortedCancellations.length)} of{' '}
            {sortedCancellations.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              First
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Prev
            </button>
            <span className="px-4 py-2 text-sm font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border rounded-lg text-sm disabled:opacity-50 hover:bg-gray-50"
            >
              Last
            </button>
          </div>
        </div>
        {selectedIds.size > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{selectedIds.size} item(s) selected</span>
              <button
                type="button"
                onClick={() => clearSelection(selectionTab)}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">
            All Cancellations ({sortedCancellations.length})
          </h3>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="btn btn-primary text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table
            data={paginatedCancellations}
            columns={columns}
            loading={loading}
            selectedIds={selectedIds}
            onSelectId={(id) => toggleSelection(selectionTab, id)}
            onSelectAll={(ids) => selectAll(selectionTab, ids)}
            onClearSelection={(ids) => clearSelection(selectionTab, ids)}
            emptyMessage="No cancellations found matching your criteria"
          />
        </div>
      </div>

      <CancellationModals
        importPreviewData={importPreviewData}
        confirmCSVImport={confirmCSVImport}
        importYear={importYear}
        onImportYearChange={handleImportYearChange}
        onImportClose={() => {
          setImportFile(null);
          setImportPreviewData([]);
        }}
      />
    </div>
  );
}
