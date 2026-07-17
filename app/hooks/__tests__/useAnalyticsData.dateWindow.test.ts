import { previousWindow, resolveDateWindow } from '../useAnalyticsData';

const NOW = new Date('2026-07-17T12:00:00Z');

describe('resolveDateWindow', () => {
  it('returns null for "all" — no bounded window to compare against', () => {
    expect(resolveDateWindow('all', '', '', NOW)).toBeNull();
  });

  it('computes a 1-month window ending now', () => {
    const window = resolveDateWindow('1month', '', '', NOW);
    expect(window?.endDate).toEqual(NOW);
    expect(window?.startDate.getUTCMonth()).toBe(NOW.getUTCMonth() - 1);
  });

  it('computes year-to-date starting Jan 1', () => {
    const window = resolveDateWindow('ytd', '', '', NOW);
    expect(window?.startDate.getFullYear()).toBe(NOW.getFullYear());
    expect(window?.startDate.getMonth()).toBe(0);
    expect(window?.startDate.getDate()).toBe(1);
  });

  it('uses custom start/end dates when provided', () => {
    const window = resolveDateWindow('custom', '2026-01-01', '2026-01-31', NOW);
    // Local-time getters — the resolver applies setHours() in local time,
    // matching how the date <input> values are used elsewhere in the app
    expect(window?.startDate.getDate()).toBe(1);
    expect(window?.startDate.getMonth()).toBe(0);
    expect(window?.endDate.getDate()).toBe(31);
    expect(window?.endDate.getMonth()).toBe(0);
  });
});

describe('previousWindow', () => {
  it('returns the immediately preceding window of the same length', () => {
    const current = { startDate: new Date('2026-07-01'), endDate: new Date('2026-07-15') };
    const lengthMs = current.endDate.getTime() - current.startDate.getTime();
    const prev = previousWindow(current);
    // Ends the millisecond before the current window starts, same length before that
    expect(prev.endDate.getTime()).toBe(current.startDate.getTime() - 1);
    expect(prev.startDate.getTime()).toBe(current.startDate.getTime() - lengthMs);
  });
});
