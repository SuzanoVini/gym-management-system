import type { Dispatch, SetStateAction } from 'react';
import ClassResolutionPopover from '@/components/tabs/ClassResolutionPopover';
import QuickSignupModal from '@/components/tabs/QuickSignupModal';
import DismissUndoToast from '@/components/ui/DismissUndoToast';
import type { FollowUpIntro } from '@/components/ui/FollowUpCheckButton';
import Modal from '@/components/ui/Modal';
import type { useIntros } from '@/hooks/useIntros';
import type { useUIStore } from '@/store/useUIStore';
import type { Intro } from '@/types';
import IntroForm from '../forms/IntroForm';
import FollowUpModal from '../modals/FollowUpModal';
import NotesManagerModal from '../modals/NotesManagerModal';
import SettingsModal from '../modals/SettingsModal';

interface IntroDialogsProps {
  data: ReturnType<typeof useIntros>;
  modals: ReturnType<typeof useUIStore.getState>['modals'];
  closeModal: ReturnType<typeof useUIStore.getState>['closeModal'];
  classTypes: string[];
  staffMembers: string[];
  selectedIntro: Intro | null;
  setSelectedIntro: (intro: Intro | null) => void;
  resolvingIntro: Intro | null;
  setResolvingIntro: Dispatch<SetStateAction<Intro | null>>;
  pendingSignupIntro: Intro | null;
  setPendingSignupIntro: Dispatch<SetStateAction<Intro | null>>;
  selectedIntroForNotes: Intro | null;
  setSelectedIntroForNotes: Dispatch<SetStateAction<Intro | null>>;
  dismissedForUndo: FollowUpIntro | null;
  setDismissedForUndo: Dispatch<SetStateAction<FollowUpIntro | null>>;
  handleUndoDismiss: () => Promise<void>;
}

export default function IntroDialogs({
  data,
  modals,
  closeModal,
  classTypes,
  staffMembers,
  selectedIntro,
  setSelectedIntro,
  resolvingIntro,
  setResolvingIntro,
  pendingSignupIntro,
  setPendingSignupIntro,
  selectedIntroForNotes,
  setSelectedIntroForNotes,
  dismissedForUndo,
  setDismissedForUndo,
  handleUndoDismiss,
}: IntroDialogsProps) {
  const { loading, addIntro, editIntro, refresh, silentRefresh } = data;
  return (
    <>
      {/* Modals */}
      <Modal
        isOpen={modals.addIntro}
        onClose={() => closeModal('addIntro')}
        title="Add New Intro"
        size="lg"
      >
        <IntroForm
          onSubmit={async (data) => {
            const created = await addIntro(data);
            closeModal('addIntro');
            if (data.signed_up === 'Yes' && created) {
              setPendingSignupIntro(created);
            }
          }}
          loading={loading}
          onCancel={() => closeModal('addIntro')}
          classTypes={classTypes}
          staffMembers={staffMembers}
        />
      </Modal>

      <Modal
        isOpen={modals.editIntro}
        onClose={() => closeModal('editIntro')}
        title="Edit Intro"
        size="lg"
      >
        <IntroForm
          intro={selectedIntro}
          onSubmit={async (data) => {
            if (!selectedIntro) {
              return;
            }
            const becameSignedUp = data.signed_up === 'Yes' && selectedIntro.signed_up !== 'Yes';
            await editIntro(selectedIntro.id, data);
            closeModal('editIntro');
            if (becameSignedUp) {
              setPendingSignupIntro(selectedIntro);
            }
            setSelectedIntro(null);
          }}
          loading={loading}
          onCancel={() => {
            closeModal('editIntro');
            setSelectedIntro(null);
          }}
          classTypes={classTypes}
          staffMembers={staffMembers}
        />
      </Modal>

      <FollowUpModal
        isOpen={modals.followUp}
        onClose={() => {
          closeModal('followUp');
          setSelectedIntro(null);
          refresh();
        }}
        intro={selectedIntro}
      />

      <SettingsModal
        isOpen={modals.settings}
        onClose={() => closeModal('settings')}
        scope="intros"
      />

      <NotesManagerModal
        isOpen={modals.notesManager}
        onClose={() => {
          closeModal('notesManager');
          setSelectedIntroForNotes(null);
        }}
        intro={selectedIntroForNotes}
        onChanged={silentRefresh}
      />

      {resolvingIntro && (
        <ClassResolutionPopover
          intro={resolvingIntro}
          classTypes={classTypes}
          onClose={() => setResolvingIntro(null)}
          onResolved={async () => {
            setResolvingIntro(null);
            await refresh();
          }}
        />
      )}

      {dismissedForUndo && (
        <DismissUndoToast onUndo={handleUndoDismiss} onExpire={() => setDismissedForUndo(null)} />
      )}

      {pendingSignupIntro && (
        <QuickSignupModal
          intro={pendingSignupIntro}
          onClose={() => setPendingSignupIntro(null)}
          onSuccess={async () => {
            setPendingSignupIntro(null);
            await silentRefresh();
          }}
        />
      )}
    </>
  );
}
