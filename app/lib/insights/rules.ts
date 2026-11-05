import { computeCoreMetrics } from '@/lib/analytics/overviewMetrics';
import { topCancellationReason } from './rules/cancellation';
import {
  cancellationSpikeVsBaseline,
  holdExpiryWatchlist,
  positiveMilestone,
} from './rules/monthly';
import {
  ageGroupCancellationConcentration,
  reEngagementWindow,
  retentionMomentumNegative,
  speedToFirstContact,
} from './rules/retention';
import { earlyCancellations, lowShowRate } from './rules/standards';
export {
  topCancellationReason,
  holdExpiryWatchlist,
  cancellationSpikeVsBaseline,
  positiveMilestone,
  retentionMomentumNegative,
  ageGroupCancellationConcentration,
  reEngagementWindow,
  speedToFirstContact,
  earlyCancellations,
  lowShowRate,
};

import type { Cancellation, Hold, Insight, Intro, Signup } from '@/types';

export const DEFAULT_MONTHLY_MEMBERSHIP_REVENUE = 180;

export interface InsightRuleInput {
  intros: Intro[];
  signups: Signup[];
  cancellations: Cancellation[];
  holds: Hold[];
  now: Date;
  /** Configurable via the settings modal — replaces the old hardcoded $180/mo. */
  revenuePerMember: number;
}

export type InsightRule = (input: InsightRuleInput) => Insight | null;

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

  return {
    id: 'seasonal-travel-cancellations',
    title: 'Travel Cancellations: A Hold Could Have Kept These Members',
    message: `${travelCancels.length} members cancelled because of travel in this period.

A hold keeps the membership and adds the paused time onto the end, so they don't lose what they paid for.`,
    icon: 'Calendar',
    color: 'red',
    priority: 'high',
    impact: `Each member kept is about $${revenuePerMember.toLocaleString()}/month`,
    standard: 'Gym hold policy',
    actions: [
      'Offer a hold before processing any travel cancellation',
      'Two hold months a year are free, then $20 a month',
      'Set an end date, with the request in at least 2 business days before the next payment',
      'Contact members who cancelled for travel when they are due back',
    ],
    category: 'retention',
  };
};

export const negativeGrowth: InsightRule = ({ intros, signups, cancellations }) => {
  const { totalSignups, totalCancellations, netGrowth } = computeCoreMetrics({
    intros,
    signups,
    cancellations,
  });
  if (netGrowth >= 0) {
    return null;
  }

  return {
    id: 'negative-growth',
    title: 'More Cancellations Than Sign-ups',
    message: `Net loss of ${Math.abs(netGrowth)} members in this period.
Sign-ups: ${totalSignups}
Cancellations: ${totalCancellations}

Students stay when they feel they belong, feel safe and can see themselves growing, so look at the student experience first.`,
    icon: 'TrendingDown',
    color: 'red',
    priority: 'high',
    standard: 'Student experience: belonging, safety and growth',
    actions: [
      'Greet every student personally and help anyone without a partner find one',
      'Check in with each new member during their first 30 days',
      'Check that classes start and finish on time, with the same quality on any day',
      'Call members who stop coming, before they ask to cancel',
    ],
    category: 'retention',
  };
};

export const lowConversionRate: InsightRule = ({
  intros,
  signups,
  cancellations,
  revenuePerMember,
}) => {
  // The same calculation as the Overview funnel, so the two tabs always agree
  const { attendedIntros, signupsFromIntros, conversionRate } = computeCoreMetrics({
    intros,
    signups,
    cancellations,
  });

  if (conversionRate >= 30 || attendedIntros <= 10) {
    return null;
  }

  const gapTo40 = Math.ceil(0.4 * attendedIntros) - signupsFromIntros;

  return {
    id: 'low-conversion-rate',
    title: `Low Conversion Rate: ${conversionRate.toFixed(1)}%`,
    message: `${signupsFromIntros} of ${attendedIntros} people who attended an intro signed up.

${gapTo40} more sign-ups would reach the gym's 40% target.`,
    icon: 'AlertTriangle',
    color: 'red',
    priority: 'high',
    impact: `Each sign-up is about $${revenuePerMember.toLocaleString()}/month`,
    standard: 'Sales: intro lesson and enrollment conference',
    actions: [
      'Go over the plans after class when they are open to it, with no pressure',
      'Ask why they came in and why now, then tie the plan to that reason',
      'On price, go back to their reason first, then break the cost down per class',
      'Point to the entry-level plan or a class pack, and any discount they qualify for',
    ],
    category: 'conversion',
  };
};

/** Answer "what happened in the selected period", so they follow the date filter. */
export const RANGE_INSIGHT_RULES: InsightRule[] = [
  seasonalTravelCancellations,
  topCancellationReason,
  negativeGrowth,
  lowConversionRate,
  lowShowRate,
  speedToFirstContact,
  ageGroupCancellationConcentration,
];

/** Answer "what needs attention now", so they always see every record. */
export const CURRENT_INSIGHT_RULES: InsightRule[] = [
  holdExpiryWatchlist,
  cancellationSpikeVsBaseline,
  positiveMilestone,
  retentionMomentumNegative,
  reEngagementWindow,
  earlyCancellations,
];
