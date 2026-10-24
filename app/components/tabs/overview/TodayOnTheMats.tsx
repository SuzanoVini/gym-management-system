import { formatDateISO } from '@/lib/utils/date.utils';
import type { Intro } from '@/types';

export interface MatSlot {
  time: string;
  className: string;
  booked: number;
  attended: number;
}

// "6:00 PM" -> minutes after midnight, so classes sort in the order they happen.
function minutesOf(time: string): number {
  const m = /^(\d{1,2}):(\d{2})\s*([AP]M)?$/i.exec(time.trim());
  if (!m) {
    return Number.MAX_SAFE_INTEGER;
  }
  let h = Number(m[1]) % 12;
  if (m[3]?.toUpperCase() === 'PM') {
    h += 12;
  } else if (!m[3]) {
    h = Number(m[1]);
  }
  return h * 60 + Number(m[2]);
}

// Today's intro bookings grouped by class slot, in schedule order.
export function todaysSlots(intros: Intro[], today = formatDateISO(new Date())): MatSlot[] {
  const slots = new Map<string, MatSlot>();
  for (const intro of intros) {
    if (intro.date !== today) {
      continue;
    }
    const time = intro.time?.trim() || 'Time not set';
    const key = `${time}|${intro.class}`;
    const slot = slots.get(key) ?? { time, className: intro.class, booked: 0, attended: 0 };
    slot.booked += 1;
    if (intro.attended === 'Yes') {
      slot.attended += 1;
    }
    slots.set(key, slot);
  }
  return [...slots.values()].sort((a, b) => minutesOf(a.time) - minutesOf(b.time));
}

// The gym's own day: who is coming in for a trial class today, class by class.
export default function TodayOnTheMats({ intros }: { intros: Intro[] }) {
  const slots = todaysSlots(intros);
  const booked = slots.reduce((n, s) => n + s.booked, 0);
  return (
    <div className="section-container">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Today on the mats</h2>
        <span className="text-sm text-[var(--muted)] tabular-nums">
          {booked === 0
            ? 'No intros booked today'
            : `${booked} intro${booked === 1 ? '' : 's'} booked`}
        </span>
      </div>
      {slots.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {slots.map((slot) => (
            <li
              key={`${slot.time}|${slot.className}`}
              className="rounded-md border border-[var(--rule)] bg-[var(--raised)] px-4 py-3"
            >
              <div className="text-sm font-semibold tabular-nums text-[var(--text)]">
                {slot.time}
              </div>
              <div className="truncate text-sm text-[var(--gb-dark-gray)]" title={slot.className}>
                {slot.className}
              </div>
              <div className="mt-1 text-xs tabular-nums text-[var(--muted)]">
                {slot.booked} booked · {slot.attended} attended
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
