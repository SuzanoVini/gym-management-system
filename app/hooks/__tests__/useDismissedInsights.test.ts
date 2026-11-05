import type { DismissedInsight } from '@/lib/supabase/dismissedInsights';
import { isInsightHidden } from '../useDismissedInsights';

const NOW = new Date('2026-11-05T12:00:00Z');
const daysFromNow = (days: number) =>
  new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

const record = (overrides: Partial<DismissedInsight>): DismissedInsight => ({
  id: 'r1',
  user_id: 'u1',
  insight_id: 'some-insight',
  action: 'dismissed',
  snoozed_until: null,
  dismissed_at: daysFromNow(0),
  data_hash: '',
  created_at: daysFromNow(0),
  ...overrides,
});

describe('isInsightHidden', () => {
  it('shows an insight with no record', () => {
    expect(isInsightHidden(undefined, NOW)).toBe(false);
  });

  it('keeps a dismissed insight hidden, however long ago', () => {
    expect(isInsightHidden(record({ dismissed_at: daysFromNow(-900) }), NOW)).toBe(true);
  });

  it('hides a done insight for 30 days, then lets it return', () => {
    const done = (days: number) => record({ action: 'done', dismissed_at: daysFromNow(days) });
    expect(isInsightHidden(done(-29), NOW)).toBe(true);
    expect(isInsightHidden(done(-31), NOW)).toBe(false);
  });

  it('hides a snoozed insight only until the snooze ends', () => {
    const snoozed = (days: number) =>
      record({ action: 'snoozed', snoozed_until: daysFromNow(days) });
    expect(isInsightHidden(snoozed(1), NOW)).toBe(true);
    expect(isInsightHidden(snoozed(-1), NOW)).toBe(false);
  });
});
