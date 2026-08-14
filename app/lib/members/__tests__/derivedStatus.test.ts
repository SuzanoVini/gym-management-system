import { deriveMemberStatus, type MemberLifecycle, toRosterStatus } from '../derivedStatus';

const base: MemberLifecycle = {
  rosterStatus: 'Active',
  hasActiveHold: false,
  rejoinedPerRoster: false,
};

const JAN = Date.parse('2026-01-01');
const JUN = Date.parse('2026-06-01');

describe('deriveMemberStatus', () => {
  it('marks a signed-up member with no cancellation as Active', () => {
    expect(deriveMemberStatus({ ...base, latestSignup: JAN })).toBe('Active');
  });

  it('marks a member whose cancellation postdates their signup as Alumni', () => {
    expect(deriveMemberStatus({ ...base, latestSignup: JAN, latestCancellation: JUN })).toBe(
      'Alumni'
    );
  });

  it('marks a lapsed membership with no cancellation record as Expired', () => {
    expect(deriveMemberStatus({ ...base, rosterStatus: 'Inactive', latestSignup: JAN })).toBe(
      'Expired'
    );
  });

  it('does not call it Expired when a cancellation explains the inactivity', () => {
    expect(
      deriveMemberStatus({
        ...base,
        rosterStatus: 'Inactive',
        latestSignup: JAN,
        latestCancellation: JUN,
      })
    ).toBe('Alumni');
  });

  it('keeps a rejoined member out of Alumni', () => {
    expect(
      deriveMemberStatus({
        ...base,
        latestSignup: JAN,
        latestCancellation: JUN,
        rejoinedPerRoster: true,
      })
    ).toBe('Active');
  });

  it('lets an active hold outrank a lapsed roster status', () => {
    expect(
      deriveMemberStatus({
        ...base,
        rosterStatus: 'Inactive',
        latestSignup: JAN,
        hasActiveHold: true,
      })
    ).toBe('On Hold');
  });

  it('falls back to the roster status when no lifecycle records exist', () => {
    expect(deriveMemberStatus({ ...base, rosterStatus: 'On Hold' })).toBe('On Hold');
    expect(deriveMemberStatus({ ...base, rosterStatus: undefined })).toBe('Alumni');
  });
});

describe('toRosterStatus', () => {
  it('collapses Expired into Alumni so the roster treats them identically', () => {
    expect(toRosterStatus('Expired')).toBe('Alumni');
  });

  it('leaves every other status untouched', () => {
    expect(toRosterStatus('Active')).toBe('Active');
    expect(toRosterStatus('On Hold')).toBe('On Hold');
    expect(toRosterStatus('Alumni')).toBe('Alumni');
  });
});
