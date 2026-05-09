import { addBusinessDays } from '../businessDays';

describe('addBusinessDays', () => {
  it('skips weekends: Friday + 1 BD = Monday', () => {
    const friday = new Date('2026-05-08T12:00:00Z'); // Friday
    const result = addBusinessDays(friday, 1);
    expect(result.getUTCDay()).toBe(1); // Monday
    expect(result.toISOString().slice(0, 10)).toBe('2026-05-11');
  });

  it('adds 2 business days across a weekend', () => {
    const thursday = new Date('2026-05-07T12:00:00Z'); // Thursday
    const result = addBusinessDays(thursday, 2);
    expect(result.toISOString().slice(0, 10)).toBe('2026-05-11'); // Monday
  });

  it('adds 5 business days = 1 week when no weekend in between', () => {
    const monday = new Date('2026-05-04T12:00:00Z'); // Monday
    const result = addBusinessDays(monday, 5);
    expect(result.toISOString().slice(0, 10)).toBe('2026-05-11'); // Next Monday
  });

  it('returns same day when days = 0', () => {
    const wednesday = new Date('2026-05-06T12:00:00Z');
    const result = addBusinessDays(wednesday, 0);
    expect(result.toISOString().slice(0, 10)).toBe('2026-05-06');
  });

  it('respects isHoliday callback when provided', () => {
    const monday = new Date('2026-05-11T12:00:00Z');
    const isHoliday = (d: Date) => d.toISOString().slice(0, 10) === '2026-05-12';
    const result = addBusinessDays(monday, 1, isHoliday);
    expect(result.toISOString().slice(0, 10)).toBe('2026-05-13');
  });
});
