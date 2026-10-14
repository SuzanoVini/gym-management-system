import type { Cancellation, Hold, Intro, Signup } from '@/types';

export interface JourneyEvent {
  date: string;
  label: string;
  sublabel?: string | undefined;
  color: string;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Timeline combines four record types into one ordered journey.
export function buildJourneyEvents(
  intros: Intro[],
  signups: Signup[],
  holds: Hold[],
  cancellations: Cancellation[]
): JourneyEvent[] {
  const nextEvents: JourneyEvent[] = [];

  for (const row of intros) {
    if (row.date) {
      nextEvents.push({
        date: row.date,
        label: 'Intro class',
        sublabel: row.class || undefined,
        color: 'bg-red-600',
      });
    }
  }

  for (const row of signups) {
    if (row.membership_date) {
      nextEvents.push({
        date: row.membership_date,
        label: `Signed up - ${row.membership}`,
        color: 'bg-green-600',
      });
    }
  }

  for (const row of holds) {
    if (row.start) {
      nextEvents.push({
        date: row.start,
        label: 'Membership hold',
        sublabel: row.end ? `Until ${row.end}` : 'Open-ended',
        color: 'bg-orange-500',
      });
    }
  }

  for (const row of cancellations) {
    if (row.date) {
      nextEvents.push({
        date: row.date,
        label: 'Cancelled',
        sublabel: row.reason || undefined,
        color: 'bg-gray-700',
      });
    }
  }

  return nextEvents.sort((a, b) => a.date.localeCompare(b.date));
}
