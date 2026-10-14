import FollowUpCheckButton, { type FollowUpIntro } from '@/components/ui/FollowUpCheckButton';
import type { FollowUpRow } from '@/hooks/useFollowUps';
import { getReminderBadgeLabel } from '@/lib/utils/reminderUtils';
import { due2Badge, dueBadge, formatDate, rowClass } from './followUpFormatting';

export function FollowUpTableHead() {
  return (
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
  );
}

export default function FollowUpTableRow({
  row,
  onOpenNotes,
  onUpdate,
  onDismissed,
}: {
  row: FollowUpRow;
  onOpenNotes: (row: FollowUpRow) => void;
  onUpdate: () => void;
  onDismissed: (intro: FollowUpIntro) => void;
}) {
  const latestNote = row.follow_up_notes?.[0]?.note ?? '';
  const preview = latestNote.length > 60 ? `${latestNote.slice(0, 60)}…` : latestNote;
  return (
    <tr className={`${rowClass(row)} transition-colors`}>
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
          onClick={() => onOpenNotes(row)}
          className="text-left text-gray-500 italic truncate w-full hover:text-blue-600 hover:underline transition-colors"
        >
          {preview || <span className="text-gray-300">No notes</span>}
        </button>
      </td>
      <td className="px-4 py-3">
        <FollowUpCheckButton intro={row} onUpdate={onUpdate} onDismissed={onDismissed} />
      </td>
    </tr>
  );
}
