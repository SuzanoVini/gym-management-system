import { useCallback, useState } from 'react';
import {
  countSpamGroup,
  dismissSpamWarning,
  markSpamGroup,
  restoreSpamGroup,
  undoSpamMark,
} from '@/lib/supabase/intros';
import type { Intro } from '@/types';

type Mode = 'mark' | 'restore';

const report = (action: string, err: unknown) =>
  alert(`Could not ${action}: ${err instanceof Error ? err.message : 'Unknown error'}`);

export function useSpamActions(onChanged: () => Promise<void> | void) {
  const [reviewIntro, setReviewIntro] = useState<Intro | null>(null);
  const [confirm, setConfirm] = useState<{ intro: Intro; mode: Mode; count: number | null } | null>(
    null
  );
  const [busy, setBusy] = useState(false);
  const [undoIds, setUndoIds] = useState<string[] | null>(null);

  const openConfirm = useCallback((intro: Intro, mode: Mode) => {
    setConfirm({ intro, mode, count: null });
    countSpamGroup(intro, mode === 'restore')
      .then((count) =>
        setConfirm((prev) => (prev && prev.intro.id === intro.id ? { ...prev, count } : prev))
      )
      .catch(() => {
        // count is display-only; leave it loading
      });
  }, []);

  const confirmAction = useCallback(async () => {
    if (!confirm) {
      return;
    }
    setBusy(true);
    try {
      if (confirm.mode === 'mark') {
        setUndoIds(await markSpamGroup(confirm.intro));
      } else {
        await restoreSpamGroup(confirm.intro);
      }
      setConfirm(null);
      setReviewIntro(null);
      await onChanged();
    } catch (err) {
      report('update spam status', err);
    } finally {
      setBusy(false);
    }
  }, [confirm, onChanged]);

  const undo = useCallback(async () => {
    const ids = undoIds ?? [];
    setUndoIds(null);
    try {
      await undoSpamMark(ids);
      await onChanged();
    } catch (err) {
      report('undo', err);
    }
  }, [undoIds, onChanged]);

  const dismissWarning = useCallback(
    async (intro: Intro) => {
      try {
        await dismissSpamWarning(intro.id);
        setReviewIntro(null);
        await onChanged();
      } catch (err) {
        report('dismiss the warning', err);
      }
    },
    [onChanged]
  );

  // Stable references: DismissUndoToast restarts its 30 s timer whenever onExpire changes.
  const cancelConfirm = useCallback(() => setConfirm(null), []);
  const clearUndo = useCallback(() => setUndoIds(null), []);

  return {
    reviewIntro,
    setReviewIntro,
    confirm,
    cancelConfirm,
    openConfirm,
    confirmAction,
    busy,
    undoIds,
    clearUndo,
    undo,
    dismissWarning,
  };
}
