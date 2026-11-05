import type { Cancellation } from '@/types';
import { type InsightRuleInput, seasonalTravelCancellations } from '../../rules';

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

describe('seasonalTravelCancellations', () => {
  it('returns null at or below the 8-cancellation threshold', () => {
    const cancellations = Array.from({ length: 8 }, () => cancellation({ reason: 'Travel' }));
    expect(seasonalTravelCancellations(baseInput({ cancellations }))).toBeNull();
  });

  it('fires above the threshold and quotes the real hold policy and revenue setting', () => {
    const cancellations = Array.from({ length: 9 }, () => cancellation({ reason: 'Travel' }));
    const insight = seasonalTravelCancellations(
      baseInput({ cancellations, revenuePerMember: 100 })
    );
    expect(insight?.id).toBe('seasonal-travel-cancellations');
    expect(insight?.impact).toContain('$100/month');
    expect(insight?.actions.join(' ')).toContain('$20 a month');
  });
});
