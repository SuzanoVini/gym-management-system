'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  clearFollowUp1,
  clearFollowUp2,
  markFollowUp1,
  markFollowUp2,
} from '@/lib/supabase/intros';
import type { Intro } from '@/types';

interface Props {
  intro: Pick<Intro, 'id' | 'signed_up' | 'followup_1_at' | 'followup_2_at'>;
  onUpdate: () => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: UI state machine with follow-up states, popover, and undo logic
export default function FollowUpCheckButton({ intro, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const has1st = !!intro.followup_1_at;
  const has2nd = !!intro.followup_2_at;

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

  const icon = has2nd ? '✓' : has1st ? '①' : '☐';
  const iconStyle = has2nd
    ? 'bg-green-100 border-green-400 text-green-700'
    : has1st
      ? 'bg-blue-100 border-blue-400 text-blue-700'
      : 'bg-gray-100 border-gray-300 text-gray-400';

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ x: rect.right, y: rect.bottom + 4 });
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
            className="min-w-[200px] bg-white rounded-xl shadow-xl border border-gray-100 py-1 overflow-hidden"
          >
            {has1st ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-green-700">
                <span>✓</span>
                <span>1st done {formatDate(intro.followup_1_at ?? '')}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => run(() => markFollowUp1(intro.id))}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <span className="text-gray-400">☐</span>
                <span>Mark 1st Follow-up</span>
              </button>
            )}

            {has2nd ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-green-700">
                <span>✓</span>
                <span>2nd done {formatDate(intro.followup_2_at ?? '')}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => (has1st ? run(() => markFollowUp2(intro.id)) : undefined)}
                disabled={!has1st}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${
                  has1st ? 'text-gray-700 hover:bg-gray-50' : 'text-gray-300 cursor-not-allowed'
                }`}
              >
                <span>☐</span>
                <span>Mark 2nd Follow-up</span>
                {!has1st && <span className="ml-auto text-xs text-gray-300">needs 1st</span>}
              </button>
            )}

            <div className="h-px bg-gray-100 mx-2 my-1" />

            {has2nd && (
              <button
                type="button"
                onClick={() => run(() => clearFollowUp2(intro.id))}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 cursor-pointer"
              >
                <span>↩</span>
                <span>Undo 2nd</span>
              </button>
            )}
            {has1st && (
              <button
                type="button"
                onClick={handleUndo1}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 cursor-pointer"
              >
                <span>↩</span>
                <span>Undo 1st</span>
              </button>
            )}
            {!has1st && !has2nd && (
              <div className="px-3 py-2 text-xs text-gray-300">Nothing to undo</div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
