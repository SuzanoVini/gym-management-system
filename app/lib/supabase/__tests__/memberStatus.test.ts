import { hasRejoinedSinceCancellation } from '../memberStatus';

describe('hasRejoinedSinceCancellation', () => {
  const cancelledOn = '2026-03-01';

  it('treats a roster sync taken after the cancellation as evidence of a rejoin', () => {
    expect(
      hasRejoinedSinceCancellation(
        { status: 'Active', last_sync_at: '2026-08-01T10:00:00.000Z' },
        cancelledOn
      )
    ).toBe(true);
  });

  it('accepts an upcoming membership and a hold, since both mean the roster still lists them', () => {
    for (const status of ['Active', 'On Hold']) {
      expect(
        hasRejoinedSinceCancellation(
          { status, last_sync_at: '2026-08-01T10:00:00.000Z' },
          cancelledOn
        )
      ).toBe(true);
    }
  });

  it('does not override when the roster dropped them to Inactive', () => {
    expect(
      hasRejoinedSinceCancellation(
        { status: 'Inactive', last_sync_at: '2026-08-01T10:00:00.000Z' },
        cancelledOn
      )
    ).toBe(false);
  });

  it('does not override when the cancellation is newer than the last sync', () => {
    expect(
      hasRejoinedSinceCancellation(
        { status: 'Active', last_sync_at: '2026-02-01T10:00:00.000Z' },
        cancelledOn
      )
    ).toBe(false);
  });

  it('accepts a numeric cancellation timestamp for callers that pre-parse dates', () => {
    expect(
      hasRejoinedSinceCancellation(
        { status: 'Active', last_sync_at: '2026-08-01T10:00:00.000Z' },
        Date.parse(cancelledOn)
      )
    ).toBe(true);
  });

  it('returns false for missing roster entries, sync times, or cancellation dates', () => {
    const synced = { status: 'Active', last_sync_at: '2026-08-01T10:00:00.000Z' };
    expect(hasRejoinedSinceCancellation(null, cancelledOn)).toBe(false);
    expect(hasRejoinedSinceCancellation(undefined, cancelledOn)).toBe(false);
    expect(hasRejoinedSinceCancellation({ status: 'Active' }, cancelledOn)).toBe(false);
    expect(hasRejoinedSinceCancellation(synced, '')).toBe(false);
    expect(hasRejoinedSinceCancellation(synced, null)).toBe(false);
    expect(hasRejoinedSinceCancellation(synced, 'not a date')).toBe(false);
  });
});
