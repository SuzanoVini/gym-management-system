import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';
import { fetchRecentIntros } from '@/lib/supabase/intros';
import { addBusinessDays } from '@/lib/utils/businessDays';
import { normalizePersonKey, personKeyString } from '@/lib/utils/normalizePersonKey';
import { isReminderActive } from '@/lib/utils/reminderUtils';
import type { Intro } from '@/types';

export interface FollowUpRow extends Intro {
  firstDueDate: Date;
  secondDueDate: Date | null;
  isFirstOverdue: boolean;
  isSecondOverdue: boolean;
  isDueToday: boolean;
  tier: 1 | 2 | 3 | 4 | 5;
  hasActiveReminder: boolean;
}

function getTier(row: Omit<FollowUpRow, 'tier'>, today: Date): 1 | 2 | 3 | 4 | 5 {
  if (!row.followup_1_at) {
    if (row.firstDueDate < today) {
      return 1;
    }
    if (row.firstDueDate.toDateString() === today.toDateString()) {
      return 2;
    }
    return 5;
  }
  if (!row.followup_2_at) {
    if (row.secondDueDate && row.secondDueDate < today) {
      return 3;
    }
    return 4;
  }
  return 5;
}

export function useFollowUps() {
  const [recentIntros, setRecentIntros] = useState<Intro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [noteQuery, setNoteQuery] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRecentIntros();
      setRecentIntros(data);
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to load follow-ups');
      setError(e);
      errorHandler.handle(e, 'useFollowUps');
    } finally {
      setLoading(false);
    }
  }, []);

  const silentRefresh = useCallback(async () => {
    try {
      const data = await fetchRecentIntros();
      setRecentIntros(data);
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Failed to refresh follow-ups');
      errorHandler.handle(e, 'useFollowUps.silentRefresh');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const [today, setToday] = useState(() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  });

  useEffect(() => {
    const msUntilMidnight = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setUTCDate(midnight.getUTCDate() + 1);
      midnight.setUTCHours(0, 0, 0, 0);
      return midnight.getTime() - now.getTime();
    };
    const id = setTimeout(() => {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      setToday(d);
    }, msUntilMidnight());
    return () => clearTimeout(id);
  }, [today]);

  const rows = useMemo<FollowUpRow[]>(() => {
    // Person-level state across all fetched intros: a person group is dismissed
    // when ANY intro in the group has followup_dismissed_at set (handles
    // partial best-effort writes), and the group's reminder is the earliest
    // non-null followup_reminder_at.
    const dismissedKeys = new Set<string>();
    const groupReminders = new Map<string, string>();
    for (const intro of recentIntros) {
      const key = normalizePersonKey(intro.name, intro.email);
      if (!key) {
        continue;
      }
      const k = personKeyString(key);
      if (intro.followup_dismissed_at) {
        dismissedKeys.add(k);
      }
      if (intro.followup_reminder_at) {
        const existing = groupReminders.get(k);
        if (!existing || intro.followup_reminder_at < existing) {
          groupReminders.set(k, intro.followup_reminder_at);
        }
      }
    }

    const base = recentIntros
      .filter((intro) => {
        if (intro.attended !== 'Yes') {
          return false;
        }
        if (intro.signed_up === 'Yes' || intro.signed_up === 'No') {
          return false;
        }
        if (intro.followup_2_at) {
          return false;
        }
        const key = normalizePersonKey(intro.name, intro.email);
        if (key && dismissedKeys.has(personKeyString(key))) {
          return false;
        }
        return true;
      })
      .map((intro) => {
        const introDate = intro.date ? new Date(intro.date) : new Date(intro.created_at);
        const firstDueDate = addBusinessDays(introDate, 2);
        firstDueDate.setUTCHours(0, 0, 0, 0);

        const secondDueDate = intro.followup_1_at
          ? addBusinessDays(new Date(intro.followup_1_at), 5)
          : null;
        if (secondDueDate) {
          secondDueDate.setUTCHours(0, 0, 0, 0);
        }

        const key = normalizePersonKey(intro.name, intro.email);
        const groupReminderAt =
          (key ? groupReminders.get(personKeyString(key)) : undefined) ??
          intro.followup_reminder_at;

        const partial = {
          ...intro,
          firstDueDate,
          secondDueDate,
          isFirstOverdue: !intro.followup_1_at && firstDueDate < today,
          isSecondOverdue: !!intro.followup_1_at && !!secondDueDate && secondDueDate < today,
          isDueToday: !intro.followup_1_at && firstDueDate.toDateString() === today.toDateString(),
          hasActiveReminder: isReminderActive(groupReminderAt),
        };

        return {
          ...partial,
          tier: getTier(partial, today),
        } as FollowUpRow;
      });

    const filtered =
      noteQuery.trim() === ''
        ? base
        : base.filter((row) =>
            row.follow_up_notes?.some((n) => n.note.toLowerCase().includes(noteQuery.toLowerCase()))
          );

    return filtered.sort((a, b) => {
      if (a.tier !== b.tier) {
        return a.tier - b.tier;
      }
      const aDate = a.date ?? a.created_at;
      const bDate = b.date ?? b.created_at;
      return aDate < bDate ? -1 : aDate > bDate ? 1 : 0;
    });
  }, [recentIntros, noteQuery, today]);

  const overdueCount = useMemo(
    () => rows.filter((r) => r.tier === 1 || r.tier === 3).length,
    [rows]
  );

  // Active reminders deduplicated by person group (a person with three
  // bookings counts as one)
  const remindersDueCount = useMemo(() => {
    const seen = new Set<string>();
    for (const row of rows) {
      if (!row.hasActiveReminder) {
        continue;
      }
      const key = normalizePersonKey(row.name, row.email);
      seen.add(key ? personKeyString(key) : row.id);
    }
    return seen.size;
  }, [rows]);

  return {
    rows,
    loading,
    error,
    noteQuery,
    setNoteQuery,
    overdueCount,
    remindersDueCount,
    silentRefresh,
    refresh: load,
  };
}
