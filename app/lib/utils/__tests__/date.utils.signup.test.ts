import { monthAbbrFromDate, yearFromDate } from '../date.utils';

describe('monthAbbrFromDate', () => {
  it('resolves the month for the 1st of the month without a UTC shift', () => {
    expect(monthAbbrFromDate('2026-07-01')).toBe('Jul');
  });

  it('resolves December for year-end dates', () => {
    expect(monthAbbrFromDate('2026-12-31')).toBe('Dec');
  });

  it('returns empty string for unparseable input', () => {
    expect(monthAbbrFromDate('')).toBe('');
  });
});

describe('yearFromDate', () => {
  it('resolves the year for Jan 1 without a UTC shift', () => {
    expect(yearFromDate('2026-01-01')).toBe(2026);
  });

  it('returns undefined for implausible years', () => {
    expect(yearFromDate('1899-01-01')).toBeUndefined();
  });

  it('returns undefined for unparseable input', () => {
    expect(yearFromDate('')).toBeUndefined();
  });
});
