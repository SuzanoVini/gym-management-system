import { formatDateISO } from '@/lib/utils/date.utils';
import type { Intro } from '@/types';

export interface MatSlot {
  time: string;
  className: string;
  intros: Intro[];
}

export type MatSlotStatus = 'upcoming' | 'in-progress' | 'finished' | 'unknown';

// Staff can mark attendance from this long before the class starts (people arrive early to change).
export const MARKING_OPENS_MINUTES_BEFORE = 20;

// GB Kitsilano's class schedule sets the shorter kids and youth sessions.
export function classLengthMinutes(name: string): number {
  const has = (n: number) => new RegExp(`\\b${n}\\b`).test(name);
  if (has(3) && has(5)) {
    return 40;
  }
  if ((has(6) && has(8)) || (has(7) && has(9))) {
    return 45;
  }
  if (/junior|teen/i.test(name) || (has(9) && has(13))) {
    return 50;
  }
  return 60;
}

export function minutesOf(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})\s*([AP]M)?$/i.exec(time.trim());
  if (!match) {
    return null;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > (match[3] ? 12 : 23) || hour < (match[3] ? 1 : 0) || minute > 59) {
    return null;
  }
  return (match[3] ? (hour % 12) + (match[3].toUpperCase() === 'PM' ? 12 : 0) : hour) * 60 + minute;
}

export function todaysSlots(intros: Intro[], now: Date): MatSlot[] {
  const today = formatDateISO(now);
  const slots = new Map<string, MatSlot>();
  for (const intro of intros) {
    if (intro.date !== today) {
      continue;
    }
    const time = intro.time?.trim() || 'Time not set';
    const key = JSON.stringify([time, intro.class]);
    const slot = slots.get(key) ?? { time, className: intro.class, intros: [] };
    slot.intros.push(intro);
    slots.set(key, slot);
  }
  return [...slots.values()].sort(
    (a, b) => (minutesOf(a.time) ?? Infinity) - (minutesOf(b.time) ?? Infinity)
  );
}

export function slotStatus(
  slot: MatSlot,
  now: Date
): {
  status: MatSlotStatus;
  end: Date | null;
  minutesUntil: number;
  canMark: boolean;
  markingOpensAt: Date | null;
} {
  const startMinutes = minutesOf(slot.time);
  if (startMinutes === null) {
    return { status: 'unknown', end: null, minutesUntil: 0, canMark: true, markingOpensAt: null };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, startMinutes);
  const end = new Date(start.getTime() + classLengthMinutes(slot.className) * 60_000);
  const markingOpensAt = new Date(start.getTime() - MARKING_OPENS_MINUTES_BEFORE * 60_000);
  return {
    status: now < start ? 'upcoming' : now < end ? 'in-progress' : 'finished',
    end,
    minutesUntil: Math.max(0, Math.ceil((start.getTime() - now.getTime()) / 60_000)),
    canMark: now >= markingOpensAt,
    markingOpensAt,
  };
}

export function attendanceCounts(
  slot: MatSlot,
  overrides: Record<string, 'Yes' | 'No' | ''> = {}
): { came: number; noShow: number; notMarked: number } {
  return slot.intros.reduce(
    (counts, intro) => {
      const attended = Object.hasOwn(overrides, intro.id) ? overrides[intro.id] : intro.attended;
      if (attended === 'Yes') {
        counts.came += 1;
      } else if (attended === 'No') {
        counts.noShow += 1;
      } else {
        counts.notMarked += 1;
      }
      return counts;
    },
    { came: 0, noShow: 0, notMarked: 0 }
  );
}
