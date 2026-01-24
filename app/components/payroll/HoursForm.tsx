'use client';

import { useEffect, useState } from 'react';
import { FormField } from '@/components/ui/Form';
import type { StaffMember, TimeEntryFormData } from '@/types';

interface HoursFormData {
  entry_date: string;
  hours: number;
  entry_type: 'regular' | 'overtime' | 'vacation' | 'mat_cleaning';
  notes: string;
  is_after_school_program: boolean;
}

interface HoursFormProps {
  staff: StaffMember[];
  onSubmit: (data: TimeEntryFormData) => void;
  loading?: boolean;
  onCancel: () => void;
  staffHoursId?: string;
  initialData?: Partial<TimeEntryFormData>;
}

export default function HoursForm({
  staff,
  onSubmit,
  loading = false,
  onCancel,
  staffHoursId = '',
  initialData,
}: HoursFormProps) {
  const defaultDate: string = new Date().toISOString().split('T')[0] || '';
  const [formData, setFormData] = useState<HoursFormData>({
    entry_date: initialData?.entry_date !== undefined ? initialData.entry_date : defaultDate,
    hours: initialData?.hours !== undefined ? initialData.hours : 0,
    entry_type: initialData?.entry_type !== undefined ? initialData.entry_type : 'regular',
    notes: initialData?.notes !== undefined ? initialData.notes : '',
    is_after_school_program:
      initialData?.is_after_school_program !== undefined
        ? initialData.is_after_school_program
        : false,
  });

  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [matCleaningChecked, setMatCleaningChecked] = useState(false);

  // Auto-detect After School Program based on time (3-6 PM on weekdays)
  useEffect(() => {
    const date = new Date(formData.entry_date);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();

    // Check if it's a weekday (1-5) and between 3-6 PM
    const isAfterSchoolTime = dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 15 && hour < 18;

    setFormData((prev) => ({
      ...prev,
      is_after_school_program: isAfterSchoolTime,
    }));
  }, [formData.entry_date]);

  // Handle mat cleaning checkbox
  useEffect(() => {
    if (matCleaningChecked) {
      setFormData((prev) => ({
        ...prev,
        entry_type: 'mat_cleaning',
        hours: 0.25,
      }));
    } else if (formData.entry_type === 'mat_cleaning') {
      setFormData((prev) => ({
        ...prev,
        entry_type: 'regular',
        hours: 0,
      }));
    }
  }, [matCleaningChecked, formData.entry_type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: TimeEntryFormData = {
      staff_hours_id: staffHoursId,
      entry_date: formData.entry_date,
      hours: formData.hours,
      entry_type: formData.entry_type,
      is_after_school_program: formData.is_after_school_program,
      ...(formData.notes && { notes: formData.notes }),
    };
    onSubmit(submitData);
  };

  const updateField = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          label="Staff Member"
          name="staff_id"
          type="select"
          value={selectedStaffId}
          onChange={(value) => setSelectedStaffId(value as string)}
          options={staff.filter((s) => s.is_active).map((s) => s.id)}
          required
        />

        <FormField
          label="Date"
          name="entry_date"
          type="date"
          value={formData.entry_date}
          onChange={(value) => updateField('entry_date', value as string)}
          required
        />

        <FormField
          label="Hours Type"
          name="entry_type"
          type="select"
          value={formData.entry_type}
          onChange={(value) => updateField('entry_type', value as string)}
          options={['regular', 'overtime', 'vacation']}
          disabled={matCleaningChecked}
          required
        />

        <FormField
          label="Hours"
          name="hours"
          type="number"
          value={formData.hours}
          onChange={(value) => updateField('hours', value as number)}
          min={0}
          max={24}
          disabled={matCleaningChecked}
          placeholder="0.00"
          required
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="mat_cleaning"
          checked={matCleaningChecked}
          onChange={(e) => setMatCleaningChecked(e.target.checked)}
          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
        />
        <label htmlFor="mat_cleaning" className="text-sm font-medium text-gray-700">
          Mat Cleaning (0.25 hours)
        </label>
      </div>

      {formData.is_after_school_program && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>After School Program Detected:</strong> This entry is during After School
            Program hours (Mon-Fri, 3-6 PM)
          </p>
        </div>
      )}

      <FormField
        label="Notes"
        name="notes"
        type="textarea"
        value={formData.notes}
        onChange={(value) => updateField('notes', value as string)}
        placeholder="Optional notes about this time entry..."
      />

      <div className="flex space-x-3 mt-6">
        <button type="button" onClick={onCancel} className="btn btn-tertiary flex-1">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn btn-primary flex-1">
          {loading ? 'Saving...' : 'Add Hours'}
        </button>
      </div>
    </form>
  );
}
