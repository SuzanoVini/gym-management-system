import { getPayrollPeriodForDate } from '@/lib/utils/date.utils';
import type { PayrollPeriod } from '@/types';
import { computeSuggestedNextPeriod } from '../PeriodCreateModal';

function period(overrides: Partial<PayrollPeriod> = {}): PayrollPeriod {
  return {
    id: `period-${Math.random()}`,
    created_at: '2026-01-01T00:00:00Z',
    period_label: '',
    start_date: '2026-07-01',
    end_date: '2026-07-15',
    is_current: false,
    is_closed: false,
    ...overrides,
  } as PayrollPeriod;
}

describe('computeSuggestedNextPeriod', () => {
  it('suggests the second half of the month right after a first-half period', () => {
    const periods = [period({ start_date: '2026-07-01', end_date: '2026-07-15' })];
    const suggestion = computeSuggestedNextPeriod(periods, getPayrollPeriodForDate);
    expect(suggestion).toEqual({ startDate: '2026-07-16', endDate: '2026-07-31' });
  });

  it('rolls into next month after a second-half period', () => {
    const periods = [period({ start_date: '2026-07-16', end_date: '2026-07-31' })];
    const suggestion = computeSuggestedNextPeriod(periods, getPayrollPeriodForDate);
    expect(suggestion).toEqual({ startDate: '2026-08-01', endDate: '2026-08-15' });
  });

  it('picks the latest period when multiple exist, regardless of array order', () => {
    const periods = [
      period({ start_date: '2026-06-01', end_date: '2026-06-15' }),
      period({ start_date: '2026-07-16', end_date: '2026-07-31' }),
      period({ start_date: '2026-06-16', end_date: '2026-06-30' }),
    ];
    const suggestion = computeSuggestedNextPeriod(periods, getPayrollPeriodForDate);
    expect(suggestion).toEqual({ startDate: '2026-08-01', endDate: '2026-08-15' });
  });

  it("falls back to today's window when no periods exist", () => {
    const suggestion = computeSuggestedNextPeriod([], getPayrollPeriodForDate);
    const today = getPayrollPeriodForDate(new Date());
    expect(suggestion.startDate).toBe(
      `${today.start.getFullYear()}-${String(today.start.getMonth() + 1).padStart(2, '0')}-${String(today.start.getDate()).padStart(2, '0')}`
    );
  });
});
