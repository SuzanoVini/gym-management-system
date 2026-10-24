import { Calendar, Lightbulb } from 'lucide-react';
import { formatReminderDate } from '@/lib/utils/reminderUtils';

export function ReminderStatus({
  reminderAt,
  showReminderInput,
  reminderDate,
  savingReminder,
  onReminderDateChange,
  onChange,
  onClear,
  onSave,
  onCloseInput,
}: {
  reminderAt: string | null;
  showReminderInput: boolean;
  reminderDate: string;
  savingReminder: boolean;
  onReminderDateChange: (value: string) => void;
  onChange: (reminderAt: string) => void;
  onClear: () => void;
  onSave: () => void;
  onCloseInput: () => void;
}) {
  return (
    <>
      {reminderAt && !showReminderInput && (
        <div className="flex items-center justify-between text-xs bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
          <span className="text-blue-700">
            Reminder set for <strong>{formatReminderDate(reminderAt)}</strong>
          </span>
          <span className="flex items-center">
            <button
              type="button"
              onClick={() => onChange(reminderAt)}
              className="text-blue-500 hover:text-blue-700 underline ml-3"
            >
              Change
            </button>
            <button
              type="button"
              onClick={onClear}
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
            onChange={(e) => onReminderDateChange(e.target.value)}
            className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={onSave}
            disabled={!reminderDate || savingReminder}
            className="btn btn-primary text-xs px-3 py-1"
          >
            {savingReminder ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCloseInput}
            className="text-gray-400 hover:text-gray-600 text-sm"
            aria-label="Close reminder input"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

export function ReminderSuggestion({
  suggestion,
  onAccept,
  onDismiss,
}: {
  suggestion: Date;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-sky-50 border border-sky-100 rounded-lg">
      <div className="flex items-center gap-2 text-xs min-w-0">
        <Lightbulb className="w-4 h-4 flex-shrink-0 text-sky-700" aria-hidden="true" />
        <span className="text-gray-700">
          <span className="text-sky-700 font-medium">Possible reminder detected</span>
          {' — follow up on '}
          <strong className="text-sky-700">
            {suggestion.toLocaleDateString('en-CA', {
              month: 'short',
              day: 'numeric',
            })}
          </strong>
        </span>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <button type="button" onClick={onAccept} className="btn btn-primary text-xs px-2.5 py-1">
          Set reminder
        </button>
        <button type="button" onClick={onDismiss} className="btn btn-tertiary text-xs px-2 py-1">
          Dismiss
        </button>
      </div>
    </div>
  );
}
