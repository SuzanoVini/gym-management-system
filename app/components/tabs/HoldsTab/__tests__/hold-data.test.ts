import type { Hold } from '@/types';
import { filterHolds, getAvailableHoldYears, getHoldStatus, sortHolds } from '../hold-data';

function hold(id: string, overrides: Partial<Hold> = {}): Hold {
  return { id, month: 'Jan', name: id, created_at: '2026-01-01T00:00:00.000Z', ...overrides };
}

describe('hold table data', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
  });

  afterEach(() => jest.useRealTimers());

  it('keeps existing hold status boundaries', () => {
    expect(getHoldStatus(undefined, '2026-06-01')).toBe('unknown');
    expect(getHoldStatus('2026-06-16')).toBe('upcoming');
    expect(getHoldStatus('2026-06-01', '2026-06-14')).toBe('ended');
    expect(getHoldStatus('2026-06-01', '2026-06-16')).toBe('active');
  });

  it('applies month, reason, status, year, and search filters together', () => {
    const holds = [
      hold('Alex Rivera', {
        month: 'Jun',
        reason: 'Travel',
        start: '2026-06-01',
        end: '2026-06-30',
        year: 2026,
      }),
      hold('Alex Morgan', {
        month: 'Jun',
        reason: 'Medical',
        start: '2026-06-01',
        end: '2026-06-30',
        year: 2026,
      }),
      hold('Alex Rivera', {
        month: 'Jul',
        reason: 'Travel',
        start: '2026-06-01',
        end: '2026-06-30',
        year: 2026,
      }),
    ];
    const filters = {
      month: 'Jun',
      reason: 'Travel',
      holdStatus: 'active',
      year: '2026',
      searchTerm: ' RIVERA ',
    };

    expect(filterHolds(holds, filters, getHoldStatus).map(({ id }) => id)).toEqual(['Alex Rivera']);
  });

  it('sorts by start date, falls back to creation time, and lists unique years descending', () => {
    const holds = [
      hold('no-start-old', { year: 2024, created_at: '2024-01-01T00:00:00.000Z' }),
      hold('later-start', {
        year: 2026,
        start: '2026-03-01',
        created_at: '2020-01-01T00:00:00.000Z',
      }),
      hold('no-start-new', { year: 2025, created_at: '2025-01-01T00:00:00.000Z' }),
      hold('no-year', { year: 0 }),
    ];

    expect(sortHolds(holds, 'newest').map(({ id }) => id)).toEqual([
      'later-start',
      'no-year',
      'no-start-new',
      'no-start-old',
    ]);
    expect(sortHolds(holds, 'oldest').map(({ id }) => id)).toEqual([
      'no-start-old',
      'no-start-new',
      'no-year',
      'later-start',
    ]);
    expect(getAvailableHoldYears(holds)).toEqual([2026, 2025, 2024]);
  });
});
