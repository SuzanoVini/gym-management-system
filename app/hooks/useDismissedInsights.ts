'use client';

import { useCallback, useEffect, useState } from 'react';
import { reportConsoleError } from '@/lib/logger';
import type { DismissedInsight, InsightAction } from '@/lib/supabase/dismissedInsights';
import {
  fetchDismissedInsights,
  restoreInsight,
  upsertDismissedInsight,
} from '@/lib/supabase/dismissedInsights';

// ponytail: fixed window, make it per-rule if some insights need to return sooner
const DONE_HIDDEN_DAYS = 30;

/**
 * Dismissed means irrelevant, so it stays gone. Done stays gone for 30 days, then returns only
 * if the rule still fires. Snoozed returns when the snooze ends. None depend on the numbers in
 * the insight, which change with the date filter and with every new record.
 */
export function isInsightHidden(record: DismissedInsight | undefined, now: Date): boolean {
  if (!record) {
    return false;
  }
  if (record.action === 'dismissed') {
    return true;
  }
  if (record.action === 'snoozed') {
    return record.snoozed_until !== null && new Date(record.snoozed_until) > now;
  }
  const doneUntil = new Date(record.dismissed_at);
  doneUntil.setDate(doneUntil.getDate() + DONE_HIDDEN_DAYS);
  return doneUntil > now;
}

export const useDismissedInsights = () => {
  const [dismissed, setDismissed] = useState<DismissedInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDismissedInsights()
      .then(setDismissed)
      .catch(reportConsoleError)
      .finally(() => setLoading(false));
  }, []);

  const isDismissed = useCallback(
    (insightId: string): boolean =>
      isInsightHidden(
        dismissed.find((d) => d.insight_id === insightId),
        new Date()
      ),
    [dismissed]
  );

  const save = useCallback(
    (insightId: string, action: InsightAction, snoozedUntil: string | null = null) => {
      const now = new Date().toISOString();
      const withRecord = (record: DismissedInsight) => (prev: DismissedInsight[]) => [
        ...prev.filter((d) => d.insight_id !== insightId),
        record,
      ];
      setDismissed(
        withRecord({
          id: `optimistic-${insightId}`,
          user_id: '',
          insight_id: insightId,
          action,
          snoozed_until: snoozedUntil,
          dismissed_at: now,
          data_hash: '',
          created_at: now,
        })
      );
      upsertDismissedInsight({ insight_id: insightId, action, snoozed_until: snoozedUntil })
        .then((saved) => setDismissed(withRecord(saved)))
        .catch(reportConsoleError);
    },
    []
  );

  const markDone = useCallback((insightId: string) => save(insightId, 'done'), [save]);
  const dismiss = useCallback((insightId: string) => save(insightId, 'dismissed'), [save]);
  const snooze = useCallback(
    (insightId: string, days = 7) => {
      const until = new Date();
      until.setDate(until.getDate() + days);
      save(insightId, 'snoozed', until.toISOString());
    },
    [save]
  );

  const restore = useCallback((insightId: string) => {
    setDismissed((prev) => prev.filter((d) => d.insight_id !== insightId));
    restoreInsight(insightId).catch((err) => {
      reportConsoleError(err);
      // Re-fetch on failure to resync
      fetchDismissedInsights().then(setDismissed).catch(reportConsoleError);
    });
  }, []);

  return { loading, isDismissed, markDone, snooze, dismiss, restore };
};
