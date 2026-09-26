import { Edit2, List, MessageSquare, Trash2 } from 'lucide-react';
import FollowUpCheckButton from '@/components/ui/FollowUpCheckButton';
import OverflowMenu from '@/components/ui/OverflowMenu';
import { updateIntroAttendance, updateIntroSignupStatus } from '@/lib/supabase/introTableActions';
import type { Intro } from '@/types';
import type { IntroTableContext } from './IntroTableContext';

export function introStatusColumns({
  silentRefresh,
  setPendingSignupIntro,
  setDismissedForUndo,
  handleFollowUpClick,
  handleEditClick,
  onManageNotes,
  removeIntro,
}: IntroTableContext) {
  return [
    {
      key: 'attended' as keyof Intro,
      label: 'Attended',
      render: (value: unknown, intro: Intro) => (
        <select
          value={(value as string) || ''}
          onChange={async (e) => {
            const val = e.target.value;
            await updateIntroAttendance(intro.id, val);
            await silentRefresh();
          }}
          onClick={(e) => e.stopPropagation()}
          className={`text-xs rounded-full px-2 py-0.5 border cursor-pointer font-medium focus:outline-none focus:ring-1 focus:ring-blue-400 ${
            (value as string) === 'Yes'
              ? 'bg-green-100 text-green-800 border-green-200'
              : (value as string) === 'No'
                ? 'bg-red-100 text-red-800 border-red-200'
                : 'bg-gray-100 text-gray-800 border-gray-200'
          }`}
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
      render: (value: unknown, intro: Intro) => (
        <select
          value={(value as string) || ''}
          onChange={async (e) => {
            const val = e.target.value;
            if (val === 'Yes') {
              setPendingSignupIntro(intro);
              return;
            }
            await updateIntroSignupStatus(intro.id, val);
            await silentRefresh();
          }}
          onClick={(e) => e.stopPropagation()}
          className={`text-xs rounded-full px-2 py-0.5 border cursor-pointer font-medium focus:outline-none focus:ring-1 focus:ring-blue-400 ${
            (value as string) === 'Yes'
              ? 'bg-green-100 text-green-800 border-green-200'
              : (value as string) === 'No'
                ? 'bg-red-100 text-red-800 border-red-200'
                : 'bg-gray-100 text-gray-800 border-gray-200'
          }`}
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
      render: (_value: unknown, intro: Intro) => (
        <div className="flex items-center gap-3">
          <FollowUpCheckButton
            intro={intro}
            onUpdate={silentRefresh}
            onDismissed={setDismissedForUndo}
          />
          <OverflowMenu
            items={[
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
              {
                label: 'Delete',
                icon: Trash2,
                variant: 'danger',
                onClick: () => removeIntro(intro.id, intro.name),
              },
            ]}
          />
        </div>
      ),
    },
  ];
}
