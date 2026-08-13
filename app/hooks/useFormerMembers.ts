import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { hasRejoinedSinceCancellation, type RosterEntry } from '@/lib/supabase/memberStatus';

interface SignupRecord {
  name: string | null;
  membership_date: string | null;
}

interface CancellationRecord {
  name: string | null;
  date: string | null;
}

interface MemberRecord extends RosterEntry {
  name: string | null;
}

function buildMostRecentMap(
  records: Array<{ name: string | null; date: string | null }>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const record of records) {
    if (!record.name || !record.date) {
      continue;
    }
    const key = record.name.toLowerCase().trim();
    const existing = map.get(key);
    if (!existing || record.date > existing) {
      map.set(key, record.date);
    }
  }
  return map;
}

function filterFormerMembers(
  signupMap: Map<string, string>,
  cancellationMap: Map<string, string>,
  roster: Map<string, RosterEntry>
): Map<string, string> {
  const result = new Map<string, string>();
  for (const [name, cancellationDate] of cancellationMap) {
    const signupDate = signupMap.get(name);
    if (
      signupDate &&
      cancellationDate >= signupDate &&
      !hasRejoinedSinceCancellation(roster.get(name), cancellationDate)
    ) {
      result.set(name, cancellationDate);
    }
  }
  return result;
}

export function useFormerMembers(): Map<string, string> {
  const [map, setMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [signupsResult, cancellationsResult, membersResult] = await Promise.all([
          supabase.from('signups').select('name, membership_date'),
          supabase.from('cancellations').select('name, date'),
          supabase.from('members').select('name, status, last_sync_at'),
        ]);

        if (cancelled) {
          return;
        }

        const signups = (signupsResult.data ?? []) as SignupRecord[];
        const cancellations = (cancellationsResult.data ?? []) as CancellationRecord[];
        const members = (membersResult.data ?? []) as MemberRecord[];

        const signupMap = buildMostRecentMap(
          signups.map((s) => ({ name: s.name, date: s.membership_date }))
        );
        const cancellationMap = buildMostRecentMap(
          cancellations.map((c) => ({ name: c.name, date: c.date }))
        );
        const roster = new Map<string, RosterEntry>(
          members
            .filter((m): m is MemberRecord & { name: string } => Boolean(m.name))
            .map((m) => [m.name.toLowerCase().trim(), m])
        );

        const result = filterFormerMembers(signupMap, cancellationMap, roster);
        setMap(result);
      } catch (err) {
        console.error('useFormerMembers: failed to load', err);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return map;
}
