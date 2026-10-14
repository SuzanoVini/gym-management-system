'use client';

import { useEffect, useState } from 'react';
import DismissUndoToast from '@/components/ui/DismissUndoToast';
import { useSpamActions } from '@/hooks/useSpamActions';
import { fetchSpamIntros } from '@/lib/supabase/intros';
import type { Intro } from '@/types';
import SpamConfirmDialog from '../SpamConfirmDialog';
import SpamReviewPopover from '../SpamReviewPopover';
import SpamStrip from '../SpamStrip';

// Spam state for the Intros tab. Spam rows load lazily, on the first search.
export function useIntroSpam(
  searchTerm: string,
  silentRefresh: () => Promise<void>,
  onIntrosChanged?: () => Promise<void> | void
) {
  const [spamIntros, setSpamIntros] = useState<Intro[] | null>(null);

  const afterSpamChange = async () => {
    await silentRefresh();
    if (spamIntros !== null) {
      setSpamIntros(await fetchSpamIntros());
    }
    await onIntrosChanged?.();
  };
  const spam = useSpamActions(afterSpamChange);

  useEffect(() => {
    if (searchTerm.trim() && spamIntros === null) {
      fetchSpamIntros()
        .then(setSpamIntros)
        .catch(() => setSpamIntros([]));
    }
  }, [searchTerm, spamIntros]);

  return { spam, spamIntros };
}

type IntroSpam = ReturnType<typeof useIntroSpam>;

export function IntroSpamLayer({
  spam,
  spamIntros,
  searchTerm,
}: IntroSpam & { searchTerm: string }) {
  const { reviewIntro } = spam;
  return (
    <>
      <SpamStrip
        spamIntros={spamIntros}
        searchTerm={searchTerm}
        onRestore={(intro) => spam.openConfirm(intro, 'restore')}
      />

      {reviewIntro && (
        <SpamReviewPopover
          intro={reviewIntro}
          onClose={() => spam.setReviewIntro(null)}
          onNotSpam={() => {
            void spam.dismissWarning(reviewIntro);
          }}
          onMarkSpam={() => {
            // Close the popover so only one modal (and focus trap) is open.
            spam.setReviewIntro(null);
            spam.openConfirm(reviewIntro, 'mark');
          }}
        />
      )}

      {spam.confirm && (
        <SpamConfirmDialog
          mode={spam.confirm.mode}
          name={spam.confirm.intro.name}
          count={spam.confirm.count}
          busy={spam.busy}
          onConfirm={() => {
            void spam.confirmAction();
          }}
          onCancel={spam.cancelConfirm}
        />
      )}

      {/* Known, accepted: can share the bottom-center spot with the follow-up undo toast. */}
      {spam.undoIds && (
        <DismissUndoToast
          message="Marked as spam"
          onUndo={() => {
            void spam.undo();
          }}
          onExpire={spam.clearUndo}
        />
      )}
    </>
  );
}
