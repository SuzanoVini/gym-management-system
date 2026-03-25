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
        <label className="form-label" htmlFor="hold-month">
          Month *
        </label>
        <select
          id="hold-month"
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
        <label className="form-label" htmlFor="hold-name">
          Name *
        </label>
        <input
          id="hold-name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="form-input"
        />
      </div>
      <div>
        <label className="form-label" htmlFor="hold-start">
          Start Date
        </label>
        <input
          id="hold-start"
          type="date"
          name="start"
          value={formData.start}
          onChange={handleChange}
          className="form-input"
        />
      </div>
      <div>
        <label className="form-label" htmlFor="hold-end">
          End Date
        </label>
        <input
          id="hold-end"
          type="date"
          name="end"
          value={formData.end}
          onChange={handleChange}
          className="form-input"
        />
      </div>
      <div>
        <label className="form-label" htmlFor="hold-reason">
          Reason
        </label>
        <select
          id="hold-reason"
          name="reason"
          value={formData.reason}
          onChange={handleChange}
          className="form-select"
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
        <label className="form-label" htmlFor="hold-fee">
          Fee
        </label>
        <input
          id="hold-fee"
          type="text"
          name="fee"
          value={formData.fee}
          onChange={handleChange}
          className="form-input"
          placeholder="Optional"
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
