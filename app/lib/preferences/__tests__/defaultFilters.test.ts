import {
  CURRENT,
  resolveOverviewDefault,
  resolveTabDefaults,
  shippedDefaults,
} from '../defaultFilters';

const now = new Date('2026-08-14T12:00:00Z');

describe('resolveTabDefaults', () => {
  it('falls back to the shipped defaults when nothing is saved', () => {
    expect(resolveTabDefaults(undefined, now)).toEqual(shippedDefaults(now));
  });

  it('applies a saved choice over the shipped default', () => {
    expect(resolveTabDefaults({ staff: 'Alpha Instructor' }, now).staff).toBe('Alpha Instructor');
  });

  it('keeps the live current period when the year or month is saved as CURRENT', () => {
    const resolved = resolveTabDefaults({ year: CURRENT, month: CURRENT }, now);
    expect(resolved.year).toBe('2026');
    expect(resolved.month).toBe('Aug');
  });

  it('pins a literal year rather than tracking today', () => {
    expect(resolveTabDefaults({ year: '2024' }, now).year).toBe('2024');
  });

  it('leaves untouched filters at their shipped value, so older saved prefs stay valid', () => {
    const resolved = resolveTabDefaults({ staff: 'Alpha Instructor' }, now);
    expect(resolved.class).toBe('all');
    expect(resolved.membership).toBe('all');
  });
});

describe('resolveOverviewDefault', () => {
  it('defaults to all time', () => {
    expect(resolveOverviewDefault(null)).toBe('all');
    expect(resolveOverviewDefault({})).toBe('all');
  });

  it('returns the saved range', () => {
    expect(resolveOverviewDefault({ defaultFilters: { overview: { dateRange: '90d' } } })).toBe(
      '90d'
    );
  });
});
