'use client';

import { Download, Edit2, FileText, Plus, RotateCcw, Settings, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import FilterBar from '@/components/ui/FilterBar';
import Modal from '@/components/ui/Modal';
import OverflowMenu from '@/components/ui/OverflowMenu';
import PaginationBar from '@/components/ui/PaginationBar';
import Table from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { useCancellations } from '@/hooks/useCancellations';
import { useImportUndo } from '@/hooks/useImportUndo';
import { useIntros } from '@/hooks/useIntros';
import { useMembers } from '@/hooks/useMembers';
import { config } from '@/lib/config';
import { type CancellationCsvRecord, parseCancellationsCSV } from '@/lib/csv';
import { supabase } from '@/lib/supabase/client';
import { closeActiveHold } from '@/lib/supabase/holds';
import { exportToCSV, formatDate } from '@/lib/supabase/utils';
import { isDefaultFilters, useFilterStore } from '@/store/useFilterStore';
import { type SelectionTabKey, useSelectionStore } from '@/store/useSelectionStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import type { Cancellation } from '@/types';
import { CancellationModals } from './modals/CancellationModals';

const AGE_GROUPS = ['3-6 YO', '7-9 YO', '10-15 YO', 'Adult'];

function monthsBetween(from: string, to: string): number {
  const start = new Date(from);
  const end = new Date(to);
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

export default function CancellationsTab() {
  const {
    cancellations,
    loading,
    error,
    addCancellation,
    editCancellation,
    removeCancellation,
    refresh,
  } = useCancellations();
  const { members } = useMembers();
  const { intros } = useIntros();
  const { openModal, closeModal } = useUIStore();
  const filters = useFilterStore((s) => s.filtersByTab.cancellations);
  const setFiltersForTab = useFilterStore((s) => s.setFilters);
  const clearFiltersForTab = useFilterStore((s) => s.clearFilters);
  const setFilters = (partial: Partial<typeof filters>) =>
    setFiltersForTab('cancellations', partial);
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
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const { saveImportBatch, getImportBatch, clearImportBatch } = useImportUndo();
  const [undoBatch, setUndoBatch] = useState(() => getImportBatch('cancellations'));
  const cancellationReasons = useSettingsStore((s) => s.cancellationReasons);
  const [viewingNote, setViewingNote] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-runs whenever filters/sortOrder change, to reset to page 1
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, sortOrder]);

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

  const syncCancellationHolds = async (records: CancellationCsvRecord[]) => {
    for (const record of records) {
      if (record.name && record.date) {
        await closeActiveHold(record.name, record.date).catch(() => {
          // Sync failure does not block import
        });
      }
    }
  };

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity, refactor deferred
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

      const { data, error } = await supabase.from('cancellations').insert(newRecords).select('id');

      if (error) {
        console.error('Error bulk importing:', error);
        alert(`Error importing: ${error.message}`);
      } else {
        const importedIds = (data ?? []).map((r) => r.id);
        saveImportBatch('cancellations', importedIds);
        setUndoBatch({ ids: importedIds, count: importedIds.length, savedAt: Date.now() });
        await refresh(); // Refresh cancellations after import
        await syncCancellationHolds(newRecords);
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
      const { error } = await supabase.from('cancellations').delete().in('id', undoBatch.ids);
      if (error) {
        throw error;
      }
      clearImportBatch('cancellations');
      setUndoBatch(null);
      await refresh();
    } catch {
      alert('Failed to undo import. Please try again.');
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
    const years = new Set<number>();
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
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Name cell combines truncation, tooltip, and cron-only enrichment badges.
      render: (value: unknown, cancellation: Cancellation) => {
        const full = (value as string) || '';
        const parts = full.trim().split(' ');
        const display =
          parts.length > 1 && full.length > 14 ? `${parts[0]} ${parts.at(-1)?.[0] ?? ''}.` : full;
        const member = members.find(
          (m) => m.name.toLowerCase().trim() === cancellation.name.toLowerCase().trim()
        );
        const intro = intros.find(
          (i) => i.name.toLowerCase().trim() === cancellation.name.toLowerCase().trim()
        );
        const durationMonths =
          member?.join_date && cancellation.date
            ? monthsBetween(member.join_date, cancellation.date)
            : 0;
        const introDate = intro?.date ? new Date(intro.date) : null;
        const introLabel =
          introDate && !Number.isNaN(introDate.getTime())
            ? `${introDate.toLocaleString('default', { month: 'short' })} ${introDate.getFullYear()}`
            : null;
        const nameNode =
          display !== full ? (
            <Tooltip content={full}>
              <div className="font-medium text-gray-900 cursor-default">{display}</div>
            </Tooltip>
          ) : (
            <div className="font-medium text-gray-900">{full}</div>
          );

        return (
          <div>
            {nameNode}
            {cancellation.source === 'cron' && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {durationMonths > 0 && (
                  <span className="inline-block bg-blue-50 text-blue-700 text-[10px] px-2 py-0.5 rounded-full">
                    Member {durationMonths} month{durationMonths === 1 ? '' : 's'}
                  </span>
                )}
                {introLabel && (
                  <span className="inline-block bg-purple-50 text-purple-700 text-[10px] px-2 py-0.5 rounded-full">
                    From intro {introLabel}
                  </span>
                )}
              </div>
            )}
          </div>
        );
      },
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
      key: 'year' as keyof Cancellation,
      label: 'Year',
      render: (value: unknown) => (
        <span className="text-sm text-gray-500">{value ? String(value) : '—'}</span>
      ),
    },
    {
      key: 'actions' as keyof Cancellation,
      label: '',
      render: (_value: unknown, cancellation: Cancellation) => (
        <OverflowMenu
          items={[
            ...(cancellation.notes
              ? [
                  {
                    label: 'Notes',
                    icon: FileText,
                    onClick: () => setViewingNote(cancellation.notes ?? ''),
                  },
                ]
              : []),
            {
              label: 'Edit',
              icon: Edit2,
              onClick: () => {
                setSelectedCancellation(cancellation);
                openModal('editCancellation');
              },
            },
            {
              label: 'Delete',
              icon: Trash2,
              variant: 'danger',
              onClick: () => removeCancellation(cancellation.id, cancellation.name),
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
            {filters.year === 'all' ? 'All Cancellations' : `${filters.year} Cancellations`}
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
        hasActiveFilters={!isDefaultFilters(filters)}
        onClear={() => clearFiltersForTab('cancellations')}
      />

      <PaginationBar
        id="cancellations-items-per-page"
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={sortedCancellations.length}
        startIndex={startIndex}
        endIndex={endIndex}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
        selectedCount={selectedIds.size}
        onClearSelection={() => clearSelection(selectionTab)}
      />

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

      <Modal isOpen={viewingNote !== null} onClose={() => setViewingNote(null)} title="Notes">
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{viewingNote}</p>
        <div className="mt-6 flex justify-end">
          <button type="button" onClick={() => setViewingNote(null)} className="btn btn-tertiary">
            Close
          </button>
        </div>
      </Modal>

      <CancellationModals
        addCancellation={addCancellation}
        editCancellation={editCancellation}
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
