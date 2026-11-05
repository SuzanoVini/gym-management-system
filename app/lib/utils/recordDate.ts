import type { Cancellation, Hold, Intro, Signup } from '@/types';
import { parseDate } from './date.utils';

const MONTH_INDEX: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

/** Date-only strings read in local time; new Date() would shift them a day back in Vancouver. */
export function parseRecordDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const parsed = parseDate(value) ?? new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

// created_at is only the last resort: on imported history it holds the import date,
// which would make years-old records look like they happened this week.
function eventDate(
  specific: string | null | undefined,
  month: string | null | undefined,
  year: number | null | undefined,
  createdAt: string | null | undefined
): Date | null {
  const exact = parseRecordDate(specific);
  if (exact) {
    return exact;
  }
  const monthIndex = month ? MONTH_INDEX[month] : undefined;
  if (monthIndex !== undefined && year) {
    return new Date(year, monthIndex, 1);
  }
  return parseRecordDate(createdAt);
}

export const introDate = (i: Intro) => eventDate(i.date, i.month, i.year, i.created_at);
export const signupDate = (s: Signup) =>
  eventDate(s.membership_date, s.month, s.year, s.created_at);
export const cancellationDate = (c: Cancellation) =>
  eventDate(c.date, c.month, c.year, c.created_at);
export const holdDate = (h: Hold) => eventDate(h.start, h.month, h.year, h.created_at);
