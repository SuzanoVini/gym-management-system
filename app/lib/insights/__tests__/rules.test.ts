import type { Cancellation, Intro, Signup } from '@/types';
import {
  ageGroupCancellationConcentration,
  type InsightRuleInput,
  lowConversionRate,
  negativeGrowth,
  reEngagementWindow,
  retentionMomentumNegative,
  seasonalTravelCancellations,
  topCancellationReason,
} from '../rules';

const NOW = new Date('2026-07-17T12:00:00Z');

function isoDaysAgo(days: number): string {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function cancellation(overrides: Partial<Cancellation> = {}): Cancellation {
  return {
    id: `cancel-${Math.random()}`,
    created_at: isoDaysAgo(1),
    month: 'Jul',
    name: 'Test Person',
    ...overrides,
  } as Cancellation;
}

function signup(overrides: Partial<Signup> = {}): Signup {
  return {
    id: `signup-${Math.random()}`,
    created_at: isoDaysAgo(1),
    month: 'Jul',
    name: 'Test Person',
    membership: 'Integrity',
    ...overrides,
  } as Signup;
}

function intro(overrides: Partial<Intro> = {}): Intro {
  return {
    id: `intro-${Math.random()}`,
    created_at: isoDaysAgo(1),
    month: 'Jul',
    class: 'GB1',
    name: 'Test Person',
    staff: 'Staff Member 3',
    ...overrides,
  } as Intro;
}

function baseInput(overrides: Partial<InsightRuleInput> = {}): InsightRuleInput {
  return {
    intros: [],
    activeIntros: [],
    signups: [],
    cancellations: [],
    now: NOW,
    revenuePerMember: 180,
    ...overrides,
  };
}

describe('seasonalTravelCancellations', () => {
  it('returns null at or below the 8-cancellation threshold', () => {
    const cancellations = Array.from({ length: 8 }, () => cancellation({ reason: 'Travel' }));
    expect(seasonalTravelCancellations(baseInput({ cancellations }))).toBeNull();
  });

  it('fires above the threshold and derives revenue from revenuePerMember', () => {
    const cancellations = Array.from({ length: 9 }, () => cancellation({ reason: 'Travel' }));
    const insight = seasonalTravelCancellations(
      baseInput({ cancellations, revenuePerMember: 100 })
    );
    expect(insight?.id).toBe('seasonal-travel-cancellations');
    expect(insight?.message).toContain('Lost revenue: $900/month');
  });
});

describe('topCancellationReason', () => {
  it('returns null below 5 occurrences of the top reason', () => {
    const cancellations = Array.from({ length: 4 }, () => cancellation({ reason: 'No time' }));
    expect(topCancellationReason(baseInput({ cancellations }))).toBeNull();
  });

  it('picks the most frequent reason and tailors advice by keyword', () => {
    const cancellations = [
      ...Array.from({ length: 5 }, () => cancellation({ reason: 'Financial' })),
      ...Array.from({ length: 2 }, () => cancellation({ reason: 'Moving' })),
    ];
    const insight = topCancellationReason(baseInput({ cancellations }));
    expect(insight?.title).toContain('"Financial" (5 cancellations)');
    expect(insight?.message).toContain('Price sensitivity');
  });
});

describe('negativeGrowth', () => {
  it('returns null when signups meet or exceed cancellations', () => {
    const signups = [signup(), signup()];
    const cancellations = [cancellation()];
    expect(negativeGrowth(baseInput({ signups, cancellations }))).toBeNull();
  });

  it('fires and reports churn rate when cancellations exceed signups', () => {
    const signups = [signup()];
    const cancellations = [cancellation(), cancellation(), cancellation()];
    const insight = negativeGrowth(baseInput({ signups, cancellations }));
    expect(insight?.message).toContain('Net loss of 2 members');
    expect(insight?.message).toContain('Churn rate: 300.0%');
  });
});

describe('lowConversionRate', () => {
  it('returns null when attended volume is at or below 10', () => {
    const activeIntros = Array.from({ length: 10 }, () => intro({ attended: 'Yes' }));
    expect(lowConversionRate(baseInput({ activeIntros }))).toBeNull();
  });

  it('returns null when conversion rate is at or above 30%', () => {
    const activeIntros = [
      ...Array.from({ length: 4 }, () => intro({ attended: 'Yes', signed_up: 'Yes' })),
      ...Array.from({ length: 8 }, () => intro({ attended: 'Yes', signed_up: 'No' })),
    ];
    expect(lowConversionRate(baseInput({ activeIntros }))).toBeNull(); // 4/12 = 33%
  });

  it('fires below 30% conversion with attended volume above 10', () => {
    const activeIntros = [
      ...Array.from({ length: 2 }, () => intro({ attended: 'Yes', signed_up: 'Yes' })),
      ...Array.from({ length: 10 }, () => intro({ attended: 'Yes', signed_up: 'No' })),
    ];
    const insight = lowConversionRate(baseInput({ activeIntros }));
    expect(insight?.id).toBe('low-conversion-rate');
    expect(insight?.title).toContain('16.7%');
  });
});

describe('retentionMomentumNegative', () => {
  it('returns null without a comparable prior-window baseline', () => {
    const signups = [signup({ created_at: isoDaysAgo(5) })];
    expect(retentionMomentumNegative(baseInput({ signups }))).toBeNull();
  });

  it('fires when recent signups drop more than 20% vs the prior window', () => {
    const signups = [
      signup({ created_at: isoDaysAgo(45) }),
      signup({ created_at: isoDaysAgo(50) }),
    ];
    const cancellations = [
      cancellation({ created_at: isoDaysAgo(10) }),
      cancellation({ created_at: isoDaysAgo(45) }),
    ];
    const insight = retentionMomentumNegative(baseInput({ signups, cancellations }));
    expect(insight?.id).toBe('retention-momentum-negative');
  });
});

describe('ageGroupCancellationConcentration', () => {
  it('returns null below the 10-cancellation sample size', () => {
    const cancellations = Array.from({ length: 5 }, () => cancellation({ age_group: 'Adult' }));
    expect(ageGroupCancellationConcentration(baseInput({ cancellations }))).toBeNull();
  });

  it('fires when one age group exceeds 40% of a large-enough sample', () => {
    const cancellations = [
      ...Array.from({ length: 8 }, () => cancellation({ age_group: 'Adult' })),
      ...Array.from({ length: 4 }, () => cancellation({ age_group: 'Kids' })),
    ];
    const insight = ageGroupCancellationConcentration(baseInput({ cancellations }));
    expect(insight?.title).toContain('Adult Age Group = 67% of Cancellations');
  });
});

describe('reEngagementWindow', () => {
  it('returns null below 2 recoverable cancellations', () => {
    const cancellations = [cancellation({ reason: 'Financial', created_at: isoDaysAgo(10) })];
    expect(reEngagementWindow(baseInput({ cancellations }))).toBeNull();
  });

  it('ignores cancellations older than 60 days', () => {
    const cancellations = [
      cancellation({ reason: 'Financial', created_at: isoDaysAgo(70) }),
      cancellation({ reason: 'Schedule', created_at: isoDaysAgo(75) }),
    ];
    expect(reEngagementWindow(baseInput({ cancellations }))).toBeNull();
  });

  it('fires for recent recoverable-reason cancellations', () => {
    const cancellations = [
      cancellation({ reason: 'Financial', created_at: isoDaysAgo(10) }),
      cancellation({ reason: 'Personal', created_at: isoDaysAgo(20) }),
    ];
    const insight = reEngagementWindow(baseInput({ cancellations }));
    expect(insight?.id).toBe('re-engagement-window');
    expect(insight?.title).toContain('2 Recently Cancelled');
  });
});
