'use client';

import { Calendar, Plus } from 'lucide-react';
import type { PayrollPeriod } from '@/types';

interface PeriodSelectorProps {
  periods: PayrollPeriod[];
  currentPeriod: PayrollPeriod | null;
  onSelectPeriod: (periodId: string) => void;
  onCreatePeriod?: () => void;
  loading?: boolean;
}

export default function PeriodSelector({
  periods,
  currentPeriod,
  onSelectPeriod,
  onCreatePeriod,
  loading = false,
}: PeriodSelectorProps) {
  return (
    <div className="flex items-center space-x-3">
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Calendar className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </div>
        <select
          value={currentPeriod?.id || ''}
          onChange={(e) => onSelectPeriod(e.target.value)}
          disabled={loading}
          className="form-select pl-10 w-full"
          aria-label="Select payroll period"
        >
          {periods.length === 0 ? (
            <option value="">No periods available</option>
          ) : (
            <>
              <option value="">Select a period</option>
              {periods.map((period) => (
                <option key={period.id} value={period.id}>
                  {period.period_label}
                  {period.is_current && ' (Current)'}
                  {period.is_closed && ' - Closed'}
                </option>
              ))}
            </>
          )}
        </select>
      </div>

      {onCreatePeriod && (
        <button
          type="button"
          onClick={onCreatePeriod}
          disabled={loading}
          className="btn btn-secondary-blue"
          title="Create new period"
          aria-label="Create new payroll period"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Period</span>
        </button>
      )}
    </div>
  );
}
