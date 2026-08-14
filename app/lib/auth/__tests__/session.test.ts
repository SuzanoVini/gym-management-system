import { isSessionExpired, SESSION_MAX_AGE_MS } from '../session';

describe('isSessionExpired', () => {
  const now = Date.parse('2026-08-14T12:00:00.000Z');
  const at = (msAgo: number) => new Date(now - msAgo).toISOString();

  it('keeps a session that is younger than 24 hours', () => {
    expect(isSessionExpired(at(SESSION_MAX_AGE_MS - 60_000), now)).toBe(false);
  });

  it('expires a session once it reaches 24 hours', () => {
    expect(isSessionExpired(at(SESSION_MAX_AGE_MS), now)).toBe(true);
    expect(isSessionExpired(at(SESSION_MAX_AGE_MS + 60_000), now)).toBe(true);
  });

  it('fails open on a missing or unparseable timestamp, rather than locking the user out', () => {
    expect(isSessionExpired(null, now)).toBe(false);
    expect(isSessionExpired(undefined, now)).toBe(false);
    expect(isSessionExpired('', now)).toBe(false);
    expect(isSessionExpired('not a date', now)).toBe(false);
  });

  it('does not expire a session dated in the future (clock skew)', () => {
    expect(isSessionExpired(at(-60_000), now)).toBe(false);
  });
});
