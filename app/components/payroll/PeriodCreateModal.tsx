'use client';

import { useEffect, useState } from 'react';
import { formatDateISO, generatePeriodLabel, parseDate } from '@/lib/utils/date.utils';
import type { PayrollPeriod } from '@/types';

interface PeriodCreateModalProps {
  suggestedStartDate: string;
  suggestedEndDate: string;
  existingPeriods: PayrollPeriod[];
  onSubmit: (startDate: string, endDate: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function PeriodCreateModal({
  suggestedStartDate,
  suggestedEndDate,
  existingPeriods,
  onSubmit,
  onCancel,
  loading = false,
}: PeriodCreateModalProps) {
  const [startDate, setStartDate] = useState(suggestedStartDate);
  const [endDate, setEndDate] = useState(suggestedEndDate);
  const [error, setError] = useState<string | null>(null);

  // Re-sync if the suggested next period changes (e.g. periods reload)
  useEffect(() => {
    setStartDate(suggestedStartDate);
    setEndDate(suggestedEndDate);
  }, [suggestedStartDate, suggestedEndDate]);

  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const label = start && end ? generatePeriodLabel(start, end) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!start || !end) {
      setError('Enter valid start and end dates');
      return;
    }
    if (start > end) {
      setError('Start date must be before end date');
      return;
    }
    const overlaps = existingPeriods.some((p) => {
      const pStart = parseDate(p.start_date);
      const pEnd = parseDate(p.end_date);
      return pStart && pEnd && start <= pEnd && end >= pStart;
    });
    if (overlaps) {
      setError('This range overlaps an existing period');
      return;
    }

    await onSubmit(startDate, endDate);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label" htmlFor="period-start-date">
            Start Date
          </label>
          <input
            id="period-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="form-input"
            required
          />
        </div>
        <div>
          <label className="form-label" htmlFor="period-end-date">
            End Date
          </label>
          <input
            id="period-end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="form-input"
            required
          />
        </div>
      </div>

      {label && (
        <p className="text-sm text-gray-600">
          Period label: <span className="font-semibold text-gray-900">{label}</span>
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className="btn btn-secondary" disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Create Period'}
        </button>
      </div>
    </form>
  );
}

/** Immediately after the latest existing period, or today's window if none exist. */
export function computeSuggestedNextPeriod(
  existingPeriods: PayrollPeriod[],
  getPayrollPeriodForDate: (date: Date) => { start: Date; end: Date }
): { startDate: string; endDate: string } {
  const latest = [...existingPeriods].sort((a, b) => b.end_date.localeCompare(a.end_date))[0];

  let anchor = new Date();
  if (latest) {
    const latestEnd = parseDate(latest.end_date);
    if (latestEnd) {
      anchor = new Date(latestEnd);
      anchor.setDate(anchor.getDate() + 1);
    }
  }

  const { start, end } = getPayrollPeriodForDate(anchor);
  return { startDate: formatDateISO(start), endDate: formatDateISO(end) };
}
