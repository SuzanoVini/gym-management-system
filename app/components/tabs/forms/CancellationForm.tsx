'use client';

import { useState } from 'react';
import type { Cancellation, CancellationFormData } from '@/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const AGE_GROUPS = ['3-6 YO', '7-9 YO', '10-15 YO', 'Adult'];

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
      month: '',
      name: '',
      date: '',
      reason: '',
      age_group: '',
      notes: '',
    }
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="form-label" htmlFor="cancellation-month">
          Month *
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
          Date
        </label>
        <input
          id="cancellation-date"
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          className="form-input"
        />
      </div>
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
          disabled={loading || !formData.name || !formData.month}
          className="btn btn-primary"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
