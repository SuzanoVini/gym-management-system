'use client';

import { useState } from 'react';
import { getMostRecentSignupDate } from '@/lib/supabase/memberStatus';
import type { Cancellation, CancellationFormData } from '@/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const AGE_GROUPS = ['3-6 YO', '7-9 YO', '10-15 YO', 'Adult'];

const monthFromDate = (dateStr: string): string => {
  const parts = dateStr.split('-');
  return parts.length >= 2 ? (MONTHS[Number(parts[1]) - 1] ?? '') : '';
};

const yearFromDate = (dateStr: string): number | undefined => {
  const y = Number(dateStr.split('-')[0]);
  return Number.isNaN(y) || y < 2000 ? undefined : y;
};

function toCancellationFormData(data: Cancellation | CancellationFormData): CancellationFormData {
  const {
    id: _id,
    created_at: _createdAt,
    updated_at: _updatedAt,
    name_normalized: _nameNormalized,
    ...writable
  } = data;
  return writable;
}

interface CancellationFormProps {
  cancellation?: Cancellation | null;
  onSubmit: (data: CancellationFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  cancellationReasons: string[];
}

export function CancellationForm({
  cancellation,
  onSubmit,
  onCancel,
  loading = false,
  cancellationReasons,
}: CancellationFormProps) {
  const [formData, setFormData] = useState(
    cancellation || {
      month: MONTHS[new Date().getMonth()] ?? '',
      name: '',
      date: '',
      reason: '',
      age_group: '',
      notes: '',
    }
  );
  const [dateError, setDateError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (name === 'date' && value) {
      const newYear = yearFromDate(value);
      setFormData((prev) => ({
        ...prev,
        date: value,
        month: monthFromDate(value) || prev.month,
        ...(newYear !== undefined ? { year: newYear } : {}),
      }));
      setDateError(null);
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDateError(null);

    if (formData.date && formData.name) {
      const signupDate = await getMostRecentSignupDate((formData.name as string).trim());
      if (signupDate && (formData.date as string) < signupDate) {
        setDateError(
          `Cancellation date cannot be before ${(formData.name as string).trim()}'s signup date (${signupDate}).`
        );
        return;
      }
    }

    const yearDerived = formData.date ? yearFromDate(formData.date as string) : undefined;
    const writable = toCancellationFormData(formData);
    onSubmit({ ...writable, ...(yearDerived !== undefined ? { year: yearDerived } : {}) });
  };

  const showMonthFallback = !formData.date;

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      className="space-y-3"
    >
      <div>
        <label className="form-label" htmlFor="cancellation-name">
          Name *
        </label>
        <input
          id="cancellation-name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="form-input"
        />
      </div>
      <div>
        <label className="form-label" htmlFor="cancellation-date">
          Date *
        </label>
        <input
          id="cancellation-date"
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          className="form-input"
        />
        {dateError && <p className="text-sm text-red-600 mt-1">{dateError}</p>}
      </div>
      {showMonthFallback && (
        <div>
          <label className="form-label" htmlFor="cancellation-month">
            Month *{' '}
            <span className="text-xs text-gray-400 font-normal">
              (set a date above to auto-fill)
            </span>
          </label>
          <select
            id="cancellation-month"
            name="month"
            value={formData.month}
            onChange={handleChange}
            className="form-select"
          >
            <option value="">Select month</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="form-label" htmlFor="cancellation-reason">
          Reason
        </label>
        <select
          id="cancellation-reason"
          name="reason"
          value={formData.reason}
          onChange={handleChange}
          className="form-select"
        >
          <option value="">Select reason</option>
          {cancellationReasons.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="form-label" htmlFor="cancellation-age-group">
          Age Group
        </label>
        <select
          id="cancellation-age-group"
          name="age_group"
          value={formData.age_group}
          onChange={handleChange}
          className="form-select"
        >
          <option value="">Select age group</option>
          {AGE_GROUPS.map((age) => (
            <option key={age} value={age}>
              {age}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="form-label" htmlFor="cancellation-notes">
          Notes
        </label>
        <textarea
          id="cancellation-notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className="form-input"
          rows={3}
        />
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="btn btn-tertiary">
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !formData.name || !formData.month || !formData.date}
          className="btn btn-primary"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
