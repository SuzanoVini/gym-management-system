'use client';

import { Plus, RotateCcw, Settings, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import type { FollowUpIntro } from '@/components/ui/FollowUpCheckButton';
import PaginationBar from '@/components/ui/PaginationBar';
import Table from '@/components/ui/Table';
import { useFormerMembers } from '@/hooks/useFormerMembers';
import { useIntroCsvImport } from '@/hooks/useIntroCsvImport';
import { useIntroListView } from '@/hooks/useIntroListView';
import { useIntros } from '@/hooks/useIntros';
import { undoDismissFollowUp } from '@/lib/supabase/intros';
import { deleteIntroIds } from '@/lib/supabase/introTableActions';
import { useFilterStore } from '@/store/useFilterStore';
import { type SelectionTabKey, useSelectionStore } from '@/store/useSelectionStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import type { Intro } from '@/types';
import IntroDialogs from './intros/IntroDialogs';
import IntroFilters from './intros/IntroFilters';
import IntroImportPreview from './intros/IntroImportPreview';
import { introIdentityColumns } from './intros/introIdentityColumns';
import { introStatusColumns } from './intros/introStatusColumns';

export default function IntrosTab() {
  const data = useIntros();
  const { intros, loading, error, removeIntro, refresh, silentRefresh } = data;
  const { modals, openModal, closeModal } = useUIStore();
  const filters = useFilterStore((s) => s.filtersByTab.intros);
  const setFiltersForTab = useFilterStore((s) => s.setFilters);
  const clearFiltersForTab = useFilterStore((s) => s.clearFilters);
  const setFilters = (partial: Partial<typeof filters>) => setFiltersForTab('intros', partial);
  const formerMemberMap = useFormerMembers();
  const selectionTab: SelectionTabKey = 'intros';
  const selectedIds = useSelectionStore((state) => state.selectedIdsByTab[selectionTab]);
  const toggleSelection = useSelectionStore((state) => state.toggleSelection);
  const selectAll = useSelectionStore((state) => state.selectAll);
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  const selectedIntro = useSelectionStore((state) => state.selectedIntro);
  const setSelectedIntro = useSelectionStore((state) => state.setSelectedIntro);
  const classTypes = useSettingsStore((s) => s.classTypes);
  const staffMembers = useSettingsStore((s) => s.staffMembers);
  const [resolvingIntro, setResolvingIntro] = useState<Intro | null>(null);
  const [pendingSignupIntro, setPendingSignupIntro] = useState<Intro | null>(null);
  const [selectedIntroForNotes, setSelectedIntroForNotes] = useState<Intro | null>(null);
  const [dismissedForUndo, setDismissedForUndo] = useState<FollowUpIntro | null>(null);

  const csvImport = useIntroCsvImport({ intros, refresh, openModal, closeModal });
  const { fileInputRef, handleCSVImport, handleUndoImport, undoBatch } = csvImport;
  const view = useIntroListView(intros, filters, staffMembers);
  const {
    filteredIntros,
    sortedIntros,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    startIndex,
    endIndex,
    paginatedIntros,
    metrics,
  } = view;

  const handleUndoDismiss = async () => {
    if (!dismissedForUndo) {
      return;
    }
    const { id, name, email } = dismissedForUndo;
    setDismissedForUndo(null);
    await undoDismissFollowUp(id, name, email);
    await silentRefresh();
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
        const { error } = await deleteIntroIds(batch);
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

  const tableContext = {
    formerMemberMap,
    classTypes,
    setResolvingIntro,
    setPendingSignupIntro,
    silentRefresh,
    setDismissedForUndo,
    handleFollowUpClick,
    handleEditClick,
    removeIntro,
    onManageNotes: (intro: Intro) => {
      setSelectedIntroForNotes(intro);
      openModal('notesManager');
    },
  };
  const columns = [...introIdentityColumns(tableContext), ...introStatusColumns(tableContext)];

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

      <IntroFilters
        filters={filters}
        setFilters={setFilters}
        clearFiltersForTab={clearFiltersForTab}
        view={view}
        staffMembers={staffMembers}
        classTypes={classTypes}
      />

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

      <IntroDialogs
        data={data}
        modals={modals}
        closeModal={closeModal}
        classTypes={classTypes}
        staffMembers={staffMembers}
        selectedIntro={selectedIntro}
        setSelectedIntro={setSelectedIntro}
        resolvingIntro={resolvingIntro}
        setResolvingIntro={setResolvingIntro}
        pendingSignupIntro={pendingSignupIntro}
        setPendingSignupIntro={setPendingSignupIntro}
        selectedIntroForNotes={selectedIntroForNotes}
        setSelectedIntroForNotes={setSelectedIntroForNotes}
        dismissedForUndo={dismissedForUndo}
        setDismissedForUndo={setDismissedForUndo}
        handleUndoDismiss={handleUndoDismiss}
      />
      <IntroImportPreview csvImport={csvImport} modals={modals} closeModal={closeModal} />
    </div>
  );
}
