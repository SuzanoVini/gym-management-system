import { Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import type { DeleteAccountState } from './useDeleteAccount';

export function DangerZone({ onDelete }: { onDelete: () => void }) {
  return (
    <div className="section-container border-red-200 bg-red-50/50">
      <h2 className="text-xl font-semibold text-red-900 mb-2">Danger Zone</h2>
      <p className="text-sm text-red-700 mb-4">
        Once you delete your account, there is no going back. This action is permanent and cannot be
        undone.
      </p>
      <button
        type="button"
        onClick={onDelete}
        className="btn bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border-0"
      >
        Delete Account
      </button>
    </div>
  );
}

export function DeleteAccountModals({ state }: { state: DeleteAccountState }) {
  const { deleting, deleteConfirmText } = state;

  return (
    <>
      {/* First Confirmation Modal */}
      <Modal
        isOpen={state.deleteModalOpen}
        onClose={() => state.setDeleteModalOpen(false)}
        title="Delete Account"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Are you sure you want to delete your account? This action cannot be undone and all your
            data will be permanently deleted.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => state.setDeleteModalOpen(false)}
              className="btn btn-tertiary"
            >
              Cancel
            </button>
            <button type="button" onClick={state.confirmFirstStep} className="btn btn-primary">
              Continue
            </button>
          </div>
        </div>
      </Modal>

      {/* Second Confirmation Modal */}
      <Modal
        isOpen={state.confirmDeleteModalOpen}
        onClose={state.closeConfirmModal}
        title="Final Confirmation"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            To confirm deletion, please type <strong className="text-red-600">DELETE</strong> in the
            box below:
          </p>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => state.setDeleteConfirmText(e.target.value)}
            className="form-input"
            placeholder="Type DELETE to confirm"
          />
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={state.closeConfirmModal} className="btn btn-tertiary">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void state.handleDeleteAccount();
              }}
              disabled={deleteConfirmText !== 'DELETE' || deleting}
              className="btn bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Delete My Account'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
