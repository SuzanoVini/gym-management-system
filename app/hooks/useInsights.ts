'use client';

import { useMemo } from 'react';
import type { Cancellation, Hold, Insight, Intro, Signup } from '@/types';

const MONTHLY_MEMBERSHIP_REVENUE = 180;
const SIGNUP_PACKAGE_REVENUE = 200;

interface UseInsightsProps {
  intros: Intro[];
  signups: Signup[];
  cancellations: Cancellation[];
  holds: Hold[];
}

export const useInsights = ({
  intros,
  signups,
  cancellations,
  holds: _holds,
}: UseInsightsProps) => {
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Insight generation aggregates many business rules.
  const insights = useMemo(() => {
    const generatedInsights: Insight[] = [];

    // Filter out intros that are Completed or Cancelled for metrics calculations
    const activeIntros = intros.filter(
      (intro) => intro.status !== 'Completed' && intro.status !== 'Cancelled'
    );

    // 1. CRITICAL: Attended But Didn't Sign Up
    const warmLeads = activeIntros.filter((intro) => {
      if (!intro.date) {
        return false;
      }
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const introDate = new Date(intro.date);

      return intro.attended === 'Yes' && intro.signed_up !== 'Yes' && introDate >= twoWeeksAgo;
    });

    if (warmLeads.length > 0) {
      const byStaff = warmLeads.reduce<Record<string, number>>((acc, intro) => {
        acc[intro.staff] = (acc[intro.staff] || 0) + 1;
        return acc;
      }, {});

      const staffBreakdown = Object.entries(byStaff)
        .map(([staff, count]) => `• ${count} from ${staff}'s classes`)
        .join('\n');

      const potentialSignups = Math.round(warmLeads.length * 0.6);
      const potentialRevenue = potentialSignups * MONTHLY_MEMBERSHIP_REVENUE;

      generatedInsights.push({
        id: 'warm-leads',
        title: `${warmLeads.length} High-Intent Prospects Need Follow-Up NOW`,
        message: `${warmLeads.length} people attended their intro in the last 2 weeks but haven't signed up yet:\n\n${staffBreakdown}\n\nThese are warm leads - they took time to attend. Don't let them go cold!\n\nSuccess rate with proper follow-up: ~60% within 48 hours\nAfter 2 weeks: Drops to 15%`,
        icon: 'Target',
        color: 'red',
        priority: 'critical',
        impact: `Potential ${potentialSignups} signups = $${potentialRevenue.toLocaleString()} revenue`,
        actions: [
          'Call each person TODAY (not tomorrow)',
          'Ask: "What questions can I answer for you?"',
          'Offer trial class or buddy intro',
          'Follow up within 48 hours if they need time',
        ],
        category: 'conversion',
      });
    }

    // 2. CRITICAL: Seasonal Cancellation Pattern
    const travelCancels = cancellations.filter(
      (c) =>
        c.reason?.toLowerCase().includes('travel') ||
        c.reason?.toLowerCase().includes('vacation') ||
        c.reason?.toLowerCase().includes('summer')
    );

    if (travelCancels.length > 5) {
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

    // 4. MEDIUM: Signup Package Rate
    const signupsWithPackage = signups.filter((s) => s.signup_package).length;
    const totalFilteredSignups = signups.length;
    const packageRate = totalFilteredSignups > 0 ? signupsWithPackage / totalFilteredSignups : 0;

    if (packageRate < 0.65 && totalFilteredSignups > 10) {
      const targetRate = 0.8;
      const gap = targetRate - packageRate;
      const additionalPackages = Math.round(gap * totalFilteredSignups);
      const revenue = additionalPackages * SIGNUP_PACKAGE_REVENUE;

      generatedInsights.push({
        id: 'signup-package-opportunity',
        title: `Signup Package Rate at ${(packageRate * 100).toFixed(0)}% - Revenue Opportunity`,
        message: `Current: ${signupsWithPackage}/${totalFilteredSignups} members purchased signup package (${(packageRate * 100).toFixed(0)}%)
Target: 80%
Gap: ${(gap * 100).toFixed(0)} percentage points

Industry data: Members with signup packages have 40% better retention at 90 days.`,
        icon: 'DollarSign',
        color: 'green',
        priority: 'medium',
        impact: `$${revenue.toLocaleString()} additional revenue + better retention`,
        actions: [
          'Train staff on package benefits during signup',
          'Use social proof: "87% of our members get the package"',
          'Emphasize retention stat: "40% more likely to still be training in 3 months"',
          'Create package as default option, not add-on',
        ],
        category: 'financial',
      });
    }

    // 5. MEDIUM: Net Growth Analysis
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
    } else if (netGrowth > 10) {
      generatedInsights.push({
        id: 'strong-growth',
        title: `Strong Growth Trajectory - Net Gain of ${netGrowth} Members`,
        message: `Excellent work! You're growing steadily.
Signups: ${totalFilteredSignups}
Cancellations: ${cancellations.length}
Net growth: +${netGrowth}

Now is the time to invest in scaling your success.`,
        icon: 'TrendingUp',
        color: 'green',
        priority: 'medium',
        impact: `Current trajectory: +${Math.round(netGrowth * 4)} members/year`,
        actions: [
          "Document what's working in your current process",
          'Consider increasing marketing budget by 20%',
          'Plan for capacity (space, instructors, equipment)',
          'Maintain intro quality as you scale',
        ],
        category: 'growth',
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
    } else if (conversionRate >= 50 && attendedIntros > 5) {
      generatedInsights.push({
        id: 'excellent-conversion',
        title: `Excellent Conversion Rate - ${conversionRate.toFixed(1)}%`,
        message: `Outstanding! Your intro program is highly effective.
Current: ${conversionRate.toFixed(1)}% (${signedUpFromIntros}/${attendedIntros})
Industry benchmark: 40-60%

You're above industry average. Time to scale.`,
        icon: 'CheckCircle',
        color: 'green',
        priority: 'medium',
        impact: 'Maintain quality while increasing volume',
        actions: [
          'Document your successful intro process',
          'Increase marketing spend to drive more intro traffic',
          'Train new staff using your proven system',
          'Consider offering intro instructor training to other gyms',
        ],
        category: 'conversion',
      });
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return generatedInsights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [intros, signups, cancellations]);

  return { insights };
};
