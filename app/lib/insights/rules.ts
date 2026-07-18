import { businessDaysBetween } from '@/lib/utils/businessDays';
import type { Cancellation, Hold, Insight, Intro, Signup } from '@/types';

export const DEFAULT_MONTHLY_MEMBERSHIP_REVENUE = 180;

export interface InsightRuleInput {
  intros: Intro[];
  activeIntros: Intro[];
  signups: Signup[];
  cancellations: Cancellation[];
  holds: Hold[];
  now: Date;
  /** Configurable via the settings modal — replaces the old hardcoded $180/mo. */
  revenuePerMember: number;
}

export type InsightRule = (input: InsightRuleInput) => Insight | null;

function daysAgo(now: Date, dateStr: string | undefined | null): number | null {
  if (!dateStr) {
    return null;
  }
  return (now.getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
}

export const seasonalTravelCancellations: InsightRule = ({ cancellations, revenuePerMember }) => {
  const travelCancels = cancellations.filter(
    (c) =>
      c.reason?.toLowerCase().includes('travel') ||
      c.reason?.toLowerCase().includes('vacation') ||
      c.reason?.toLowerCase().includes('summer')
  );

  if (travelCancels.length <= 8) {
    return null;
  }

  const lostRevenue = travelCancels.length * revenuePerMember;
  const holdRecovery = Math.round(travelCancels.length * 0.6);
  const holdRevenue = holdRecovery * 29;

  return {
    id: 'seasonal-travel-cancellations',
    title: 'Summer Travel Cancellations - Preventable Loss',
    message: `${travelCancels.length} travel-related cancellations detected.
Lost revenue: $${lostRevenue.toLocaleString()}/month

These aren't lost causes - they're seasonal! Most travel cancellations will return if you give them an option to hold their membership.`,
    icon: 'Calendar',
    color: 'red',
    priority: 'critical',
    impact: `$${holdRevenue}/month from holds + member retention`,
    actions: [
      'Launch "Summer Hold" program immediately',
      'Offer $29/month hold fee vs. full cancellation',
      'Guarantee their spot when they return',
      `Contact ${travelCancels.length} recent travel cancellations TODAY`,
    ],
    category: 'retention',
  };
};

function cancellationReasonAdvice(reasonLower: string): { advice: string; actions: string[] } {
  if (reasonLower.includes('time') || reasonLower.includes('schedule')) {
    return {
      advice: 'Schedule conflicts are fixable - offer more class times or online options.',
      actions: [
        'Survey cancelled members about preferred class times',
        'Consider adding early morning (6AM) or late evening (8PM) classes',
        'Test virtual/online class options',
        'Offer flexible scheduling for busy members',
      ],
    };
  }
  if (
    reasonLower.includes('financial') ||
    reasonLower.includes('money') ||
    reasonLower.includes('expensive')
  ) {
    return {
      advice: 'Price sensitivity - create more accessible options.',
      actions: [
        'Introduce budget-friendly membership tier',
        'Offer payment plans (bi-weekly instead of monthly)',
        'Create student/family discounts',
        'Emphasize value in member communications',
      ],
    };
  }
  if (reasonLower.includes('injury') || reasonLower.includes('medical')) {
    return {
      advice: 'Medical holds should be offered, not cancellations.',
      actions: [
        'Create injury hold program (reduced rate during recovery)',
        'Offer modified training during recovery',
        'Partner with physical therapist for rehab programs',
        'Emphasize injury prevention in classes',
      ],
    };
  }
  if (reasonLower.includes('moving') || reasonLower.includes('relocation')) {
    return {
      advice: 'Moving members may return — keep the relationship warm.',
      actions: [
        'Offer a farewell freeze instead of cancellation',
        'Ask for a referral to friends/family staying in the area',
        'Send a "welcome back" offer if they return to the city',
        'Connect them with a partner gym in their new location',
      ],
    };
  }
  return { advice: 'Pattern detected - needs investigation.', actions: [] };
}

export const topCancellationReason: InsightRule = ({ cancellations, revenuePerMember }) => {
  const reasonCounts = cancellations.reduce<Record<string, number>>((acc, cancel) => {
    if (cancel.reason) {
      acc[cancel.reason] = (acc[cancel.reason] || 0) + 1;
    }
    return acc;
  }, {});

  const top = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] < 5) {
    return null;
  }

  const [reason, count] = top;
  const reasonLower = reason.toLowerCase();
  const { advice, actions } = cancellationReasonAdvice(reasonLower);
  const specificActions =
    actions.length > 0
      ? actions
      : [
          `Schedule exit interviews to understand "${reason}" better`,
          'Track this reason monthly to spot trends',
          'Create retention offer for this specific reason',
          'Review what competitors offer for similar situations',
        ];

  return {
    id: 'top-cancellation-reason',
    title: `Top Cancellation Reason: "${reason}" (${count} cancellations)`,
    message: `${count} members cancelled due to "${reason}".\n\n${advice}\n\nThis is a fixable pattern that's costing you members.`,
    icon: 'UserMinus',
    color: 'orange',
    priority: 'high',
    impact: `Reducing this by 50% = ${Math.round(count / 2)} retained members = $${(Math.round(count / 2) * revenuePerMember).toLocaleString()}/month`,
    actions: specificActions,
    category: 'retention',
  };
};

