import { cancellationDate, parseRecordDate, signupDate } from '@/lib/utils/recordDate';
import type { InsightRule } from '../rules';

function monthKey(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

function countRecordsByMonth<T>(
  records: T[],
  dateOf: (record: T) => Date | null,
  currentKey: number,
  monthsBack: number
): Map<number, number> {
  const countsByMonth = new Map<number, number>();

  for (const record of records) {
    const date = dateOf(record);
    if (!date) {
      continue;
    }
    const key = monthKey(date);
    if (key > currentKey || key <= currentKey - monthsBack) {
      continue;
    }
    countsByMonth.set(key, (countsByMonth.get(key) ?? 0) + 1);
  }

  return countsByMonth;
}

export const holdExpiryWatchlist: InsightRule = ({ holds, now }) => {
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiringSoon = holds.filter((hold) => {
    const end = parseRecordDate(hold.end);
    return end !== null && end >= now && end <= sevenDaysOut;
  });

  if (expiringSoon.length === 0) {
    return null;
  }

  const names = expiringSoon
    .slice(0, 8)
    .map((hold) => `• ${hold.name}`)
    .join('\n');

  return {
    id: 'hold-expiry-watchlist',
    title: `${expiringSoon.length} Hold${expiringSoon.length === 1 ? '' : 's'} Ending This Week`,
    message: `${expiringSoon.length} membership hold${expiringSoon.length === 1 ? '' : 's'} end${expiringSoon.length === 1 ? 's' : ''} in the next 7 days:\n\n${names}\n\nA hold that ends without the member returning is the churn moment — reach out before it lapses.`,
    icon: 'Clock',
    color: 'yellow',
    priority: 'high',
    impact: 'Our system sends no alert when a hold ends, so this is the only reminder',
    standard: 'Gym hold policy',
    actions: [
      'Reach out to each person before their hold ends',
      'Confirm they know their membership resumes on that date',
      'Offer to extend, with the request in at least 2 business days before the hold ends',
    ],
    category: 'retention',
  };
};

export const cancellationSpikeVsBaseline: InsightRule = ({ cancellations, now }) => {
  const currentKey = monthKey(now);
  const countsByMonth = countRecordsByMonth(cancellations, cancellationDate, currentKey, 6);
  const currentCount = countsByMonth.get(currentKey) ?? 0;
  const priorKeys = Array.from({ length: 5 }, (_, i) => currentKey - 1 - i);
  const priorCounts = priorKeys.map((key) => countsByMonth.get(key) ?? 0);
  const monthsWithData = priorCounts.filter((count) => count > 0).length;
  if (monthsWithData < 3) {
    return null;
  }

  const baseline = priorCounts.reduce((sum, count) => sum + count, 0) / priorCounts.length;
  if (baseline <= 0 || currentCount < baseline * 1.5 || currentCount - baseline < 3) {
    return null;
  }

  return {
    id: 'cancellation-spike-vs-baseline',
    title: `Cancellations Spiking — ${currentCount} vs ${baseline.toFixed(1)} Average`,
    message: `This month's ${currentCount} cancellations are well above the trailing 5-month average of ${baseline.toFixed(1)}.\n\nA spike this size is worth investigating before it becomes a trend.`,
    icon: 'AlertTriangle',
    color: 'red',
    priority: 'high',
    standard: 'Sales: cancellation call',
    actions: [
      "Review this month's cancellation reasons for a common thread",
      'Check for a recent pricing, schedule, or staffing change',
      'Call the 3 most recent cancellations to ask what changed',
    ],
    category: 'retention',
  };
};

export const positiveMilestone: InsightRule = ({ signups, now }) => {
  const currentKey = monthKey(now);
  const countsByMonth = countRecordsByMonth(signups, signupDate, currentKey, 12);
  const currentCount = countsByMonth.get(currentKey) ?? 0;
  const priorKeys = Array.from({ length: 11 }, (_, i) => currentKey - 1 - i);
  const priorCounts = priorKeys
    .map((key) => countsByMonth.get(key) ?? 0)
    .filter((count) => count > 0);

  if (currentCount < 5 || priorCounts.length < 6) {
    return null;
  }
  const best = Math.max(...priorCounts);
  if (currentCount <= best) {
    return null;
  }

  return {
    id: 'positive-milestone-best-signup-month',
    title: `Best Signup Month in Over a Year — ${currentCount} Sign-ups`,
    message: `This month's ${currentCount} sign-ups beat every month in the trailing year (previous best: ${best}).\n\nWorth celebrating — and worth understanding what worked so it can be repeated.`,
    icon: 'TrendingUp',
    color: 'green',
    priority: 'low',
    impact: 'Recognizing what worked helps repeat it',
    actions: [
      'Note what changed this month (promotion, season, staffing, referrals)',
      'Share the win with the team',
      'Consider repeating whatever drove the increase',
    ],
    category: 'growth',
  };
};
