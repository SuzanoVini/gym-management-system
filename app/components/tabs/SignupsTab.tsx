'use client';

import { useRef, useState } from 'react';
import Modal from '@/components/ui/Modal';
import type { Signup } from '@/types';
import SettingsModal from './modals/SettingsModal';
import { SignupModals } from './modals/SignupModals';
import { createSignupColumns } from './SignupsTab/SignupColumns';
import { SignupTabContent } from './SignupsTab/SignupTabContent';
import { useSignupImport } from './SignupsTab/useSignupImport';
import { useSignupPagination } from './SignupsTab/useSignupPagination';
import { useSignupSelection } from './SignupsTab/useSignupSelection';
import { useSignupTabData } from './SignupsTab/useSignupTabData';

function SignupError({ error, onRetry }: { error: Error; onRetry: () => Promise<void> }) {
  return (
    <div className="text-center py-12">
      <div className="text-red-600 mb-4">Error: {error.message}</div>
      <button
        type="button"
        onClick={() => {
          void onRetry();
        }}
        className="btn btn-primary"
      >
        Retry
      </button>
    </div>
  );
}

function SignupNotesModal({ note, onClose }: { note: string | null; onClose: () => void }) {
  return (
    <Modal isOpen={note !== null} onClose={onClose} title="Notes">
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{note}</p>
      <div className="mt-6 flex justify-end">
        <button type="button" onClick={onClose} className="btn btn-tertiary">
          Close
        </button>
      </div>
    </Modal>
  );
}

export default function SignupsTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [viewingNote, setViewingNote] = useState<string | null>(null);
  const tab = useSignupTabData(sortOrder);
  const pagination = useSignupPagination(tab.filters, sortOrder, tab.sortedSignups);
  const selection = useSignupSelection(tab.refresh, pagination.setCurrentPage);
  const signupImport = useSignupImport({
    signups: tab.signups,
    refresh: tab.refresh,
    openPreview: () => tab.openModal('importPreview'),
    closePreview: () => tab.closeModal('importPreview'),
  });
  const columns = createSignupColumns({
    intros: tab.intros,
    onViewNote: setViewingNote,
    onEdit: (signup: Signup) => {
      selection.setSelectedSignup(signup);
      tab.openModal('editSignup');
    },
    onDelete: (signup: Signup) => void tab.removeSignup(signup.id, signup.name),
  });

  if (tab.error) {
    return <SignupError error={tab.error} onRetry={tab.refresh} />;
  }

  return (
    <>
      <SignupTabContent
        filters={tab.filters}
        membershipTypes={tab.membershipTypes}
        availableYears={tab.availableYears}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        onFiltersChange={tab.setFilters}
        onClearFilters={tab.clearFilters}
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        itemsPerPage={pagination.itemsPerPage}
        sortedSignups={tab.sortedSignups}
        paginatedSignups={pagination.paginatedSignups}
        startIndex={pagination.startIndex}
        endIndex={pagination.endIndex}
        selectedIds={selection.selectedIds}
        onPageChange={pagination.setCurrentPage}
        onItemsPerPageChange={pagination.setItemsPerPage}
        onClearSelection={selection.clearSelection}
        onDeleteSelected={selection.deleteSelected}
        metrics={tab.metrics}
        fileInputRef={fileInputRef}
        onCSVImport={signupImport.handleCSVImport}
        undoCount={signupImport.undoBatch?.count ?? null}
        onUndoImport={signupImport.handleUndoImport}
        onOpenSettings={() => tab.openModal('settings')}
        onOpenAddSignup={() => tab.openModal('addSignup')}
        loading={tab.loading}
        columns={columns}
        onSelectId={selection.toggleSelection}
        onSelectAll={selection.selectAll}
        onClearSelectedIds={selection.clearSelectedIds}
      />
      <SignupNotesModal note={viewingNote} onClose={() => setViewingNote(null)} />
      <SignupModals
        importPreviewData={signupImport.previewData}
        confirmCSVImport={signupImport.confirmCSVImport}
        importYear={signupImport.importYear}
        onImportYearChange={signupImport.handleImportYearChange}
        onImportClose={signupImport.closeImport}
        addSignup={tab.addSignup}
        editSignup={tab.editSignup}
      />
      <SettingsModal
        isOpen={tab.modals.settings}
        onClose={() => tab.closeModal('settings')}
        scope="signups"
      />
    </>
  );
}