export const negativeGrowth: InsightRule = ({ signups, cancellations }) => {
  const totalSignups = signups.length;
  const netGrowth = totalSignups - cancellations.length;
  if (netGrowth >= 0) {
    return null;
  }

  const churnRate =
    totalSignups > 0 ? ((cancellations.length / totalSignups) * 100).toFixed(1) : '0';

  return {
    id: 'negative-growth',
    title: 'Negative Member Growth - Priority: Retention',
    message: `Net loss of ${Math.abs(netGrowth)} members this period.
Signups: ${totalSignups}
Cancellations: ${cancellations.length}
Churn rate: ${churnRate}%

You're working hard to get new members, but losing them faster. Focus on retention FIRST.`,
    icon: 'TrendingDown',
    color: 'red',
    priority: 'high',
    impact: `Reducing this by 30% would save ${Math.round(cancellations.length * 0.3)} members`,
    actions: [
      'Implement new member 30-day check-in program',
      'Create re-engagement campaign for inactive members',
      'Address top cancellation reasons immediately',
      'Launch member appreciation events',
    ],
    category: 'retention',
  };
};

export const lowConversionRate: InsightRule = ({ activeIntros, revenuePerMember }) => {
  const attendedIntros = activeIntros.filter((i) => i.attended === 'Yes').length;
  const signedUpFromIntros = activeIntros.filter(
    (i) => i.attended === 'Yes' && i.signed_up === 'Yes'
  ).length;
  const conversionRate = attendedIntros > 0 ? (signedUpFromIntros / attendedIntros) * 100 : 0;

  if (conversionRate >= 30 || attendedIntros <= 10) {
    return null;
  }

  const gapTo40 = Math.round((0.4 - conversionRate / 100) * attendedIntros);

  return {
    id: 'low-conversion-rate',
    title: `Low Conversion Rate - ${conversionRate.toFixed(1)}%`,
    message: `Your conversion rate is below industry standard.
Current: ${conversionRate.toFixed(1)}% (${signedUpFromIntros}/${attendedIntros})
Industry benchmark: 40-60%

Gap to 40%: ${gapTo40} additional signups needed`,
    icon: 'AlertTriangle',
    color: 'red',
    priority: 'high',
    impact: `Reaching 40% = $${(gapTo40 * revenuePerMember).toLocaleString()} monthly revenue`,
    actions: [
      'Review intro class structure and sales process',
      'Check pricing against local competitors',
      'Improve instructor engagement during intros',
      'Reduce friction in signup process (make it easier)',
    ],
    category: 'conversion',
  };
};

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

