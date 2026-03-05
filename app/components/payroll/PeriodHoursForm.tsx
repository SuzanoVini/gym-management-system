'use client';

import { useState } from 'react';
import type { StaffHoursFormData, StaffMember } from '@/types';

interface PeriodHoursFormData {
  staff_id: string;
  regular_hours: number;
  overtime_hours: number;
  vacation_hours: number;
  sick_hours: number;
  mat_cleaning_count: number;
}

interface PeriodHoursFormProps {
  staff: StaffMember[];
  onSubmit: (staffId: string, data: Partial<StaffHoursFormData>) => void;
  loading?: boolean;
  onCancel: () => void;
}

export default function PeriodHoursForm({
  staff,
  onSubmit,
  loading = false,
  onCancel,
}: PeriodHoursFormProps) {
  const [formData, setFormData] = useState<PeriodHoursFormData>({
    staff_id: '',
    regular_hours: 0,
    overtime_hours: 0,
    vacation_hours: 0,
    sick_hours: 0,
    mat_cleaning_count: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.staff_id) {
      alert('Please select a staff member');
      return;
    }

    const submitData: Partial<StaffHoursFormData> = {
      regular_hours: formData.regular_hours,
      overtime_hours: formData.overtime_hours,
      vacation_hours: formData.vacation_hours,
      sick_hours: formData.sick_hours,
      mat_cleaning_count: formData.mat_cleaning_count,
    };

    onSubmit(formData.staff_id, submitData);
  };

  const updateField = (field: keyof PeriodHoursFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const totalHours =
    formData.regular_hours +
    formData.overtime_hours +
    formData.vacation_hours +
    formData.sick_hours +
    formData.mat_cleaning_count * 0.25;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Staff Selection */}
      <div className="mb-4">
        <label htmlFor="staff_id" className="form-label">
          Staff Member
          <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          id="staff_id"
          value={formData.staff_id}
          onChange={(e) => updateField('staff_id', e.target.value)}
          className="form-select"
          required
        >
          <option value="">Select Staff Member</option>
          {staff
            .filter((s) => s.is_active)
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} ({s.employee_id})
              </option>
            ))}
        </select>
      </div>

      {/* Hours Entry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Regular Hours */}
        <div className="mb-4">
          <label htmlFor="regular_hours" className="form-label">
            Regular Hours
          </label>
          <input
            id="regular_hours"
            type="number"
            value={formData.regular_hours}
            onChange={(e) => updateField('regular_hours', Number(e.target.value))}
            min={0}
            max={999}
            step={0.25}
            placeholder="0.00"
            className="form-input"
          />
        </div>

        {/* Overtime Hours */}
        <div className="mb-4">
          <label htmlFor="overtime_hours" className="form-label">
            Overtime Hours
          </label>
          <input
            id="overtime_hours"
            type="number"
            value={formData.overtime_hours}
            onChange={(e) => updateField('overtime_hours', Number(e.target.value))}
            min={0}
            max={999}
            step={0.25}
            placeholder="0.00"
            className="form-input"
          />
        </div>

        {/* Vacation Hours */}
        <div className="mb-4">
          <label htmlFor="vacation_hours" className="form-label">
            Vacation Hours
          </label>
          <input
            id="vacation_hours"
            type="number"
            value={formData.vacation_hours}
            onChange={(e) => updateField('vacation_hours', Number(e.target.value))}
            min={0}
            max={999}
            step={0.25}
            placeholder="0.00"
            className="form-input"
          />
        </div>

        {/* Sick Hours */}
        <div className="mb-4">
          <label htmlFor="sick_hours" className="form-label">
            Sick Hours
          </label>
          <input
            id="sick_hours"
            type="number"
            value={formData.sick_hours}
            onChange={(e) => updateField('sick_hours', Number(e.target.value))}
            min={0}
            max={999}
            step={0.25}
            placeholder="0.00"
            className="form-input"
          />
        </div>

        {/* Mat Cleaning Count */}
        <div className="mb-4">
          <label htmlFor="mat_cleaning_count" className="form-label">
            Mat Cleaning Count
            <span className="text-xs text-gray-500 ml-2">(0.25 hrs each)</span>
          </label>
          <input
            id="mat_cleaning_count"
            type="number"
            value={formData.mat_cleaning_count}
            onChange={(e) => updateField('mat_cleaning_count', Number(e.target.value))}
            min={0}
            max={100}
            step={1}
            placeholder="0"
            className="form-input"
          />
        </div>
      </div>

      {/* Total Hours Display */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-blue-900">Total Hours:</span>
          <span className="text-lg font-bold text-blue-900">{totalHours.toFixed(2)}</span>
        </div>
        {formData.mat_cleaning_count > 0 && (
          <p className="text-xs text-blue-700 mt-1">
            Includes {formData.mat_cleaning_count} mat cleaning bonus(es) ={' '}
            {(formData.mat_cleaning_count * 0.25).toFixed(2)} hrs
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3 mt-6">
        <button type="button" onClick={onCancel} className="btn btn-tertiary flex-1">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn btn-primary flex-1">
          {loading ? 'Saving...' : 'Save Hours'}
        </button>
      </div>
    </form>
  );
}
