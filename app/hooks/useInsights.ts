'use client';

import { useMemo } from 'react';
import {
  CURRENT_INSIGHT_RULES,
  DEFAULT_MONTHLY_MEMBERSHIP_REVENUE,
  type InsightRule,
  type InsightRuleInput,
  RANGE_INSIGHT_RULES,
} from '@/lib/insights/rules';
import type { Cancellation, Hold, Insight, Intro, Signup } from '@/types';

interface InsightRecords {
  intros: Intro[];
  signups: Signup[];
  cancellations: Cancellation[];
  holds: Hold[];
}

interface UseInsightsProps extends InsightRecords {
  /** Every record, unfiltered: rules about right now must not depend on the date filter. */
  allData: InsightRecords;
  /** From the settings modal; falls back to the historical $180/mo default. */
  revenuePerMember?: number;
}

export const useInsights = ({
  intros,
  signups,
  cancellations,
  holds,
  allData,
  revenuePerMember = DEFAULT_MONTHLY_MEMBERSHIP_REVENUE,
}: UseInsightsProps) => {
  const insights = useMemo(() => {
    const now = new Date();
    const run = (rules: InsightRule[], records: InsightRecords) => {
      const input: InsightRuleInput = { ...records, now, revenuePerMember };
      return rules.map((rule) => rule(input));
    };

    const generatedInsights = [
      ...run(RANGE_INSIGHT_RULES, { intros, signups, cancellations, holds }),
      ...run(CURRENT_INSIGHT_RULES, allData),
    ].filter((insight): insight is Insight => insight !== null);

    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return generatedInsights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [intros, signups, cancellations, holds, allData, revenuePerMember]);

  return { insights };
};
