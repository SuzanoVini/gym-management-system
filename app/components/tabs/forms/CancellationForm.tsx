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
        <label className="block text-sm font-medium mb-1">Month *</label>
        <select
          name="month"
          value={formData.month}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
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
        <label className="block text-sm font-medium mb-1">Name *</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Date</label>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Reason</label>
        <select
          name="reason"
          value={formData.reason}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
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
        <label className="block text-sm font-medium mb-1">Age Group</label>
        <select
          name="age_group"
          value={formData.age_group}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
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
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
          rows={3}
        />
      </div>
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !formData.name || !formData.month}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
