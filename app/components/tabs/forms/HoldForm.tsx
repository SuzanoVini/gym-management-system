'use client';

import { useState } from 'react';
import type { Hold, HoldFormData } from '@/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface HoldFormProps {
  hold?: Hold | null;
  onSubmit: (data: HoldFormData) => void;
  onCancel: () => void;
  loading?: boolean;
  holdReasons: string[];
}

export function HoldForm({
  hold,
  onSubmit,
  onCancel,
  loading = false,
  holdReasons,
}: HoldFormProps) {
  const [formData, setFormData] = useState(
    hold || {
      month: '',
      name: '',
      start: '',
      end: '',
      reason: '',
      fee: '',
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
        <label className="block text-sm font-medium mb-1">Start Date</label>
        <input
          type="date"
          name="start"
          value={formData.start}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">End Date</label>
        <input
          type="date"
          name="end"
          value={formData.end}
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
          {holdReasons.map((reason) => (
            <option key={reason} value={reason}>
              {reason}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Fee</label>
        <input
          type="text"
          name="fee"
          value={formData.fee}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded"
          placeholder="Optional"
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
