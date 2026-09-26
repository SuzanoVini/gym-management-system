import type { FollowUpIntro } from '@/components/ui/FollowUpCheckButton';
import type { Intro } from '@/types';

export interface IntroTableContext {
  formerMemberMap: Map<string, string>;
  classTypes: string[];
  setResolvingIntro: (intro: Intro) => void;
  setPendingSignupIntro: (intro: Intro) => void;
  silentRefresh: () => Promise<void>;
  setDismissedForUndo: (intro: FollowUpIntro) => void;
  handleFollowUpClick: (intro: Intro) => void;
  handleEditClick: (intro: Intro) => void;
  onManageNotes: (intro: Intro) => void;
  removeIntro: (id: string, name: string) => Promise<void>;
}
