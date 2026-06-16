'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: UI state machine with follow-up states, popover, and undo logic
export default function FollowUpCheckButton({ intro, onUpdate, onDismissed }: Props) {
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

  if (intro.signed_up === 'Yes') {
    return <span className="text-gray-300 text-sm">—</span>;
  }

  if (dismissed) {
    return (
      <span
        title="Not necessary"
        className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-400 text-xs font-bold select-none"
      >
        ✕
      </span>
    );
  }

  const icon = has2nd ? '✓' : has1st ? '①' : '☐';
  const iconStyle = has2nd
    ? 'bg-emerald-50 border-emerald-300 text-emerald-600 hover:bg-emerald-100'
    : has1st
      ? 'bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100'
      : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100 hover:border-gray-300';

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
      console.error(err);
      alert('Failed to save follow-up. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUndo1 = () => {
    if (has2nd) {
      const confirmed = window.confirm('This will also clear the 2nd follow-up check. Continue?');
      if (!confirmed) {
        return;
      }
    }
    run(() => clearFollowUp1(intro.id));
  };

  const handleDismiss = () => {
    run(async () => {
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
      await setFollowUpReminder(
        intro.id,
        intro.name,
        intro.email,
        dateInputToUTCTimestamp(reminderDate)
      );
      setShowReminderInput(false);
      setOpen(false);
      onUpdate();
    } catch (err) {
      console.error(err);
      alert('Failed to save reminder. Please try again.');
    } finally {
      setSavingReminder(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        disabled={loading}
        title="Follow-up status"
        aria-label="Follow-up status"
        className={`h-7 w-7 inline-flex items-center justify-center rounded-md border text-xs font-bold transition-colors duration-150 cursor-pointer disabled:opacity-50 ${iconStyle}`}
      >
        {icon}
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              left: pos.x,
              top: pos.y,
              transform: 'translateX(-100%)',
              zIndex: 9999,
            }}
            className="min-w-[220px] bg-slate-900 rounded-xl shadow-2xl border border-slate-700/60 py-1.5 overflow-hidden"
          >
            {has1st ? (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-emerald-400">
                <span className="text-emerald-400 font-semibold">✓</span>
                <span className="font-medium">
                  1st done {formatDate(intro.followup_1_at ?? '')}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => run(() => markFollowUp1(intro.id))}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-200 hover:bg-slate-700/70 hover:text-white transition-colors duration-100 cursor-pointer"
              >
                <span className="text-slate-500 text-base leading-none">☐</span>
                <span className="font-medium">Mark 1st Follow-up</span>
              </button>
            )}

            {has2nd ? (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-emerald-400">
                <span className="font-semibold">✓</span>
                <span className="font-medium">
                  2nd done {formatDate(intro.followup_2_at ?? '')}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => (has1st ? run(() => markFollowUp2(intro.id)) : undefined)}
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
              <button
                type="button"
                onClick={() => run(() => clearFollowUp2(intro.id))}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-400 hover:bg-slate-700/70 hover:text-slate-200 transition-colors duration-100 cursor-pointer"
              >
                <span className="text-xs">↩</span>
                <span>Undo 2nd</span>
              </button>
            )}
            {has1st && (
              <button
                type="button"
                onClick={handleUndo1}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-400 hover:bg-slate-700/70 hover:text-slate-200 transition-colors duration-100 cursor-pointer"
              >
                <span className="text-xs">↩</span>
                <span>Undo 1st</span>
              </button>
            )}
            {!has1st && !has2nd && (
              <div className="px-3.5 py-2 text-xs text-slate-600">Nothing to undo</div>
            )}

            <div className="h-px bg-slate-700/50 mx-3 my-1" />

            {showReminderInput ? (
              <div className="px-3.5 py-2">
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="flex-1 min-w-0 bg-slate-800 border border-slate-600 rounded text-xs text-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveReminder}
                    disabled={!reminderDate || savingReminder}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs rounded px-2 py-1 disabled:opacity-40"
                  >
                    {savingReminder ? '…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReminderInput(false)}
                    className="text-slate-500 hover:text-slate-300 text-xs px-1"
                    aria-label="Close reminder input"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowReminderInput(true);
                  setReminderDate(
                    intro.followup_reminder_at
                      ? utcTimestampToDateInput(intro.followup_reminder_at)
                      : ''
                  );
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-400 hover:bg-slate-700/70 hover:text-slate-200 transition-colors duration-100 cursor-pointer"
              >
                <span className="text-xs">🗓</span>
                <span>
                  {intro.followup_reminder_at
                    ? `Reminder: ${formatReminderDate(intro.followup_reminder_at)}`
                    : 'Set reminder'}
                </span>
              </button>
            )}

            <div className="h-px bg-slate-700/50 mx-3 my-1" />

            <button
              type="button"
              onClick={handleDismiss}
              disabled={loading}
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
