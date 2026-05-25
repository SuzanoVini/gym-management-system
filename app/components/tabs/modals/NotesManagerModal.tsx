'use client';

import { Edit2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import {
  createFollowUpNote,
  deleteFollowUpNote,
  fetchFollowUpNotes,
  updateFollowUpNote,
} from '@/lib/supabase/intros';
import { resolveStaffName } from '@/lib/supabase/profiles';
import type { FollowUpNote, Intro } from '@/types';

interface NotesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  intro: Intro | null;
  onChanged?: () => void | Promise<void>;
}

function formatAttribution(note: FollowUpNote): string {
  const date = new Date(note.created_at).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  });
  return note.staff_name ? `${date} - ${note.staff_name}` : date;
}

export default function NotesManagerModal({
  isOpen,
  onClose,
  intro,
  onChanged,
}: NotesManagerModalProps) {
  const [notes, setNotes] = useState<FollowUpNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !intro) {
      return;
    }

    let cancelled = false;
    setLoadingNotes(true);
    fetchFollowUpNotes(intro.id)
      .then((freshNotes) => {
        if (!cancelled) {
          setNotes(freshNotes || []);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch follow-up notes:', err);
        if (!cancelled) {
          setNotes([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingNotes(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, intro]);

  if (!isOpen || !intro) {
    return null;
  }

  const refreshNotes = async () => {
    const fresh = await fetchFollowUpNotes(intro.id);
    setNotes(fresh || []);
    await onChanged?.();
  };

  const handleAdd = async () => {
    if (!newNote.trim() || saving) {
      return;
    }

    setSaving(true);
    try {
      const staffName = await resolveStaffName();
      await createFollowUpNote({
        intro_id: intro.id,
        note: newNote.trim(),
        staff_name: staffName,
      });
      setNewNote('');
      await refreshNotes();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim() || saving) {
      return;
    }

    setSaving(true);
    try {
      await updateFollowUpNote(id, editText.trim());
      setEditingId(null);
      setEditText('');
      await refreshNotes();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this note?')) {
      return;
    }

    setSaving(true);
    try {
      await deleteFollowUpNote(id);
      if (editingId === id) {
        setEditingId(null);
        setEditText('');
      }
      await refreshNotes();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Notes - ${intro.name}`} size="md">
      <div className="space-y-4">
        <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
          {loadingNotes && <p className="text-sm text-gray-400 text-center py-4">Loading...</p>}

          {!loadingNotes && notes.length === 0 && (
            <p className="text-sm text-gray-400 italic text-center py-4">No notes yet.</p>
          )}

          {!loadingNotes &&
            notes.map((note) => (
              <div key={note.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
                {editingId === note.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(note.id)}
                        disabled={!editText.trim() || saving}
                        className="btn btn-primary text-xs px-3 py-1"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditText('');
                        }}
                        disabled={saving}
                        className="btn btn-tertiary text-xs px-3 py-1"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-800 flex-1 whitespace-pre-wrap break-words">
                      {note.note}
                    </p>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(note.id);
                          setEditText(note.note);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        aria-label="Edit note"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        aria-label="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-400">{formatAttribution(note)}</p>
              </div>
            ))}
        </div>

        <div className="h-px bg-gray-200" />

        <div className="space-y-2">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            rows={3}
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newNote.trim() || saving}
              className="btn btn-primary"
            >
              {saving ? 'Saving...' : 'Add Note'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
