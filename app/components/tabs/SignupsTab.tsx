'use client';

import { Edit2, FileText, Plus, RotateCcw, Settings, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import FilterBar from '@/components/ui/FilterBar';
import Modal from '@/components/ui/Modal';
import OverflowMenu from '@/components/ui/OverflowMenu';
import PaginationBar from '@/components/ui/PaginationBar';
import Table from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import { useImportUndo } from '@/hooks/useImportUndo';
import { useIntros } from '@/hooks/useIntros';
import { useSignups } from '@/hooks/useSignups';
import { config } from '@/lib/config';
import { parseSignupsCSV, type SignupCsvRecord } from '@/lib/csv';
import { supabase } from '@/lib/supabase/client';
import { markMostRecentIntroAsSignedUp } from '@/lib/supabase/intros';
import { formatDate } from '@/lib/supabase/utils';
import { isDefaultFilters, useFilterStore } from '@/store/useFilterStore';
import { type SelectionTabKey, useSelectionStore } from '@/store/useSelectionStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import type { Signup } from '@/types';
import { SignupModals } from './modals/SignupModals';

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
}

export default function SignupsTab() {
  const { signups, loading, error, addSignup, editSignup, removeSignup, refresh } = useSignups();
  const { intros } = useIntros();
  const { openModal, closeModal } = useUIStore();
  const filters = useFilterStore((s) => s.filtersByTab.signups);
  const setFiltersForTab = useFilterStore((s) => s.setFilters);
  const clearFiltersForTab = useFilterStore((s) => s.clearFilters);
  const setFilters = (partial: Partial<typeof filters>) => setFiltersForTab('signups', partial);
  const selectionTab: SelectionTabKey = 'signups';
  const selectedIds = useSelectionStore((state) => state.selectedIdsByTab[selectionTab]);
  const toggleSelection = useSelectionStore((state) => state.toggleSelection);
  const selectAll = useSelectionStore((state) => state.selectAll);
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const setSelectedSignup = useSelectionStore((state) => state.setSelectedSignup);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreviewData, setImportPreviewData] = useState<SignupCsvRecord[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importYear, setImportYear] = useState<number>(new Date().getFullYear());
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const { saveImportBatch, getImportBatch, clearImportBatch } = useImportUndo();
  const [undoBatch, setUndoBatch] = useState(() => getImportBatch('signups'));
  const membershipTypes = useSettingsStore((s) => s.membershipTypes);
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
    parseSignupsCSV(
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
      parseSignupsCSV(importFile, setImportPreviewData, year);
    }
  };

  const syncSignupIntros = async (records: SignupCsvRecord[]) => {
    for (const record of records) {
      if (record.name) {
        await markMostRecentIntroAsSignedUp(record.name).catch(() => {
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
        const isDuplicate = signups.some((s) => {
          if (s.name.toLowerCase().trim() !== row.name.toLowerCase().trim()) {
            return false;
          }
          if (s.membership_date && row.membership_date) {
            return s.membership_date === row.membership_date;
          }
          return s.month === row.month && String(s.year) === String(importYear);
        });
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

      const { data, error } = await supabase.from('signups').insert(newRecords).select('id');

      if (error) {
        console.error('Error bulk importing:', error);
        alert(`Error importing: ${error.message}`);
      } else {
        const importedIds = (data ?? []).map((r) => r.id);
        saveImportBatch('signups', importedIds);
        setUndoBatch({ ids: importedIds, count: importedIds.length, savedAt: Date.now() });
        await refresh(); // Refresh signups after import
        await syncSignupIntros(newRecords);
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
      const { error } = await supabase.from('signups').delete().in('id', undoBatch.ids);
      if (error) {
        throw error;
      }
      clearImportBatch('signups');
      setUndoBatch(null);
      await refresh();
    } catch {
      alert('Failed to undo import. Please try again.');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      alert('Please select sign-ups to delete');
      return;
    }
    if (selectedIds.size > 1000) {
      alert('⚠️ Maximum 1000 items at once. Please select fewer items.');
      return;
    }
    if (!confirm(`Delete ${selectedIds.size} selected sign-ups?`)) {
      return;
    }

    try {
      // setLoading(true);
      const idsToDelete = Array.from(selectedIds);
      const batchSize = 50;

      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const { error } = await supabase.from('signups').delete().in('id', batch);
        if (error) {
          throw error;
        }
      }

      await refresh();
      clearSelection(selectionTab);
      setCurrentPage(1);
      alert(`✅ Deleted ${idsToDelete.length} sign-ups`);
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting sign-ups');
    } finally {
      // setLoading(false);
    }
  };

  const filteredAndSearchedSignups = useMemo(() => {
    let filtered = signups;

    // Apply existing filters
    filtered = filtered.filter((signup) => {
      const matchesMonth = filters.month === 'all' || signup.month === filters.month;
      const matchesMembership =
        filters.membership === 'all' ||
        (signup.membership && signup.membership === filters.membership);
      const matchesYear = filters.year === 'all' || String(signup.year) === filters.year;
      return matchesMonth && matchesMembership && matchesYear;
    });

    // Apply search filter
    if (filters.searchTerm.trim()) {
      const search = filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (signup) =>
          signup.name.toLowerCase().includes(search) ||
          signup.membership?.toLowerCase().includes(search) ||
          signup.membership_date?.includes(search) ||
          signup.first_payment_date?.includes(search) ||
          signup.notes?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [signups, filters]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const signup of signups) {
      if (signup.year) {
        years.add(signup.year);
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [signups]);

  const getSortTimestamp = (signup: Signup) => {
    const dateValue = signup.membership_date ? new Date(signup.membership_date).getTime() : 0;
    if (dateValue) {
      return dateValue;
    }
    return signup.created_at ? new Date(signup.created_at).getTime() : 0;
  };

  const sortedSignups = [...filteredAndSearchedSignups].sort((a, b) => {
    const dateA = getSortTimestamp(a);
    const dateB = getSortTimestamp(b);
    if (dateA === dateB) {
      return 0;
    }
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });

  const totalPages = Math.ceil(sortedSignups.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSignups = sortedSignups.slice(startIndex, endIndex);

  const metrics = {
    total: filteredAndSearchedSignups.length,
    integrity: filteredAndSearchedSignups.filter((s) => s.membership === 'Integrity').length,
    legacy: filteredAndSearchedSignups.filter((s) => s.membership === 'Legacy').length,
    special: filteredAndSearchedSignups.filter((s) => s.membership === 'Special').length,
    asp: filteredAndSearchedSignups.filter((s) => s.membership === 'ASP').length,
    withPackage: filteredAndSearchedSignups.filter((s) => s.signup_package).length,
  };

  const columns = [
    {
      key: 'month' as keyof Signup,
      label: 'Month',
      render: (value: unknown, _item: Signup) => (
        <div className="font-medium text-gray-900">{value as string}</div>
      ),
    },
    {
      key: 'name' as keyof Signup,
      label: 'Name',
      render: (value: unknown, signup: Signup) => {
        const full = (value as string) || '';
        const parts = full.trim().split(' ');
        const display =
          parts.length > 1 && full.length > 14 ? `${parts[0]} ${parts.at(-1)?.[0] ?? ''}.` : full;
        const intro = intros.find(
          (i) => i.name.toLowerCase().trim() === signup.name.toLowerCase().trim()
        );
        const conversionDays =
          intro?.date && signup.membership_date
            ? daysBetween(intro.date, signup.membership_date)
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
            {conversionDays !== null && conversionDays >= 0 && conversionDays <= 365 && (
              <span className="inline-block bg-green-50 text-green-700 text-[10px] px-2 py-0.5 rounded-full mt-1">
                Intro to signup in {conversionDays} day{conversionDays === 1 ? '' : 's'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'membership' as keyof Signup,
      label: 'Membership',
      render: (value: unknown, _item: Signup) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            (value as string) === 'Integrity'
              ? 'bg-green-100 text-green-800'
              : (value as string) === 'Legacy'
                ? 'bg-purple-100 text-purple-800'
                : (value as string) === 'Special'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
          }`}
        >
          {value as string}
        </span>
      ),
    },
    {
      key: 'membership_date' as keyof Signup,
      label: 'Sign Up Date',
      render: (value: unknown, _item: Signup) => formatDate(value as string),
    },
    {
      key: 'first_payment_date' as keyof Signup,
      label: 'First Payment',
      render: (value: unknown, _item: Signup) => formatDate(value as string),
    },
    {
      key: 'signup_package' as keyof Signup,
      label: 'Package',
      render: (value: unknown, _item: Signup) =>
        (value as boolean) ? (
          <span className="text-green-600 font-medium">✓ Yes</span>
        ) : (
          <span className="text-gray-400">No</span>
        ),
    },
    {
      key: 'year' as keyof Signup,
      label: 'Year',
      render: (value: unknown) => (
        <span className="text-sm text-gray-500">{value ? String(value) : '—'}</span>
      ),
    },
    {
      key: 'actions' as keyof Signup,
      label: '',
      render: (_value: unknown, signup: Signup) => (
        <OverflowMenu
          items={[
            ...(signup.notes
              ? [
                  {
                    label: 'Notes',
                    icon: FileText,
                    onClick: () => setViewingNote(signup.notes ?? ''),
                  },
                ]
              : []),
            {
              label: 'Edit',
              icon: Edit2,
              onClick: () => {
                setSelectedSignup(signup);
                openModal('editSignup');
              },
            },
            {
              label: 'Delete',
              icon: Trash2,
              variant: 'danger',
              onClick: () => removeSignup(signup.id, signup.name),
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
            {filters.year === 'all' ? 'All Sign-ups' : `${filters.year} Sign-ups`}
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
            <button
              type="button"
              onClick={() => openModal('addSignup')}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              <span>Add Sign-up</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="section-container border-l-4 border-blue-600">
          <div className="text-sm text-gray-600">Total Sign-ups</div>
          <div className="text-3xl font-bold mt-1">{metrics.total}</div>
        </div>
        <div className="section-container border-l-4 border-green-600">
          <div className="text-sm text-gray-600">Integrity</div>
          <div className="text-3xl font-bold mt-1">{metrics.integrity}</div>
        </div>
        <div className="section-container border-l-4 border-purple-600">
          <div className="text-sm text-gray-600">Legacy</div>
          <div className="text-3xl font-bold mt-1">{metrics.legacy}</div>
        </div>
        <div className="section-container border-l-4 border-yellow-600">
          <div className="text-sm text-gray-600">Special</div>
          <div className="text-3xl font-bold mt-1">{metrics.special}</div>
        </div>
        <div className="section-container border-l-4 border-red-600">
          <div className="text-sm text-gray-600">ASP</div>
          <div className="text-3xl font-bold mt-1">{metrics.asp}</div>
        </div>
        <div className="section-container border-l-4 border-indigo-600">
          <div className="text-sm text-gray-600">With Package</div>
          <div className="text-3xl font-bold mt-1">{metrics.withPackage}</div>
        </div>
      </div>

      <FilterBar
        availableYears={availableYears}
        selectedYear={filters.year}
        onYearChange={(year) => setFilters({ year })}
        searchValue={filters.searchTerm}
        onSearchChange={(searchTerm) => setFilters({ searchTerm })}
        searchPlaceholder="Search by name, membership type, dates, or notes..."
        selects={[
          {
            id: 'signups-month',
            label: 'Month',
            value: filters.month,
            onChange: (month) => setFilters({ month }),
            options: [...config.months],
            allLabel: 'All Months',
          },
          {
            id: 'signups-membership',
            label: 'Membership Type',
            value: filters.membership,
            onChange: (membership) => setFilters({ membership }),
            options: membershipTypes,
            allLabel: 'All Types',
          },
        ]}
        sortSelect={{
          id: 'signups-sort',
          label: 'Sort By',
          value: sortOrder,
          onChange: (value) => setSortOrder(value as 'newest' | 'oldest'),
          options: [
            { value: 'newest', label: 'Newest First' },
            { value: 'oldest', label: 'Oldest First' },
          ],
        }}
        hasActiveFilters={!isDefaultFilters(filters)}
        onClear={() => clearFiltersForTab('signups')}
      />

      <PaginationBar
        id="signups-items-per-page"
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={sortedSignups.length}
        startIndex={startIndex}
        endIndex={endIndex}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
        selectedCount={selectedIds.size}
        onClearSelection={() => clearSelection(selectionTab)}
      />

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">All Sign-ups ({sortedSignups.length})</h3>
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelected}
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
            onSelectId={(id) => toggleSelection(selectionTab, id)}
            onSelectAll={(ids) => selectAll(selectionTab, ids)}
            onClearSelection={(ids) => clearSelection(selectionTab, ids)}
            emptyMessage="No sign-ups found matching your criteria"
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

      <SignupModals
        importPreviewData={importPreviewData}
        confirmCSVImport={confirmCSVImport}
        importYear={importYear}
        onImportYearChange={handleImportYearChange}
        onImportClose={() => {
          setImportFile(null);
          setImportPreviewData([]);
        }}
        addSignup={addSignup}
        editSignup={editSignup}
      />
    </div>
  );
}
