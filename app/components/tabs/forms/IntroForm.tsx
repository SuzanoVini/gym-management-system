'use client';

import { useState } from 'react';
import { Form, FormField } from '@/components/ui/Form';
import type { Intro, IntroFormData } from '@/types';

interface IntroFormProps {
  intro?: Intro | null;
  onSubmit: (data: IntroFormData) => void;
  loading?: boolean;
  onCancel: () => void;
}

export default function IntroForm({ intro, onSubmit, loading = false, onCancel }: IntroFormProps) {
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
    month: intro?.month || '',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: IntroFormData = {
      month: formData.month,
      class: formData.class,
      name: formData.name,
      staff: formData.staff,
      status: formData.status,
    };
    if (formData.date) {
      payload.date = formData.date;
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
    onSubmit(payload);
  };

  const updateField = (
    field: keyof IntroFormValues,
    value: string | number | readonly string[]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Form onSubmit={handleSubmit} loading={loading}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Name"
          name="name"
          value={formData.name}
          onChange={(value) => updateField('name', value)}
          placeholder="Enter full name"
          required
        />

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
          label="Month"
          name="month"
          type="select"
          value={formData.month}
          onChange={(value) => updateField('month', value)}
          options={[
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
          ]}
          required
        />

        <FormField
          label="Date"
          name="date"
          type="date"
          value={formData.date}
          onChange={(value) => updateField('date', value)}
          required
        />

        <FormField
          label="Time"
          name="time"
          value={formData.time}
          onChange={(value) => updateField('time', value)}
          placeholder="10:00 AM"
        />

        <FormField
          label="Class"
          name="class"
          type="select"
          value={formData.class}
          onChange={(value) => updateField('class', value)}
          options={['GB1', 'GB2', 'GB3', 'Muay Thai', 'Kids 3-6', 'Kids 7-9', 'No-Gi']}
          required
        />

        <FormField
          label="Staff"
          name="staff"
          type="select"
          value={formData.staff}
          onChange={(value) => updateField('staff', value)}
          options={['Staff 1', 'Staff 4', 'Staff 2', 'Staff 3', 'Vinicius', 'Jun', 'Staff 7', 'Staff 8']}
          required
        />

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
