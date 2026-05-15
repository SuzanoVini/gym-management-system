'use client';

import {
  AlertTriangle,
  Edit2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RotateCcw,
  Settings,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ClassResolutionPopover from '@/components/tabs/ClassResolutionPopover';
import QuickSignupModal from '@/components/tabs/QuickSignupModal';
import CopyButton from '@/components/ui/CopyButton';
import FollowUpCheckButton from '@/components/ui/FollowUpCheckButton';
import Modal from '@/components/ui/Modal';
import OverflowMenu from '@/components/ui/OverflowMenu';
import PaginationBar from '@/components/ui/PaginationBar';
import Table from '@/components/ui/Table';
import Tooltip from '@/components/ui/Tooltip';
import YearFilter from '@/components/ui/YearFilter';
import { useFormerMembers } from '@/hooks/useFormerMembers';
import { useImportUndo } from '@/hooks/useImportUndo';
import { useIntros } from '@/hooks/useIntros';
import { type IntroCsvRecord, parseIntrosCSV } from '@/lib/csv';
import { supabase } from '@/lib/supabase/client';
import { fetchSettings } from '@/lib/supabase/settings';
import { formatDate } from '@/lib/supabase/utils';
import { useFilterStore } from '@/store/useFilterStore';
import { type SelectionTabKey, useSelectionStore } from '@/store/useSelectionStore';
import { useUIStore } from '@/store/useUIStore';
import type { Intro } from '@/types';
import IntroForm from './forms/IntroForm';
import FollowUpModal from './modals/FollowUpModal';
import SettingsModal from './modals/SettingsModal';

function formatFormerMemberDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

export default function IntrosTab() {
  const { intros, loading, error, addIntro, editIntro, removeIntro, refresh, silentRefresh } =
    useIntros();
  const { modals, openModal, closeModal } = useUIStore();
  const { filters, setFilters } = useFilterStore();
  const formerMemberMap = useFormerMembers();
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
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const { saveImportBatch, getImportBatch, clearImportBatch } = useImportUndo();
  const [undoBatch, setUndoBatch] = useState(() => getImportBatch('intros'));
  const [classTypes, setClassTypes] = useState<string[]>([]);
  const [staffMembers, setStaffMembers] = useState<string[]>([]);
  const [resolvingIntro, setResolvingIntro] = useState<Intro | null>(null);
  const [pendingSignupIntro, setPendingSignupIntro] = useState<Intro | null>(null);

  const refreshSettings = useCallback(async () => {
    const [classes, staff] = await Promise.all([
      fetchSettings('class_types'),
      fetchSettings('staff_members'),
    ]);
    setClassTypes(classes);
    setStaffMembers(staff);
  }, []);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

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
      const matchesYear = filters.year === 'all' || String(intro.year) === filters.year;

      return matchesSearch && matchesMonth && matchesStaff && matchesClass && matchesYear;
    });
  }, [intros, filters]);

  const sortedIntros = useMemo(() => {
    const parseDateStr = (s: string): number => {
      const parts = s.split('-');
      return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
    };
    const getSortTimestamp = (intro: Intro): number => {
      const dateValue = intro.date ? parseDateStr(intro.date) : 0;
      if (dateValue) {
        return dateValue;
      }
      return intro.created_at ? new Date(intro.created_at).getTime() : 0;
    };
    return [...filteredIntros].sort((a, b) => {
      const dateA = getSortTimestamp(a);
      const dateB = getSortTimestamp(b);
      if (dateA === dateB) {
        return 0;
      }
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [filteredIntros, sortOrder]);

  const totalPages = Math.ceil(sortedIntros.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedIntros = sortedIntros.slice(startIndex, endIndex);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
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

      // Coerce date: string|undefined → string|null to satisfy DB Insert type
      const recordsToInsert = newRecords.map((r) => ({ ...r, date: r.date ?? null }));
      const { data, error } = await supabase.from('intros').insert(recordsToInsert).select('id');

      if (error) {
        console.error('Error bulk importing:', error);
        alert(`Error importing: ${error.message}`);
      } else {
        const importedIds = (data ?? []).map((r) => r.id);
        saveImportBatch('intros', importedIds);
        setUndoBatch({ ids: importedIds, count: importedIds.length, savedAt: Date.now() });
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
      const { error } = await supabase.from('intros').delete().in('id', undoBatch.ids);
      if (error) {
        throw error;
      }
      clearImportBatch('intros');
      setUndoBatch(null);
      await refresh();
    } catch {
      // Preserve localStorage so user can retry
      alert('Failed to undo import. Please try again.');
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
      render: (value: unknown, intro: Intro) => {
        const full = (value as string) || '';
        const parts = full.trim().split(' ');
        const display =
          parts.length > 1 && full.length > 14 ? `${parts[0]} ${parts.at(-1)?.[0] ?? ''}.` : full;
        const cancellationDate = formerMemberMap.get(intro.name.toLowerCase().trim());
        const isFormer = !!cancellationDate && intro.signed_up !== 'Yes';
        const nameNode =
          display !== full ? (
            <Tooltip content={full}>
              <div className="font-medium text-gray-900 cursor-default">{display}</div>
            </Tooltip>
          ) : (
            <div className="font-medium text-gray-900">{full}</div>
          );
        return (
          <div className="flex items-center gap-1.5">
            {nameNode}
            {isFormer && (
              <Tooltip
                content={`Former member cancelled on ${formatFormerMemberDate(cancellationDate)}`}
              >
                <span className="text-amber-500 cursor-help text-sm leading-none">⚠</span>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      key: 'email' as keyof Intro,
      label: 'Email',
      render: (value: unknown, _intro: Intro) => (
        <CopyButton value={value as string} icon={Mail} ariaLabel="Copy email" />
      ),
    },
    {
      key: 'phone' as keyof Intro,
      label: 'Phone',
      render: (value: unknown, _intro: Intro) => (
        <CopyButton value={value as string} icon={Phone} ariaLabel="Copy phone" />
      ),
    },
    {
      key: 'staff' as keyof Intro,
      label: 'Staff',
      render: (value: unknown, _intro: Intro) => {
        const full = (value as string) || '';
        if (!full) {
          return <span className="text-gray-400">—</span>;
        }
        const first = full.split(' ')[0];
        return first !== full ? (
          <Tooltip content={full}>
            <span className="text-sm text-gray-700 cursor-default">{first}</span>
          </Tooltip>
        ) : (
          <span className="text-sm text-gray-700">{full}</span>
        );
      },
    },
    {
      key: 'class' as keyof Intro,
      label: 'Class',
      render: (value: unknown, intro: Intro) => {
        const cls = (value as string) || '';
        const isUnresolved = cls !== '' && !classTypes.includes(cls);
        return (
          <div className="flex items-center gap-1">
            <span className="text-sm">{cls || '-'}</span>
            {isUnresolved && (
              <Tooltip content="Unknown class — click to resolve">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setResolvingIntro(intro);
                  }}
                  className="text-amber-500 hover:text-amber-600 focus:outline-none"
                  aria-label="Resolve unknown class"
                >
                  <AlertTriangle size={14} />
                </button>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      key: 'date' as keyof Intro,
      label: 'Date',
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: 'time' as keyof Intro,
      label: 'Time',
      render: (value: unknown) => (
        <span className="text-sm text-gray-700">{value ? String(value) : '—'}</span>
      ),
    },
    {
      key: 'attended' as keyof Intro,
      label: 'Attended',
      render: (value: unknown, intro: Intro) => (
        <select
          value={(value as string) || ''}
          onChange={async (e) => {
            const val = e.target.value;
            await supabase
              .from('intros')
              .update({ attended: val === '' ? null : val })
              .eq('id', intro.id);
            await silentRefresh();
          }}
          onClick={(e) => e.stopPropagation()}
          className={`text-xs rounded-full px-2 py-0.5 border cursor-pointer font-medium focus:outline-none focus:ring-1 focus:ring-blue-400 ${
            (value as string) === 'Yes'
              ? 'bg-green-100 text-green-800 border-green-200'
              : (value as string) === 'No'
                ? 'bg-red-100 text-red-800 border-red-200'
                : 'bg-gray-100 text-gray-800 border-gray-200'
          }`}
        >
          <option value="">—</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      ),
    },
    {
      key: 'signed_up' as keyof Intro,
      label: 'Signed Up',
      render: (value: unknown, intro: Intro) => (
        <select
          value={(value as string) || ''}
          onChange={async (e) => {
            const val = e.target.value;
            if (val === 'Yes') {
              setPendingSignupIntro(intro);
              return;
            }
            await supabase
              .from('intros')
              .update({ signed_up: val === '' ? null : val })
              .eq('id', intro.id);
            await silentRefresh();
          }}
          onClick={(e) => e.stopPropagation()}
          className={`text-xs rounded-full px-2 py-0.5 border cursor-pointer font-medium focus:outline-none focus:ring-1 focus:ring-blue-400 ${
            (value as string) === 'Yes'
              ? 'bg-green-100 text-green-800 border-green-200'
              : (value as string) === 'No'
                ? 'bg-red-100 text-red-800 border-red-200'
                : 'bg-gray-100 text-gray-800 border-gray-200'
          }`}
        >
          <option value="">—</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      ),
    },
    {
      key: 'year' as keyof Intro,
      label: 'Year',
      render: (value: unknown, _intro: Intro) => (
        <span className="text-sm text-gray-500">{value ? String(value) : '—'}</span>
      ),
    },
    {
      key: 'actions' as keyof Intro,
      label: '',
      render: (_value: unknown, intro: Intro) => (
        <div className="flex items-center gap-3">
          <FollowUpCheckButton intro={intro} onUpdate={silentRefresh} />
          <OverflowMenu
            items={[
              {
                label: 'Add Note',
                icon: MessageSquare,
                onClick: () => handleFollowUpClick(intro),
              },
              {
                label: 'Edit',
                icon: Edit2,
                onClick: () => handleEditClick(intro),
              },
              {
                label: 'Delete',
                icon: Trash2,
                variant: 'danger',
                onClick: () => removeIntro(intro.id, intro.name),
              },
            ]}
          />
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
          <h2 className="text-2xl font-bold text-gray-900">
            {filters.year === 'all' ? 'All Intros' : `${filters.year} Intros`}
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
            <button type="button" onClick={() => openModal('addIntro')} className="btn btn-primary">
              <Plus className="w-4 h-4" />
              <span>Add Intro</span>
            </button>
          </div>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            {staffMembers.map((staff) => (
              <option key={staff} value={staff}>
                {staff}
              </option>
            ))}
          </select>
          <select
            value={filters.class}
            onChange={(e) => setFilters({ class: e.target.value })}
            className="form-select"
          >
            <option value="all">All Classes</option>
            {classTypes.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className="form-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      <PaginationBar
        id="intros-items-per-page"
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={sortedIntros.length}
        startIndex={startIndex}
        endIndex={endIndex}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
        selectedCount={selectedIds.size}
        onClearSelection={() => clearSelection(selectionTab)}
      />

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
        <Table
          data={paginatedIntros}
          columns={columns}
          loading={loading}
          selectedIds={selectedIds}
          onSelectId={(id) => toggleSelection(selectionTab, id)}
          onSelectAll={(ids) => selectAll(selectionTab, ids)}
          onClearSelection={(ids) => clearSelection(selectionTab, ids)}
          emptyMessage="No intros found matching your criteria"
          getRowClassName={(intro) =>
            intro.followup_1_at && !intro.followup_2_at
              ? 'bg-blue-50 hover:bg-blue-100'
              : 'hover:bg-gray-50'
          }
        />
      </div>

      {/* Modals */}
      <Modal
        isOpen={modals.addIntro}
        onClose={() => closeModal('addIntro')}
        title="Add New Intro"
        size="lg"
      >
        <IntroForm
          onSubmit={async (data) => {
            await addIntro(data);
            closeModal('addIntro');
          }}
          loading={loading}
          onCancel={() => closeModal('addIntro')}
          classTypes={classTypes}
          staffMembers={staffMembers}
        />
      </Modal>

      <Modal
        isOpen={modals.editIntro}
        onClose={() => closeModal('editIntro')}
        title="Edit Intro"
        size="lg"
      >
        <IntroForm
          intro={selectedIntro}
          onSubmit={async (data) => {
            if (!selectedIntro) {
              return;
            }
            await editIntro(selectedIntro.id, data);
            closeModal('editIntro');
            setSelectedIntro(null);
          }}
          loading={loading}
          onCancel={() => {
            closeModal('editIntro');
            setSelectedIntro(null);
          }}
          classTypes={classTypes}
          staffMembers={staffMembers}
        />
      </Modal>

      <FollowUpModal
        isOpen={modals.followUp}
        onClose={() => {
          closeModal('followUp');
          setSelectedIntro(null);
          refresh();
        }}
        intro={selectedIntro}
      />

      <SettingsModal
        isOpen={modals.settings}
        onClose={() => closeModal('settings')}
        onSettingsChange={refreshSettings}
      />

      {resolvingIntro && (
        <ClassResolutionPopover
          intro={resolvingIntro}
          classTypes={classTypes}
          onClose={() => setResolvingIntro(null)}
          onResolved={async () => {
            setResolvingIntro(null);
            await refresh();
          }}
        />
      )}

      {pendingSignupIntro && (
        <QuickSignupModal
          intro={pendingSignupIntro}
          onClose={() => setPendingSignupIntro(null)}
          onSuccess={async () => {
            setPendingSignupIntro(null);
            await silentRefresh();
          }}
        />
      )}

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
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Attended
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Signed Up
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {importPreviewData.slice(0, 50).map((row) => (
                  <tr key={`${row.name}-${row.month}-${row.class ?? ''}`}>
                    <td className="px-4 py-2 text-sm">{row.name}</td>
                    <td className="px-4 py-2 text-sm">{row.month}</td>
                    <td className="px-4 py-2 text-sm">{row.class ?? '-'}</td>
                    <td className="px-4 py-2 text-sm">{row.staff ?? '-'}</td>
                    <td className="px-4 py-2 text-sm">{row.attended || '-'}</td>
                    <td className="px-4 py-2 text-sm">{row.signed_up || '-'}</td>
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
