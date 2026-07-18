import type { Cancellation, Hold, Intro, Signup } from '@/types';
import {
  ageGroupCancellationConcentration,
  cancellationSpikeVsBaseline,
  holdExpiryWatchlist,
  type InsightRuleInput,
  lowConversionRate,
  negativeGrowth,
  positiveMilestone,
  reEngagementWindow,
  retentionMomentumNegative,
  seasonalTravelCancellations,
  speedToFirstContact,
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

function hold(overrides: Partial<Hold> = {}): Hold {
  return {
    id: `hold-${Math.random()}`,
    created_at: isoDaysAgo(1),
    month: 'Jul',
    name: 'Test Person',
    ...overrides,
  } as Hold;
}

function baseInput(overrides: Partial<InsightRuleInput> = {}): InsightRuleInput {
  return {
    intros: [],
    activeIntros: [],
    signups: [],
    cancellations: [],
    holds: [],
    now: NOW,
    revenuePerMember: 180,
    ...overrides,
  };
}

function isoMonthsAgo(months: number, day = 15): string {
  const d = new Date(NOW);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - months);
  d.setUTCDate(day);
  return d.toISOString();
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

describe('speedToFirstContact', () => {
  it('returns null with fewer than 5 followed-up intros', () => {
    const intros = Array.from({ length: 4 }, () =>
      intro({
        attended: 'Yes',
        date: '2026-07-01',
        followup_1_at: '2026-07-06T00:00:00Z', // 3 business days later
      })
    );
    expect(speedToFirstContact(baseInput({ intros }))).toBeNull();
  });

  it('returns null when median latency is at or below 2 business days', () => {
    const intros = Array.from({ length: 6 }, () =>
      intro({
        attended: 'Yes',
        date: '2026-07-06', // Monday
        followup_1_at: '2026-07-08T00:00:00Z', // Wednesday = 2 business days
      })
    );
    expect(speedToFirstContact(baseInput({ intros }))).toBeNull();
  });

  it('fires with a per-staff breakdown when median latency exceeds 2 business days', () => {
    const intros = Array.from({ length: 6 }, () =>
      intro({
        attended: 'Yes',
        date: '2026-07-06', // Monday
        followup_1_at: '2026-07-10T00:00:00Z', // Friday = 4 business days
        staff: 'Staff Member 3',
      })
    );
    const insight = speedToFirstContact(baseInput({ intros }));
    expect(insight?.id).toBe('speed-to-first-contact');
    expect(insight?.message).toContain('Staff Member 3');
  });

  it('ignores intros that never got followed up', () => {
    const intros = Array.from({ length: 6 }, () => intro({ attended: 'Yes' }));
    expect(speedToFirstContact(baseInput({ intros }))).toBeNull();
  });
});

describe('holdExpiryWatchlist', () => {
  it('returns null when no holds end within 7 days', () => {
    const holds = [hold({ end: isoDaysAgo(-30).slice(0, 10) })];
    expect(holdExpiryWatchlist(baseInput({ holds }))).toBeNull();
  });

  it('fires for holds ending within the next 7 days', () => {
    const soon = new Date(NOW);
    soon.setUTCDate(soon.getUTCDate() + 3);
    const holds = [hold({ end: soon.toISOString().slice(0, 10), name: 'Alex Rivera' })];
    const insight = holdExpiryWatchlist(baseInput({ holds }));
    expect(insight?.id).toBe('hold-expiry-watchlist');
    expect(insight?.message).toContain('Alex Rivera');
  });

  it('ignores open-ended holds with no end date', () => {
    const holds = [hold()];
    expect(holdExpiryWatchlist(baseInput({ holds }))).toBeNull();
  });
});

describe('cancellationSpikeVsBaseline', () => {
  it('returns null without at least 3 months of prior baseline data', () => {
    const cancellations = Array.from({ length: 10 }, () =>
      cancellation({ created_at: isoMonthsAgo(0) })
    );
    expect(cancellationSpikeVsBaseline(baseInput({ cancellations, now: NOW }))).toBeNull();
  });

  it('returns null when the current month is not a meaningful spike', () => {
    const cancellations = [
      ...Array.from({ length: 3 }, () => cancellation({ created_at: isoMonthsAgo(0) })),
      ...Array.from({ length: 3 }, () => cancellation({ created_at: isoMonthsAgo(1) })),
      ...Array.from({ length: 3 }, () => cancellation({ created_at: isoMonthsAgo(2) })),
      ...Array.from({ length: 3 }, () => cancellation({ created_at: isoMonthsAgo(3) })),
    ];
    expect(cancellationSpikeVsBaseline(baseInput({ cancellations, now: NOW }))).toBeNull();
  });

  it('fires when the current month well exceeds the trailing baseline', () => {
    const cancellations = [
      ...Array.from({ length: 10 }, () => cancellation({ created_at: isoMonthsAgo(0) })),
      ...Array.from({ length: 2 }, () => cancellation({ created_at: isoMonthsAgo(1) })),
      ...Array.from({ length: 2 }, () => cancellation({ created_at: isoMonthsAgo(2) })),
      ...Array.from({ length: 2 }, () => cancellation({ created_at: isoMonthsAgo(3) })),
    ];
    const insight = cancellationSpikeVsBaseline(baseInput({ cancellations, now: NOW }));
    expect(insight?.id).toBe('cancellation-spike-vs-baseline');
  });
});

describe('positiveMilestone', () => {
  it('returns null without at least 6 months of prior history', () => {
    const signups = Array.from({ length: 10 }, () => signup({ created_at: isoMonthsAgo(0) }));
    expect(positiveMilestone(baseInput({ signups, now: NOW }))).toBeNull();
  });

  it('returns null when the current month does not beat the trailing best', () => {
    const signups = [
      ...Array.from({ length: 5 }, () => signup({ created_at: isoMonthsAgo(0) })),
      ...Array.from({ length: 10 }, () => signup({ created_at: isoMonthsAgo(1) })),
      ...Array.from({ length: 3 }, () => signup({ created_at: isoMonthsAgo(2) })),
      ...Array.from({ length: 3 }, () => signup({ created_at: isoMonthsAgo(3) })),
      ...Array.from({ length: 3 }, () => signup({ created_at: isoMonthsAgo(4) })),
      ...Array.from({ length: 3 }, () => signup({ created_at: isoMonthsAgo(5) })),
      ...Array.from({ length: 3 }, () => signup({ created_at: isoMonthsAgo(6) })),
    ];
    expect(positiveMilestone(baseInput({ signups, now: NOW }))).toBeNull();
  });

  it('fires when the current month beats every month in the trailing year', () => {
    const signups = [
      ...Array.from({ length: 12 }, () => signup({ created_at: isoMonthsAgo(0) })),
      ...Array.from({ length: 3 }, () => signup({ created_at: isoMonthsAgo(1) })),
      ...Array.from({ length: 3 }, () => signup({ created_at: isoMonthsAgo(2) })),
      ...Array.from({ length: 3 }, () => signup({ created_at: isoMonthsAgo(3) })),
      ...Array.from({ length: 3 }, () => signup({ created_at: isoMonthsAgo(4) })),
      ...Array.from({ length: 3 }, () => signup({ created_at: isoMonthsAgo(5) })),
      ...Array.from({ length: 3 }, () => signup({ created_at: isoMonthsAgo(6) })),
    ];
    const insight = positiveMilestone(baseInput({ signups, now: NOW }));
    expect(insight?.id).toBe('positive-milestone-best-signup-month');
    expect(insight?.priority).toBe('low');
  });
});
