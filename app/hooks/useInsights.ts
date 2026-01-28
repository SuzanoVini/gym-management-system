'use client';

import { useMemo } from 'react';
import type { Cancellation, Hold, Insight, Intro, Signup } from '@/types';

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
      if (!intro.created_at) {
        return false;
      }
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const introDate = new Date(intro.created_at);

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
      const potentialRevenue = potentialSignups * 180;

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

    // 2. HIGH: Staff Performance Anomaly
    const staffStats = activeIntros.reduce<
      Record<string, { total: number; attended: number; signedUp: number }>
    >((acc, intro) => {
      if (!intro.staff) {
        return acc;
      }

      if (!acc[intro.staff]) {
        acc[intro.staff] = {
          total: 0,
          attended: 0,
          signedUp: 0,
        };
      }

      const staffEntry = acc[intro.staff];
      staffEntry.total++;
      if (intro.attended === 'Yes') {
        staffEntry.attended++;
        if (intro.signed_up === 'Yes') {
          staffEntry.signedUp++;
        }
      }

      return acc;
    }, {});

    const staffPerformance = Object.entries(staffStats).map(([name, stats]) => ({
      name,
      attended: stats.attended,
      signedUp: stats.signedUp,
      conversionRate: stats.attended > 0 ? (stats.signedUp / stats.attended) * 100 : 0,
    }));

    const avgConversion =
      staffPerformance.reduce((sum, s) => sum + s.conversionRate, 0) / staffPerformance.length;

    staffPerformance.forEach((staff) => {
      const variance = staff.conversionRate - avgConversion;

      // Top Performer
      if (variance > 15 && staff.attended >= 5) {
        const additionalSignups = Math.round(
          staffPerformance.reduce((sum, s) => {
            if (s.name !== staff.name && s.conversionRate < staff.conversionRate) {
              const gap = (staff.conversionRate - s.conversionRate) / 100;
              return sum + s.attended * gap;
            }
            return sum;
          }, 0)
        );

        generatedInsights.push({
          id: `staff-outperformer-${staff.name}`,
          title: `${staff.name} Converting ${variance.toFixed(0)}% Above Team Average`,
          message: `${staff.name}: ${staff.conversionRate.toFixed(1)}% conversion (${staff.signedUp}/${staff.attended})
Team average: ${avgConversion.toFixed(1)}%
Gap: +${variance.toFixed(0)} percentage points

If all staff matched ${staff.name}'s rate, you'd have ${additionalSignups} more signups this period.`,
          icon: 'TrendingUp',
          color: 'green',
          priority: 'high',
          impact: `$${(additionalSignups * 180).toLocaleString()} monthly revenue opportunity`,
          actions: [
            `Shadow ${staff.name}'s intro process`,
            'Document best practices and techniques',
            `Have ${staff.name} coach other staff members`,
            'Record successful intro for training',
          ],
          category: 'conversion',
        });
      }

      // Underperformer
      if (variance < -15 && staff.attended >= 5) {
        const missedSignups = Math.round(
          ((avgConversion - staff.conversionRate) / 100) * staff.attended
        );

        generatedInsights.push({
          id: `staff-underperformer-${staff.name}`,
          title: `${staff.name}'s Conversion Needs Attention`,
          message: `${staff.name}: ${staff.conversionRate.toFixed(1)}% conversion (${staff.signedUp}/${staff.attended})
Team average: ${avgConversion.toFixed(1)}%
Gap: ${variance.toFixed(0)} percentage points

This gap represents ~${missedSignups} missed signups this period.`,
          icon: 'TrendingDown',
          color: 'orange',
          priority: 'high',
          impact: `$${(missedSignups * 180).toLocaleString()} lost revenue`,
          actions: [
            `Schedule 1-on-1 coaching session with ${staff.name}`,
            'Review intro script and close techniques',
            'Check if specific class types are the issue',
            'Pair with top performer for mentoring',
          ],
          category: 'conversion',
        });
      }
    });

    // 3. HIGH: Class-Specific Conversion
    const classStats = activeIntros.reduce<
      Record<string, { intros: number; attended: number; signups: number }>
    >((acc, intro) => {
      if (!intro.class) {
        return acc;
      }

      if (!acc[intro.class]) {
        acc[intro.class] = {
          intros: 0,
          attended: 0,
          signups: 0,
        };
      }

      const classEntry = acc[intro.class];
      classEntry.intros++;
      if (intro.attended === 'Yes') {
        classEntry.attended++;
        if (intro.signed_up === 'Yes') {
          classEntry.signups++;
        }
      }

      return acc;
    }, {});

    const classPerformance = Object.entries(classStats)
      .map(([name, stats]) => ({
        name,
        attended: stats.attended,
        signups: stats.signups,
        conversionRate: stats.attended > 0 ? (stats.signups / stats.attended) * 100 : 0,
      }))
      .filter((c) => c.attended >= 3)
      .sort((a, b) => b.conversionRate - a.conversionRate);

    if (classPerformance.length >= 2) {
      const topClass = classPerformance[0];
      const bottomClass = classPerformance[classPerformance.length - 1];

      if (topClass && bottomClass && topClass.conversionRate > bottomClass.conversionRate * 1.8) {
        generatedInsights.push({
          id: 'class-performance-gap',
          title: `${topClass.name} Converting ${topClass.conversionRate.toFixed(0)}% - ${bottomClass.name} at ${bottomClass.conversionRate.toFixed(0)}%`,
          message: `${topClass.name}: ${topClass.signups}/${topClass.attended} intros (${topClass.conversionRate.toFixed(1)}%)
${bottomClass.name}: ${bottomClass.signups}/${bottomClass.attended} intros (${bottomClass.conversionRate.toFixed(1)}%)

${bottomClass.name} needs investigation.`,
          icon: 'AlertCircle',
          color: 'yellow',
          priority: 'high',
          impact: 'Improving low-converting classes could add 3-5 signups/month',
          actions: [
            `Survey recent ${bottomClass.name} intros who didn't sign up`,
            'Check if pricing concerns are specific to this class',
            'Review class format and intro experience',
            `Compare ${topClass.name} intro process to ${bottomClass.name}`,
          ],
          category: 'conversion',
        });
      }
    }

    // 4. CRITICAL: Seasonal Cancellation Pattern
    const currentMonth = new Date().toLocaleString('default', { month: 'short' });
    const travelCancels = cancellations.filter(
      (c) =>
        c.reason?.toLowerCase().includes('travel') ||
        c.reason?.toLowerCase().includes('vacation') ||
        c.reason?.toLowerCase().includes('summer')
    );

    if ((currentMonth === 'Jul' || currentMonth === 'Aug') && travelCancels.length > 5) {
      const lostRevenue = travelCancels.length * 180;
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

    // 5. HIGH: Cancellation Reason Analysis
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
        impact: `Reducing this by 50% = ${Math.round((count as number) / 2)} retained members = $${(Math.round((count as number) / 2) * 180).toLocaleString()}/month`,
        actions: specificActions,
        category: 'retention',
      });
    }

    // 6. MEDIUM: Signup Package Rate
    const signupsWithPackage = signups.filter((s) => s.signup_package).length;
    const totalFilteredSignups = signups.length;
    const packageRate = totalFilteredSignups > 0 ? signupsWithPackage / totalFilteredSignups : 0;

    if (packageRate < 0.65 && totalFilteredSignups > 10) {
      const targetRate = 0.8;
      const gap = targetRate - packageRate;
      const additionalPackages = Math.round(gap * totalFilteredSignups);
      const revenue = additionalPackages * 200;

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

    // 7. MEDIUM: Net Growth Analysis
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

    // 8. HIGH: Conversion Rate Analysis
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
        impact: `Reaching 40% = $${(gapTo40 * 180).toLocaleString()} monthly revenue`,
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
