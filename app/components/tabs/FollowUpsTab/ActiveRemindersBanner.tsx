import { Bell } from 'lucide-react';
import type { FollowUpRow } from '@/hooks/useFollowUps';
import { clearFollowUpReminder } from '@/lib/supabase/intros';
import { formatReminderDate } from '@/lib/utils/reminderUtils';

export default function ActiveRemindersBanner({
  groups,
  onOpenNotes,
  onCleared,
}: {
  groups: FollowUpRow[];
  onOpenNotes: (row: FollowUpRow) => void;
  onCleared: () => void;
}) {
  const clearReminder = async (row: FollowUpRow) => {
    await clearFollowUpReminder(row.id, row.name, row.email);
    onCleared();
  };

  return (
    <>
      {groups.length > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
            <Bell className="w-4 h-4" aria-hidden="true" />
            <span>Active reminders ({groups.length})</span>
          </div>
          {groups.map((row) => (
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
                  onClick={() => onOpenNotes(row)}
                  className="text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2 py-1"
                >
                  Open notes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void clearReminder(row);
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
    </>
  );
}
