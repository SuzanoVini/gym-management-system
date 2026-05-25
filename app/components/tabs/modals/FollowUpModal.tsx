'use client';

import { useState } from 'react';
import { FormField } from '@/components/ui/Form';
import Modal from '@/components/ui/Modal';
import { errorHandler } from '@/lib/errorHandler';
import { createFollowUpNote } from '@/lib/supabase/intros';
import { resolveStaffName } from '@/lib/supabase/profiles';
import type { Intro } from '@/types';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  intro: Intro | null;
}

export default function FollowUpModal({ isOpen, onClose, intro }: FollowUpModalProps) {
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!intro || !note.trim()) {
      return;
    }

    try {
      setLoading(true);
      const staffName = await resolveStaffName();
      await createFollowUpNote({
        intro_id: intro.id,
        note: note.trim(),
        staff_name: staffName,
      });

      setNote('');
      onClose();
      errorHandler.notify('Follow-up note added successfully', 'success');
    } catch (err) {
      errorHandler.handle(err, 'addFollowUpNote');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setNote('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Quick Note" size="md">
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Adding note for: <span className="font-medium">{intro?.name}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Follow-up Note"
          name="note"
          type="textarea"
          value={note}
          onChange={(value) => setNote(value as string)}
          placeholder="Enter follow-up notes, conversation details, next steps..."
          required
        />

        <div className="flex space-x-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="btn btn-tertiary flex-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !note.trim()}
            className="btn btn-primary flex-1"
          >
            {loading ? 'Adding...' : 'Add Note'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
