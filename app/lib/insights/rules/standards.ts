import { cancellationDate, parseRecordDate, signupDate } from '@/lib/utils/recordDate';
import type { InsightRule } from '../rules';

const DAY_MS = 24 * 60 * 60 * 1000;
const EARLY_WINDOW_DAYS = 90;
// ponytail: the standards give no numeric show rate, 60% is our own trigger, tune it here
const MIN_SHOW_RATE = 60;

const personName = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ');

export const lowShowRate: InsightRule = ({ intros, now }) => {
  const decided = intros.filter((i) => {
    const date = parseRecordDate(i.date);
    return (
      i.status !== 'Cancelled' &&
      (i.attended === 'Yes' || i.attended === 'No') &&
      date !== null &&
      date <= now
    );
  });
  if (decided.length < 10) {
    return null;
  }

  const showed = decided.filter((i) => i.attended === 'Yes').length;
  const showRate = (showed / decided.length) * 100;
  if (showRate >= MIN_SHOW_RATE) {
    return null;
  }

  return {
    id: 'low-show-rate',
    title: `Only ${showRate.toFixed(0)}% of Booked Intros Showed Up`,
    message: `${showed} of ${decided.length} booked intros in this period came to class.\n\nEvery no-show is a lead you already paid to get, and a confirmation before the class is the cheapest way to keep them.`,
    icon: 'Calendar',
    color: 'orange',
    priority: 'medium',
    standard: 'Sales: lead-to-member funnel',
    actions: [
      'Confirm by text 24 hours before, with the time and address, and ask for a reply',
      'Ask them to arrive 10 minutes early so a clean uniform is ready in their size',
      'Work no-shows through Follow Ups, offering the times for the class they booked',
    ],
    category: 'conversion',
  };
};

export const earlyCancellations: InsightRule = ({ signups, cancellations, now }) => {
  const earliest = now.getTime() - EARLY_WINDOW_DAYS * DAY_MS;

  const early = cancellations.filter((c) => {
    const cancelled = cancellationDate(c);
    if (!cancelled || cancelled.getTime() < earliest || cancelled > now) {
      return false;
    }
    return signups.some((s) => {
      const joined = signupDate(s);
      if (!joined || personName(s.name) !== personName(c.name)) {
        return false;
      }
      const daysIn = (cancelled.getTime() - joined.getTime()) / DAY_MS;
      return daysIn >= 0 && daysIn <= EARLY_WINDOW_DAYS;
    });
  });

  if (early.length < 3) {
    return null;
  }

  const names = early
    .slice(0, 8)
    .map((c) => `• ${c.name}`)
    .join('\n');

  return {
    id: 'early-cancellations',
    title: `${early.length} Members Cancelled Within 90 Days of Joining`,
    message: `In the last 90 days, ${early.length} members cancelled within 90 days of signing up:\n\n${names}\n\nLeaving this early usually means they never settled in, which is about the first classes more than the program.`,
    icon: 'Users',
    color: 'orange',
    priority: 'high',
    standard: 'Student experience: belonging and individuality',
    actions: [
      'Call each one and ask what would have made them stay',
      'Greet new members by name and make sure they have a partner in class',
      'Check in with every new member during their first 30 days',
    ],
    category: 'retention',
  };
};