export const speedToFirstContact: InsightRule = ({ intros }) => {
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

  const allLatencies = [...latenciesByStaff.values()].flat();
  if (allLatencies.length < 5) {
    return null;
  }

  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const midValue = sorted[mid];
    if (midValue === undefined) {
      return 0;
    }
    return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? midValue) + midValue) / 2 : midValue;
  };

  const overallMedian = median(allLatencies);
  if (overallMedian <= 2) {
    return null;
  }

  const staffBreakdown = [...latenciesByStaff.entries()]
    .map(([staff, list]) => ({ staff, median: median(list) }))
    .sort((a, b) => b.median - a.median)
    .map(({ staff, median: m }) => `• ${staff}: ${m.toFixed(1)} business days`)
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

export const holdExpiryWatchlist: InsightRule = ({ holds, now }) => {
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiringSoon = holds.filter((h) => {
    if (!h.end) {
      return false;
    }
    const end = new Date(h.end);
    return !Number.isNaN(end.getTime()) && end >= now && end <= sevenDaysOut;
  });

  if (expiringSoon.length === 0) {
    return null;
  }

  const names = expiringSoon
    .slice(0, 8)
    .map((h) => `• ${h.name}`)
    .join('\n');

  return {
    id: 'hold-expiry-watchlist',
    title: `${expiringSoon.length} Hold${expiringSoon.length === 1 ? '' : 's'} Ending This Week`,
    message: `${expiringSoon.length} membership hold${expiringSoon.length === 1 ? '' : 's'} end${expiringSoon.length === 1 ? 's' : ''} in the next 7 days:\n\n${names}\n\nA hold that ends without the member returning is the churn moment — reach out before it lapses.`,
    icon: 'Clock',
    color: 'yellow',
    priority: 'high',
    impact: 'Win-back outreach before lapse is far cheaper than re-acquiring the member',
    actions: [
      'Reach out to each person before their hold ends',
      'Confirm they know their membership is resuming',
      'Offer to extend the hold if they need more time',
    ],
    category: 'retention',
  };
};

function monthKey(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

export const cancellationSpikeVsBaseline: InsightRule = ({ cancellations, now }) => {
  const currentKey = monthKey(now);
  const countsByMonth = new Map<number, number>();

  for (const c of cancellations) {
    if (!c.created_at) {
      continue;
    }
    const d = new Date(c.created_at);
    if (Number.isNaN(d.getTime())) {
      continue;
    }
    const key = monthKey(d);
    if (key > currentKey || key <= currentKey - 6) {
      continue;
    }
    countsByMonth.set(key, (countsByMonth.get(key) ?? 0) + 1);
  }

  const currentCount = countsByMonth.get(currentKey) ?? 0;
  const priorKeys = Array.from({ length: 5 }, (_, i) => currentKey - 1 - i);
  const priorCounts = priorKeys.map((k) => countsByMonth.get(k) ?? 0);
  const monthsWithData = priorCounts.filter((n) => n > 0).length;
  if (monthsWithData < 3) {
    return null;
  }

  const baseline = priorCounts.reduce((sum, n) => sum + n, 0) / priorCounts.length;
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
    impact: 'Catching a spike early keeps it from compounding next month',
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
  const countsByMonth = new Map<number, number>();

  for (const s of signups) {
    if (!s.created_at) {
      continue;
    }
    const d = new Date(s.created_at);
    if (Number.isNaN(d.getTime())) {
      continue;
    }
    const key = monthKey(d);
    if (key > currentKey || key <= currentKey - 12) {
      continue;
    }
    countsByMonth.set(key, (countsByMonth.get(key) ?? 0) + 1);
  }

  const currentCount = countsByMonth.get(currentKey) ?? 0;
  const priorKeys = Array.from({ length: 11 }, (_, i) => currentKey - 1 - i);
  const priorCounts = priorKeys.map((k) => countsByMonth.get(k) ?? 0).filter((n) => n > 0);

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

export const INSIGHT_RULES: InsightRule[] = [
  seasonalTravelCancellations,
  topCancellationReason,
  negativeGrowth,
  lowConversionRate,
  speedToFirstContact,
  holdExpiryWatchlist,
  cancellationSpikeVsBaseline,
  positiveMilestone,
  retentionMomentumNegative,
  ageGroupCancellationConcentration,
  reEngagementWindow,
];
