import { businessDaysBetween } from '@/lib/utils/businessDays';
import type { Intro } from '@/types';
import type { InsightRule } from '../rules';

function daysAgo(now: Date, dateStr: string | undefined | null): number | null {
  if (!dateStr) {
    return null;
  }
  return (now.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
}

export const retentionMomentumNegative: InsightRule = ({ signups, cancellations, now }) => {
  const withinLast = (dateStr: string | undefined, maxDays: number) => {
    const d = daysAgo(now, dateStr);
    return d !== null && d <= maxDays;
  };
  const withinRange = (dateStr: string | undefined, minDays: number, maxDays: number) => {
    const d = daysAgo(now, dateStr);
    return d !== null && d > minDays && d <= maxDays;
  };

  const recentSignups = signups.filter((s) => withinLast(s.created_at, 30)).length;
  const priorSignups = signups.filter((s) => withinRange(s.created_at, 30, 60)).length;
  const recentCancels = cancellations.filter((c) => withinLast(c.created_at, 30)).length;
  const priorCancels = cancellations.filter((c) => withinRange(c.created_at, 30, 60)).length;

  if (priorSignups <= 0 || priorCancels <= 0) {
    return null;
  }

  const signupGrowth = ((recentSignups - priorSignups) / priorSignups) * 100;
  const cancelChange = ((recentCancels - priorCancels) / priorCancels) * 100;

  if (!(signupGrowth < -20 || cancelChange > 20)) {
    return null;
  }

  return {
    id: 'retention-momentum-negative',
    title: 'Declining Retention Momentum — Act Now',
    message: `Last 30 days vs. prior 30 days:
Signups: ${recentSignups} (${signupGrowth > 0 ? '+' : ''}${signupGrowth.toFixed(0)}%)
Cancellations: ${recentCancels} (${cancelChange > 0 ? '+' : ''}${cancelChange.toFixed(0)}%)

This trend will compound — address it before it accelerates.`,
    icon: 'TrendingDown',
    color: 'orange',
    priority: 'high',
    impact: `Trend reversal could recover ${Math.abs(Math.round(signupGrowth / 10))} members/month`,
    actions: [
      'Hold team meeting to identify what changed',
      'Review any recent pricing or program changes',
      'Increase member check-ins this week',
      'Launch emergency retention outreach',
    ],
    category: 'retention',
  };
};

export const ageGroupCancellationConcentration: InsightRule = ({
  cancellations,
  revenuePerMember,
}) => {
  const ageGroupMap = cancellations.reduce<Record<string, number>>((acc, c) => {
    if (c.age_group) {
      acc[c.age_group] = (acc[c.age_group] || 0) + 1;
    }
    return acc;
  }, {});
  const totalWithAge = Object.values(ageGroupMap).reduce((s, n) => s + n, 0);
  const topAgeEntry = Object.entries(ageGroupMap).sort((a, b) => b[1] - a[1])[0];

  if (!topAgeEntry || totalWithAge < 10) {
    return null;
  }

  const [ageGroup, ageCount] = topAgeEntry;
  const agePct = (ageCount / totalWithAge) * 100;
  if (agePct <= 40) {
    return null;
  }

  return {
    id: 'age-group-cancellation-concentration',
    title: `${ageGroup} Age Group = ${agePct.toFixed(0)}% of Cancellations`,
    message: `${ageCount} of ${totalWithAge} cancellations are from the ${ageGroup} group.

This concentration points to a retention issue specific to this demographic.`,
    icon: 'Users',
    color: 'orange',
    priority: 'high',
    impact: `Retaining 50% of this group = $${(Math.round(ageCount * 0.5) * revenuePerMember).toLocaleString()}/month`,
    actions: [
      `Survey recent ${ageGroup} cancellations to identify the pattern`,
      `Review class schedule for ${ageGroup}-friendly time slots`,
      `Create a ${ageGroup}-focused retention offer`,
      'Adjust programming to better serve this demographic',
    ],
    category: 'retention',
  };
};

export const reEngagementWindow: InsightRule = ({ cancellations, now, revenuePerMember }) => {
  const reEngageable = cancellations.filter((c) => {
    const d = daysAgo(now, c.created_at);
    if (d === null || d > 60) {
      return false;
    }
    const r = (c.reason ?? '').toLowerCase();
    return (
      r.includes('financial') ||
      r.includes('money') ||
      r.includes('schedule') ||
      r.includes('time') ||
      r.includes('personal')
    );
  });

  if (reEngageable.length < 2) {
    return null;
  }

  const recoverable = Math.max(1, Math.round(reEngageable.length * 0.3));

  return {
    id: 're-engagement-window',
    title: `${reEngageable.length} Recently Cancelled Members Are Re-Engageable`,
    message: `${reEngageable.length} members cancelled in the last 60 days for reasons that may have changed (financial, scheduling, personal).

The 60-day window is critical — after that, habits change and re-engagement becomes much harder.`,
    icon: 'Users',
    color: 'blue',
    priority: 'high',
    impact: `Re-engaging 30% = ${recoverable} members = $${(recoverable * revenuePerMember).toLocaleString()}/month`,
    actions: [
      'Make a personal call or text (not email) to each person',
      'Ask: "Has anything changed since you left?"',
      'Offer a flexible re-join option (shorter commitment or lower rate)',
      'Invite them to a free community event or open house',
    ],
    category: 'retention',
  };
};

function collectLatenciesByStaff(intros: Intro[]): Map<string, number[]> {
  const latenciesByStaff = new Map<string, number[]>();

  for (const intro of intros) {
    if (intro.attended !== 'Yes' || !intro.date || !intro.followup_1_at) {
      continue;
    }
    const introDate = new Date(intro.date);
    const contactDate = new Date(intro.followup_1_at);
    if (Number.isNaN(introDate.getTime()) || Number.isNaN(contactDate.getTime())) {
      continue;
    }
    const latency = businessDaysBetween(introDate, contactDate);
    const staff = intro.staff || 'Unassigned';
    const list = latenciesByStaff.get(staff) ?? [];
    list.push(latency);
    latenciesByStaff.set(staff, list);
  }

  return latenciesByStaff;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const midValue = sorted[mid];
  if (midValue === undefined) {
    return 0;
  }
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? midValue) + midValue) / 2 : midValue;
}

