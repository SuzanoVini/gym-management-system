'use client';

import { useMemo } from 'react';
import type { Cancellation, Hold, Insight, Intro, Member, Signup } from '@/types';

const MONTHLY_MEMBERSHIP_REVENUE = 180;
const SIGNUP_PACKAGE_REVENUE = 200;

interface UseInsightsProps {
  intros: Intro[];
  signups: Signup[];
  cancellations: Cancellation[];
  holds: Hold[];
  rawHolds?: Hold[]; // Unfiltered holds for return-rate calculation (hold relevance is by end date, not created_at)
  members?: Member[];
}

export const useInsights = ({
  intros,
  signups,
  cancellations,
  holds,
  rawHolds,
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

    if (warmLeads.length >= 3) {
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

    // NS-3: Hold Return Rate (uses rawHolds if available for accuracy; falls back to filtered holds)
    const holdsToUse = rawHolds ?? holds;
    const expiredHolds = holdsToUse.filter((h) => h.end && new Date(h.end) < now);

    if (expiredHolds.length >= 5) {
      const signupNames = new Set(signups.map((s) => s.name.toLowerCase().trim()));
      const returnedCount = expiredHolds.filter((h) =>
        signupNames.has(h.name.toLowerCase().trim())
      ).length;
      const returnRate = (returnedCount / expiredHolds.length) * 100;
      const missedReturns = expiredHolds.length - returnedCount;

      if (returnRate < 50) {
        generatedInsights.push({
          id: 'low-hold-return-rate',
          title: `Hold Return Rate at ${returnRate.toFixed(0)}% — ${missedReturns} Members Didn't Come Back`,
          message: `${expiredHolds.length} holds have expired.
Returned: ${returnedCount} (${returnRate.toFixed(0)}%)
Did not return: ${missedReturns} (${(100 - returnRate).toFixed(0)}%)

Members on hold intend to return — a low return rate means re-activation is failing.`,
          icon: 'RefreshCw',
          color: 'orange',
          priority: 'high',
          impact: `Recovering 50% of non-returns = $${(Math.round(missedReturns * 0.5) * MONTHLY_MEMBERSHIP_REVENUE).toLocaleString()}/month`,
          actions: [
            'Contact hold members within 48 hours of their hold end date',
            'Create an automated re-activation reminder sequence',
            'Offer a "welcome back" session or free class',
            'Remove re-activation fees to lower the barrier',
          ],
          category: 'retention',
        });
      } else if (returnRate >= 75) {
        generatedInsights.push({
          id: 'high-hold-return-rate',
          title: `Strong Hold Return Rate — ${returnRate.toFixed(0)}% Come Back`,
          message: `${returnedCount} of ${expiredHolds.length} hold members returned (${returnRate.toFixed(0)}%).

Your hold program is working well as a retention tool.`,
          icon: 'RefreshCw',
          color: 'green',
          priority: 'medium',
          impact: 'Hold program is saving revenue that would otherwise be lost',
          actions: [
            'Offer holds more proactively during cancellation conversations',
            'Consider extending max hold duration to retain more at-risk members',
            'Collect testimonials from returned members',
            'Train all staff on the hold program benefits',
          ],
          category: 'retention',
        });
      }
    }

    // NS-4: Stale Warm Leads (attended 30–90 days ago, still no signup)
    const staleLeads = activeIntros.filter((intro) => {
      if (!intro.date) {
        return false;
      }
      const daysAgo = (now.getTime() - new Date(intro.date).getTime()) / (1000 * 60 * 60 * 24);
      return intro.attended === 'Yes' && intro.signed_up !== 'Yes' && daysAgo > 30 && daysAgo <= 90;
    });

    if (staleLeads.length >= 5) {
      generatedInsights.push({
        id: 'stale-warm-leads',
        title: `${staleLeads.length} Warm Leads Gone Cold — Last-Chance Outreach`,
        message: `${staleLeads.length} people attended intros 30–90 days ago and never signed up.

After 30 days conversion drops to under 10%. A personal, compelling offer is the last realistic chance.`,
        icon: 'Clock',
        color: 'orange',
        priority: 'high',
        impact: `Even 10% conversion = ${Math.max(1, Math.round(staleLeads.length * 0.1))} signups = $${(Math.max(1, Math.round(staleLeads.length * 0.1)) * MONTHLY_MEMBERSHIP_REVENUE).toLocaleString()}/month`,
        actions: [
          'Send a personal (not automated) message to each person',
          'Offer a limited-time re-intro or trial session',
          'Mention any new programs or changes since their visit',
          'Keep expectations realistic — focus on the motivated 10%',
        ],
        category: 'conversion',
      });
    }

    // NS-5: Recent Signup Package Gap (signups in last 30 days without a package)
    const recentSignupsAll = signups.filter((s) => {
      if (!s.created_at) {
        return false;
      }
      const daysAgo = (now.getTime() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 30;
    });
    const recentWithoutPkg = recentSignupsAll.filter((s) => !s.signup_package);

    if (recentSignupsAll.length >= 5 && recentWithoutPkg.length > 0) {
      generatedInsights.push({
        id: 'recent-signup-package-gap',
        title: `${recentWithoutPkg.length} Recent Members Skipped the Signup Package`,
        message: `In the last 30 days: ${recentWithoutPkg.length} of ${recentSignupsAll.length} new members didn't purchase a package.

These members are still in their honeymoon phase — the best window to upsell.`,
        icon: 'DollarSign',
        color: 'green',
        priority: 'medium',
        impact: `${recentWithoutPkg.length} package upgrades = $${(recentWithoutPkg.length * SIGNUP_PACKAGE_REVENUE).toLocaleString()} immediate revenue`,
        actions: [
          'Reach out to these members this week with a personal package offer',
          'Emphasize retention benefit: "40% more likely to still be here in 3 months"',
          'Offer a time-limited discount (e.g., $20 off within 30 days of joining)',
          'Have front desk mention it at their next check-in',
        ],
        category: 'financial',
      });
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

    // NEW-1: Long holds - churn risk
    const holdsSource = rawHolds ?? holds;
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const longHolds = holdsSource.filter((h) => {
      if (!h.start) {
        return false;
      }
      const start = new Date(h.start);
      const end = h.end ? new Date(h.end) : null;
      return start <= thirtyDaysAgo && (!end || end >= now);
    });

    if (longHolds.length > 0) {
      const names = longHolds
        .slice(0, 3)
        .map((h) => h.name)
        .join(', ');
      const extra = longHolds.length > 3 ? ` +${longHolds.length - 3} more` : '';
      const recoveredCount = Math.ceil(longHolds.length / 2);

      generatedInsights.push({
        id: 'long-holds-churn-risk',
        title: `${longHolds.length} member${longHolds.length === 1 ? '' : 's'} on hold for 30+ days - churn risk`,
        message: `${names}${extra}\n\nMembers on extended holds often don't return. A proactive check-in now significantly improves return rates.`,
        icon: 'Clock',
        color: 'red',
        priority: 'high',
        impact: `Recovering 50% = ${recoveredCount} members = $${(recoveredCount * MONTHLY_MEMBERSHIP_REVENUE).toLocaleString()}/month`,
        actions: [
          'Reach out personally to each member on extended hold',
          'Offer a re-activation session or open house invite',
          'Check if their hold reason has resolved',
          'Make it easy to return - no re-activation fees',
        ],
        category: 'retention',
      });
    }

    // NEW-2: Stale intros - 60+ days, no signup
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const staleIntros60 = activeIntros.filter((intro) => {
      if (!intro.date) {
        return false;
      }
      return intro.signed_up !== 'Yes' && new Date(intro.date) <= sixtyDaysAgo;
    });

    if (staleIntros60.length > 0) {
      const possibleSignups = Math.max(1, Math.ceil(staleIntros60.length * 0.05));
      generatedInsights.push({
        id: 'intros-60-days-no-signup',
        title: `${staleIntros60.length} intro${staleIntros60.length === 1 ? '' : 's'} from 60+ days ago haven't signed up`,
        message: `${staleIntros60.length} active intros attended 60+ days ago with no signup.\n\nConversion drops under 5% after 60 days - a final personal outreach is worth attempting before closing these leads.`,
        icon: 'Clock',
        color: 'orange',
        priority: 'medium',
        impact: `Even 5% conversion = ${possibleSignups} signup${possibleSignups === 1 ? '' : 's'}`,
        actions: [
          'Send a personal message to each person',
          'Mention any new programs, schedule changes, or promotions',
          'Offer a free return visit before deciding',
          'Mark as Completed/Cancelled after outreach to keep the list clean',
        ],
        category: 'conversion',
      });
    }

    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return generatedInsights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [intros, signups, cancellations, holds, rawHolds]);

  return { insights };
};
