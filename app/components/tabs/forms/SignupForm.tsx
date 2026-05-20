'use client';

import { useState } from 'react';
import type { Signup, SignupFormData } from '@/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const monthFromDate = (dateStr: string): string => {
  const parts = dateStr.split('-');
  return parts.length >= 2 ? (MONTHS[Number(parts[1]) - 1] ?? '') : '';
};

const yearFromDate = (dateStr: string): number | undefined => {
  const y = Number(dateStr.split('-')[0]);
  return Number.isNaN(y) || y < 2000 ? undefined : y;
};

interface SignupFormProps {
  signup?: Signup | null;
  onSubmit: (data: SignupFormData) => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  membershipTypes: string[];
}

export function SignupForm({
  signup,
  onSubmit,
  onCancel,
  loading = false,
  membershipTypes,
}: SignupFormProps) {
  const [formData, setFormData] = useState(
    signup || {
      month: MONTHS[new Date().getMonth()] ?? '',
      name: '',
      membership: '',
      membership_date: '',
      first_payment_date: '',
      signup_package: false,
      notes: '',
    }
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    if (name === 'membership_date' && value) {
      const newYear = yearFromDate(value);
      setFormData((prev) => ({
        ...prev,
        membership_date: value,
        month: monthFromDate(value) || prev.month,
        ...(newYear !== undefined ? { year: newYear } : {}),
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const yearDerived = formData.membership_date
      ? yearFromDate(formData.membership_date as string)
      : undefined;
    await onSubmit({ ...formData, ...(yearDerived !== undefined ? { year: yearDerived } : {}) });
  };

  const showMonthFallback = !formData.membership_date;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="form-label" htmlFor="signup-name">
          Name *
        </label>
        <input
          id="signup-name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="form-input"
        />
      </div>
      <div>
        <label className="form-label" htmlFor="signup-membership">
          Membership Type *
        </label>
        <select
          id="signup-membership"
          name="membership"
          value={formData.membership}
          onChange={handleChange}
          className="form-select"
        >
          <option value="">Select type</option>
          {membershipTypes.length === 0 ? (
            <option value="" disabled>
              Loading…
            </option>
          ) : (
            membershipTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))
          )}
        </select>
      </div>
      <div>
        <label className="form-label" htmlFor="signup-membership-date">
          Sign Up Date *
        </label>
        <input
          id="signup-membership-date"
          type="date"
          name="membership_date"
          value={formData.membership_date}
          onChange={handleChange}
          className="form-input"
        />
      </div>
      {showMonthFallback && (
        <div>
          <label className="form-label" htmlFor="signup-month">
            Month *{' '}
            <span className="text-xs text-gray-400 font-normal">
              (set a date above to auto-fill)
            </span>
          </label>
          <select
            id="signup-month"
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
        <label className="form-label" htmlFor="signup-first-payment-date">
          First Payment Date
        </label>
        <input
          id="signup-first-payment-date"
          type="date"
          name="first_payment_date"
          value={formData.first_payment_date}
          onChange={handleChange}
          className="form-input"
        />
      </div>
      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="signup_package"
            checked={formData.signup_package}
            onChange={handleChange}
            className="rounded"
          />
          <span className="text-sm font-medium">Sign-up Package</span>
        </label>
      </div>
      <div>
        <label className="form-label" htmlFor="signup-notes">
          Notes
        </label>
        <textarea
          id="signup-notes"
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
          disabled={
            loading ||
            !formData.name ||
            !formData.month ||
            !formData.membership ||
            !formData.membership_date
          }
          className="btn btn-primary"
        >
          {loading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
}
