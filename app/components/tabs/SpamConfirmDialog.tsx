'use client';

import Modal from '@/components/ui/Modal';

interface Props {
  mode: 'mark' | 'restore';
  name: string;
  count: number | null; // null while the count is loading
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SpamConfirmDialog({ mode, name, count, busy, onConfirm, onCancel }: Props) {
  const verb = mode === 'mark' ? 'hides' : 'restores';
  let message: string;
  if (count === null) {
    message = 'Checking matching bookings…';
  } else if (count <= 1) {
    message = `This ${verb} the booking for ${name}.`;
  } else {
    message = `This ${verb} ${count} bookings with the same email or phone as ${name}.`;
  }
  return (
    <Modal
      isOpen
      onClose={onCancel}
      title={mode === 'mark' ? 'Confirm spam' : 'Confirm not spam'}
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-700">{message}</p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onCancel} className="btn btn-secondary text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="btn btn-primary text-sm"
          >
            {mode === 'mark' ? 'Mark as spam' : 'Restore'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
