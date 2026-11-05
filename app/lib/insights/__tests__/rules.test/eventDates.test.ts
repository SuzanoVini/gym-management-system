import type { Cancellation, Intro, Signup } from '@/types';
import {
  cancellationSpikeVsBaseline,
  earlyCancellations,
  type InsightRuleInput,
  lowShowRate,
  reEngagementWindow,
  retentionMomentumNegative,
  topCancellationReason,
} from '../../rules';

const NOW = new Date('2026-07-17T12:00:00Z');

function isoDaysAgo(days: number): string {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function isoMonthsAgo(months: number, day = 15): string {
  const d = new Date(NOW);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - months);
  d.setUTCDate(day);
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
    ...overrides,
  } as Intro;
}

function baseInput(overrides: Partial<InsightRuleInput> = {}): InsightRuleInput {
  return {
    intros: [],
    signups: [],
    cancellations: [],
    holds: [],
    now: NOW,
    revenuePerMember: 180,
    ...overrides,
  };
}

describe('imported history', () => {
  // A CSV import stamps created_at with the import day, not the day it happened
  const importedYesterday = isoDaysAgo(1);

  it('re-engagement ignores old cancellations imported recently', () => {
    const cancellations = [
      cancellation({ reason: 'Financial', date: '2025-01-09', created_at: importedYesterday }),
      cancellation({ reason: 'Schedule', date: '2025-01-13', created_at: importedYesterday }),
    ];
    expect(reEngagementWindow(baseInput({ cancellations }))).toBeNull();
  });

  it('spike rule counts the month the cancellation happened, not the import month', () => {
    const cancellations = [
      ...Array.from({ length: 10 }, () =>
        cancellation({ date: '2025-03-10', created_at: importedYesterday })
      ),
      ...Array.from({ length: 2 }, () => cancellation({ created_at: isoMonthsAgo(1) })),
      ...Array.from({ length: 2 }, () => cancellation({ created_at: isoMonthsAgo(2) })),
      ...Array.from({ length: 2 }, () => cancellation({ created_at: isoMonthsAgo(3) })),
    ];
    expect(cancellationSpikeVsBaseline(baseInput({ cancellations }))).toBeNull();
  });

  it('momentum rule ignores signups imported recently', () => {
    const signups = Array.from({ length: 5 }, () =>
      signup({ membership_date: '2025-02-01', created_at: importedYesterday })
    );
    const cancellations = [
      cancellation({ created_at: isoDaysAgo(5) }),
      cancellation({ created_at: isoDaysAgo(40) }),
    ];
    expect(retentionMomentumNegative(baseInput({ signups, cancellations }))).toBeNull();
  });
});

describe('topCancellationReason grouping', () => {
  it('groups reasons regardless of case and gives each reason its own id', () => {
    const cancellations = [
      ...Array.from({ length: 3 }, () => cancellation({ reason: 'No time' })),
      ...Array.from({ length: 2 }, () => cancellation({ reason: 'no time' })),
    ];
    const insight = topCancellationReason(baseInput({ cancellations }));
    expect(insight?.title).toContain('(5 cancellations)');
    expect(insight?.id).toBe('top-cancellation-reason-no-time');
  });
});

describe('lowShowRate', () => {
  const booked = (showed: number, missed: number) => [
    ...Array.from({ length: showed }, () => intro({ attended: 'Yes', date: '2026-07-01' })),
    ...Array.from({ length: missed }, () => intro({ attended: 'No', date: '2026-07-01' })),
  ];

  it('returns null below 10 decided bookings', () => {
    expect(lowShowRate(baseInput({ intros: booked(1, 8) }))).toBeNull();
  });

  it('returns null at or above 60%', () => {
    expect(lowShowRate(baseInput({ intros: booked(6, 4) }))).toBeNull();
  });

  it('fires below 60%, leaving out cancelled and future bookings', () => {
    const intros = [
      ...booked(5, 5),
      intro({ attended: 'Yes', date: '2026-07-01', status: 'Cancelled' }),
      intro({ attended: 'Yes', date: '2026-08-30' }),
    ];
    const insight = lowShowRate(baseInput({ intros }));
    expect(insight?.id).toBe('low-show-rate');
    expect(insight?.message).toContain('5 of 10');
  });
});

describe('earlyCancellations', () => {
  const pair = (name: string, joinedDaysAgo: number, cancelledDaysAgo: number) => ({
    s: signup({ name, membership_date: isoDaysAgo(joinedDaysAgo).slice(0, 10) }),
    c: cancellation({ name, date: isoDaysAgo(cancelledDaysAgo).slice(0, 10) }),
  });
  const run = (pairs: ReturnType<typeof pair>[]) =>
    earlyCancellations(
      baseInput({ signups: pairs.map((p) => p.s), cancellations: pairs.map((p) => p.c) })
    );

  it('returns null below 3 early cancellations', () => {
    expect(run([pair('Member One', 40, 5), pair('Member Two', 50, 5)])).toBeNull();
  });

  it('ignores long-time members and old cancellations', () => {
    expect(
      run([pair('Member One', 400, 5), pair('Member Two', 500, 5), pair('Member Three', 200, 150)])
    ).toBeNull();
  });

  it('fires and lists members who left within 90 days of joining', () => {
    const insight = run([
      pair('Member One', 40, 5),
      pair('Member Two', 50, 5),
      pair('Member Three', 60, 5),
    ]);
    expect(insight?.id).toBe('early-cancellations');
    expect(insight?.message).toContain('Member Two');
  });
});
