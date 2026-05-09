import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface SignupRecord {
  name: string | null;
  membership_date: string | null;
}

interface CancellationRecord {
  name: string | null;
  date: string | null;
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
  cancellationMap: Map<string, string>
): Map<string, string> {
  const result = new Map<string, string>();
  for (const [name, cancellationDate] of cancellationMap) {
    const signupDate = signupMap.get(name);
    if (signupDate && cancellationDate >= signupDate) {
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
        const [signupsResult, cancellationsResult] = await Promise.all([
          supabase.from('signups').select('name, membership_date'),
          supabase.from('cancellations').select('name, date'),
        ]);

        if (cancelled) {
          return;
        }

        const signups = (signupsResult.data ?? []) as SignupRecord[];
        const cancellations = (cancellationsResult.data ?? []) as CancellationRecord[];

        const signupMap = buildMostRecentMap(
          signups.map((s) => ({ name: s.name, date: s.membership_date }))
        );
        const cancellationMap = buildMostRecentMap(
          cancellations.map((c) => ({ name: c.name, date: c.date }))
        );

        const result = filterFormerMembers(signupMap, cancellationMap);
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
