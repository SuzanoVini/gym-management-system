'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useCancellations } from '@/hooks/useCancellations';
import { useIntros } from '@/hooks/useIntros';
import { useMembers } from '@/hooks/useMembers';
import { exportToCSV } from '@/lib/supabase/utils';
import { useFilterStore } from '@/store/useFilterStore';
import { useSelectionStore } from '@/store/useSelectionStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import type { Cancellation } from '@/types';
import CancellationSummaryFilters from './CancellationsTab/CancellationSummaryFilters';
import CancellationsTable from './CancellationsTab/CancellationsTable';
import CancellationsToolbar from './CancellationsTab/CancellationsToolbar';
import { useCancellationImports } from './CancellationsTab/useCancellationImports';
import { useCancellationSelection } from './CancellationsTab/useCancellationSelection';
import { useCancellationsListData } from './CancellationsTab/useCancellationsListData';
import { useCancellationsPagination } from './CancellationsTab/useCancellationsPagination';
import { CancellationModals } from './modals/CancellationModals';
import SettingsModal from './modals/SettingsModal';

function CancellationsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="text-red-600 mb-4">Error: {message}</div>
      <button type="button" onClick={onRetry} className="btn btn-primary">
        Retry
      </button>
    </div>
  );
}

function exportCancellations(cancellations: Cancellation[]) {
  const exportData = cancellations.map((cancellation) => ({
    Name: cancellation.name,
    Month: cancellation.month,
    Date: cancellation.date,
    Reason: cancellation.reason,
    'Age Category': cancellation.age_group,
    Notes: cancellation.notes,
  }));
  exportToCSV(exportData, 'cancellations');
  alert('✅ Cancellations exported successfully!');
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
  const { modals, openModal, closeModal } = useUIStore();
  const filterState = useFilterStore();
  const filters = filterState.filtersByTab.cancellations;
  const { setFilters: setFiltersForTab, clearFilters: clearFiltersForTab } = filterState;
  const setFilters = (partial: Partial<typeof filters>) =>
    setFiltersForTab('cancellations', partial);
  const selectedIds = useSelectionStore((state) => state.selectedIdsByTab.cancellations);
  const { toggleSelection, selectAll, clearSelection, setSelectedCancellation } =
    useSelectionStore.getState();
  const { sortOrder, setSortOrder, currentPage, setCurrentPage, itemsPerPage, setItemsPerPage } =
    useCancellationsPagination(filters);
  const cancellationReasons = useSettingsStore((s) => s.cancellationReasons);
  const [viewingNote, setViewingNote] = useState<string | null>(null);
  const imports = useCancellationImports({
    cancellations,
    refresh,
    openImportPreview: () => openModal('importPreview'),
    closeImportPreview: () => closeModal('importPreview'),
  });
  const { handleDeleteSelected } = useCancellationSelection({
    selectedIds,
    refresh,
    clearSelection: () => clearSelection('cancellations'),
    setCurrentPage,
  });

  const {
    filteredAndSearchedCancellations,
    availableYears,
    sortedCancellations,
    totalPages,
    startIndex,
    endIndex,
    paginatedCancellations,
    topReasons,
  } = useCancellationsListData({ cancellations, filters, sortOrder, currentPage, itemsPerPage });

  if (error) {
    return (
      <CancellationsError
        message={error.message}
        onRetry={() => {
          void refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <CancellationsToolbar
        year={filters.year}
        fileInputRef={imports.fileInputRef}
        undoCount={imports.undoBatch?.count ?? null}
        onOpenSettings={() => openModal('settings')}
        onImport={imports.handleCSVImport}
        onUndoImport={() => {
          void imports.handleUndoImport();
        }}
        onExport={() => exportCancellations(filteredAndSearchedCancellations)}
        onAdd={() => openModal('addCancellation')}
      />
      <CancellationSummaryFilters
        count={filteredAndSearchedCancellations.length}
        topReasons={topReasons}
        availableYears={availableYears}
        filters={filters}
        cancellationReasons={cancellationReasons}
        sortOrder={sortOrder}
        setFilters={setFilters}
        setSortOrder={setSortOrder}
        onClear={() => clearFiltersForTab('cancellations')}
      />

      <CancellationsTable
        cancellations={cancellations}
        members={members}
        intros={intros}
        loading={loading}
        selectedIds={selectedIds}
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={sortedCancellations.length}
        startIndex={startIndex}
        endIndex={endIndex}
        paginated={paginatedCancellations}
        setCurrentPage={setCurrentPage}
        setItemsPerPage={setItemsPerPage}
        clearSelection={clearSelection}
        toggleSelection={toggleSelection}
        selectAll={selectAll}
        clearSelectionIds={clearSelection}
        onDeleteSelected={() => {
          void handleDeleteSelected();
        }}
        onViewNote={setViewingNote}
        onEdit={(cancellation) => {
          setSelectedCancellation(cancellation);
          openModal('editCancellation');
        }}
        onDelete={removeCancellation}
      />

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
        importPreviewData={imports.importPreviewData}
        confirmCSVImport={imports.confirmCSVImport}
        importYear={imports.importYear}
        onImportYearChange={imports.handleImportYearChange}
        onImportClose={() => {
          imports.setImportFile(null);
          imports.setImportPreviewData([]);
        }}
      />
      <SettingsModal
        isOpen={modals.settings}
        onClose={() => closeModal('settings')}
        scope="cancellations"
      />
    </div>
  );
}
