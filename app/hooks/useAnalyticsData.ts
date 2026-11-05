'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';
import { fetchCancellations } from '@/lib/supabase/cancellations';
import { fetchHolds } from '@/lib/supabase/holds';
import { fetchIntros } from '@/lib/supabase/intros';
import { fetchSignups } from '@/lib/supabase/signups';
import { parseDate } from '@/lib/utils/date.utils';
import { cancellationDate, holdDate, introDate, signupDate } from '@/lib/utils/recordDate';
import type { Cancellation, Hold, Intro, Signup } from '@/types';

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

const FULL_MONTH_RANGES = { '1month': 1, '3months': 3, '6months': 6, year: 12 } as const;

// parseDate reads YYYY-MM-DD in local time; new Date(str) would parse
// it as UTC midnight and shift the range back a day in timezones behind UTC
function customWindow(
  customStartDate: string,
  customEndDate: string,
  startDate: Date,
  endDate: Date
): DateWindow {
  const start = customStartDate ? parseDate(customStartDate) : null;
  const end = customEndDate ? parseDate(customEndDate) : null;
  start?.setHours(0, 0, 0, 0);
  end?.setHours(23, 59, 59, 999);
  return { startDate: start ?? startDate, endDate: end ?? endDate };
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
    case 'thismonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case '1month':
    case '3months':
    case '6months':
    case 'year': {
      // The last N full calendar months, ending with last month. A rolling window
      // would start mid-month and leave the first month's chart bar partial.
      const months = FULL_MONTH_RANGES[dateRange];
      startDate = new Date(now.getFullYear(), now.getMonth() - months, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    }
    case 'ytd':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      ({ startDate, endDate } = customWindow(customStartDate, customEndDate, startDate, endDate));
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

  const inRange = (d: Date | null): boolean => d !== null && d >= startDate && d <= endDate;

  return {
    intros: data.intros.filter((i) => inRange(introDate(i))),
    signups: data.signups.filter((s) => inRange(signupDate(s))),
    cancellations: data.cancellations.filter((c) => inRange(cancellationDate(c))),
    holds: data.holds.filter((h) => inRange(holdDate(h))),
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

  // `silent` reloads in place (no loading state), for small edits made from the screen itself,
  // so the page doesn't swap to the spinner and lose what the user had open.
  const loadAllData = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
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
    void loadAllData();
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
    refresh: () => loadAllData(),
    silentRefresh: () => loadAllData(true),
  };
};
