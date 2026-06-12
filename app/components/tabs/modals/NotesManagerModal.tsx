'use client';

import { Calendar, Edit2, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import {
  clearFollowUpReminder,
  createFollowUpNote,
  deleteFollowUpNote,
  fetchFollowUpNotesByPerson,
  setFollowUpReminder,
  updateFollowUpNote,
} from '@/lib/supabase/intros';
import { resolveStaffName } from '@/lib/supabase/profiles';
import {
  dateInputToUTCTimestamp,
  dateToDateInput,
  detectReminderDate,
  formatReminderDate,
  utcTimestampToDateInput,
} from '@/lib/utils/reminderUtils';
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
  // Local source of truth for the reminder — the intro prop is a snapshot and
  // doesn't refresh while the modal is open
  const [reminderAt, setReminderAt] = useState<string | null>(null);
  const [showReminderInput, setShowReminderInput] = useState(false);
  const [reminderDate, setReminderDate] = useState('');
  const [savingReminder, setSavingReminder] = useState(false);
  const [reminderSuggestion, setReminderSuggestion] = useState<Date | null>(null);

  useEffect(() => {
    if (!isOpen || !intro) {
      return;
    }

    setReminderAt(intro.followup_reminder_at ?? null);
    setShowReminderInput(false);
    setReminderSuggestion(null);

    let cancelled = false;
    setLoadingNotes(true);
    fetchFollowUpNotesByPerson(intro.id, intro.name, intro.email)
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

  const bookingCount = useMemo(() => new Set(notes.map((n) => n.intro_id)).size, [notes]);

  if (!isOpen || !intro) {
    return null;
  }

  const refreshNotes = async () => {
    const fresh = await fetchFollowUpNotesByPerson(intro.id, intro.name, intro.email);
    setNotes(fresh || []);
    await onChanged?.();
  };

  const handleAdd = async () => {
    const text = newNote.trim();
    if (!text || saving) {
      return;
    }

    setSaving(true);
    try {
      const staffName = await resolveStaffName();
      await createFollowUpNote({
        intro_id: intro.id,
        note: text,
        staff_name: staffName,
      });
      setNewNote('');
      await refreshNotes();
      if (!intro.followup_dismissed_at) {
        const detected = detectReminderDate(text);
        if (detected) {
          setReminderSuggestion(detected);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReminder = async () => {
    if (!reminderDate || savingReminder) {
      return;
    }
    setSavingReminder(true);
    try {
      const utc = dateInputToUTCTimestamp(reminderDate);
      await setFollowUpReminder(intro.id, intro.name, intro.email, utc);
      setReminderAt(utc);
      setShowReminderInput(false);
      await onChanged?.();
    } finally {
      setSavingReminder(false);
    }
  };

  const handleClearReminder = async () => {
    await clearFollowUpReminder(intro.id, intro.name, intro.email);
    setReminderAt(null);
    setShowReminderInput(false);
    await onChanged?.();
  };

  const handleAcceptSuggestion = async () => {
    if (!reminderSuggestion) {
      return;
    }
    const utc = dateInputToUTCTimestamp(dateToDateInput(reminderSuggestion));
    await setFollowUpReminder(intro.id, intro.name, intro.email, utc);
    setReminderAt(utc);
    setReminderSuggestion(null);
    await onChanged?.();
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
    <Modal isOpen={isOpen} onClose={onClose} title={`Notes — ${intro.name}`} size="md">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          {bookingCount > 1 ? (
            <p className="text-xs text-gray-400">{bookingCount} bookings</p>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => {
              setShowReminderInput(true);
              setReminderDate(reminderAt ? utcTimestampToDateInput(reminderAt) : '');
            }}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 bg-blue-50 rounded-md px-2.5 py-1"
          >
            <Calendar className="w-3.5 h-3.5" />
            Set reminder
          </button>
        </div>

        {reminderAt && !showReminderInput && (
          <div className="flex items-center justify-between text-xs bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
            <span className="text-blue-700">
              🔔 Reminder set for <strong>{formatReminderDate(reminderAt)}</strong>
            </span>
            <span className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  setShowReminderInput(true);
                  setReminderDate(utcTimestampToDateInput(reminderAt));
                }}
                className="text-blue-500 hover:text-blue-700 underline ml-3"
              >
                Change
              </button>
              <button
                type="button"
                onClick={handleClearReminder}
                className="text-gray-400 hover:text-red-500 underline ml-2"
              >
                Clear
              </button>
            </span>
          </div>
        )}

        {showReminderInput && (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border border-gray-200">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="date"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={handleSaveReminder}
              disabled={!reminderDate || savingReminder}
              className="btn btn-primary text-xs px-3 py-1"
            >
              {savingReminder ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setShowReminderInput(false)}
              className="text-gray-400 hover:text-gray-600 text-sm"
              aria-label="Close reminder input"
            >
              ✕
            </button>
          </div>
        )}

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
                <p className="text-xs text-gray-400">
                  {formatAttribution(note)}
                  {bookingCount > 1 && note.intro_id !== intro.id && (
                    <span className="ml-2 text-[10px] text-purple-400 bg-purple-50 rounded px-1.5 py-0.5">
                      Other booking
                    </span>
                  )}
                </p>
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

        {reminderSuggestion && (
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-sky-50 border border-sky-100 rounded-lg">
            <div className="flex items-center gap-2 text-xs min-w-0">
              <span className="flex-shrink-0">💡</span>
              <span className="text-gray-700">
                <span className="text-sky-700 font-medium">Possible reminder detected</span>
                {' — follow up on '}
                <strong className="text-sky-700">
                  {reminderSuggestion.toLocaleDateString('en-CA', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </strong>
              </span>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={handleAcceptSuggestion}
                className="btn btn-primary text-xs px-2.5 py-1"
              >
                Set reminder
              </button>
              <button
                type="button"
                onClick={() => setReminderSuggestion(null)}
                className="btn btn-tertiary text-xs px-2 py-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
