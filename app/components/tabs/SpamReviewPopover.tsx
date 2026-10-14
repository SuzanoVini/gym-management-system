'use client';

import Modal from '@/components/ui/Modal';
import { SPAM_SIGNAL_LABELS, type SpamSignal } from '@/lib/spam/detectSpamSignals';
import type { Intro } from '@/types';

interface Props {
  intro: Intro;
  onClose: () => void;
  onNotSpam: () => void;
  onMarkSpam: () => void;
}

export default function SpamReviewPopover({ intro, onClose, onNotSpam, onMarkSpam }: Props) {
  const reasons = (intro.spam_signals ?? []).map(
    (code) => SPAM_SIGNAL_LABELS[code as SpamSignal] ?? code
  );
  return (
    <Modal isOpen onClose={onClose} title="Possible spam booking" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          <span className="font-medium">{intro.name}</span> was flagged at import because:
        </p>
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <div className="flex gap-2">
          <button type="button" onClick={onNotSpam} className="btn btn-secondary flex-1 text-sm">
            Not spam
          </button>
          <button
            type="button"
            onClick={onMarkSpam}
            className="flex-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Mark as spam
          </button>
        </div>
      </div>
    </Modal>
  );
}
