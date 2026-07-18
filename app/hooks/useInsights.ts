'use client';

import { useMemo } from 'react';
import {
  DEFAULT_MONTHLY_MEMBERSHIP_REVENUE,
  INSIGHT_RULES,
  type InsightRuleInput,
} from '@/lib/insights/rules';
import type { Cancellation, Hold, Insight, Intro, Member, Signup } from '@/types';

interface UseInsightsProps {
  intros: Intro[];
  signups: Signup[];
  cancellations: Cancellation[];
  holds: Hold[];
  members?: Member[];
  /** From the settings modal; falls back to the historical $180/mo default. */
  revenuePerMember?: number;
}

export const useInsights = ({
  intros,
  signups,
  cancellations,
  holds,
  revenuePerMember = DEFAULT_MONTHLY_MEMBERSHIP_REVENUE,
}: UseInsightsProps) => {
  const insights = useMemo(() => {
    const activeIntros = intros.filter(
      (intro) => intro.status !== 'Completed' && intro.status !== 'Cancelled'
    );

    const input: InsightRuleInput = {
      intros,
      activeIntros,
      signups,
      cancellations,
      holds,
      now: new Date(),
      revenuePerMember,
    };

    const generatedInsights = INSIGHT_RULES.map((rule) => rule(input)).filter(
      (insight): insight is Insight => insight !== null
    );

    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return generatedInsights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [intros, signups, cancellations, holds, revenuePerMember]);

  return { insights };
};
