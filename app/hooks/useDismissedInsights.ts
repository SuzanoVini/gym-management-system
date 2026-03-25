'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DismissedInsight } from '@/lib/supabase/dismissedInsights';
import {
  fetchDismissedInsights,
  restoreInsight,
  upsertDismissedInsight,
} from '@/lib/supabase/dismissedInsights';

export type { DismissedInsight };

export const useDismissedInsights = () => {
  const [dismissed, setDismissed] = useState<DismissedInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDismissedInsights()
      .then(setDismissed)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /**
   * Returns true if an insight should be hidden:
   * - action === 'dismissed': always hidden
   * - action === 'done': always hidden
   * - action === 'snoozed': hidden until snoozed_until date; resurfaces if data_hash changed
   * Dismissed/done insights resurface when data_hash changes (underlying data shifted).
   */
  const isDismissed = useCallback(
    (insightId: string, dataHash: string): boolean => {
      const record = dismissed.find((d) => d.insight_id === insightId);
      if (!record) {
        return false;
      }

      // Resurface if the data that produced this insight has changed
      if (record.data_hash !== dataHash) {
        return false;
      }

      if (record.action === 'snoozed') {
        if (!record.snoozed_until) {
          return false;
        }
        return new Date(record.snoozed_until) > new Date();
      }

      return true; // 'done' or 'dismissed'
    },
    [dismissed]
  );

  const markDone = useCallback((insightId: string, dataHash: string) => {
    const optimistic: DismissedInsight = {
      id: `optimistic-${insightId}`,
      user_id: '',
      insight_id: insightId,
      action: 'done',
      snoozed_until: null,
      dismissed_at: new Date().toISOString(),
      data_hash: dataHash,
      created_at: new Date().toISOString(),
    };
    setDismissed((prev) => [...prev.filter((d) => d.insight_id !== insightId), optimistic]);
    upsertDismissedInsight({ insight_id: insightId, action: 'done', data_hash: dataHash })
      .then((saved) =>
        setDismissed((prev) => [...prev.filter((d) => d.insight_id !== insightId), saved])
      )
      .catch(console.error);
  }, []);

  const snooze = useCallback((insightId: string, dataHash: string, days = 7) => {
    const snoozedUntil = new Date();
    snoozedUntil.setDate(snoozedUntil.getDate() + days);
    const snoozedUntilIso = snoozedUntil.toISOString();

    const optimistic: DismissedInsight = {
      id: `optimistic-${insightId}`,
      user_id: '',
      insight_id: insightId,
      action: 'snoozed',
      snoozed_until: snoozedUntilIso,
      dismissed_at: new Date().toISOString(),
      data_hash: dataHash,
      created_at: new Date().toISOString(),
    };
    setDismissed((prev) => [...prev.filter((d) => d.insight_id !== insightId), optimistic]);
    upsertDismissedInsight({
      insight_id: insightId,
      action: 'snoozed',
      data_hash: dataHash,
      snoozed_until: snoozedUntilIso,
    })
      .then((saved) =>
        setDismissed((prev) => [...prev.filter((d) => d.insight_id !== insightId), saved])
      )
      .catch(console.error);
  }, []);

  const dismiss = useCallback((insightId: string, dataHash: string) => {
    const optimistic: DismissedInsight = {
      id: `optimistic-${insightId}`,
      user_id: '',
      insight_id: insightId,
      action: 'dismissed',
      snoozed_until: null,
      dismissed_at: new Date().toISOString(),
      data_hash: dataHash,
      created_at: new Date().toISOString(),
    };
    setDismissed((prev) => [...prev.filter((d) => d.insight_id !== insightId), optimistic]);
    upsertDismissedInsight({
      insight_id: insightId,
      action: 'dismissed',
      data_hash: dataHash,
    })
      .then((saved) =>
        setDismissed((prev) => [...prev.filter((d) => d.insight_id !== insightId), saved])
      )
      .catch(console.error);
  }, []);

  const restore = useCallback((insightId: string) => {
    setDismissed((prev) => prev.filter((d) => d.insight_id !== insightId));
    restoreInsight(insightId).catch((err) => {
      console.error(err);
      // Re-fetch on failure to resync
      fetchDismissedInsights().then(setDismissed).catch(console.error);
    });
  }, []);

  const dismissedCount = dismissed.filter(
    (d) => d.action === 'dismissed' || d.action === 'done'
  ).length;

  return { dismissed, loading, isDismissed, markDone, snooze, dismiss, restore, dismissedCount };
};
