import FollowUpCheckButton, { type FollowUpIntro } from '@/components/ui/FollowUpCheckButton';
import type { FollowUpRow } from '@/hooks/useFollowUps';
import { getReminderBadgeLabel } from '@/lib/utils/reminderUtils';
import { due2Badge, dueBadge, formatDate, rowClass } from './followUpFormatting';

// On a phone the queue reads as two-line items: name and the first follow-up on line one, the
// intro date, class and staff in grey on line two. The wider columns return from 640px up.
const WIDE = 'hidden sm:table-cell';

export function FollowUpTableHead() {
  return (
    <thead>
      <tr>
        <th>Name</th>
        <th className={WIDE}>Intro date</th>
        <th className={WIDE}>Class</th>
        <th className={WIDE}>Staff</th>
        <th>1st follow-up</th>
        <th className={WIDE}>2nd follow-up</th>
        <th className={WIDE}>Notes</th>
        <th>
          <span className="sr-only">Actions</span>
        </th>
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
    <tr className={rowClass(row)}>
      <td className="font-medium text-[var(--text)]">
        <div className="flex items-center gap-2 flex-wrap">
          <span>{row.name}</span>
          {row.hasActiveReminder && row.followup_reminder_at && (
            <span className="rounded-full bg-[var(--raised)] px-2 py-0.5 text-xs font-medium text-[var(--gb-dark-gray)]">
              Reminder {getReminderBadgeLabel(row.followup_reminder_at)}
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs font-normal text-[var(--muted)] sm:hidden">
          {[formatDate(row.date), row.class, row.staff].filter(Boolean).join(' · ')}
        </div>
      </td>
      <td className={`${WIDE} text-[var(--gb-dark-gray)] whitespace-nowrap`}>
        {formatDate(row.date)}
      </td>
      <td className={`${WIDE} text-[var(--gb-dark-gray)]`}>{row.class}</td>
      <td className={`${WIDE} text-[var(--gb-dark-gray)]`}>{row.staff}</td>
      <td>{dueBadge(row)}</td>
      <td className={WIDE}>{due2Badge(row)}</td>
      <td className={`${WIDE} max-w-[200px]`}>
        <button
          type="button"
          onClick={() => onOpenNotes(row)}
          className="text-left truncate w-full text-[var(--gb-dark-gray)] hover:text-[var(--text)] hover:underline"
        >
          {preview || <span className="text-[var(--muted)]">Add note</span>}
        </button>
      </td>
      <td>
        <FollowUpCheckButton intro={row} onUpdate={onUpdate} onDismissed={onDismissed} />
      </td>
    </tr>
  );
}
