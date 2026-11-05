'use client';

import { useEffect, useState } from 'react';
import {
  attendanceCounts,
  MARKING_OPENS_MINUTES_BEFORE,
  type MatSlot,
  slotStatus,
  todaysSlots,
} from '@/lib/analytics/todayOnTheMats';
import { errorHandler } from '@/lib/errorHandler';
import { updateIntroStatus } from '@/lib/supabase/intros';
import { updateIntroAttendance } from '@/lib/supabase/introTableActions';
import type { Intro } from '@/types';
import CancelBookingDialog from '../intros/CancelBookingDialog';

const secondaryButton =
  'min-h-11 rounded-[var(--radius-control)] border border-[var(--control-border)] bg-[var(--surface)] px-3 text-xs font-medium hover:bg-[var(--hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--navy)] disabled:cursor-not-allowed disabled:opacity-60';

type Attendance = 'Yes' | 'No' | '';

function attendanceButtonStyle(selected: boolean, value: 'Yes' | 'No'): string {
  if (!selected) {
    return 'border-[var(--control-border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--hover)]';
  }
  return value === 'Yes'
    ? 'border-green-200 bg-green-50 text-green-800'
    : 'border-[var(--accent-100)] bg-[var(--accent-50)] text-[var(--accent-ink)]';
}

