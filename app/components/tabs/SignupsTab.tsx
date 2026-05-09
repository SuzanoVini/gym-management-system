'use client';

import { Edit2, Plus, RotateCcw, Settings, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import OverflowMenu from '@/components/ui/OverflowMenu';
import PaginationBar from '@/components/ui/PaginationBar';
import Table from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import YearFilter from '@/components/ui/YearFilter';
import { useImportUndo } from '@/hooks/useImportUndo';
import { useSignups } from '@/hooks/useSignups';
import { parseSignupsCSV, type SignupCsvRecord } from '@/lib/csv';
import { supabase } from '@/lib/supabase/client';
import { markMostRecentIntroAsSignedUp } from '@/lib/supabase/intros';
import { formatDate } from '@/lib/supabase/utils';
import { useFilterStore } from '@/store/useFilterStore';
import { type SelectionTabKey, useSelectionStore } from '@/store/useSelectionStore';
import { useUIStore } from '@/store/useUIStore';
import type { Signup } from '@/types';
import { SignupModals } from './modals/SignupModals';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function SignupsTab() {
  const { signups, loading, error, removeSignup, refresh } = useSignups();
  const { openModal, closeModal } = useUIStore();
  const { filters, setFilters } = useFilterStore();
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
        const isDuplicate = signups.some(
          (s) =>
            s.name.toLowerCase().trim() === row.name.toLowerCase().trim() && s.month === row.month
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
      render: (value: unknown, _item: Signup) => {
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
      key: 'notes' as keyof Signup,
      label: 'Notes',
      render: (value: unknown, _item: Signup) => (
        <div className="text-sm text-gray-500 max-w-xs truncate">{(value as string) || '-'}</div>
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

      <div className="section-container mb-4">
        <input
          type="text"
          placeholder="Search by name, membership type, dates, or notes..."
          value={filters.searchTerm}
          onChange={(e) => setFilters({ searchTerm: e.target.value })}
          className="form-input"
        />
      </div>

      <div className="section-container">
        <YearFilter
          availableYears={availableYears}
          selectedYear={filters.year}
          onYearChange={(year) => setFilters({ year })}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label" htmlFor="signups-sort">
              Sort By
            </label>
            <select
              id="signups-sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="form-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
          <div>
            <label className="form-label" htmlFor="signups-month">
              Month
            </label>
            <select
              id="signups-month"
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
            <label className="form-label" htmlFor="signups-membership">
              Membership Type
            </label>
            <select
              id="signups-membership"
              value={filters.membership}
              onChange={(e) => setFilters({ membership: e.target.value })}
              className="form-select"
            >
              <option value="all">All Types</option>
              {/* Membership types will be loaded in SignupModals */}
              {/* {membershipTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))} */}
            </select>
          </div>
        </div>
      </div>

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

      <SignupModals
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
