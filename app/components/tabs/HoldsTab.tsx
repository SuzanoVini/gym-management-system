'use client';

import { Download, Edit2, Plus, RotateCcw, Settings, Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import OverflowMenu from '@/components/ui/OverflowMenu';
import PaginationBar from '@/components/ui/PaginationBar';
import Table from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import YearFilter from '@/components/ui/YearFilter';
import { useHolds } from '@/hooks/useHolds';
import { useImportUndo } from '@/hooks/useImportUndo';
import { type HoldCsvRecord, parseHoldsCSV } from '@/lib/csv';
import { supabase } from '@/lib/supabase/client';
import { fetchSettings } from '@/lib/supabase/settings';
import { exportToCSV, formatDate } from '@/lib/supabase/utils';
import { useFilterStore } from '@/store/useFilterStore';
import { type SelectionTabKey, useSelectionStore } from '@/store/useSelectionStore';
import { useUIStore } from '@/store/useUIStore';
import type { Hold } from '@/types';
import { HoldModals } from './modals/HoldModals';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function HoldsTab() {
  const { holds, loading, error, addHold, editHold, removeHold, refresh } = useHolds();
  const { openModal, closeModal } = useUIStore();
  const { filters, setFilters } = useFilterStore();
  const selectionTab: SelectionTabKey = 'holds';
  const selectedIds = useSelectionStore((state) => state.selectedIdsByTab[selectionTab]);
  const toggleSelection = useSelectionStore((state) => state.toggleSelection);
  const selectAll = useSelectionStore((state) => state.selectAll);
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const setSelectedHold = useSelectionStore((state) => state.setSelectedHold);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreviewData, setImportPreviewData] = useState<HoldCsvRecord[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importYear, setImportYear] = useState<number>(new Date().getFullYear());
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const { saveImportBatch, getImportBatch, clearImportBatch } = useImportUndo();
  const [undoBatch, setUndoBatch] = useState(() => getImportBatch('holds'));
  const [holdReasons, setHoldReasons] = useState<string[]>([]);

  const refreshHoldReasons = useCallback(async () => {
    const reasons = await fetchSettings('hold_reasons');
    setHoldReasons(reasons);
  }, []);

  useEffect(() => {
    void refreshHoldReasons();
  }, [refreshHoldReasons]);

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setImportFile(file);
    parseHoldsCSV(
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
      parseHoldsCSV(importFile, setImportPreviewData, year);
    }
  };

  const filterNewRecords = (records: HoldCsvRecord[]) => {
    return records.filter((row) => {
      if (!row.name || !row.month) {
        return false;
      }
      const isDuplicate = holds.some(
        (h) =>
          h.name.toLowerCase().trim() === row.name.toLowerCase().trim() &&
          h.month === row.month &&
          h.start === row.start
      );
      return !isDuplicate;
    });
  };

  const handleImportSuccess = async (newRecords: HoldCsvRecord[], duplicateCount: number) => {
    const { data, error } = await supabase.from('holds').insert(newRecords).select('id');

    if (error) {
      console.error('Error bulk importing:', error);
      alert(`Error importing: ${error.message}`);
      return;
    }

    const importedIds = (data ?? []).map((r) => r.id);
    saveImportBatch('holds', importedIds);
    setUndoBatch({ ids: importedIds, count: importedIds.length, savedAt: Date.now() });
    await refresh(); // Refresh holds after import
    closeModal('importPreview');
    setImportPreviewData([]);
    setImportFile(null);
    alert(
      `✅ Successfully imported ${newRecords.length} records!\n${duplicateCount > 0 ? `Skipped ${duplicateCount} duplicates.` : ''}`
    );
  };

  const confirmCSVImport = async () => {
    if (!importPreviewData || importPreviewData.length === 0) {
      alert('No data to import');
      return;
    }

    try {
      // setLoading(true); // Use useUIStore's setLoading
      const newRecords = filterNewRecords(importPreviewData);
      const duplicateCount = importPreviewData.length - newRecords.length;

      if (newRecords.length === 0) {
        alert(`All ${duplicateCount} records are duplicates. Nothing to import.`);
        closeModal('importPreview');
        setImportPreviewData([]);
        setImportFile(null);
        // setLoading(false);
        return;
      }

      await handleImportSuccess(newRecords, duplicateCount);
    } catch (error) {
      console.error('Fatal error importing CSV:', error);
      alert(`Error importing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // setLoading(false);
    }
  };

  const handleUndoImport = async () => {
    if (!undoBatch) {
      return;
    }
    if (
      !confirm(
        `Delete the ${undoBatch.count} records from the last import? This is permanent and cannot be reversed.`
      )
    ) {
      return;
    }
    try {
      const { error } = await supabase.from('holds').delete().in('id', undoBatch.ids);
      if (error) {
        throw error;
      }
      clearImportBatch('holds');
      setUndoBatch(null);
      await refresh();
    } catch {
      alert('Failed to undo import. Please try again.');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      alert('Please select holds to delete');
      return;
    }
    if (selectedIds.size > 1000) {
      alert('⚠️ Maximum 1000 items at once. Please select fewer items.');
      return;
    }
    if (!confirm(`Delete ${selectedIds.size} selected holds?`)) {
      return;
    }

    try {
      // setLoading(true);
      const idsToDelete = Array.from(selectedIds);
      const batchSize = 50;

      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const { error } = await supabase.from('holds').delete().in('id', batch);
        if (error) {
          throw error;
        }
      }

      await refresh();
      clearSelection(selectionTab);
      setCurrentPage(1);
      alert(`✅ Deleted ${idsToDelete.length} holds`);
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting holds');
    } finally {
      // setLoading(false);
    }
  };

  const handleExportHolds = () => {
    const exportData = filteredAndSearchedHolds.map((hold) => ({
      Name: hold.name,
      Month: hold.month,
      'Start Date': hold.start,
      'End Date': hold.end,
      Reason: hold.reason,
      Fee: hold.fee,
    }));

    exportToCSV(exportData, 'holds');
    alert('✅ Holds exported successfully!');
  };

  const getHoldStatus = useCallback((start?: string, end?: string): string => {
    if (!start) {
      return 'unknown';
    }
    const today = new Date();
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : null;

    if (startDate > today) {
      return 'upcoming';
    }
    if (endDate && endDate < today) {
      return 'ended';
    }
    return 'active';
  }, []);

  const filteredAndSearchedHolds = useMemo(() => {
    let filtered = holds;

    // Apply existing filters
    filtered = filtered.filter((hold) => {
      const matchesMonth = filters.month === 'all' || hold.month === filters.month;
      const matchesReason =
        filters.reason === 'all' || (hold.reason && hold.reason === filters.reason);
      let matchesStatus = true;

      if (filters.holdStatus !== 'all') {
        const status = getHoldStatus(hold.start, hold.end);
        matchesStatus = status === filters.holdStatus;
      }

      const matchesYear = filters.year === 'all' || String(hold.year) === filters.year;
      return matchesMonth && matchesReason && matchesStatus && matchesYear;
    });

    // Apply search filter
    if (filters.searchTerm.trim()) {
      const search = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (hold) =>
          hold.name.toLowerCase().includes(search) ||
          hold.reason?.toLowerCase().includes(search) ||
          hold.start?.includes(search) ||
          hold.end?.includes(search)
      );
    }

    return filtered;
  }, [holds, filters, getHoldStatus]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const hold of holds) {
      if (hold.year) {
        years.add(hold.year);
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [holds]);

  const getSortTimestamp = (hold: Hold) => {
    const startValue = hold.start ? new Date(hold.start).getTime() : 0;
    if (startValue) {
      return startValue;
    }
    return hold.created_at ? new Date(hold.created_at).getTime() : 0;
  };

  const sortedHolds = [...filteredAndSearchedHolds].sort((a, b) => {
    const dateA = getSortTimestamp(a);
    const dateB = getSortTimestamp(b);
    if (dateA === dateB) {
      return 0;
    }
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const totalPages = Math.ceil(sortedHolds.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHolds = sortedHolds.slice(startIndex, endIndex);

  const statusCounts = {
    active: filteredAndSearchedHolds.filter((h) => getHoldStatus(h.start, h.end) === 'active')
      .length,
    upcoming: filteredAndSearchedHolds.filter((h) => getHoldStatus(h.start, h.end) === 'upcoming')
      .length,
    ended: filteredAndSearchedHolds.filter((h) => getHoldStatus(h.start, h.end) === 'ended').length,
  };

  const columns = [
    {
      key: 'month' as keyof Hold,
      label: 'Month',
      render: (value: unknown, _item: Hold) => (
        <div className="font-medium text-gray-900">{value as string}</div>
      ),
    },
    {
      key: 'name' as keyof Hold,
      label: 'Name',
      render: (value: unknown, _item: Hold) => {
        const full = (value as string) || '';
        const parts = full.trim().split(' ');
        const display =
          parts.length > 1 && full.length > 14 ? `${parts[0]} ${parts.at(-1)?.[0] ?? ''}.` : full;
        return display !== full ? (
          <Tooltip content={full}>
            <div className="font-medium text-gray-900 cursor-default">{display}</div>
          </Tooltip>
        ) : (
          <div className="font-medium text-gray-900">{full}</div>
        );
      },
    },
    {
      key: 'start' as keyof Hold,
      label: 'Start',
      render: (value: unknown, _item: Hold) => formatDate(value as string),
    },
    {
      key: 'end' as keyof Hold,
      label: 'End',
      render: (value: unknown, _item: Hold) => formatDate(value as string),
    },
    {
      key: 'reason' as keyof Hold,
      label: 'Reason',
      render: (value: unknown, _item: Hold) => (
        <div className="text-sm">{(value as string) || '-'}</div>
      ),
    },
    {
      key: 'fee' as keyof Hold,
      label: 'Fee',
      render: (value: unknown, _item: Hold) => (
        <div className="text-sm">{(value as string) || '-'}</div>
      ),
    },
    {
      key: 'status' as keyof Hold,
      label: 'Status',
      render: (_value: unknown, hold: Hold) => {
        const status = getHoldStatus(hold.start, hold.end);
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              status === 'active'
                ? 'bg-green-100 text-green-800'
                : status === 'upcoming'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      },
    },
    {
      key: 'year' as keyof Hold,
      label: 'Year',
      render: (value: unknown) => (
        <span className="text-sm text-gray-500">{value ? String(value) : '—'}</span>
      ),
    },
    {
      key: 'actions' as keyof Hold,
      label: '',
      render: (_value: unknown, hold: Hold) => (
        <OverflowMenu
          items={[
            {
              label: 'Edit',
              icon: Edit2,
              onClick: () => {
                setSelectedHold(hold);
                openModal('editHold');
              },
            },
            {
              label: 'Delete',
              icon: Trash2,
              variant: 'danger',
              onClick: () => removeHold(hold.id, hold.name),
            },
          ]}
        />
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
          <h2 className="text-2xl font-bold">
            {filters.year === 'all' ? 'All Holds' : `${filters.year} Holds`}
          </h2>
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
            {undoBatch && (
              <button type="button" onClick={handleUndoImport} className="btn btn-secondary">
                <RotateCcw className="w-4 h-4" />
                <span>Undo Import ({undoBatch.count})</span>
              </button>
            )}
            <button type="button" onClick={handleExportHolds} className="btn btn-primary">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button type="button" onClick={() => openModal('addHold')} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              <span>Add Hold</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="section-container border-l-4 border-blue-600">
          <div className="text-sm text-gray-600">Total Holds</div>
          <div className="text-3xl font-bold mt-1">{filteredAndSearchedHolds.length}</div>
        </div>
        <div className="section-container border-l-4 border-green-600">
          <div className="text-sm text-gray-600">Active</div>
          <div className="text-3xl font-bold mt-1">{statusCounts.active}</div>
        </div>
        <div className="section-container border-l-4 border-yellow-600">
          <div className="text-sm text-gray-600">Upcoming</div>
          <div className="text-3xl font-bold mt-1">{statusCounts.upcoming}</div>
        </div>
        <div className="section-container border-l-4 border-gray-600">
          <div className="text-sm text-gray-600">Ended</div>
          <div className="text-3xl font-bold mt-1">{statusCounts.ended}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <input
          type="text"
          placeholder="Search by name, reason, or dates..."
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
            <label className="form-label" htmlFor="holds-sort">
              Sort By
            </label>
            <select
              id="holds-sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="form-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="holds-month">
              Month
            </label>
            <select
              id="holds-month"
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
            <label className="form-label" htmlFor="holds-reason">
              Reason
            </label>
            <select
              id="holds-reason"
              value={filters.reason}
              onChange={(e) => setFilters({ reason: e.target.value })}
              className="form-select"
            >
              <option value="all">All Reasons</option>
              {holdReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="holds-status">
              Status
            </label>
            <select
              id="holds-status"
              value={filters.holdStatus}
              onChange={(e) => setFilters({ holdStatus: e.target.value })}
              className="form-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="upcoming">Upcoming</option>
              <option value="ended">Ended</option>
            </select>
          </div>
        </div>
      </div>

      <PaginationBar
        id="holds-items-per-page"
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={sortedHolds.length}
        startIndex={startIndex}
        endIndex={endIndex}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
        selectedCount={selectedIds.size}
        onClearSelection={() => clearSelection(selectionTab)}
      />

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">All Holds ({sortedHolds.length})</h3>
          {selectedIds.size > 0 && (
            <button type="button" onClick={handleDeleteSelected} className="btn btn-primary">
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedIds.size})</span>
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table
            data={paginatedHolds}
            columns={columns}
            loading={loading}
            selectedIds={selectedIds}
            onSelectId={(id) => toggleSelection(selectionTab, id)}
            onSelectAll={(ids) => selectAll(selectionTab, ids)}
            onClearSelection={(ids) => clearSelection(selectionTab, ids)}
            emptyMessage="No holds found matching your criteria"
          />
        </div>
      </div>

      <HoldModals
        importPreviewData={importPreviewData}
        confirmCSVImport={confirmCSVImport}
        importYear={importYear}
        onImportYearChange={handleImportYearChange}
        onImportClose={() => {
          setImportFile(null);
          setImportPreviewData([]);
        }}
        holdReasons={holdReasons}
        onHoldReasonsChange={refreshHoldReasons}
        addHold={addHold}
        editHold={editHold}
      />
    </div>
  );
}
