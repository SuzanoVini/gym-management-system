'use client';

import { useMemo } from 'react';
import type { Cancellation, Hold, Insight, Intro, Member, Signup } from '@/types';

const MONTHLY_MEMBERSHIP_REVENUE = 180;

interface UseInsightsProps {
  intros: Intro[];
  signups: Signup[];
  cancellations: Cancellation[];
  holds: Hold[];
  members?: Member[];
}

export const useInsights = ({ intros, signups, cancellations }: UseInsightsProps) => {
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Insight generation aggregates many business rules.
  const insights = useMemo(() => {
    const generatedInsights: Insight[] = [];

    // Filter out intros that are Completed or Cancelled for metrics calculations
    const activeIntros = intros.filter(
      (intro) => intro.status !== 'Completed' && intro.status !== 'Cancelled'
    );

    // Follow-up urgency is covered by the follow-ups-due insight in InsightsTab,
    // built from useFollowUps — the same engine as the Follow Ups tab, so it
    // honors contacts, reminders, and dismissals.

    // 2. CRITICAL: Seasonal Cancellation Pattern
    const travelCancels = cancellations.filter(
      (c) =>
        c.reason?.toLowerCase().includes('travel') ||
        c.reason?.toLowerCase().includes('vacation') ||
        c.reason?.toLowerCase().includes('summer')
    );

    if (travelCancels.length > 8) {
      const lostRevenue = travelCancels.length * MONTHLY_MEMBERSHIP_REVENUE;
      const holdRecovery = Math.round(travelCancels.length * 0.6);
      const holdRevenue = holdRecovery * 29;

      generatedInsights.push({
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
      });
    }

    // 3. HIGH: Cancellation Reason Analysis
    const cancellationReasons = cancellations.reduce<Record<string, number>>((acc, cancel) => {
      if (cancel.reason) {
        acc[cancel.reason] = (acc[cancel.reason] || 0) + 1;
      }
      return acc;
    }, {});

    const topCancellationReason = Object.entries(cancellationReasons).sort(
      (a, b) => b[1] - a[1]
    )[0];

    if (topCancellationReason && (topCancellationReason[1] as number) >= 5) {
      const [reason, count] = topCancellationReason;
      const reasonLower = (reason as string).toLowerCase();

      let actionableAdvice = '';
      let specificActions: string[] = [];

      if (reasonLower.includes('time') || reasonLower.includes('schedule')) {
        actionableAdvice =
          'Schedule conflicts are fixable - offer more class times or online options.';
        specificActions = [
          'Survey cancelled members about preferred class times',
          'Consider adding early morning (6AM) or late evening (8PM) classes',
          'Test virtual/online class options',
          'Offer flexible scheduling for busy members',
        ];
      } else if (
        reasonLower.includes('financial') ||
        reasonLower.includes('money') ||
        reasonLower.includes('expensive')
      ) {
        actionableAdvice = 'Price sensitivity - create more accessible options.';
        specificActions = [
          'Introduce budget-friendly membership tier',
          'Offer payment plans (bi-weekly instead of monthly)',
          'Create student/family discounts',
          'Emphasize value in member communications',
        ];
      } else if (reasonLower.includes('injury') || reasonLower.includes('medical')) {
        actionableAdvice = 'Medical holds should be offered, not cancellations.';
        specificActions = [
          'Create injury hold program (reduced rate during recovery)',
          'Offer modified training during recovery',
          'Partner with physical therapist for rehab programs',
          'Emphasize injury prevention in classes',
        ];
      } else if (reasonLower.includes('moving') || reasonLower.includes('relocation')) {
        actionableAdvice = 'Moving members may return — keep the relationship warm.';
        specificActions = [
          'Offer a farewell freeze instead of cancellation',
          'Ask for a referral to friends/family staying in the area',
          'Send a "welcome back" offer if they return to the city',
          'Connect them with a partner gym in their new location',
        ];
      } else {
        actionableAdvice = 'Pattern detected - needs investigation.';
        specificActions = [
          `Schedule exit interviews to understand "${reason}" better`,
          'Track this reason monthly to spot trends',
          'Create retention offer for this specific reason',
          'Review what competitors offer for similar situations',
        ];
      }

      generatedInsights.push({
        id: 'top-cancellation-reason',
        title: `Top Cancellation Reason: "${reason}" (${count} cancellations)`,
        message: `${count} members cancelled due to "${reason}".\n\n${actionableAdvice}\n\nThis is a fixable pattern that's costing you members.`,
        icon: 'UserMinus',
        color: 'orange',
        priority: 'high',
        impact: `Reducing this by 50% = ${Math.round((count as number) / 2)} retained members = $${(Math.round((count as number) / 2) * MONTHLY_MEMBERSHIP_REVENUE).toLocaleString()}/month`,
        actions: specificActions,
        category: 'retention',
      });
    }

    // 5. MEDIUM: Net Growth Analysis
    const totalFilteredSignups = signups.length;
    const netGrowth = totalFilteredSignups - cancellations.length;

    if (netGrowth < 0) {
      const churnRate =
        totalFilteredSignups > 0
          ? ((cancellations.length / totalFilteredSignups) * 100).toFixed(1)
          : '0';

      generatedInsights.push({
        id: 'negative-growth',
        title: `Negative Member Growth - Priority: Retention`,
        message: `Net loss of ${Math.abs(netGrowth)} members this period.
Signups: ${totalFilteredSignups}
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
      });
    }

    // 6. HIGH: Conversion Rate Analysis
    const attendedIntros = activeIntros.filter((i) => i.attended === 'Yes').length;
    const signedUpFromIntros = activeIntros.filter(
      (i) => i.attended === 'Yes' && i.signed_up === 'Yes'
    ).length;
    const conversionRate = attendedIntros > 0 ? (signedUpFromIntros / attendedIntros) * 100 : 0;

    if (conversionRate < 30 && attendedIntros > 10) {
      const gapTo40 = Math.round((0.4 - conversionRate / 100) * attendedIntros);

      generatedInsights.push({
        id: 'low-conversion-rate',
        title: `Low Conversion Rate - ${conversionRate.toFixed(1)}%`,
        message: `Your conversion rate is below industry standard.
Current: ${conversionRate.toFixed(1)}% (${signedUpFromIntros}/${attendedIntros})
Industry benchmark: 40-60%

Gap to 40%: ${gapTo40} additional signups needed`,
        icon: 'AlertTriangle',
        color: 'red',
        priority: 'high',
        impact: `Reaching 40% = $${(gapTo40 * MONTHLY_MEMBERSHIP_REVENUE).toLocaleString()} monthly revenue`,
        actions: [
          'Review intro class structure and sales process',
          'Check pricing against local competitors',
          'Improve instructor engagement during intros',
          'Reduce friction in signup process (make it easier)',
        ],
        category: 'conversion',
      });
    }

    // NS-1: Retention Momentum (30-day vs prior 30-day comparison)
    const now = new Date();
    const recentSignups = signups.filter((s) => {
      if (!s.created_at) {
        return false;
      }
      const daysAgo = (now.getTime() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 30;
    }).length;
    const priorSignups = signups.filter((s) => {
      if (!s.created_at) {
        return false;
      }
      const daysAgo = (now.getTime() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo > 30 && daysAgo <= 60;
    }).length;
    const recentCancels = cancellations.filter((c) => {
      if (!c.created_at) {
        return false;
      }
      const daysAgo = (now.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 30;
    }).length;
    const priorCancels = cancellations.filter((c) => {
      if (!c.created_at) {
        return false;
      }
      const daysAgo = (now.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo > 30 && daysAgo <= 60;
    }).length;

    if (priorSignups > 0 && priorCancels > 0) {
      const signupGrowth = ((recentSignups - priorSignups) / priorSignups) * 100;
      const cancelChange = ((recentCancels - priorCancels) / priorCancels) * 100;

      if (signupGrowth < -20 || cancelChange > 20) {
        generatedInsights.push({
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
        });
      }
    }

    // NS-2: Age Group Cancellation Concentration
    const ageGroupMap = cancellations.reduce<Record<string, number>>((acc, c) => {
      if (c.age_group) {
        acc[c.age_group] = (acc[c.age_group] || 0) + 1;
      }
      return acc;
    }, {});
    const totalWithAge = Object.values(ageGroupMap).reduce((s, n) => s + n, 0);
    const topAgeEntry = Object.entries(ageGroupMap).sort((a, b) => b[1] - a[1])[0];

    if (topAgeEntry && totalWithAge >= 10) {
      const [ageGroup, ageCount] = topAgeEntry;
      const agePct = (ageCount / totalWithAge) * 100;
      if (agePct > 40) {
        generatedInsights.push({
          id: 'age-group-cancellation-concentration',
          title: `${ageGroup} Age Group = ${agePct.toFixed(0)}% of Cancellations`,
          message: `${ageCount} of ${totalWithAge} cancellations are from the ${ageGroup} group.

This concentration points to a retention issue specific to this demographic.`,
          icon: 'Users',
          color: 'orange',
          priority: 'high',
          impact: `Retaining 50% of this group = $${(Math.round(ageCount * 0.5) * MONTHLY_MEMBERSHIP_REVENUE).toLocaleString()}/month`,
          actions: [
            `Survey recent ${ageGroup} cancellations to identify the pattern`,
            `Review class schedule for ${ageGroup}-friendly time slots`,
            `Create a ${ageGroup}-focused retention offer`,
            'Adjust programming to better serve this demographic',
          ],
          category: 'retention',
        });
      }
    }

    // NS-6: Re-Engagement Window (cancelled in last 60 days for recoverable reasons)
    const reEngageable = cancellations.filter((c) => {
      if (!c.created_at) {
        return false;
      }
      const daysAgo = (now.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysAgo > 60) {
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

    if (reEngageable.length >= 2) {
      generatedInsights.push({
        id: 're-engagement-window',
        title: `${reEngageable.length} Recently Cancelled Members Are Re-Engageable`,
        message: `${reEngageable.length} members cancelled in the last 60 days for reasons that may have changed (financial, scheduling, personal).

The 60-day window is critical — after that, habits change and re-engagement becomes much harder.`,
        icon: 'Users',
        color: 'blue',
        priority: 'high',
        impact: `Re-engaging 30% = ${Math.max(1, Math.round(reEngageable.length * 0.3))} members = $${(Math.max(1, Math.round(reEngageable.length * 0.3)) * MONTHLY_MEMBERSHIP_REVENUE).toLocaleString()}/month`,
        actions: [
          'Make a personal call or text (not email) to each person',
          'Ask: "Has anything changed since you left?"',
          'Offer a flexible re-join option (shorter commitment or lower rate)',
          'Invite them to a free community event or open house',
        ],
        category: 'retention',
      });
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return generatedInsights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [intros, signups, cancellations]);

  return { insights };
};
