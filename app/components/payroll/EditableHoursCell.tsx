'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface EditableHoursCellProps {
  value: number;
  onSave: (value: number) => Promise<void>;
  disabled?: boolean;
}

export default function EditableHoursCell({
  value,
  onSave,
  disabled = false,
}: EditableHoursCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value.toFixed(2));
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update local value when prop changes
  useEffect(() => {
    setCurrentValue(value.toFixed(2));
  }, [value]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    if (!disabled && !isSaving) {
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    const numValue = parseFloat(currentValue) || 0;

    // Only save if value changed
    if (numValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(numValue);
      setIsEditing(false);
    } catch (_error) {
      // Reset to original value on error
      setCurrentValue(value.toFixed(2));
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlur = () => {
    if (!isSaving) {
      handleSave();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setCurrentValue(value.toFixed(2));
      setIsEditing(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentValue(e.target.value);
  };

  if (isEditing) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="number"
          step="0.25"
          min="0"
          value={currentValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          className="w-full text-right px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          aria-label="Edit hours"
        />
        {isSaving && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`text-right px-2 py-1 rounded w-full ${
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'cursor-pointer hover:bg-blue-50 hover:text-blue-700'
      } transition-colors`}
      disabled={disabled}
      aria-label={`${value.toFixed(2)} hours - Click to edit`}
    >
      {isSaving ? (
        <div className="flex items-center justify-end">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500 mr-1" />
          <span>{value.toFixed(2)}</span>
        </div>
      ) : (
        value.toFixed(2)
      )}
    </button>
  );
}
