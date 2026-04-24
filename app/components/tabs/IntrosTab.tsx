'use client';

import { Edit2, MessageSquare, Plus, Settings, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import YearFilter from '@/components/ui/YearFilter';
import { useIntros } from '@/hooks/useIntros';
import { type IntroCsvRecord, parseIntrosCSV } from '@/lib/csv';
import { supabase } from '@/lib/supabase/client';
import { useFilterStore } from '@/store/useFilterStore';
import { type SelectionTabKey, useSelectionStore } from '@/store/useSelectionStore';
import { useUIStore } from '@/store/useUIStore';
import type { Intro } from '@/types';
import IntroForm from './forms/IntroForm';
import FollowUpModal from './modals/FollowUpModal';
import SettingsModal from './modals/SettingsModal';

export default function IntrosTab() {
  const { intros, loading, error, addIntro, editIntro, removeIntro, refresh } = useIntros();
  const { modals, openModal, closeModal } = useUIStore();
  const { filters, setFilters } = useFilterStore();
  const selectionTab: SelectionTabKey = 'intros';
  const selectedIds = useSelectionStore((state) => state.selectedIdsByTab[selectionTab]);
  const toggleSelection = useSelectionStore((state) => state.toggleSelection);
  const selectAll = useSelectionStore((state) => state.selectAll);
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const selectedIntro = useSelectionStore((state) => state.selectedIntro);
  const setSelectedIntro = useSelectionStore((state) => state.setSelectedIntro);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importPreviewData, setImportPreviewData] = useState<IntroCsvRecord[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importYear, setImportYear] = useState<number>(new Date().getFullYear());

  // Filter and search intros
  const filteredIntros = useMemo(() => {
    return intros.filter((intro: Intro) => {
      const matchesSearch =
        !filters.searchTerm ||
        intro.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        intro.email?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        intro.phone?.includes(filters.searchTerm);

      const matchesMonth = filters.month === 'all' || intro.month === filters.month;
      const matchesStaff = filters.staff === 'all' || intro.staff === filters.staff;
      const matchesClass = filters.class === 'all' || intro.class === filters.class;
      const matchesStatus = filters.status === 'all' || intro.status === filters.status;
      const matchesYear = filters.year === 'all' || String(intro.year) === filters.year;

      return (
        matchesSearch &&
        matchesMonth &&
        matchesStaff &&
        matchesClass &&
        matchesStatus &&
        matchesYear
      );
    });
  }, [intros, filters]);

  const availableYears = useMemo(() => {
    const current = new Date().getFullYear();
    const years = new Set<number>([current, current - 1, current - 2]);
    for (const intro of intros) {
      if (intro.year) {
        years.add(intro.year);
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [intros]);

  // Calculate metrics
  const metrics = {
    total: filteredIntros.length,
    attended: filteredIntros.filter((i) => i.attended === 'Yes').length,
    signedUp: filteredIntros.filter((i) => i.signed_up === 'Yes').length,
    active: filteredIntros.filter((i) => i.status === 'Active').length,
    completed: filteredIntros.filter((i) => i.status === 'Completed').length,
    cancelled: filteredIntros.filter((i) => i.status === 'Cancelled').length,
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setImportFile(file);
    parseIntrosCSV(
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
      parseIntrosCSV(importFile, setImportPreviewData, year);
    }
  };

  const confirmCSVImport = async () => {
    if (!importPreviewData || importPreviewData.length === 0) {
      alert('No data to import');
      return;
    }

    try {
      const newRecords = importPreviewData.filter((row) => {
        if (!row.name || !row.month) {
          return false;
        }
        const isDuplicate = intros.some(
          (i) =>
            i.name.toLowerCase().trim() === row.name.toLowerCase().trim() && i.month === row.month
        );
        return !isDuplicate;
      });

      const duplicateCount = importPreviewData.length - newRecords.length;

      if (newRecords.length === 0) {
        alert(`All ${duplicateCount} records are duplicates. Nothing to import.`);
        closeModal('importPreview');
        setImportPreviewData([]);
        return;
      }

      const { error } = await supabase.from('intros').insert(newRecords);

      if (error) {
        console.error('Error bulk importing:', error);
        alert(`Error importing: ${error.message}`);
      } else {
        await refresh();
        closeModal('importPreview');
        setImportPreviewData([]);
        alert(
          `✅ Successfully imported ${newRecords.length} records!\n${duplicateCount > 0 ? `Skipped ${duplicateCount} duplicates.` : ''}`
        );
      }
    } catch (error) {
      console.error('Fatal error importing CSV:', error);
      alert(`Error importing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEditClick = (intro: Intro) => {
    setSelectedIntro(intro);
    openModal('editIntro');
  };

  const handleFollowUpClick = (intro: Intro) => {
    setSelectedIntro(intro);
    openModal('followUp');
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      alert('Please select intros to delete');
      return;
    }
    if (selectedIds.size > 1000) {
      alert('Maximum 1000 items at once. Please select fewer items.');
      return;
    }
    if (!confirm(`Delete ${selectedIds.size} selected intros?`)) {
      return;
    }

    try {
      const idsToDelete = Array.from(selectedIds);
      const batchSize = 50;

      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const { error } = await supabase.from('intros').delete().in('id', batch);
        if (error) {
          throw error;
        }
      }

      await refresh();
      clearSelection(selectionTab);
      alert(`Deleted ${idsToDelete.length} intros`);
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting intros');
    }
  };

  // Table columns
  const columns = [
    {
      key: 'name' as keyof Intro,
      label: 'Name',
      render: (value: unknown, _intro: Intro) => (
        <div className="font-medium text-gray-900">{value as string}</div>
      ),
    },
    {
      key: 'email' as keyof Intro,
      label: 'Email',
      render: (value: unknown, _intro: Intro) =>
        (value as string) ? (
          <a href={`mailto:${value as string}`} className="text-blue-600 hover:text-blue-800">
            {value as string}
          </a>
        ) : (
          '-'
        ),
    },
    {
      key: 'phone' as keyof Intro,
      label: 'Phone',
      render: (value: unknown, _intro: Intro) => (value as string) || '-',
    },
    {
      key: 'staff' as keyof Intro,
      label: 'Staff',
      render: (value: unknown, _intro: Intro) => (value as string) || '-',
    },
    {
      key: 'class' as keyof Intro,
      label: 'Class',
      render: (value: unknown, _intro: Intro) => (value as string) || '-',
    },
    {
      key: 'attended' as keyof Intro,
      label: 'Attended',
      render: (value: unknown, _intro: Intro) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            (value as string) === 'Yes'
              ? 'bg-green-100 text-green-800'
              : (value as string) === 'No'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
          }`}
        >
          {(value as string) || '-'}
        </span>
      ),
    },
    {
      key: 'signed_up' as keyof Intro,
      label: 'Signed Up',
      render: (value: unknown, _intro: Intro) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            (value as string) === 'Yes'
              ? 'bg-green-100 text-green-800'
              : (value as string) === 'No'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
          }`}
        >
          {(value as string) || '-'}
        </span>
      ),
    },
    {
      key: 'status' as keyof Intro,
      label: 'Status',
      render: (value: unknown, _intro: Intro) => (
        <span
          className={`px-2 py-1 text-xs rounded-full ${
            (value as string) === 'Active'
              ? 'bg-blue-100 text-blue-800'
              : (value as string) === 'Completed'
                ? 'bg-green-100 text-green-800'
                : (value as string) === 'Cancelled'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-gray-100 text-gray-800'
          }`}
        >
          {(value as string) || 'Active'}
        </span>
      ),
    },
    {
      key: 'actions' as keyof Intro,
      label: 'Actions',
      render: (_value: unknown, intro: Intro) => (
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={() => handleEditClick(intro)}
            className="btn-icon hover:text-blue-600"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleFollowUpClick(intro)}
            className="btn-icon hover:text-green-600"
            title="Add Follow-up"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => removeIntro(intro.id, intro.name)}
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
      {/* Header Section */}
      <div className="section-container">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Intro Classes</h2>
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
            <button type="button" onClick={() => openModal('addIntro')} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              <span>Add Intro</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="section-container border-l-4 border-blue-600">
          <div className="text-sm text-gray-600">Total Intros</div>
          <div className="text-3xl font-bold mt-1">{metrics.total}</div>
        </div>
        <div className="section-container border-l-4 border-green-600">
          <div className="text-sm text-gray-600">Attended</div>
          <div className="text-3xl font-bold mt-1">{metrics.attended}</div>
        </div>
        <div className="section-container border-l-4 border-purple-600">
          <div className="text-sm text-gray-600">Signed Up</div>
          <div className="text-3xl font-bold mt-1">{metrics.signedUp}</div>
        </div>
        <div className="section-container border-l-4 border-cyan-600">
          <div className="text-sm text-gray-600">Active</div>
          <div className="text-3xl font-bold mt-1">{metrics.active}</div>
        </div>
        <div className="section-container border-l-4 border-emerald-600">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-3xl font-bold mt-1">{metrics.completed}</div>
        </div>
        <div className="section-container border-l-4 border-red-600">
          <div className="text-sm text-gray-600">Cancelled</div>
          <div className="text-3xl font-bold mt-1">{metrics.cancelled}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="section-container">
        <YearFilter
          availableYears={availableYears}
          selectedYear={filters.year}
          onYearChange={(year) => setFilters({ year })}
        />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={filters.searchTerm}
            onChange={(e) => setFilters({ searchTerm: e.target.value })}
            className="form-input"
          />
          <select
            value={filters.month}
            onChange={(e) => setFilters({ month: e.target.value })}
            className="form-select"
          >
            <option value="all">All Months</option>
            {[
              'Jan',
              'Feb',
              'Mar',
              'Apr',
              'May',
              'Jun',
              'Jul',
              'Aug',
              'Sep',
              'Oct',
              'Nov',
              'Dec',
            ].map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={filters.staff}
            onChange={(e) => setFilters({ staff: e.target.value })}
            className="form-select"
          >
            <option value="all">All Staff</option>
            {['Staff 1', 'Staff 4', 'Staff 2', 'Staff 3', 'Vinicius', 'Jun', 'Staff 7', 'Staff 8'].map(
              (staff) => (
                <option key={staff} value={staff}>
                  {staff}
                </option>
              )
            )}
          </select>
          <select
            value={filters.class}
            onChange={(e) => setFilters({ class: e.target.value })}
            className="form-select"
          >
            <option value="all">All Classes</option>
            {['GB1', 'GB2', 'GB3', 'Muay Thai', 'Kids 3-6', 'Kids 7-9', 'No-Gi'].map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value })}
            className="form-select"
          >
            <option value="all">All Status</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="section-container">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
          <h3 className="text-lg font-semibold">All Intros ({filteredIntros.length})</h3>
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
        {selectedIds.size > 0 && (
          <div className="mb-4 pb-4 border-b">
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
        <Table
          data={filteredIntros}
          columns={columns}
          loading={loading}
          selectedIds={selectedIds}
          onSelectId={(id) => toggleSelection(selectionTab, id)}
          onSelectAll={(ids) => selectAll(selectionTab, ids)}
          onClearSelection={(ids) => clearSelection(selectionTab, ids)}
          emptyMessage="No intros found matching your criteria"
        />
      </div>

      {/* Modals */}
      <Modal
        isOpen={modals.addIntro}
        onClose={() => closeModal('addIntro')}
        title="Add New Intro"
        size="lg"
      >
        <IntroForm onSubmit={addIntro} loading={loading} onCancel={() => closeModal('addIntro')} />
      </Modal>

      <Modal
        isOpen={modals.editIntro}
        onClose={() => closeModal('editIntro')}
        title="Edit Intro"
        size="lg"
      >
        <IntroForm
          intro={selectedIntro}
          onSubmit={(data) => {
            if (!selectedIntro) {
              return;
            }
            editIntro(selectedIntro.id, data);
          }}
          loading={loading}
          onCancel={() => {
            closeModal('editIntro');
            setSelectedIntro(null);
          }}
        />
      </Modal>

      <FollowUpModal
        isOpen={modals.followUp}
        onClose={() => {
          closeModal('followUp');
          setSelectedIntro(null);
        }}
        intro={selectedIntro}
      />

      <SettingsModal isOpen={modals.settings} onClose={() => closeModal('settings')} />

      {/* Import Preview Modal */}
      <Modal
        isOpen={modals.importPreview}
        onClose={() => {
          closeModal('importPreview');
          setImportPreviewData([]);
          setImportFile(null);
        }}
        title="Import Preview"
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              Preview of data to be imported. Duplicates will be automatically skipped.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <label
                htmlFor="intro-import-year"
                className="text-sm font-medium text-gray-700 whitespace-nowrap"
              >
                Year
              </label>
              <input
                id="intro-import-year"
                type="number"
                min={2000}
                max={2100}
                value={importYear}
                onChange={(e) => handleImportYearChange(Number(e.target.value))}
                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto border rounded">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Month</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Class</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Staff</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {importPreviewData.slice(0, 50).map((row) => (
                  <tr key={`${row.name}-${row.month}-${row.class ?? ''}`}>
                    <td className="px-4 py-2 text-sm">{row.name}</td>
                    <td className="px-4 py-2 text-sm">{row.month}</td>
                    <td className="px-4 py-2 text-sm">{row.class ?? '-'}</td>
                    <td className="px-4 py-2 text-sm">{row.staff ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {importPreviewData.length > 50 && (
            <p className="text-sm text-gray-500">
              Showing first 50 of {importPreviewData.length} records
            </p>
          )}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                closeModal('importPreview');
                setImportPreviewData([]);
                setImportFile(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmCSVImport}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Import {importPreviewData.length} Records
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
