'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';
import { fetchCancellations } from '@/lib/supabase/cancellations';
import { fetchHolds } from '@/lib/supabase/holds';
import { fetchIntros } from '@/lib/supabase/intros';
import { fetchSignups } from '@/lib/supabase/signups';
import { parseDate } from '@/lib/utils/date.utils';
import type { Cancellation, Hold, Intro, Signup } from '@/types';

const MONTH_MAP: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

const dateFromMonthYear = (month: string, year?: number): Date | null => {
  const idx = MONTH_MAP[month];
  if (idx === undefined || !year) {
    return null;
  }
  return new Date(year, idx, 1);
};

interface AnalyticsData {
  intros: Intro[];
  signups: Signup[];
  cancellations: Cancellation[];
  holds: Hold[];
}

interface DateRangeFilterOptions {
  dateRange: string;
  customStartDate: string;
  customEndDate: string;
}

interface DateWindow {
  startDate: Date;
  endDate: Date;
}

/** Null for 'all' — there's no bounded window to mirror for a delta comparison. */
export function resolveDateWindow(
  dateRange: string,
  customStartDate: string,
  customEndDate: string,
  now: Date
): DateWindow | null {
  if (dateRange === 'all') {
    return null;
  }

  let startDate = new Date(now);
  let endDate = now;

  switch (dateRange) {
    case '1month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case '3months':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case '6months':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case 'year':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case 'ytd':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      // parseDate reads YYYY-MM-DD in local time; new Date(str) would parse
      // it as UTC midnight and shift the range back a day in timezones
      // behind UTC
      if (customStartDate) {
        const parsed = parseDate(customStartDate);
        if (parsed) {
          parsed.setHours(0, 0, 0, 0);
          startDate = parsed;
        }
      }
      if (customEndDate) {
        const parsed = parseDate(customEndDate);
        if (parsed) {
          parsed.setHours(23, 59, 59, 999);
          endDate = parsed;
        }
      }
      break;
    default:
      break;
  }

  return { startDate, endDate };
}

/** The immediately preceding window of the same length — for period-over-period deltas. */
export function previousWindow(window: DateWindow): DateWindow {
  const lengthMs = window.endDate.getTime() - window.startDate.getTime();
  return {
    startDate: new Date(window.startDate.getTime() - lengthMs),
    endDate: new Date(window.startDate.getTime() - 1),
  };
}

function filterByWindow(data: AnalyticsData, window: DateWindow | null): AnalyticsData {
  if (!window) {
    return data;
  }
  const { startDate, endDate } = window;

  const inRange = (d: Date | null): boolean => {
    if (!d || Number.isNaN(d.getTime())) {
      return false;
    }
    return d >= startDate && d <= endDate;
  };

  const resolve = (
    specific: string | undefined,
    month: string,
    year?: number,
    fallback?: string
  ): Date | null => {
    if (specific) {
      return new Date(specific);
    }
    const fromMY = dateFromMonthYear(month, year);
    if (fromMY) {
      return fromMY;
    }
    return fallback ? new Date(fallback) : null;
  };

  return {
    intros: data.intros.filter((i: Intro) =>
      inRange(resolve(i.date, i.month, i.year, i.created_at))
    ),
    signups: data.signups.filter((s: Signup) =>
      inRange(resolve(s.membership_date, s.month, s.year, s.created_at))
    ),
    cancellations: data.cancellations.filter((c: Cancellation) =>
      inRange(resolve(c.date, c.month, c.year, c.created_at))
    ),
    holds: data.holds.filter((h: Hold) => inRange(resolve(h.start, h.month, h.year, h.created_at))),
  };
}

export const useAnalyticsData = (filterOptions: DateRangeFilterOptions) => {
  const [allData, setAllData] = useState<AnalyticsData>({
    intros: [],
    signups: [],
    cancellations: [],
    holds: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { dateRange, customStartDate, customEndDate } = filterOptions;

  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [introsData, signupsData, cancellationsData, holdsData] = await Promise.all([
        fetchIntros(),
        fetchSignups(),
        fetchCancellations(),
        fetchHolds(),
      ]);
      setAllData({
        intros: introsData,
        signups: signupsData,
        cancellations: cancellationsData,
        holds: holdsData,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load analytics data');
      setError(error);
      errorHandler.handle(error, 'loadAnalyticsData');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const window = useMemo(
    () => resolveDateWindow(dateRange, customStartDate, customEndDate, new Date()),
    [dateRange, customStartDate, customEndDate]
  );

  const filteredData = useMemo(() => filterByWindow(allData, window), [allData, window]);

  // Null when dateRange is 'all' — there's no bounded window to compare against
  const previousPeriodData = useMemo(
    () => (window ? filterByWindow(allData, previousWindow(window)) : null),
    [allData, window]
  );

  return {
    filteredData,
    previousPeriodData,
    allData,
    loading,
    error,
    refresh: loadAllData,
  };
};
