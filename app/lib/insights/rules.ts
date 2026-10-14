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
export {
  topCancellationReason,
  holdExpiryWatchlist,
  cancellationSpikeVsBaseline,
  positiveMilestone,
  retentionMomentumNegative,
  ageGroupCancellationConcentration,
  reEngagementWindow,
  speedToFirstContact,
};

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
