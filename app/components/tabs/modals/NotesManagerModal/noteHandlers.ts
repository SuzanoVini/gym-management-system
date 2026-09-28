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
} from '@/lib/utils/reminderUtils';
import type { Intro } from '@/types';
import type { NotesManagerState } from './useNotesManagerState';

// Plain factory (not a hook): called on every render after the modal's early
// return, so each handler closes over that render's state exactly as the
// inline handlers did.
export function createNoteHandlers(
  intro: Intro,
  state: NotesManagerState,
  onChanged: (() => void | Promise<void>) | undefined
) {
  const {
    setNotes,
    editingId,
    setEditingId,
    editText,
    setEditText,
    newNote,
    setNewNote,
    saving,
    setSaving,
    setReminderAt,
    setShowReminderInput,
    reminderDate,
    savingReminder,
    setSavingReminder,
    reminderSuggestion,
    setReminderSuggestion,
  } = state;

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

  return {
    handleAdd,
    handleSaveReminder,
    handleClearReminder,
    handleAcceptSuggestion,
    handleSaveEdit,
    handleDelete,
  };
}