function statusLine(
  slot: MatSlot,
  now: Date,
  overrides: Record<string, Attendance>
): { text: string; needsAction: boolean } {
  const timing = slotStatus(slot, now);
  if (timing.status === 'upcoming') {
    const hours = Math.floor(timing.minutesUntil / 60);
    const minutes = timing.minutesUntil % 60;
    return {
      text: `Starts in ${hours ? `${hours} h ` : ''}${minutes} m`,
      needsAction: false,
    };
  }
  if (timing.status === 'in-progress' || timing.status === 'unknown') {
    return {
      text: timing.end
        ? `In progress, ends ${timing.end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
        : 'Time not set · mark attendance',
      needsAction: false,
    };
  }
  const { came, noShow, notMarked } = attendanceCounts(slot, overrides);
  return {
    text: `${came} came · ${noShow} no-show · ${notMarked} not marked`,
    needsAction: notMarked > 0,
  };
}

function AttendanceToggle({
  name,
  current,
  pending,
  canMark,
  opensAt,
  onChange,
}: {
  name: string;
  current: Attendance | undefined;
  pending: boolean;
  canMark: boolean;
  opensAt: string | undefined;
  onChange: (value: Attendance) => void;
}) {
  return (
    <fieldset
      className={`inline-flex rounded-[var(--radius-control)] ${pending ? 'opacity-60' : ''}`}
    >
      <legend className="sr-only">Attendance for {name}</legend>
      {(['Yes', 'No'] as const).map((value) => {
        const selected = current === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={selected}
            disabled={!canMark || pending}
            title={
              canMark
                ? undefined
                : `Available from ${opensAt}, ${MARKING_OPENS_MINUTES_BEFORE} min before class`
            }
            onClick={() => onChange(selected ? '' : value)}
            className={`min-h-11 min-w-20 border px-3 text-xs font-medium focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--navy)] disabled:cursor-not-allowed ${attendanceButtonStyle(selected, value)} first:rounded-l-[var(--radius-control)] last:rounded-r-[var(--radius-control)]`}
          >
            {value === 'Yes' ? 'Came' : 'No-show'}
          </button>
        );
      })}
    </fieldset>
  );
}

function MatSlotCard({
  slot,
  now,
  onAttendanceChanged,
  onCancel,
}: {
  slot: MatSlot;
  now: Date;
  onAttendanceChanged: () => Promise<void> | void;
  onCancel: (intro: Intro) => void;
}) {
  const [overrides, setOverrides] = useState<Record<string, Attendance>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const timing = slotStatus(slot, now);
  const status = timing.status;
  const opensAt = timing.markingOpensAt?.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const line = statusLine(slot, now, overrides);
  const defaultOpen = status === 'finished' && attendanceCounts(slot, overrides).notMarked > 0;
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    if (defaultOpen) {
      setOpen(true);
    }
  }, [defaultOpen]);

  const changeAttendance = async (intro: Intro, value: Attendance) => {
    const previous = (intro.attended || '') as Attendance;
    setOverrides((current) => ({ ...current, [intro.id]: value }));
    setPending((current) => ({ ...current, [intro.id]: true }));
    setErrors((current) => ({ ...current, [intro.id]: false }));
    try {
      const { error } = await updateIntroAttendance(intro.id, value);
      if (error) {
        throw error;
      }
    } catch {
      setOverrides((current) => ({ ...current, [intro.id]: previous }));
      setErrors((current) => ({ ...current, [intro.id]: true }));
      setPending((current) => ({ ...current, [intro.id]: false }));
      return;
    }
    try {
      await onAttendanceChanged();
    } finally {
      setOverrides((current) =>
        Object.fromEntries(Object.entries(current).filter(([id]) => id !== intro.id))
      );
      setPending((current) => ({ ...current, [intro.id]: false }));
    }
  };

  // Restoring is non-destructive, so no confirmation step (same as the Intros tab)
  const restore = async (intro: Intro) => {
    setPending((current) => ({ ...current, [intro.id]: true }));
    try {
      await updateIntroStatus(intro.id, 'Active');
      await onAttendanceChanged();
      errorHandler.notify(`Booking for ${intro.name} restored`, 'success');
    } catch (err) {
      errorHandler.handle(err, 'restoreBooking');
    } finally {
      setPending((current) => ({ ...current, [intro.id]: false }));
    }
  };

  return (
    <li className="min-w-0 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-sm font-semibold tabular-nums text-[var(--text)]">{slot.time}</div>
      <div className="text-sm text-[var(--muted)]">{slot.className}</div>
      <p
        className={`mt-1 text-xs ${line.needsAction ? 'text-[var(--negative)]' : 'text-[var(--muted)]'}`}
      >
        {line.text}
      </p>
      <details
        className="mt-3 border-t border-[var(--rule)] pt-2"
        open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
      >
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-[var(--navy)] hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--navy)]">
          {open ? 'Hide names' : `Show names (${slot.intros.length})`}
        </summary>
        <ul className="divide-y divide-[var(--rule)]">
          {slot.intros.map((intro) => (
            <li
              key={intro.id}
              className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div
                  className={`break-words text-sm ${intro.status === 'Cancelled' ? 'text-[var(--muted)] line-through' : 'text-[var(--text)]'}`}
                >
                  {intro.name}
                </div>
                <div className="text-xs text-[var(--muted)]">
                  {intro.status === 'Cancelled' ? 'Cancelled' : intro.staff || 'Staff not set'}
                </div>
              </div>
              <div className="shrink-0">
                {intro.status === 'Cancelled' ? (
                  <button
                    type="button"
                    disabled={!!pending[intro.id]}
                    onClick={() => void restore(intro)}
                    aria-label={`Restore booking for ${intro.name}`}
                    className={`${secondaryButton} text-[var(--text)]`}
                  >
                    Restore
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <AttendanceToggle
                      name={intro.name}
                      current={
                        Object.hasOwn(overrides, intro.id)
                          ? overrides[intro.id]
                          : (intro.attended as Attendance | undefined)
                      }
                      pending={!!pending[intro.id]}
                      canMark={timing.canMark}
                      opensAt={opensAt}
                      onChange={(value) => void changeAttendance(intro, value)}
                    />
                    <button
                      type="button"
                      disabled={!!pending[intro.id]}
                      onClick={() => onCancel(intro)}
                      aria-label={`Cancel booking for ${intro.name}`}
                      className={`${secondaryButton} text-[var(--negative)]`}
                    >
                      Cancel
                    </button>
                  </div>
                )}
                {errors[intro.id] && (
                  <p role="alert" className="mt-1 text-xs text-[var(--negative)]">
                    Couldn&apos;t save, try again
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

export default function TodayOnTheMats({
  intros,
  onAttendanceChanged,
}: {
  intros: Intro[];
  onAttendanceChanged: () => Promise<void> | void;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const interval = setInterval(tick, 60_000);
    // Timers stall while the tab is frozen or the computer sleeps, so catch up on return
    const onVisible = () => document.visibilityState === 'visible' && tick();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', tick);
    };
  }, []);

  const [cancellingIntro, setCancellingIntro] = useState<Intro | null>(null);
  const slots = todaysSlots(intros, now);
  const active = (slot: MatSlot) => slot.intros.filter((i) => i.status !== 'Cancelled').length;
  const total = slots.reduce((count, slot) => count + active(slot), 0);
  const upcoming = slots.reduce(
    (count, slot) => count + (slotStatus(slot, now).status === 'upcoming' ? active(slot) : 0),
    0
  );
  const toMark = slots.reduce(
    (count, slot) =>
      count + (slotStatus(slot, now).status === 'finished' ? attendanceCounts(slot).notMarked : 0),
    0
  );

  return (
    <section className="section-container">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Today on the mats</h2>
        <p className="text-sm tabular-nums text-[var(--muted)]">
          {total} intro{total === 1 ? '' : 's'} today · {upcoming} upcoming
          {toMark > 0 && <span className="text-[var(--negative)]"> · {toMark} to mark</span>}
        </p>
      </div>
      {slots.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {slots.map((slot) => (
            <MatSlotCard
              key={JSON.stringify([slot.time, slot.className])}
              slot={slot}
              now={now}
              onAttendanceChanged={onAttendanceChanged}
              onCancel={setCancellingIntro}
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-[var(--radius-control)] border border-dashed border-[var(--border)] p-3 text-sm text-[var(--muted)]">
          No intros booked today
        </p>
      )}
      {cancellingIntro && (
        <CancelBookingDialog
          intro={cancellingIntro}
          onClose={() => setCancellingIntro(null)}
          onCancelled={onAttendanceChanged}
        />
      )}
    </section>
  );
}
