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
import { reportConsoleError } from '@/lib/logger';
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
import type { IntroTableContext } from './intros/IntroTableContext';
import { introIdentityColumns } from './intros/introIdentityColumns';
import { introStatusColumns } from './intros/introStatusColumns';

const selectionTab: SelectionTabKey = 'intros';

function useIntroFilterState() {
  const filters = useFilterStore((s) => s.filtersByTab.intros);
  const setFiltersForTab = useFilterStore((s) => s.setFilters);
  const clearFiltersForTab = useFilterStore((s) => s.clearFilters);
  const setFilters = (partial: Partial<typeof filters>) => setFiltersForTab('intros', partial);
  return { filters, setFilters, clearFiltersForTab };
}

function useIntroSelection() {
  const selectedIds = useSelectionStore((state) => state.selectedIdsByTab[selectionTab]);
  const toggleSelection = useSelectionStore((state) => state.toggleSelection);
  const selectAll = useSelectionStore((state) => state.selectAll);
  const clearSelection = useSelectionStore((state) => state.clearSelection);
  return { selectedIds, toggleSelection, selectAll, clearSelection };
}

function useIntroDialogState() {
  const [resolvingIntro, setResolvingIntro] = useState<Intro | null>(null);
  const [pendingSignupIntro, setPendingSignupIntro] = useState<Intro | null>(null);
  const [selectedIntroForNotes, setSelectedIntroForNotes] = useState<Intro | null>(null);
  const [dismissedForUndo, setDismissedForUndo] = useState<FollowUpIntro | null>(null);
  return {
    resolvingIntro,
    setResolvingIntro,
    pendingSignupIntro,
    setPendingSignupIntro,
    selectedIntroForNotes,
    setSelectedIntroForNotes,
    dismissedForUndo,
    setDismissedForUndo,
  };
}

async function deleteIntrosInBatches(idsToDelete: string[]) {
  const batchSize = 50;
  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);
    const { error } = await deleteIntroIds(batch);
    if (error) {
      throw error;
    }
  }
}

function IntroMetrics({ metrics }: { metrics: ReturnType<typeof useIntroListView>['metrics'] }) {
  return (
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
  );
}

