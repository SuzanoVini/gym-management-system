import { isActiveHold } from '../holds';

const NOW = new Date('2026-07-16T12:00:00Z');

describe('isActiveHold', () => {
  it('counts a started, open-ended hold as active', () => {
    expect(isActiveHold({ start: '2026-07-01' }, NOW)).toBe(true);
  });

  it('counts a hold spanning now as active', () => {
    expect(isActiveHold({ start: '2026-07-01', end: '2026-08-01' }, NOW)).toBe(true);
  });

  it('excludes upcoming holds', () => {
    expect(isActiveHold({ start: '2026-08-01', end: '2026-09-01' }, NOW)).toBe(false);
  });

  it('excludes ended holds', () => {
    expect(isActiveHold({ start: '2026-05-01', end: '2026-06-01' }, NOW)).toBe(false);
  });

  it('excludes holds with no start date', () => {
    expect(isActiveHold({}, NOW)).toBe(false);
  });
});
