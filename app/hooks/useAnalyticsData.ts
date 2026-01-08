'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchCancellations } from '@/lib/supabase/cancellations';
import { fetchHolds } from '@/lib/supabase/holds';
import { fetchIntros } from '@/lib/supabase/intros';
import { fetchSignups } from '@/lib/supabase/signups';
import type { Intro, Signup, Cancellation, Hold } from '@/types';
import { errorHandler } from '@/lib/errorHandler';

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
    const filterByDateRange = (data: any[]) => {
      if (dateRange === 'all') {
        return data;
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
        case 'ytd': // Year to date
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

      return data.filter((item) => {
        if (!item.created_at) {
          return false;
        }
        const itemDate = new Date(item.created_at);
        return itemDate >= startDate && itemDate <= endDate;
      });
    };

    return {
      intros: filterByDateRange(allData.intros),
      signups: filterByDateRange(allData.signups),
      cancellations: filterByDateRange(allData.cancellations),
      holds: filterByDateRange(allData.holds),
    };
  }, [allData, dateRange, customStartDate, customEndDate]);

  return {
    filteredData,
    loading,
    error,
    refresh: loadAllData,
  };
};