function IntrosHeader({
  year,
  csvImport,
  openModal,
}: {
  year: string | number;
  csvImport: ReturnType<typeof useIntroCsvImport>;
  openModal: ReturnType<typeof useUIStore.getState>['openModal'];
}) {
  return (
    <div className="section-container">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {year === 'all' ? 'All Intros' : `${year} Intros`}
        </h2>
        <div className="flex space-x-3">
          <button type="button" onClick={() => openModal('settings')} className="btn btn-secondary">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            ref={csvImport.fileInputRef}
            onChange={(e) => {
              void csvImport.handleCSVImport(e);
            }}
          />
          <button
            type="button"
            onClick={() => csvImport.fileInputRef.current?.click()}
            className="btn btn-secondary-blue"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
          {csvImport.undoBatch && (
            <button
              type="button"
              onClick={() => {
                void csvImport.handleUndoImport();
              }}
              className="btn btn-secondary"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Undo Import ({csvImport.undoBatch.count})</span>
            </button>
          )}
          <button type="button" onClick={() => openModal('addIntro')} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            <span>Add Intro</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function IntrosTableSection({
  view,
  tableContext,
  loading,
  selection,
  onDeleteSelected,
}: {
  view: ReturnType<typeof useIntroListView>;
  tableContext: IntroTableContext;
  loading: boolean;
  selection: ReturnType<typeof useIntroSelection>;
  onDeleteSelected: () => void;
}) {
  const columns = [...introIdentityColumns(tableContext), ...introStatusColumns(tableContext)];
  return (
    <div className="section-container">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
        <h3 className="text-lg font-semibold">All Intros ({view.filteredIntros.length})</h3>
        {selection.selectedIds.size > 0 && (
          <button
            type="button"
            onClick={onDeleteSelected}
            className="flex items-center space-x-2 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Selected ({selection.selectedIds.size})</span>
          </button>
        )}
      </div>
      <Table
        data={view.paginatedIntros}
        columns={columns}
        loading={loading}
        selectedIds={selection.selectedIds}
        onSelectId={(id) => selection.toggleSelection(selectionTab, id)}
        onSelectAll={(ids) => selection.selectAll(selectionTab, ids)}
        onClearSelection={(ids) => selection.clearSelection(selectionTab, ids)}
        emptyMessage="No intros found matching your criteria"
        getRowClassName={(intro) =>
          intro.followup_1_at && !intro.followup_2_at
            ? 'bg-blue-50 hover:bg-blue-100'
            : 'hover:bg-gray-50'
        }
      />
    </div>
  );
}

export default function IntrosTab() {
  const data = useIntros();
  const { intros, loading, error, removeIntro, refresh, silentRefresh } = data;
  const { modals, openModal, closeModal } = useUIStore();
  const { filters, setFilters, clearFiltersForTab } = useIntroFilterState();
  const formerMemberMap = useFormerMembers();
  const selection = useIntroSelection();
  const selectedIntro = useSelectionStore((state) => state.selectedIntro);
  const setSelectedIntro = useSelectionStore((state) => state.setSelectedIntro);
  const classTypes = useSettingsStore((s) => s.classTypes);
  const staffMembers = useSettingsStore((s) => s.staffMembers);
  const dialogState = useIntroDialogState();

  const csvImport = useIntroCsvImport({ intros, refresh, openModal, closeModal });
  const view = useIntroListView(intros, filters, staffMembers);

  const handleUndoDismiss = async () => {
    if (!dialogState.dismissedForUndo) {
      return;
    }
    const { id, name, email } = dialogState.dismissedForUndo;
    dialogState.setDismissedForUndo(null);
    await undoDismissFollowUp(id, name, email);
    await silentRefresh();
  };

  const openIntroModal = (intro: Intro, modal: 'editIntro' | 'followUp') => {
    setSelectedIntro(intro);
    openModal(modal);
  };

  const handleDeleteSelected = async () => {
    if (selection.selectedIds.size === 0) {
      alert('Please select intros to delete');
      return;
    }
    if (selection.selectedIds.size > 1000) {
      alert('Maximum 1000 items at once. Please select fewer items.');
      return;
    }
    if (!confirm(`Delete ${selection.selectedIds.size} selected intros?`)) {
      return;
    }
    try {
      const idsToDelete = Array.from(selection.selectedIds);
      await deleteIntrosInBatches(idsToDelete);
      await refresh();
      selection.clearSelection(selectionTab);
      alert(`Deleted ${idsToDelete.length} intros`);
    } catch (error) {
      reportConsoleError('Error:', error);
      alert('Error deleting intros');
    }
  };

  const tableContext = {
    formerMemberMap,
    classTypes,
    setResolvingIntro: dialogState.setResolvingIntro,
    setPendingSignupIntro: dialogState.setPendingSignupIntro,
    silentRefresh,
    setDismissedForUndo: dialogState.setDismissedForUndo,
    handleFollowUpClick: (intro: Intro) => openIntroModal(intro, 'followUp'),
    handleEditClick: (intro: Intro) => openIntroModal(intro, 'editIntro'),
    removeIntro,
    onManageNotes: (intro: Intro) => {
      dialogState.setSelectedIntroForNotes(intro);
      openModal('notesManager');
    },
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error: {error.message}</div>
        <button
          type="button"
          onClick={() => {
            void refresh();
          }}
          className="btn btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <IntrosHeader year={filters.year} csvImport={csvImport} openModal={openModal} />

      {/* Overview Metrics */}
      <IntroMetrics metrics={view.metrics} />

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
        currentPage={view.currentPage}
        totalPages={view.totalPages}
        itemsPerPage={view.itemsPerPage}
        totalItems={view.sortedIntros.length}
        startIndex={view.startIndex}
        endIndex={view.endIndex}
        onPageChange={view.setCurrentPage}
        onItemsPerPageChange={view.setItemsPerPage}
        selectedCount={selection.selectedIds.size}
        onClearSelection={() => selection.clearSelection(selectionTab)}
      />

      {/* Table */}
      <IntrosTableSection
        view={view}
        tableContext={tableContext}
        loading={loading}
        selection={selection}
        onDeleteSelected={() => {
          void handleDeleteSelected();
        }}
      />

      <IntroDialogs
        data={data}
        modals={modals}
        closeModal={closeModal}
        classTypes={classTypes}
        staffMembers={staffMembers}
        selectedIntro={selectedIntro}
        setSelectedIntro={setSelectedIntro}
        {...dialogState}
        handleUndoDismiss={handleUndoDismiss}
      />
      <IntroImportPreview csvImport={csvImport} modals={modals} closeModal={closeModal} />
    </div>
  );
}
