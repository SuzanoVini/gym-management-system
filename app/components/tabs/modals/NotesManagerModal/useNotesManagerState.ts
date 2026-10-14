import { useEffect, useMemo, useState } from 'react';
import { reportConsoleError } from '@/lib/logger';
import { fetchFollowUpNotesByPerson } from '@/lib/supabase/intros';
import type { FollowUpNote, Intro } from '@/types';

export function useNotesManagerState(isOpen: boolean, intro: Intro | null) {
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
        reportConsoleError('Failed to fetch follow-up notes:', err);
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

  return {
    notes,
    setNotes,
    loadingNotes,
    editingId,
    setEditingId,
    editText,
    setEditText,
    newNote,
    setNewNote,
    saving,
    setSaving,
    reminderAt,
    setReminderAt,
    showReminderInput,
    setShowReminderInput,
    reminderDate,
    setReminderDate,
    savingReminder,
    setSavingReminder,
    reminderSuggestion,
    setReminderSuggestion,
    bookingCount,
  };
}

export type NotesManagerState = ReturnType<typeof useNotesManagerState>;
