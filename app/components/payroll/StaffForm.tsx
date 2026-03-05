'use client';

import { useState } from 'react';
import { FormField } from '@/components/ui/Form';
import type { StaffMember, StaffMemberFormData } from '@/types';

interface StaffFormProps {
  staff?: StaffMember | null;
  onSubmit: (data: StaffMemberFormData) => void;
  loading?: boolean;
  onCancel: () => void;
}

export default function StaffForm({ staff, onSubmit, loading = false, onCancel }: StaffFormProps) {
  const [formData, setFormData] = useState<StaffMemberFormData>({
    employee_id: staff?.employee_id || '',
    full_name: staff?.full_name || '',
    job_title: staff?.job_title || '',
    is_active: staff?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate employee ID format (should be numeric)
    if (!/^\d+$/.test(formData.employee_id)) {
      alert('Payroll ID must be numeric');
      return;
    }

    onSubmit(formData);
  };

  const updateField = (field: keyof StaffMemberFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Payroll ID"
          name="employee_id"
          type="text"
          value={formData.employee_id}
          onChange={(value) => updateField('employee_id', value as string)}
          placeholder="e.g., 1023"
          required
        />

        <FormField
          label="Full Name"
          name="full_name"
          type="text"
          value={formData.full_name}
          onChange={(value) => updateField('full_name', value as string)}
          placeholder="e.g., John Doe"
          required
        />

        <FormField
          label="Job Title"
          name="job_title"
          type="select"
          value={formData.job_title}
          onChange={(value) => updateField('job_title', value as string)}
          options={[
            'Instructor',
            'Assistant Instructor',
            'Front Desk',
            'Manager',
            'Special Class Instructor',
            'Contractor',
            'After School Program',
          ]}
          required
        />

        <div className="flex items-center space-x-2 pt-8">
          <input
            type="checkbox"
            id="is_active"
            checked={formData.is_active}
            onChange={(e) => updateField('is_active', e.target.checked)}
            className="rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
            Active Employee
          </label>
        </div>
      </div>

      {/* Contractor Note */}
      {formData.job_title.toLowerCase().includes('contractor') && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Contractors may have different payroll processing requirements.
            Verify tax classification and payment terms.
          </p>
        </div>
      )}

      {/* After School Program Note */}
      {formData.job_title.toLowerCase().includes('after school') && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Time entries for After School Program staff will be automatically
            tagged based on their department assignment.
          </p>
        </div>
      )}

      <div className="flex space-x-3 mt-6">
        <button type="button" onClick={onCancel} className="btn btn-tertiary flex-1">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn btn-primary flex-1">
          {loading ? 'Saving...' : staff ? 'Update Staff' : 'Add Staff'}
        </button>
      </div>
    </form>
  );
}
