import { useCallback } from 'react';
import type { useDismissedInsights } from '@/hooks/useDismissedInsights';
import type { useInsightToasts } from './useInsightToasts';

type DismissActions = Pick<
  ReturnType<typeof useDismissedInsights>,
  'markDone' | 'snooze' | 'dismiss' | 'restore'
>;
type ToastActions = Pick<ReturnType<typeof useInsightToasts>, 'addToast' | 'removeToastsFor'>;

export function useInsightActions(
  { markDone, snooze, dismiss, restore }: DismissActions,
  { addToast, removeToastsFor }: ToastActions
) {
  const handleMarkDone = useCallback(
    (insightId: string, dataHash: string) => {
      markDone(insightId, dataHash);
      addToast(insightId, 'Marked as done');
    },
    [markDone, addToast]
  );

  const handleSnooze = useCallback(
    (insightId: string, dataHash: string, days = 7) => {
      snooze(insightId, dataHash, days);
      addToast(insightId, `Snoozed for ${days} days`);
    },
    [snooze, addToast]
  );

  const handleDismiss = useCallback(
    (insightId: string, dataHash: string) => {
      dismiss(insightId, dataHash);
      addToast(insightId, 'Insight dismissed');
    },
    [dismiss, addToast]
  );

  const handleRestore = useCallback(
    (insightId: string) => {
      restore(insightId);
      removeToastsFor(insightId);
    },
    [restore, removeToastsFor]
  );

  return { handleMarkDone, handleSnooze, handleDismiss, handleRestore };
}
