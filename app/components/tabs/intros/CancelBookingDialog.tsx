'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { errorHandler } from '@/lib/errorHandler';
import { updateIntroStatus } from '@/lib/supabase/intros';
import type { Intro } from '@/types';

interface Props {
  intro: Intro;
  onClose: () => void;
  onCancelled: () => Promise<void> | void;
}

export default function CancelBookingDialog({ intro, onClose, onCancelled }: Props) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await updateIntroStatus(intro.id, 'Cancelled');
      await onCancelled();
      errorHandler.notify(`Booking for ${intro.name} cancelled`, 'success');
      onClose();
    } catch (err) {
      errorHandler.handle(err, 'cancelBooking');
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Cancel booking" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          Mark the booking for <span className="font-semibold">{intro.name}</span> as cancelled?
          Attended and Signed Up will be locked and it leaves Follow Ups. You can restore it later.
        </p>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn btn-secondary text-sm">
            Keep booking
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={busy}
            className="btn text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            {busy ? 'Cancelling…' : 'Cancel booking'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
