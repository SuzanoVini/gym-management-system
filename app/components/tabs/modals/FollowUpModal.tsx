'use client';

import { useState } from 'react';
import { Form, FormField } from '@/components/ui/Form';
import Modal from '@/components/ui/Modal';
import { errorHandler } from '@/lib/errorHandler';
import { createFollowUpNote } from '@/lib/supabase/intros';
import type { Intro } from '@/types';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  intro: Intro | null;
}

export default function FollowUpModal({ isOpen, onClose, intro }: FollowUpModalProps) {
  const [note, setNote] = useState('');
  const [staffName, setStaffName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!intro || !note.trim()) {
      return;
    }

    try {
      setLoading(true);
      await createFollowUpNote({
        intro_id: intro.id,
        note: note.trim(),
        staff_name: staffName.trim() || 'Unknown',
      });

      setNote('');
      setStaffName('');
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
      setStaffName('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Follow-up Note" size="md">
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Adding follow-up for: <span className="font-medium">{intro?.name}</span>
        </p>
      </div>

      <Form onSubmit={handleSubmit} loading={loading}>
        <FormField
          label="Staff Name"
          name="staffName"
          value={staffName}
          onChange={(value) => setStaffName(value as string)}
          placeholder="Enter your name"
          required
        />

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
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !note.trim()}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Note'}
          </button>
        </div>
      </Form>
    </Modal>
  );
}
