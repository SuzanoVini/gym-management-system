import { Edit2, Trash2 } from 'lucide-react';
import type { FollowUpNote } from '@/types';

function formatAttribution(note: FollowUpNote): string {
  const date = new Date(note.created_at).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
  });
  return note.staff_name ? `${date} - ${note.staff_name}` : date;
}

export default function NoteItem({
  note,
  isEditing,
  editText,
  onEditTextChange,
  saving,
  isOtherBooking,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onDelete,
}: {
  note: FollowUpNote;
  isEditing: boolean;
  editText: string;
  onEditTextChange: (value: string) => void;
  saving: boolean;
  isOtherBooking: boolean;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editText}
            onChange={(e) => onEditTextChange(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSaveEdit}
              disabled={!editText.trim() || saving}
              className="btn btn-primary text-xs px-3 py-1"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
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
              onClick={onStartEdit}
              className="p-1 text-gray-400 hover:text-blue-600 rounded"
              aria-label="Edit note"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
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
        {isOtherBooking && (
          <span className="ml-2 text-xs text-[var(--gb-dark-gray)] bg-[var(--raised)] rounded px-1.5 py-0.5">
            Other booking
          </span>
        )}
      </p>
    </div>
  );
}
