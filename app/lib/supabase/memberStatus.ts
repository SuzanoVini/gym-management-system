import { supabase } from './client';

export interface MemberStatus {
  isCurrentMember: boolean;
  signupDate: string | null;
}

export async function checkMemberStatus(name: string): Promise<MemberStatus> {
  const normalised = name.toLowerCase().trim();

  const [signupResult, cancellationResult] = await Promise.all([
    supabase
      .from('signups')
      .select('membership_date')
      .ilike('name', normalised)
      .order('membership_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('cancellations')
      .select('date')
      .ilike('name', normalised)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const signup = signupResult.data;
  const cancellation = cancellationResult.data;

  if (!signup) {
    return { isCurrentMember: false, signupDate: null };
  }

  const signupDate = signup.membership_date ?? '';
  const cancellationDate = cancellation?.date ?? '';

  // Current member = signed up AND (no cancellation OR cancellation before signup)
  const isCurrentMember = !cancellationDate || cancellationDate < signupDate;

  return { isCurrentMember, signupDate };
}

export async function getMostRecentSignupDate(name: string): Promise<string | null> {
  const { data } = await supabase
    .from('signups')
    .select('membership_date')
    .ilike('name', name.toLowerCase().trim())
    .order('membership_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.membership_date ?? null;
}
