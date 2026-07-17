import type { Cancellation, Insight, Intro, Signup } from '@/types';

export const DEFAULT_MONTHLY_MEMBERSHIP_REVENUE = 180;

export interface InsightRuleInput {
  intros: Intro[];
  activeIntros: Intro[];
  signups: Signup[];
  cancellations: Cancellation[];
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

export const INSIGHT_RULES: InsightRule[] = [
  seasonalTravelCancellations,
  topCancellationReason,
  negativeGrowth,
  lowConversionRate,
  retentionMomentumNegative,
  ageGroupCancellationConcentration,
  reEngagementWindow,
];
