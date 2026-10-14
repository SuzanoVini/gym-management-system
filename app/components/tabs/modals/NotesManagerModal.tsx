'use client';

import { Calendar } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { utcTimestampToDateInput } from '@/lib/utils/reminderUtils';
import type { Intro } from '@/types';
import NoteItem from './NotesManagerModal/NoteItem';
import { createNoteHandlers } from './NotesManagerModal/noteHandlers';
import { ReminderStatus, ReminderSuggestion } from './NotesManagerModal/ReminderControls';
import { useNotesManagerState } from './NotesManagerModal/useNotesManagerState';

interface NotesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  intro: Intro | null;
  onChanged?: () => void | Promise<void>;
}

export default function NotesManagerModal({
  isOpen,
  onClose,
  intro,
  onChanged,
}: NotesManagerModalProps) {
  const state = useNotesManagerState(isOpen, intro);
  const {
    notes,
    loadingNotes,
    editingId,
    setEditingId,
    editText,
    setEditText,
    newNote,
    setNewNote,
    saving,
    reminderAt,
    showReminderInput,
    setShowReminderInput,
    reminderDate,
    setReminderDate,
    savingReminder,
    reminderSuggestion,
    setReminderSuggestion,
    bookingCount,
  } = state;

  if (!isOpen || !intro) {
    return null;
  }

  const handlers = createNoteHandlers(intro, state, onChanged);

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

        <ReminderStatus
          reminderAt={reminderAt}
          showReminderInput={showReminderInput}
          reminderDate={reminderDate}
          savingReminder={savingReminder}
          onReminderDateChange={setReminderDate}
          onChange={(current) => {
            setShowReminderInput(true);
            setReminderDate(utcTimestampToDateInput(current));
          }}
          onClear={() => {
            void handlers.handleClearReminder();
          }}
          onSave={() => {
            void handlers.handleSaveReminder();
          }}
          onCloseInput={() => setShowReminderInput(false)}
        />

        <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
          {loadingNotes && <p className="text-sm text-gray-400 text-center py-4">Loading...</p>}

          {!loadingNotes && notes.length === 0 && (
            <p className="text-sm text-gray-400 italic text-center py-4">No notes yet.</p>
          )}

          {!loadingNotes &&
            notes.map((note) => (
              <NoteItem
                key={note.id}
                note={note}
                isEditing={editingId === note.id}
                editText={editText}
                onEditTextChange={setEditText}
                saving={saving}
                isOtherBooking={bookingCount > 1 && note.intro_id !== intro.id}
                onSaveEdit={() => {
                  void handlers.handleSaveEdit(note.id);
                }}
                onCancelEdit={() => {
                  setEditingId(null);
                  setEditText('');
                }}
                onStartEdit={() => {
                  setEditingId(note.id);
                  setEditText(note.note);
                }}
                onDelete={() => {
                  void handlers.handleDelete(note.id);
                }}
              />
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
              onClick={() => {
                void handlers.handleAdd();
              }}
              disabled={!newNote.trim() || saving}
              className="btn btn-primary"
            >
              {saving ? 'Saving...' : 'Add Note'}
            </button>
          </div>
        </div>

        {reminderSuggestion && (
          <ReminderSuggestion
            suggestion={reminderSuggestion}
            onAccept={() => {
              void handlers.handleAcceptSuggestion();
            }}
            onDismiss={() => setReminderSuggestion(null)}
          />
        )}
      </div>
    </Modal>
  );
}
