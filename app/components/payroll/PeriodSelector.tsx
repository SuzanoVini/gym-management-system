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
    <div className="space-y-3">
      {/* Current Period Display */}
      {currentPeriod && (
        <div className="payroll-current-period">
          <span className="text-base font-semibold">
            Current Period: {currentPeriod.period_label}
          </span>
          {currentPeriod.is_closed && (
            <span className="ml-3 px-3 py-1 bg-gray-800 text-white text-xs font-semibold rounded-full">
              Closed
            </span>
          )}
        </div>
      )}

      {/* Period Selector Dropdown */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
            <Calendar className="h-4 w-4 text-slate-500" aria-hidden="true" />
          </div>
          <select
            value={currentPeriod?.id || ''}
            onChange={(e) => onSelectPeriod(e.target.value)}
            disabled={loading}
            className="form-select pl-12 w-full"
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
    </div>
  );
}
