import type { Member } from '@/types';

export type DerivedMemberStatus = 'Active' | 'On Hold' | 'Alumni' | 'Expired';
export type RosterStatus = Exclude<DerivedMemberStatus, 'Expired'>;

export interface MemberLifecycle {
  /** `status` as last written by the roster CSV import. */
  rosterStatus?: Member['status'];
  /** Epoch ms of the member's most recent signup, if we have one. */
  latestSignup?: number | undefined;
  /** Epoch ms of the member's most recent cancellation, if we have one. */
  latestCancellation?: number | undefined;
  hasActiveHold: boolean;
  /** A roster sync newer than the cancellation still lists them — see hasRejoinedSinceCancellation. */
  rejoinedPerRoster: boolean;
}

function fallbackStatus(status?: Member['status']): DerivedMemberStatus {
  if (status === 'Active' || status === 'On Hold') {
    return status;
  }
  return 'Alumni';
}

/**
 * Status is derived from lifecycle records, never stored, so it self-heals when history
 * is corrected. Order matters: a cancellation outranks a hold, a hold outranks a lapsed
 * membership, and only then does an old signup count as evidence of being Active.
 */
export function deriveMemberStatus({
  rosterStatus,
  latestSignup,
  latestCancellation,
  hasActiveHold,
  rejoinedPerRoster,
}: MemberLifecycle): DerivedMemberStatus {
  const cancelledAfterSignup =
    latestCancellation !== undefined &&
    (latestSignup === undefined || latestCancellation > latestSignup);

  if (cancelledAfterSignup && !rejoinedPerRoster) {
    return 'Alumni';
  }
  if (hasActiveHold) {
    return 'On Hold';
  }
  if (rosterStatus === 'Inactive' && latestCancellation === undefined) {
    // The roster stopped listing them as a member, yet no cancellation was ever recorded:
    // the membership reached its end date without a renewal. Without this branch their old
    // signup still reads as proof they are Active.
    return 'Expired';
  }
  if (latestSignup !== undefined) {
    return 'Active';
  }
  return fallbackStatus(rosterStatus);
}

/**
 * Expired is a flavour of Alumni, not a peer of it: both mean "no longer training", and the
 * roster's counts, filters, and badges treat them identically. The distinction — cancelled
 * versus simply lapsed — surfaces only in the member's own journey panel.
 */
export function toRosterStatus(status: DerivedMemberStatus): RosterStatus {
  return status === 'Expired' ? 'Alumni' : status;
}
