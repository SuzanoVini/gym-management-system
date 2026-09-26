import { type DerivedMemberStatus, deriveMemberStatus } from '@/lib/members/derivedStatus';
import { hasRejoinedSinceCancellation } from '@/lib/supabase/memberStatus';
import { isActiveHold } from '@/lib/utils/holds';
import type { Cancellation, Hold, Member, Signup } from '@/types';

export type DisplayMember = Member & { derivedStatus: DerivedMemberStatus };

function nameKey(row: { name: string; name_normalized?: string | null }) {
  return (row.name_normalized ?? row.name).toLowerCase().trim();
}

function parseLifecycleDate(primary?: string | null, fallback?: string | null): number | null {
  const primaryTime = primary ? new Date(primary).getTime() : Number.NaN;
  if (!Number.isNaN(primaryTime)) {
    return primaryTime;
  }
  const fallbackTime = fallback ? new Date(fallback).getTime() : Number.NaN;
  return Number.isNaN(fallbackTime) ? null : fallbackTime;
}

export function buildMemberRoster({
  members,
  signups,
  cancellations,
  holds,
  now,
}: {
  members: Member[];
  signups: Signup[];
  cancellations: Cancellation[];
  holds: Hold[];
  now: Date;
}): DisplayMember[] {
  const latestSignupByName = new Map<string, number>();
  const latestCancellationByName = new Map<string, number>();
  const activeHoldKeys = new Set<string>();

  for (const signup of signups) {
    const effectiveDate = parseLifecycleDate(signup.membership_date, signup.created_at);
    if (effectiveDate === null) {
      continue;
    }
    const key = nameKey(signup);
    const current = latestSignupByName.get(key);
    if (current === undefined || effectiveDate > current) {
      latestSignupByName.set(key, effectiveDate);
    }
  }

  for (const cancellation of cancellations) {
    const effectiveDate = parseLifecycleDate(cancellation.date, cancellation.created_at);
    if (effectiveDate === null) {
      continue;
    }
    const key = nameKey(cancellation);
    const current = latestCancellationByName.get(key);
    if (current === undefined || effectiveDate > current) {
      latestCancellationByName.set(key, effectiveDate);
    }
  }

  for (const hold of holds) {
    if (isActiveHold(hold, now)) {
      activeHoldKeys.add(nameKey(hold));
    }
  }

  return members.map((member) => {
    const key = nameKey(member);
    const latestSignup = latestSignupByName.get(key);
    const latestCancellation = latestCancellationByName.get(key);

    const derivedStatus = deriveMemberStatus({
      rosterStatus: member.status,
      latestSignup,
      latestCancellation,
      hasActiveHold: activeHoldKeys.has(key),
      rejoinedPerRoster: hasRejoinedSinceCancellation(member, latestCancellation),
    });

    return { ...member, derivedStatus };
  });
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Classifies plan strings into independent summary groups.
export function summarizeMemberPlans(nonAlumniMembers: DisplayMember[]) {
  const program = { Legacy: 0, Integrity: 0, Special: 0 };
  const age = { Adults: 0, Kids: 0 };
  const duration = { Annual: 0, 'Semi-Annual': 0 };
  const classPacks = { 'Flex 10': 0, 'Flex 20': 0 };

  for (const member of nonAlumniMembers) {
    const plan = member.membership_type?.toLowerCase() ?? '';
    if (plan.includes('legacy')) {
      program.Legacy++;
    }
    if (plan.includes('integrity')) {
      program.Integrity++;
    }
    if (plan.includes('special')) {
      program.Special++;
    }
    if (plan.includes('adult')) {
      age.Adults++;
    }
    if (plan.includes('kids') || plan.includes('youth')) {
      age.Kids++;
    }
    if (plan.includes('semi-annual') || plan.includes('semi annual')) {
      duration['Semi-Annual']++;
    } else if (plan.includes('annual')) {
      duration.Annual++;
    }
    if (plan.includes('flex 10')) {
      classPacks['Flex 10']++;
    }
    if (plan.includes('flex 20')) {
      classPacks['Flex 20']++;
    }
  }

  const nonZeroEntries = (counts: Record<string, number>) =>
    Object.entries(counts).filter(([, count]) => count > 0) as [string, number][];

  return {
    program: nonZeroEntries(program),
    age: nonZeroEntries(age),
    duration: nonZeroEntries(duration),
    classPacks: nonZeroEntries(classPacks),
  };
}
