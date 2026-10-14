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

function latestDateByName<T extends { name: string; name_normalized?: string | null }>(
  rows: T[],
  getDates: (row: T) => [string | null | undefined, string | null | undefined]
): Map<string, number> {
  const latestByName = new Map<string, number>();
  for (const row of rows) {
    const effectiveDate = parseLifecycleDate(...getDates(row));
    if (effectiveDate === null) {
      continue;
    }
    const key = nameKey(row);
    const current = latestByName.get(key);
    if (current === undefined || effectiveDate > current) {
      latestByName.set(key, effectiveDate);
    }
  }
  return latestByName;
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
  const latestSignupByName = latestDateByName(signups, (signup) => [
    signup.membership_date,
    signup.created_at,
  ]);
  const latestCancellationByName = latestDateByName(cancellations, (cancellation) => [
    cancellation.date,
    cancellation.created_at,
  ]);
  const activeHoldKeys = new Set<string>();

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

interface PlanCounts {
  program: { Legacy: number; Integrity: number; Special: number };
  age: { Adults: number; Kids: number };
  duration: { Annual: number; 'Semi-Annual': number };
  classPacks: { 'Flex 10': number; 'Flex 20': number };
}

function countProgramAndAge(plan: string, { program, age }: PlanCounts): void {
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
}

function countDurationAndPacks(plan: string, { duration, classPacks }: PlanCounts): void {
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

export function summarizeMemberPlans(nonAlumniMembers: DisplayMember[]) {
  const counts: PlanCounts = {
    program: { Legacy: 0, Integrity: 0, Special: 0 },
    age: { Adults: 0, Kids: 0 },
    duration: { Annual: 0, 'Semi-Annual': 0 },
    classPacks: { 'Flex 10': 0, 'Flex 20': 0 },
  };

  for (const member of nonAlumniMembers) {
    const plan = member.membership_type?.toLowerCase() ?? '';
    countProgramAndAge(plan, counts);
    countDurationAndPacks(plan, counts);
  }

  const nonZeroEntries = (group: Record<string, number>) =>
    Object.entries(group).filter(([, count]) => count > 0) as [string, number][];

  return {
    program: nonZeroEntries(counts.program),
    age: nonZeroEntries(counts.age),
    duration: nonZeroEntries(counts.duration),
    classPacks: nonZeroEntries(counts.classPacks),
  };
}
