import { Edit2, FileText, Trash2 } from 'lucide-react';
import OverflowMenu from '@/components/ui/OverflowMenu';
import Tooltip from '@/components/ui/Tooltip';
import { formatDate } from '@/lib/supabase/utils';
import type { Signup } from '@/types';

function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24));
}

function SignupNameLabel({ full, display }: { full: string; display: string }) {
  if (display === full) {
    return <div className="font-medium text-gray-900">{full}</div>;
  }
  return (
    <Tooltip content={full}>
      <div className="font-medium text-gray-900 cursor-default">{display}</div>
    </Tooltip>
  );
}

function SignupConversionBadge({ days }: { days: number | null }) {
  if (days === null || days < 0 || days > 365) {
    return null;
  }
  return (
    <span className="inline-block bg-green-50 text-green-700 text-[10px] px-2 py-0.5 rounded-full mt-1">
      Intro to signup in {days} day{days === 1 ? '' : 's'}
    </span>
  );
}

interface SignupColumnOptions {
  intros: { name: string; date?: string | null }[];
  onViewNote: (note: string) => void;
  onEdit: (signup: Signup) => void;
  onDelete: (signup: Signup) => void;
}

function SignupNameCell({
  value,
  signup,
  intros,
}: {
  value: unknown;
  signup: Signup;
  intros: SignupColumnOptions['intros'];
}) {
  const full = (value as string) || '';
  const parts = full.trim().split(' ');
  const display =
    parts.length > 1 && full.length > 14 ? `${parts[0]} ${parts.at(-1)?.[0] ?? ''}.` : full;
  const intro = intros.find(
    (i) => i.name.toLowerCase().trim() === signup.name.toLowerCase().trim()
  );
  const conversionDays =
    intro?.date && signup.membership_date ? daysBetween(intro.date, signup.membership_date) : null;

  return (
    <div>
      <SignupNameLabel full={full} display={display} />
      <SignupConversionBadge days={conversionDays} />
    </div>
  );
}

export function createSignupColumns({ intros, onViewNote, onEdit, onDelete }: SignupColumnOptions) {
  return [
    {
      key: 'month' as keyof Signup,
      label: 'Month',
      render: (value: unknown, _item: Signup) => (
        <div className="font-medium text-gray-900">{value as string}</div>
      ),
    },
    {
      key: 'name' as keyof Signup,
      label: 'Name',
      render: (value: unknown, signup: Signup) => (
        <SignupNameCell value={value} signup={signup} intros={intros} />
      ),
    },
    {
      key: 'membership' as keyof Signup,
      label: 'Membership',
      render: (value: unknown, _item: Signup) => {
        const membership = value as string;
        const color =
          membership === 'Integrity'
            ? 'bg-green-100 text-green-800'
            : membership === 'Legacy'
              ? 'bg-purple-100 text-purple-800'
              : membership === 'Special'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800';
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
            {membership}
          </span>
        );
      },
    },
    {
      key: 'membership_date' as keyof Signup,
      label: 'Sign Up Date',
      render: (value: unknown, _item: Signup) => formatDate(value as string),
    },
    {
      key: 'first_payment_date' as keyof Signup,
      label: 'First Payment',
      render: (value: unknown, _item: Signup) => formatDate(value as string),
    },
    {
      key: 'signup_package' as keyof Signup,
      label: 'Package',
      render: (value: unknown, _item: Signup) =>
        (value as boolean) ? (
          <span className="text-green-600 font-medium">✓ Yes</span>
        ) : (
          <span className="text-gray-400">No</span>
        ),
    },
    {
      key: 'year' as keyof Signup,
      label: 'Year',
      render: (value: unknown) => (
        <span className="text-sm text-gray-500">{value ? String(value) : '—'}</span>
      ),
    },
    {
      key: 'actions' as keyof Signup,
      label: '',
      render: (_value: unknown, signup: Signup) => (
        <OverflowMenu
          items={[
            ...(signup.notes
              ? [
                  {
                    label: 'Notes',
                    icon: FileText,
                    onClick: () => onViewNote(signup.notes ?? ''),
                  },
                ]
              : []),
            { label: 'Edit', icon: Edit2, onClick: () => onEdit(signup) },
            {
              label: 'Delete',
              icon: Trash2,
              variant: 'danger',
              onClick: () => onDelete(signup),
            },
          ]}
        />
      ),
    },
  ];
}
