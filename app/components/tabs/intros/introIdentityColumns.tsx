import { AlertTriangle, Mail, Phone, ShieldAlert } from 'lucide-react';
import CopyButton from '@/components/ui/CopyButton';
import Tooltip from '@/components/ui/Tooltip';
import { spamLevel } from '@/lib/spam/detectSpamSignals';
import { formatDate } from '@/lib/supabase/utils';
import type { Intro } from '@/types';
import type { IntroTableContext } from './IntroTableContext';

function formatFormerMemberDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

function SpamShield({
  intro,
  onReviewSpam,
}: {
  intro: Intro;
  onReviewSpam: IntroTableContext['onReviewSpam'];
}) {
  const level = spamLevel(intro);
  if (!level) {
    return null;
  }
  return (
    <Tooltip content="Possible spam — click to review">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onReviewSpam(intro);
        }}
        className={
          level === 'strong'
            ? 'text-amber-500 hover:text-amber-600 focus:outline-none'
            : 'text-gray-400 hover:text-gray-500 focus:outline-none'
        }
        aria-label="Review possible spam"
      >
        <ShieldAlert size={14} />
      </button>
    </Tooltip>
  );
}

export function introIdentityColumns({
  formerMemberMap,
  classTypes,
  setResolvingIntro,
  onReviewSpam,
}: IntroTableContext) {
  return [
    {
      key: 'name' as keyof Intro,
      label: 'Name',
      render: (value: unknown, intro: Intro) => {
        const full = (value as string) || '';
        const parts = full.trim().split(' ');
        const display =
          parts.length > 1 && full.length > 14 ? `${parts[0]} ${parts.at(-1)?.[0] ?? ''}.` : full;
        const cancellationDate = formerMemberMap.get(intro.name.toLowerCase().trim());
        const isFormer = !!cancellationDate && intro.signed_up !== 'Yes';
        const nameNode =
          display !== full ? (
            <Tooltip content={full}>
              <div className="font-medium text-gray-900 cursor-default">{display}</div>
            </Tooltip>
          ) : (
            <div className="font-medium text-gray-900">{full}</div>
          );
        return (
          <div className="flex items-center gap-1.5">
            {nameNode}
            {isFormer && (
              <Tooltip
                content={`Former member cancelled on ${formatFormerMemberDate(cancellationDate)}`}
              >
                <AlertTriangle
                  className="w-3.5 h-3.5 text-amber-600 cursor-help"
                  aria-label="Former member"
                />
              </Tooltip>
            )}
            <SpamShield intro={intro} onReviewSpam={onReviewSpam} />
          </div>
        );
      },
    },
    {
      key: 'email' as keyof Intro,
      label: 'Email',
      render: (value: unknown, _intro: Intro) => (
        <CopyButton value={value as string} icon={Mail} ariaLabel="Copy email" />
      ),
    },
    {
      key: 'phone' as keyof Intro,
      label: 'Phone',
      render: (value: unknown, _intro: Intro) => (
        <CopyButton value={value as string} icon={Phone} ariaLabel="Copy phone" />
      ),
    },
    {
      key: 'staff' as keyof Intro,
      label: 'Staff',
      render: (value: unknown, _intro: Intro) => {
        const full = (value as string) || '';
        if (!full) {
          return <span className="text-gray-400">—</span>;
        }
        const first = full.split(' ')[0];
        return first !== full ? (
          <Tooltip content={full}>
            <span className="text-sm text-gray-700 cursor-default">{first}</span>
          </Tooltip>
        ) : (
          <span className="text-sm text-gray-700">{full}</span>
        );
      },
    },
    {
      key: 'class' as keyof Intro,
      label: 'Class',
      render: (value: unknown, intro: Intro) => {
        const cls = (value as string) || '';
        const isUnresolved = cls !== '' && !classTypes.includes(cls);
        return (
          <div className="flex items-center gap-1">
            <span className="text-sm">{cls || '-'}</span>
            {isUnresolved && (
              <Tooltip content="Unknown class — click to resolve">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setResolvingIntro(intro);
                  }}
                  className="text-amber-500 hover:text-amber-600 focus:outline-none"
                  aria-label="Resolve unknown class"
                >
                  <AlertTriangle size={14} />
                </button>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      key: 'date' as keyof Intro,
      label: 'Date',
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: 'time' as keyof Intro,
      label: 'Time',
      render: (value: unknown) => (
        <span className="text-sm text-gray-700">{value ? String(value) : '—'}</span>
      ),
    },
  ];
}
