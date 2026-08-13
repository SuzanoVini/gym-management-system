import { escapeIlike } from '@/lib/utils/normalizePersonKey';
import { supabase } from './client';

export interface MemberStatus {
  isCurrentMember: boolean;
  signupDate: string | null;
}

export interface RosterEntry {
  status?: string | null;
  last_sync_at?: string | null;
}

/**
 * Zen Planner doesn't re-fire the signup automation when an alumnus rejoins, so no new signup
 * record ever arrives to outdate their cancellation. A roster sync taken after the cancellation
 * that still lists them as a member (current, on hold, or not-yet-started) is the only evidence
 * they came back. Shared by every place that compares signups against cancellations.
 */
export function hasRejoinedSinceCancellation(
  member: RosterEntry | null | undefined,
  cancellationDate: string | number | null | undefined
): boolean {
  if (!(member && cancellationDate) || member.status === 'Inactive') {
    return false;
  }

  const syncedAt = member.last_sync_at ? Date.parse(member.last_sync_at) : Number.NaN;
  const cancelledAt =
    typeof cancellationDate === 'number' ? cancellationDate : Date.parse(cancellationDate);

  return !(Number.isNaN(syncedAt) || Number.isNaN(cancelledAt)) && syncedAt > cancelledAt;
}

export async function checkMemberStatus(name: string): Promise<MemberStatus> {
  const normalised = name.toLowerCase().trim();

  const [signupResult, cancellationResult, memberResult] = await Promise.all([
    supabase
      .from('signups')
      .select('membership_date')
      .ilike('name', escapeIlike(normalised))
      .order('membership_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('cancellations')
      .select('date')
      .eq('name_normalized', normalised)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('members')
      .select('status, last_sync_at')
      .eq('name_normalized', normalised)
      .maybeSingle(),
  ]);

  const signup = signupResult.data;
  const cancellation = cancellationResult.data;
  const cancellationDate = cancellation?.date ?? '';
  const rejoined = hasRejoinedSinceCancellation(memberResult.data, cancellationDate);

  if (!signup) {
    return { isCurrentMember: rejoined, signupDate: null };
  }

  const signupDate = signup.membership_date ?? '';

  // Current member = signed up AND (no cancellation OR cancellation before signup OR rejoined since)
  const isCurrentMember = !cancellationDate || cancellationDate < signupDate || rejoined;

  return { isCurrentMember, signupDate };
}

export async function getMostRecentSignupDate(name: string): Promise<string | null> {
  const { data } = await supabase
    .from('signups')
    .select('membership_date')
    .ilike('name', escapeIlike(name.toLowerCase().trim()))
    .order('membership_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.membership_date ?? null;
}
