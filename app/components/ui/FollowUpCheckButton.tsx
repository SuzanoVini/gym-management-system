'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { reportConsoleError } from '@/lib/logger';
import {
  clearFollowUp1,
  clearFollowUp2,
  dismissFollowUp,
  markFollowUp1,
  markFollowUp2,
  setFollowUpReminder,
} from '@/lib/supabase/intros';
import {
  dateInputToUTCTimestamp,
  formatReminderDate,
  utcTimestampToDateInput,
} from '@/lib/utils/reminderUtils';
import type { Intro } from '@/types';

export type FollowUpIntro = Pick<
  Intro,
  | 'id'
  | 'name'
  | 'email'
  | 'signed_up'
  | 'followup_1_at'
  | 'followup_2_at'
  | 'followup_reminder_at'
  | 'followup_dismissed_at'
>;

interface Props {
  intro: FollowUpIntro;
  onUpdate: () => void;
  // Called after a successful "Not necessary" dismiss. The parent owns the
  // undo toast — the row (and this button) may unmount when the list refreshes.
  onDismissed?: (intro: FollowUpIntro) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

const UNDO_ITEM =
  'w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-400 hover:bg-slate-700/70 hover:text-slate-200 transition-colors duration-100 cursor-pointer';
const MENU_BASE = { position: 'fixed', transform: 'translateX(-100%)', zIndex: 9999 } as const;
const MARK_1ST_ITEM =
  'w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-slate-700/70 hover:text-white transition-colors duration-100 cursor-pointer';
const DISMISSED_BADGE =
  'h-7 w-7 inline-flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-400 text-xs font-bold select-none';

// State, effects and handlers; hook order matches the original inline component.
function useFollowUpCheck({ intro, onUpdate, onDismissed }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [showReminderInput, setShowReminderInput] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [savingReminder, setSavingReminder] = useState(false);
  const [localDismissed, setLocalDismissed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const has1st = !!intro.followup_1_at;
  const has2nd = !!intro.followup_2_at;
  const dismissed = localDismissed || !!intro.followup_dismissed_at;
  useEffect(() => {
    if (!open) {
      return;
    }
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const outsideTrigger = triggerRef.current && !triggerRef.current.contains(target);
      const outsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      if (outsideTrigger && outsideDropdown) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ x: rect.right, y: rect.bottom + 4 });
      setShowReminderInput(false);
    }
    setOpen((prev) => !prev);
  };
  const run = async (fn: () => Promise<void>) => {
    if (loading) {
      return;
    }
    setLoading(true);
    setOpen(false);
    try {
      await fn();
      onUpdate();
    } catch (err) {
      reportConsoleError(err);
      alert('Failed to save follow-up. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  const handleUndo1 = () => {
    if (has2nd) {
      if (!window.confirm('This will also clear the 2nd follow-up check. Continue?')) {
        return;
      }
    }
    void run(() => clearFollowUp1(intro.id));
  };
  const handleDismiss = () => {
    void run(async () => {
      await dismissFollowUp(intro.id, intro.name, intro.email);
      setLocalDismissed(true);
      onDismissed?.(intro);
    });
  };
  const handleSaveReminder = async () => {
    if (!reminderDate || savingReminder) {
      return;
    }
    setSavingReminder(true);
    try {
      const reminderAt = dateInputToUTCTimestamp(reminderDate);
      await setFollowUpReminder(intro.id, intro.name, intro.email, reminderAt);
      setShowReminderInput(false);
      setOpen(false);
      onUpdate();
    } catch (err) {
      reportConsoleError(err);
      alert('Failed to save reminder. Please try again.');
    } finally {
      setSavingReminder(false);
    }
  };
  return {
    intro,
    open,
    loading,
    pos,
    showReminderInput,
    setShowReminderInput,
    reminderDate,
    setReminderDate,
    savingReminder,
    triggerRef,
    dropdownRef,
    has1st,
    has2nd,
    dismissed,
    handleToggle,
    run,
    handleUndo1,
    handleDismiss,
    handleSaveReminder,
  };
}
type FollowUpState = ReturnType<typeof useFollowUpCheck>;

function StatusSection({ s }: { s: FollowUpState }) {
  const { intro, has1st, has2nd, run, handleUndo1 } = s;
  const mark1st = () => {
    void run(() => markFollowUp1(intro.id));
  };
  const handleUndo2 = () => {
    void run(() => clearFollowUp2(intro.id));
  };
  return (
    <>
      {has1st ? (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-emerald-400">
          <span className="text-emerald-400 font-semibold">✓</span>
          <span className="font-medium">1st done {formatDate(intro.followup_1_at ?? '')}</span>
        </div>
      ) : (
        <button type="button" onClick={mark1st} className={MARK_1ST_ITEM}>
          <span className="text-slate-500 text-base leading-none">☐</span>
          <span className="font-medium">Mark 1st Follow-up</span>
        </button>
      )}
      {has2nd ? (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-emerald-400">
          <span className="font-semibold">✓</span>
          <span className="font-medium">2nd done {formatDate(intro.followup_2_at ?? '')}</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (has1st) {
              void run(() => markFollowUp2(intro.id));
            }
          }}
          disabled={!has1st}
          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors duration-100 ${
            has1st
              ? 'text-slate-200 hover:bg-slate-700/70 hover:text-white cursor-pointer'
              : 'text-slate-600 cursor-not-allowed'
          }`}
        >
          <span className="text-base leading-none">☐</span>
          <span className="font-medium">Mark 2nd Follow-up</span>
          {!has1st && <span className="ml-auto text-xs text-slate-600">needs 1st</span>}
        </button>
      )}
      <div className="h-px bg-slate-700/50 mx-3 my-1" />
      {has2nd && (
        <button type="button" onClick={handleUndo2} className={UNDO_ITEM}>
          <span className="text-xs">↩</span>
          <span>Undo 2nd</span>
        </button>
      )}
      {has1st && (
        <button type="button" onClick={handleUndo1} className={UNDO_ITEM}>
          <span className="text-xs">↩</span>
          <span>Undo 1st</span>
        </button>
      )}
      {!has1st && !has2nd && (
        <div className="px-3.5 py-2 text-xs text-slate-600">Nothing to undo</div>
      )}
    </>
  );
}

function ReminderSection({ s }: { s: FollowUpState }) {
  const reminderAt = s.intro.followup_reminder_at;
  if (!s.showReminderInput) {
    return (
      <button
        type="button"
        onClick={() => {
          s.setShowReminderInput(true);
          s.setReminderDate(reminderAt ? utcTimestampToDateInput(reminderAt) : '');
        }}
        className={UNDO_ITEM}
      >
        <span className="text-xs">🗓</span>
        <span>{reminderAt ? `Reminder: ${formatReminderDate(reminderAt)}` : 'Set reminder'}</span>
      </button>
    );
  }
  return (
    <div className="px-3.5 py-2">
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={s.reminderDate}
          onChange={(e) => s.setReminderDate(e.target.value)}
          className="flex-1 min-w-0 bg-slate-800 border border-slate-600 rounded text-xs text-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => {
            void s.handleSaveReminder();
          }}
          disabled={!s.reminderDate || s.savingReminder}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs rounded px-2 py-1 disabled:opacity-40"
        >
          {s.savingReminder ? '…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => s.setShowReminderInput(false)}
          className="text-slate-500 hover:text-slate-300 text-xs px-1"
          aria-label="Close reminder input"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default function FollowUpCheckButton(props: Props) {
  const s = useFollowUpCheck(props);

  if (s.intro.signed_up === 'Yes') {
    return <span className="text-gray-300 text-sm">—</span>;
  }
  if (s.dismissed) {
    return (
      <span title="Not necessary" className={DISMISSED_BADGE}>
        ✕
      </span>
    );
  }
  const icon = s.has2nd ? '✓' : s.has1st ? '①' : '☐';
  const iconStyle = s.has2nd
    ? 'bg-emerald-50 border-emerald-300 text-emerald-600 hover:bg-emerald-100'
    : s.has1st
      ? 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100'
      : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:border-gray-300';
  return (
    <>
      <button
        ref={s.triggerRef}
        type="button"
        onClick={s.handleToggle}
        disabled={s.loading}
        title="Follow-up status"
        aria-label="Follow-up status"
        className={`h-7 w-7 inline-flex items-center justify-center rounded-md border text-xs font-bold transition-colors duration-150 cursor-pointer disabled:opacity-50 ${iconStyle}`}
      >
        {icon}
      </button>
      {s.open &&
        s.pos &&
        createPortal(
          <div
            ref={s.dropdownRef}
            style={{ ...MENU_BASE, left: s.pos.x, top: s.pos.y }}
            className="min-w-[220px] bg-slate-900 rounded-xl shadow-2xl border border-slate-700/60 py-1.5 overflow-hidden"
          >
            <StatusSection s={s} />
            <div className="h-px bg-slate-700/50 mx-3 my-1" />
            <ReminderSection s={s} />
            <div className="h-px bg-slate-700/50 mx-3 my-1" />
            <button
              type="button"
              onClick={s.handleDismiss}
              disabled={s.loading}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-500 hover:bg-slate-700/70 hover:text-red-400 transition-colors duration-100 cursor-pointer"
            >
              <span className="text-xs">✕</span>
              <span>Not necessary</span>
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
