import { Ban, Edit2, List, MessageSquare, RotateCcw, ShieldBan, Trash2 } from 'lucide-react';
import FollowUpCheckButton from '@/components/ui/FollowUpCheckButton';
import OverflowMenu, { type OverflowMenuItem } from '@/components/ui/OverflowMenu';
import { updateIntroAttendance, updateIntroSignupStatus } from '@/lib/supabase/introTableActions';
import type { Intro } from '@/types';
import type { IntroTableContext } from './IntroTableContext';

const isCancelled = (intro: Intro) => intro.status === 'Cancelled';

// Replaces the Attended / Signed Up selects on cancelled bookings: same pill
// shape, but locked so the row can't be edited from the table.
function CancelledPill() {
  return (
    <span
      title="Booking cancelled"
      className="inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border font-medium bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed select-none"
    >
      <Ban className="w-3 h-3" aria-hidden="true" />
      Cancelled
    </span>
  );
}

const pillClass = (value: string) =>
  `text-xs rounded-full px-2 py-0.5 border cursor-pointer font-medium focus:outline-none focus:ring-1 focus:ring-blue-400 ${
    value === 'Yes'
      ? 'bg-green-100 text-green-800 border-green-200'
      : value === 'No'
        ? 'bg-red-100 text-red-800 border-red-200'
        : 'bg-gray-100 text-gray-800 border-gray-200'
  }`;

export function introStatusColumns({
  silentRefresh,
  setPendingSignupIntro,
  setDismissedForUndo,
  handleFollowUpClick,
  handleEditClick,
  onManageNotes,
  removeIntro,
  onMarkSpam,
  onCancelBooking,
  onRestoreBooking,
}: IntroTableContext) {
  return [
    {
      key: 'attended' as keyof Intro,
      label: 'Attended',
      render: (value: unknown, intro: Intro) =>
        isCancelled(intro) ? (
          <CancelledPill />
        ) : (
          <select
            value={(value as string) || ''}
            onChange={(e) => {
              const val = e.target.value;
              void (async () => {
                await updateIntroAttendance(intro.id, val);
                await silentRefresh();
              })();
            }}
            onClick={(e) => e.stopPropagation()}
            className={pillClass(value as string)}
          >
            <option value="">—</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        ),
    },
    {
      key: 'signed_up' as keyof Intro,
      label: 'Signed Up',
      render: (value: unknown, intro: Intro) =>
        isCancelled(intro) ? (
          <CancelledPill />
        ) : (
          <select
            value={(value as string) || ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'Yes') {
                setPendingSignupIntro(intro);
                return;
              }
              void (async () => {
                await updateIntroSignupStatus(intro.id, val);
                await silentRefresh();
              })();
            }}
            onClick={(e) => e.stopPropagation()}
            className={pillClass(value as string)}
          >
            <option value="">—</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        ),
    },
    {
      key: 'year' as keyof Intro,
      label: 'Year',
      render: (value: unknown, _intro: Intro) => (
        <span className="text-sm text-gray-500">{value ? String(value) : '—'}</span>
      ),
    },
    {
      key: 'actions' as keyof Intro,
      label: '',
      render: (_value: unknown, intro: Intro) => {
        const items: OverflowMenuItem[] = [
          {
            label: 'Quick Note',
            icon: MessageSquare,
            onClick: () => handleFollowUpClick(intro),
          },
          {
            label: 'Manage Notes',
            icon: List,
            onClick: () => {
              onManageNotes(intro);
            },
          },
          {
            label: 'Edit',
            icon: Edit2,
            onClick: () => handleEditClick(intro),
          },
          isCancelled(intro)
            ? {
                label: 'Restore booking',
                icon: RotateCcw,
                variant: 'success',
                onClick: () => onRestoreBooking(intro),
              }
            : {
                label: 'Mark as cancelled',
                icon: Ban,
                variant: 'danger',
                onClick: () => onCancelBooking(intro),
              },
          {
            label: 'Mark as spam',
            icon: ShieldBan,
            variant: 'danger',
            onClick: () => onMarkSpam(intro),
          },
          {
            label: 'Delete',
            icon: Trash2,
            variant: 'danger',
            onClick: () => {
              void removeIntro(intro.id, intro.name);
            },
          },
        ];
        return (
          <div className="flex items-center gap-3">
            {isCancelled(intro) ? (
              <span className="h-7 w-7" aria-hidden="true" />
            ) : (
              <FollowUpCheckButton
                intro={intro}
                onUpdate={() => {
                  void silentRefresh();
                }}
                onDismissed={setDismissedForUndo}
              />
            )}
            <OverflowMenu items={items} />
          </div>
        );
      },
    },
  ];
}