export const speedToFirstContact: InsightRule = ({ intros }) => {
  const latenciesByStaff = collectLatenciesByStaff(intros);
  const allLatencies = [...latenciesByStaff.values()].flat();
  if (allLatencies.length < 5) {
    return null;
  }

  const overallMedian = median(allLatencies);
  if (overallMedian <= 2) {
    return null;
  }

  const staffBreakdown = [...latenciesByStaff.entries()]
    .map(([staff, list]) => ({ staff, median: median(list) }))
    .sort((a, b) => b.median - a.median)
    .map(({ staff, median: value }) => `• ${staff}: ${value.toFixed(1)} business days`)
    .join('\n');

  return {
    id: 'speed-to-first-contact',
    title: `Slow First Contact — ${overallMedian.toFixed(1)} Business Days Median`,
    message: `Median time from intro to first follow-up is ${overallMedian.toFixed(1)} business days, above the 2-day target.\n\n${staffBreakdown}\n\nContact speed is the #1 lever for intro-to-signup conversion.`,
    icon: 'Clock',
    color: 'orange',
    priority: 'medium',
    impact: 'Faster first contact directly improves conversion rate',
    actions: [
      'Set a same-day or next-day follow-up habit for every attended intro',
      'Use the Follow Ups tab tiers to catch anyone slipping past 2 days',
      'Consider a same-day text template for instructors after class',
    ],
    category: 'conversion',
  };
};
