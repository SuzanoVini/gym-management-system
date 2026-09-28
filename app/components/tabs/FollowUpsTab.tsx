'use client';

import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import NotesManagerModal from '@/components/tabs/modals/NotesManagerModal';
import DismissUndoToast from '@/components/ui/DismissUndoToast';
import type { FollowUpIntro } from '@/components/ui/FollowUpCheckButton';
import PaginationBar from '@/components/ui/PaginationBar';
import type { FollowUpRow, useFollowUps } from '@/hooks/useFollowUps';
import { undoDismissFollowUp } from '@/lib/supabase/intros';
import ActiveRemindersBanner from './FollowUpsTab/ActiveRemindersBanner';
import FollowUpTableRow, { FollowUpTableHead } from './FollowUpsTab/FollowUpTableRow';
import { exportCsv, groupActiveReminders } from './FollowUpsTab/followUpFormatting';

interface FollowUpsTabProps {
  // Single useFollowUps instance owned by page.tsx (also feeds the sidebar
  // badge) — calling the hook here too would mean duplicate fetches and a
  // badge that never refreshes after actions in this tab
  followUps: ReturnType<typeof useFollowUps>;
}

export default function FollowUpsTab({ followUps }: FollowUpsTabProps) {
  const { rows, loading, error, noteQuery, setNoteQuery, overdueCount, silentRefresh, refresh } =
    followUps;
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [page, setPage] = useState(1);
  const [selectedIntroForNotes, setSelectedIntroForNotes] = useState<FollowUpRow | null>(null);
  const [dismissedForUndo, setDismissedForUndo] = useState<FollowUpIntro | null>(null);

  // One entry per person group with an active reminder, for the banner
  const activeReminderGroups = useMemo(() => groupActiveReminders(rows), [rows]);

  const handleUndoDismiss = async () => {
    if (!dismissedForUndo) {
      return;
    }
    const { id, name, email } = dismissedForUndo;
    setDismissedForUndo(null);
    await undoDismissFollowUp(id, name, email);
    void silentRefresh();
  };

  const handleNoteQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNoteQuery(e.target.value);
    setPage(1);
  };

  const handleItemsPerPageChange = (n: number) => {
    setItemsPerPage(n);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / itemsPerPage));
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginated = useMemo(() => rows.slice(startIndex, endIndex), [rows, startIndex, endIndex]);

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
      <div className="section-container">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Follow Ups</h2>
        </div>

        {/* Search + Export bar */}
        <div className="flex flex-wrap gap-3 items-center mb-4">
          <input
            type="search"
            value={noteQuery}
            onChange={handleNoteQueryChange}
            placeholder="Search notes..."
            className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => exportCsv(rows)}
            className="btn btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <span className="text-sm text-gray-500">
            {rows.length} pending
            {overdueCount > 0 && <span className="text-red-600"> · {overdueCount} overdue</span>}
          </span>
        </div>

        {/* Active reminders banner */}
        <ActiveRemindersBanner
          groups={activeReminderGroups}
          onOpenNotes={setSelectedIntroForNotes}
          onCleared={() => {
            void silentRefresh();
          }}
        />

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <FollowUpTableHead />
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">
                    {noteQuery
                      ? 'No follow-ups match your search.'
                      : 'No follow-ups due right now.'}
                  </td>
                </tr>
              )}
              {paginated.map((row) => (
                <FollowUpTableRow
                  key={row.id}
                  row={row}
                  onOpenNotes={setSelectedIntroForNotes}
                  onUpdate={() => {
                    void silentRefresh();
                  }}
                  onDismissed={setDismissedForUndo}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <PaginationBar
        id="follow-ups-items-per-page"
        currentPage={page}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        totalItems={rows.length}
        startIndex={startIndex}
        endIndex={endIndex}
        onPageChange={setPage}
        onItemsPerPageChange={handleItemsPerPageChange}
      />

      <NotesManagerModal
        isOpen={!!selectedIntroForNotes}
        onClose={() => setSelectedIntroForNotes(null)}
        intro={selectedIntroForNotes}
        onChanged={silentRefresh}
      />

      {dismissedForUndo && (
        <DismissUndoToast
          onUndo={() => {
            void handleUndoDismiss();
          }}
          onExpire={() => setDismissedForUndo(null)}
        />
      )}
    </div>
  );
}
