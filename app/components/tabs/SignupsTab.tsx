'use client';

import { Edit2, Plus, Settings, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import Table from '@/components/ui/Table';
import { useSignups } from '@/hooks/useSignups';
import { parseSignupsCSV, type SignupCsvRecord } from '@/lib/csv';
import { supabase } from '@/lib/supabase/client';
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
  const [itemsPerPage, setItemsPerPage] = useState(100);

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

      const { error } = await supabase.from('signups').insert(newRecords);

      if (error) {
        console.error('Error bulk importing:', error);
        alert(`Error importing: ${error.message}`);
      } else {
        await refresh(); // Refresh signups after import
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
    const current = new Date().getFullYear();
    const years = new Set<number>([current, current - 1, current - 2]);
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

  // Helper to format dates for display
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
      key: 'month' as keyof Signup,
      label: 'Month',
      render: (value: unknown, _item: Signup) => (
        <div className="font-medium text-gray-900">{value as string}</div>
      ),
    },
    {
      key: 'name' as keyof Signup,
      label: 'Name',
      render: (value: unknown, _item: Signup) => (
        <div className="font-medium text-gray-900">{value as string}</div>
      ),
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
      key: 'actions' as keyof Signup,
      label: 'Actions',
      render: (_value: unknown, signup: Signup) => (
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => {
              setSelectedSignup(signup);
              openModal('editSignup');
            }}
            className="btn-icon hover:text-blue-600"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => removeSignup(signup.id, signup.name)}
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
          <h2 className="text-2xl font-bold">Sign-ups</h2>
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
            <div className="flex items-center rounded-lg border border-blue-200 overflow-hidden">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary-blue rounded-none border-0 border-r border-blue-200"
              >
                <Upload className="w-4 h-4" />
                <span>Import CSV</span>
              </button>
              <div className="flex items-center gap-1 px-2 bg-blue-50">
                <span className="text-xs text-blue-500 font-medium">Year</span>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={importYear}
                  onChange={(e) => setImportYear(Number(e.target.value))}
                  className="w-16 text-sm text-center bg-transparent border-0 outline-none text-blue-700 font-semibold"
                />
              </div>
            </div>
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
        <div className="flex items-center gap-2 flex-wrap pb-3 mb-1 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setFilters({ year: 'all' })}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filters.year === 'all'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-white text-gray-700 border border-gray-200 hover:border-red-400 hover:text-red-600'
            }`}
          >
            All
            <span
              className={`ml-1.5 text-xs ${filters.year === 'all' ? 'text-red-100' : 'text-gray-400'}`}
            >
              · {signups.length}
            </span>
          </button>
          {availableYears.map((year) => {
            const count = signups.filter((s) => s.year === year).length;
            const isActive = filters.year === String(year);
            return (
              <button
                key={year}
                type="button"
                onClick={() => setFilters({ year: String(year) })}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-red-400 hover:text-red-600'
                }`}
              >
                {year}
                <span className={`ml-1.5 text-xs ${isActive ? 'text-red-100' : 'text-gray-400'}`}>
                  · {count}
                </span>
              </button>
            );
          })}
        </div>
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

      <div className="section-container">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700" htmlFor="signups-items-per-page">
              Show:
            </label>
            <select
              id="signups-items-per-page"
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
            Showing {startIndex + 1}-{Math.min(endIndex, sortedSignups.length)} of{' '}
            {sortedSignups.length}
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
