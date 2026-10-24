'use client';

import { useCallback, useRef } from 'react';
import HoldsFilters from '@/components/tabs/HoldsTab/HoldsFilters';
import HoldsGrid from '@/components/tabs/HoldsTab/HoldsGrid';
import HoldsHeader from '@/components/tabs/HoldsTab/HoldsHeader';
import HoldsSummary from '@/components/tabs/HoldsTab/HoldsSummary';
import { useHolds } from '@/hooks/useHolds';
import { exportToCSV } from '@/lib/supabase/utils';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUIStore } from '@/store/useUIStore';
import { useHoldsActions } from './HoldsTab/useHoldsActions';
import { useHoldsFilters } from './HoldsTab/useHoldsFilters';
import { useHoldsImport } from './HoldsTab/useHoldsImport';
import { useHoldsList } from './HoldsTab/useHoldsList';
import { useHoldsSelection } from './HoldsTab/useHoldsSelection';
import { HoldModals } from './modals/HoldModals';
import SettingsModal from './modals/SettingsModal';

export default function HoldsTab() {
  const { holds, loading, error, addHold, editHold, removeHold, refresh } = useHolds();
  const { modals, openModal, closeModal } = useUIStore();
  const { filters, setFilters, clearFilters } = useHoldsFilters();
  const selection = useHoldsSelection();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const holdReasons = useSettingsStore((state) => state.holdReasons);
  const holdImport = useHoldsImport({
    holds,
    refresh,
    openImportPreview: () => openModal('importPreview'),
    closeImportPreview: () => closeModal('importPreview'),
  });
  const holdsList = useHoldsList(holds, filters);
  const holdActions = useHoldsActions({
    refresh,
    setCurrentPage: holdsList.setCurrentPage,
    selectedIds: selection.selectedIds,
    clearSelection: selection.clearSelection,
  });

  const exportHolds = useCallback(() => {
    const exportData = holdsList.filteredHolds.map((hold) => ({
      Name: hold.name,
      Month: hold.month,
      'Start Date': hold.start,
      'End Date': hold.end,
      Reason: hold.reason,
      Fee: hold.fee,
    }));
    exportToCSV(exportData, 'holds');
    alert('Holds exported successfully!');
  }, [holdsList.filteredHolds]);

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
      <HoldsHeader
        year={filters.year}
        fileInputRef={fileInputRef}
        undoBatch={holdImport.undoBatch}
        onOpenSettings={() => openModal('settings')}
        onFileChange={holdImport.handleFileChange}
        onUndoImport={holdImport.undoImport}
        onExport={exportHolds}
        onAddHold={() => openModal('addHold')}
      />
      <HoldsSummary total={holdsList.filteredHolds.length} {...holdsList.statusCounts} />
      <HoldsFilters
        filters={filters}
        holdReasons={holdReasons}
        availableYears={holdsList.availableYears}
        sortOrder={holdsList.sortOrder}
        onFiltersChange={setFilters}
        onSortChange={holdsList.setSortOrder}
        onClear={clearFilters}
      />
      <HoldsGrid
        holds={holdsList.paginatedHolds}
        loading={loading}
        selectedIds={selection.selectedIds}
        currentPage={holdsList.currentPage}
        totalPages={holdsList.totalPages}
        itemsPerPage={holdsList.itemsPerPage}
        totalItems={holdsList.sortedHolds.length}
        startIndex={holdsList.startIndex}
        endIndex={holdsList.endIndex}
        onPageChange={holdsList.setCurrentPage}
        onItemsPerPageChange={holdsList.setItemsPerPage}
        onClearSelection={() => selection.clearSelection(selection.selectionTab)}
        onDeleteSelected={holdActions.deleteSelected}
        onSelectId={(id) => selection.toggleSelection(selection.selectionTab, id)}
        onSelectAll={(ids) => selection.selectAll(selection.selectionTab, ids)}
        onClearSelectedIds={(ids) => selection.clearSelection(selection.selectionTab, ids)}
        onEdit={(hold) => {
          selection.setSelectedHold(hold);
          openModal('editHold');
        }}
        onDelete={(hold) => {
          void removeHold(hold.id, hold.name);
        }}
      />
      <HoldModals
        importPreviewData={holdImport.previewData}
        confirmCSVImport={holdImport.confirmImport}
        importYear={holdImport.importYear}
        onImportYearChange={holdImport.handleYearChange}
        onImportClose={holdImport.clearImportPreview}
        addHold={addHold}
        editHold={editHold}
      />
      <SettingsModal
        isOpen={modals.settings}
        onClose={() => closeModal('settings')}
        scope="holds"
      />
    </div>
  );
}
