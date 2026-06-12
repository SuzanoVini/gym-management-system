'use client';

import { Download } from 'lucide-react';
import { useMemo, useState } from 'react';
import NotesManagerModal from '@/components/tabs/modals/NotesManagerModal';
import DismissUndoToast from '@/components/ui/DismissUndoToast';
import FollowUpCheckButton, { type FollowUpIntro } from '@/components/ui/FollowUpCheckButton';
import PaginationBar from '@/components/ui/PaginationBar';
import type { FollowUpRow, useFollowUps } from '@/hooks/useFollowUps';
import { clearFollowUpReminder, undoDismissFollowUp } from '@/lib/supabase/intros';
import { normalizePersonKey, personKeyString } from '@/lib/utils/normalizePersonKey';
import { formatReminderDate, getReminderBadgeLabel } from '@/lib/utils/reminderUtils';

function rowClass(row: FollowUpRow): string {
  if (row.hasActiveReminder) {
    return 'border-l-4 border-blue-400 bg-blue-50';
  }
  const base = 'border-l-4 ';
  if (row.tier === 1 || row.tier === 3) {
    return `${base}border-red-400 bg-red-50`;
  }
  if (row.tier === 2) {
    return `${base}border-amber-400 bg-amber-50`;
  }
  if (row.tier === 4) {
    return `${base}border-blue-400 bg-blue-50`;
  }
  return 'border-l-4 border-transparent opacity-60';
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

function dueBadge(row: FollowUpRow): React.ReactNode {
  if (!row.followup_1_at) {
    if (row.tier === 1) {
      return <span className="text-xs font-semibold text-red-600">⚠ Overdue</span>;
    }
    if (row.tier === 2) {
      return <span className="text-xs font-semibold text-amber-600">Due today</span>;
    }
    return (
      <span className="text-xs text-gray-400">
        Due {formatDate(row.firstDueDate.toISOString())}
      </span>
    );
  }
  return <span className="text-xs text-green-700">✓ {formatDate(row.followup_1_at)}</span>;
}

function due2Badge(row: FollowUpRow): React.ReactNode {
  if (!row.followup_1_at) {
    return <span className="text-gray-300 text-sm">—</span>;
  }
  if (row.followup_2_at) {
    return <span className="text-xs text-green-700">✓ {formatDate(row.followup_2_at)}</span>;
  }
  if (row.isSecondOverdue) {
    return <span className="text-xs font-semibold text-red-600">⚠ Overdue</span>;
  }
  return (
    <span className="text-xs text-blue-600">
      Due {row.secondDueDate ? formatDate(row.secondDueDate.toISOString()) : '—'}
    </span>
  );
}

function escapeCsvField(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

function exportCsv(rows: FollowUpRow[]) {
  const header = [
    'Name',
    'Phone',
    'Email',
    'Class',
    'Intro Date',
    'Attended',
    'Staff',
    '1st Follow-up',
    '2nd Follow-up',
    'Notes',
  ];
  const csvRows = rows.map((r) => [
    escapeCsvField(r.name),
    escapeCsvField(r.phone ?? ''),
    escapeCsvField(r.email ?? ''),
    escapeCsvField(r.class ?? ''),
    escapeCsvField(r.date ?? ''),
    escapeCsvField(r.attended ?? ''),
    escapeCsvField(r.staff ?? ''),
    escapeCsvField(r.followup_1_at ? formatDate(r.followup_1_at) : ''),
    escapeCsvField(r.followup_2_at ? formatDate(r.followup_2_at) : ''),
    escapeCsvField((r.follow_up_notes ?? []).map((n) => n.note).join(' ; ')),
  ]);
  const csv = [header.map(escapeCsvField), ...csvRows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `follow-ups-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

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
  const activeReminderGroups = useMemo(() => {
    const seen = new Map<string, FollowUpRow>();
    for (const row of rows) {
      if (!row.hasActiveReminder) {
        continue;
      }
      const key = normalizePersonKey(row.name, row.email);
      const k = key ? personKeyString(key) : row.id;
      if (!seen.has(k)) {
        seen.set(k, row);
      }
    }
    return Array.from(seen.values());
  }, [rows]);

  const handleUndoDismiss = async () => {
    if (!dismissedForUndo) {
      return;
    }
    const { id, name, email } = dismissedForUndo;
    setDismissedForUndo(null);
    await undoDismissFollowUp(id, name, email);
    silentRefresh();
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
        <button type="button" onClick={refresh} className="btn btn-primary">
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
        {activeReminderGroups.length > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
              <span>🔔</span>
              <span>Active reminders ({activeReminderGroups.length})</span>
            </div>
            {activeReminderGroups.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between bg-white rounded-md border border-blue-100 px-3 py-2"
              >
                <div className="min-w-0">
                  <span className="text-sm font-medium text-gray-900">{row.name}</span>
                  {row.followup_reminder_at && (
                    <span className="text-xs text-gray-500 ml-2">
                      Due {formatReminderDate(row.followup_reminder_at)}
                    </span>
                  )}
                  {row.follow_up_notes?.[0] && (
                    <p className="text-xs text-gray-400 italic truncate mt-0.5">
                      "{row.follow_up_notes[0].note.slice(0, 60)}
                      {row.follow_up_notes[0].note.length > 60 ? '…' : ''}"
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedIntroForNotes(row)}
                    className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1"
                  >
                    Open notes
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await clearFollowUpReminder(row.id, row.name, row.email);
                      silentRefresh();
                    }}
                    className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 rounded px-2 py-1"
                  >
                    Clear reminder
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Intro Date</th>
                <th className="text-left px-4 py-3">Class</th>
                <th className="text-left px-4 py-3">Staff</th>
                <th className="text-left px-4 py-3">1st Follow-up</th>
                <th className="text-left px-4 py-3">2nd Follow-up</th>
                <th className="text-left px-4 py-3">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
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
              {paginated.map((row) => {
                const latestNote = row.follow_up_notes?.[0]?.note ?? '';
                const preview = latestNote.length > 60 ? `${latestNote.slice(0, 60)}…` : latestNote;
                return (
                  <tr key={row.id} className={`${rowClass(row)} transition-colors`}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{row.name}</span>
                        {row.hasActiveReminder && row.followup_reminder_at && (
                          <span className="text-[10px] font-semibold bg-blue-100 text-blue-600 rounded px-1.5 py-0.5">
                            🔔 {getReminderBadgeLabel(row.followup_reminder_at)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(row.date)}</td>
                    <td className="px-4 py-3 text-gray-600">{row.class}</td>
                    <td className="px-4 py-3 text-gray-600">{row.staff}</td>
                    <td className="px-4 py-3">{dueBadge(row)}</td>
                    <td className="px-4 py-3">{due2Badge(row)}</td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <button
                        type="button"
                        onClick={() => setSelectedIntroForNotes(row)}
                        className="text-left text-gray-500 italic truncate w-full hover:text-blue-600 hover:underline transition-colors"
                      >
                        {preview || <span className="text-gray-300">No notes</span>}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <FollowUpCheckButton
                        intro={row}
                        onUpdate={silentRefresh}
                        onDismissed={setDismissedForUndo}
                      />
                    </td>
                  </tr>
                );
              })}
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
        <DismissUndoToast onUndo={handleUndoDismiss} onExpire={() => setDismissedForUndo(null)} />
      )}
    </div>
  );
}
