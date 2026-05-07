'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { errorHandler } from '@/lib/errorHandler';
import { fetchCancellations } from '@/lib/supabase/cancellations';
import { fetchHolds } from '@/lib/supabase/holds';
import { fetchIntros } from '@/lib/supabase/intros';
import { fetchSignups } from '@/lib/supabase/signups';
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

  const filteredData = useMemo(() => {
    if (dateRange === 'all') {
      return {
        intros: allData.intros,
        signups: allData.signups,
        cancellations: allData.cancellations,
        holds: allData.holds,
      };
    }

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (dateRange) {
      case '1month':
        startDate.setMonth(now.getMonth() - 1);
        endDate = now;
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        endDate = now;
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        endDate = now;
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        endDate = now;
        break;
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      case 'custom':
        if (customStartDate) {
          startDate = new Date(customStartDate);
          startDate.setHours(0, 0, 0, 0);
        }
        if (customEndDate) {
          endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
        }
        break;
      default:
        endDate = now;
    }

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
      intros: allData.intros.filter((i: Intro) =>
        inRange(resolve(i.date, i.month, i.year, i.created_at))
      ),
      signups: allData.signups.filter((s: Signup) =>
        inRange(resolve(s.membership_date, s.month, s.year, s.created_at))
      ),
      cancellations: allData.cancellations.filter((c: Cancellation) =>
        inRange(resolve(c.date, c.month, c.year, c.created_at))
      ),
      holds: allData.holds.filter((h: Hold) =>
        inRange(resolve(h.start, h.month, h.year, h.created_at))
      ),
    };
  }, [allData, dateRange, customStartDate, customEndDate]);

  return {
    filteredData,
    allData,
    loading,
    error,
    refresh: loadAllData,
  };
};
