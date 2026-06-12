import {
  dateInputToUTCTimestamp,
  detectReminderDate,
  getReminderBadgeLabel,
  getVancouverDate,
  isReminderActive,
  utcTimestampToDateInput,
} from '@/lib/utils/reminderUtils';

// Fixed "today" for deterministic tests: 2026-06-08 in Vancouver
const FIXED_NOW_UTC = '2026-06-08T14:00:00Z'; // 7am Vancouver PDT

describe('getVancouverDate', () => {
  it('returns the correct Vancouver date for a UTC timestamp', () => {
    // 2026-06-08T14:00:00Z = 07:00 Vancouver PDT
    const { year, month, day } = getVancouverDate(new Date(FIXED_NOW_UTC));
    expect(year).toBe(2026);
    expect(month).toBe(5); // 0-indexed June
    expect(day).toBe(8);
  });

  it('handles the UTC midnight rollover (00:30 UTC = prev day in Vancouver)', () => {
    // 2026-06-09T00:30:00Z = 17:30 June 8 Vancouver PDT
    const { year, month, day } = getVancouverDate(new Date('2026-06-09T00:30:00Z'));
    expect(year).toBe(2026);
    expect(month).toBe(5);
    expect(day).toBe(8);
  });
});

describe('dateInputToUTCTimestamp', () => {
  it('converts 2026-06-08 to 2026-06-08T07:00:00.000Z (PDT = UTC-7)', () => {
    const result = dateInputToUTCTimestamp('2026-06-08');
    expect(result).toBe('2026-06-08T07:00:00.000Z');
  });

  it('converts a PST date with UTC-8 offset', () => {
    const result = dateInputToUTCTimestamp('2026-01-15');
    expect(result).toBe('2026-01-15T08:00:00.000Z');
  });
});

describe('utcTimestampToDateInput', () => {
  it('round-trips a date-input value', () => {
    expect(utcTimestampToDateInput('2026-06-08T07:00:00.000Z')).toBe('2026-06-08');
  });
});

describe('isReminderActive', () => {
  it('returns false for null/undefined', () => {
    expect(isReminderActive(null, FIXED_NOW_UTC)).toBe(false);
    expect(isReminderActive(undefined, FIXED_NOW_UTC)).toBe(false);
  });

  it('returns true when reminder date is today', () => {
    const today = '2026-06-08T07:00:00.000Z'; // midnight Vancouver June 8
    expect(isReminderActive(today, FIXED_NOW_UTC)).toBe(true);
  });

  it('returns true when reminder date is in the past', () => {
    const past = '2026-06-01T07:00:00.000Z';
    expect(isReminderActive(past, FIXED_NOW_UTC)).toBe(true);
  });

  it('returns false when reminder date is in the future', () => {
    const future = '2026-06-15T07:00:00.000Z';
    expect(isReminderActive(future, FIXED_NOW_UTC)).toBe(false);
  });
});

describe('getReminderBadgeLabel', () => {
  it('returns "today" when reminder is today', () => {
    const today = '2026-06-08T07:00:00.000Z';
    expect(getReminderBadgeLabel(today, FIXED_NOW_UTC)).toBe('today');
  });

  it('returns "overdue" when reminder is in the past', () => {
    const past = '2026-06-01T07:00:00.000Z';
    expect(getReminderBadgeLabel(past, FIXED_NOW_UTC)).toBe('overdue');
  });
});

describe('detectReminderDate', () => {
  const NOW = new Date(FIXED_NOW_UTC);

  it('returns null for vague phrases', () => {
    expect(detectReminderDate('maybe later', NOW)).toBeNull();
    expect(detectReminderDate('not interested', NOW)).toBeNull();
    expect(detectReminderDate('not ready', NOW)).toBeNull();
    expect(detectReminderDate('will think about it', NOW)).toBeNull();
  });

  it('detects "call back in 2 weeks"', () => {
    const result = detectReminderDate('call back in 2 weeks', NOW);
    expect(result).not.toBeNull();
    // Should be ~14 days from June 8 = June 22
    expect(result!.getDate()).toBe(22);
    expect(result!.getMonth()).toBe(5); // June
  });

  it('detects "follow up in 3 days"', () => {
    const result = detectReminderDate('follow up in 3 days', NOW);
    expect(result).not.toBeNull();
    expect(result!.getDate()).toBe(11);
  });

  it('detects "try again in a month"', () => {
    const result = detectReminderDate('try again in a month', NOW);
    expect(result).not.toBeNull();
  });

  it('detects "not ready until July"', () => {
    const result = detectReminderDate('not ready until July', NOW);
    expect(result).not.toBeNull();
    expect(result!.getMonth()).toBe(6); // July
    expect(result!.getDate()).toBe(1);
  });

  it('detects "after August"', () => {
    const result = detectReminderDate('after August', NOW);
    expect(result).not.toBeNull();
    expect(result!.getMonth()).toBe(7); // August
  });

  it('does NOT trigger for bare "in July"', () => {
    expect(detectReminderDate('in July', NOW)).toBeNull();
    expect(detectReminderDate('she mentioned in July', NOW)).toBeNull();
  });

  it('detects "end of June"', () => {
    const result = detectReminderDate('end of June', NOW);
    expect(result).not.toBeNull();
    expect(result!.getMonth()).toBe(5);
    expect(result!.getDate()).toBe(30);
  });

  it('detects "next week"', () => {
    const result = detectReminderDate('call next week', NOW);
    expect(result).not.toBeNull();
  });

  it('detects "next month"', () => {
    const result = detectReminderDate('follow up next month', NOW);
    expect(result).not.toBeNull();
    expect(result!.getMonth()).toBe(6); // July
  });

  it('detects "beginning of next month"', () => {
    const result = detectReminderDate('beginning of next month', NOW);
    expect(result).not.toBeNull();
    expect(result!.getMonth()).toBe(6); // July
    expect(result!.getDate()).toBe(1);
  });

  it('returns null if detected date is yesterday or earlier', () => {
    // "after May" — May is already past; spec says future months only (no year rollover)
    expect(detectReminderDate('after May', NOW)).toBeNull();
  });
});
