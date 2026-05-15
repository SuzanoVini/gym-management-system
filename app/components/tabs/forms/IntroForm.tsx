'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Form, FormField } from '@/components/ui/Form';
import { checkMemberStatus } from '@/lib/supabase/memberStatus';
import type { Intro, IntroFormData } from '@/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const monthFromDate = (dateStr: string): string => {
  const parts = dateStr.split('-');
  return parts.length >= 2 ? (MONTHS[Number(parts[1]) - 1] ?? '') : '';
};

interface IntroFormProps {
  intro?: Intro | null;
  onSubmit: (data: IntroFormData) => void | Promise<void>;
  loading?: boolean;
  onCancel: () => void;
  classTypes: string[];
  staffMembers: string[];
}

export default function IntroForm({
  intro,
  onSubmit,
  loading = false,
  onCancel,
  classTypes,
  staffMembers,
}: IntroFormProps) {
  type IntroFormValues = {
    month: string;
    date: string;
    time: string;
    class: string;
    name: string;
    email: string;
    phone: string;
    staff: string;
    attended: '' | 'Yes' | 'No';
    signed_up: '' | 'Yes' | 'No';
    status: 'Active' | 'Cancelled' | 'Completed';
  };

  const [formData, setFormData] = useState<IntroFormValues>({
    month: intro?.month || (MONTHS[new Date().getMonth()] ?? ''),
    date: intro?.date || '',
    time: intro?.time || '',
    class: intro?.class || '',
    name: intro?.name || '',
    email: intro?.email || '',
    phone: intro?.phone || '',
    staff: intro?.staff || '',
    attended: intro?.attended || '',
    signed_up: intro?.signed_up || '',
    status: intro?.status || 'Active',
  });

  const [memberError, setMemberError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const classOptions = useMemo(() => {
    if (intro?.class && !classTypes.includes(intro.class)) {
      return [...classTypes, intro.class];
    }
    return classTypes;
  }, [classTypes, intro?.class]);

  const staffOptions = useMemo(() => {
    if (intro?.staff && !staffMembers.includes(intro.staff)) {
      return [...staffMembers, intro.staff];
    }
    return staffMembers;
  }, [staffMembers, intro?.staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Create mode only: hard block if current member
    if (!intro) {
      const status = await checkMemberStatus(formData.name.trim());
      if (status.isCurrentMember && status.signupDate) {
        setMemberError(
          `${formData.name.trim()} is a current member (signed up ${status.signupDate}). Cannot add as intro.`
        );
        return;
      }
    }

    const payload: IntroFormData = {
      month: formData.month,
      class: formData.class,
      name: formData.name,
      staff: formData.staff,
      status: formData.status,
    };
    if (formData.date) {
      payload.date = formData.date;
      const yr = Number(formData.date.split('-')[0]);
      if (!Number.isNaN(yr)) {
        payload.year = yr;
      }
    }
    if (formData.time) {
      payload.time = formData.time;
    }
    if (formData.email) {
      payload.email = formData.email;
    }
    if (formData.phone) {
      payload.phone = formData.phone;
    }
    if (formData.attended) {
      payload.attended = formData.attended;
    }
    if (formData.signed_up) {
      payload.signed_up = formData.signed_up;
    }
    await onSubmit(payload);
  };

  const updateField = (
    field: keyof IntroFormValues,
    value: string | number | readonly string[]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      loading={loading}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Name"
          name="name"
          value={formData.name}
          onChange={(value) => {
            updateField('name', value);
            setMemberError(null);

            // Only validate in create mode
            if (intro) {
              return;
            }

            if (debounceRef.current) {
              clearTimeout(debounceRef.current);
            }
            const trimmed = (value as string).trim();
            if (!trimmed) {
              return;
            }

            debounceRef.current = setTimeout(async () => {
              const status = await checkMemberStatus(trimmed);
              if (status.isCurrentMember && status.signupDate) {
                setMemberError(
                  `${trimmed} is a current member (signed up ${status.signupDate}). Cannot add as intro.`
                );
              }
            }, 500);
          }}
          placeholder="Enter full name"
          required
        />

        {memberError && (
          <p className="text-sm text-red-600 -mt-2 col-span-1 md:col-span-2">{memberError}</p>
        )}

        <FormField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={(value) => updateField('email', value)}
          placeholder="email@example.com"
        />

        <FormField
          label="Phone"
          name="phone"
          type="tel"
          value={formData.phone}
          onChange={(value) => updateField('phone', value)}
          placeholder="(555) 123-4567"
        />

        <FormField
          label="Date"
          name="date"
          type="date"
          value={formData.date}
          onChange={(value) => {
            const s = value as string;
            setFormData((prev) => ({ ...prev, date: s, month: monthFromDate(s) || prev.month }));
          }}
          required
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="time" className="form-label">
            Time
          </label>
          <input
            id="time"
            list="time-options"
            value={formData.time}
            onChange={(e) => updateField('time', e.target.value)}
            placeholder="Type or select a time…"
            className="form-input"
            autoComplete="off"
          />
          <datalist id="time-options">
            {[
              '6:00 AM',
              '6:30 AM',
              '7:00 AM',
              '7:30 AM',
              '8:00 AM',
              '8:30 AM',
              '9:00 AM',
              '9:30 AM',
              '10:00 AM',
              '10:30 AM',
              '11:00 AM',
              '11:30 AM',
              '12:00 PM',
              '12:30 PM',
              '4:00 PM',
              '4:30 PM',
              '5:00 PM',
              '5:30 PM',
              '6:00 PM',
              '6:30 PM',
              '7:00 PM',
              '7:30 PM',
              '8:00 PM',
              '8:30 PM',
            ].map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </div>

        <div className="mb-4">
          <label htmlFor="class" className="form-label">
            Class<span className="text-red-500 ml-1">*</span>
          </label>
          <select
            id="class"
            value={formData.class}
            onChange={(e) => updateField('class', e.target.value)}
            disabled={classOptions.length === 0}
            className={`form-select ${classOptions.length === 0 ? '!bg-gray-100 !cursor-not-allowed' : ''}`}
            required
          >
            {classOptions.length === 0 ? (
              <option value="" disabled>
                Loading…
              </option>
            ) : (
              <>
                <option value="">Select Class</option>
                {classOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="staff" className="form-label">
            Staff<span className="text-red-500 ml-1">*</span>
          </label>
          <select
            id="staff"
            value={formData.staff}
            onChange={(e) => updateField('staff', e.target.value)}
            disabled={staffOptions.length === 0}
            className={`form-select ${staffOptions.length === 0 ? '!bg-gray-100 !cursor-not-allowed' : ''}`}
            required
          >
            {staffOptions.length === 0 ? (
              <option value="" disabled>
                Loading…
              </option>
            ) : (
              <>
                <option value="">Select Staff</option>
                {staffOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </>
            )}
          </select>
        </div>

        <FormField
          label="Attended"
          name="attended"
          type="select"
          value={formData.attended}
          onChange={(value) => updateField('attended', value)}
          options={['', 'Yes', 'No']}
        />

        <FormField
          label="Signed Up"
          name="signed_up"
          type="select"
          value={formData.signed_up}
          onChange={(value) => updateField('signed_up', value)}
          options={['', 'Yes', 'No']}
        />

        <FormField
          label="Status"
          name="status"
          type="select"
          value={formData.status}
          onChange={(value) => updateField('status', value)}
          options={['Active', 'Cancelled', 'Completed']}
        />
      </div>

      <div className="flex space-x-3 mt-6">
        <button type="button" onClick={onCancel} className="btn btn-tertiary flex-1">
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className={`flex-1 ${intro ? 'btn btn-primary' : 'btn btn-secondary'}`}
        >
          {loading ? 'Saving...' : intro ? 'Update' : 'Create'}
        </button>
      </div>
    </Form>
  );
}
