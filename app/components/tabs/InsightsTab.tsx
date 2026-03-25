'use client';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { useDismissedInsights } from '@/hooks/useDismissedInsights';
import { useInsights } from '@/hooks/useInsights';
import type { Insight } from '@/types';
import { InsightCard } from './InsightCard';

// Compute a stable hash from serialized insight data — defined at module level
// to avoid Biome's no-unstable-dependencies lint error inside components.
const insightDataHash = (data: unknown): string => {
  const str = JSON.stringify(data);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h.toString(36);
};

interface Toast {
  id: string;
  message: string;
  insightId: string;
}

export default function InsightsTab() {
  const [dateRange, setDateRange] = useState('3months');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [showDismissed, setShowDismissed] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const { filteredData, allData, loading, error, refresh } = useAnalyticsData({
    dateRange,
    customStartDate,
    customEndDate,
  });

  const { insights } = useInsights({
    ...filteredData,
    rawHolds: allData.holds,
  });

  const { isDismissed, markDone, snooze, dismiss, restore, dismissed } = useDismissedInsights();

  // Per-insight data hash — keyed by insight id, computed from the insight content
  const getInsightHash = useCallback(
    (insight: Insight) =>
      insightDataHash({ id: insight.id, title: insight.title, message: insight.message }),
    []
  );

  // Toast management
  const toastTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const addToast = useCallback((insightId: string, message: string) => {
    const id = `${insightId}-${Date.now()}`;
    setToasts((prev) => [...prev, { id, message, insightId }]);
    toastTimers.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((toastId: string) => {
    clearTimeout(toastTimers.current[toastId]);
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  // Clean up timers on unmount
  useEffect(
    () => () => {
      for (const timer of Object.values(toastTimers.current)) {
        clearTimeout(timer);
      }
    },
    []
  );

  const handleMarkDone = useCallback(
    (insightId: string, dataHash: string) => {
      markDone(insightId, dataHash);
      addToast(insightId, 'Marked as done');
    },
    [markDone, addToast]
  );

  const handleSnooze = useCallback(
    (insightId: string, dataHash: string, days = 7) => {
      snooze(insightId, dataHash, days);
      addToast(insightId, `Snoozed for ${days} days`);
    },
    [snooze, addToast]
  );

  const handleDismiss = useCallback(
    (insightId: string, dataHash: string) => {
      dismiss(insightId, dataHash);
      addToast(insightId, 'Insight dismissed');
    },
    [dismiss, addToast]
  );

  const handleRestore = useCallback(
    (insightId: string) => {
      restore(insightId);
      setToasts((prev) => prev.filter((t) => t.insightId !== insightId));
    },
    [restore]
  );

  const handleApplyCustomDates = () => {
    setCustomStartDate(tempStartDate);
    setCustomEndDate(tempEndDate);
  };

  const visibleInsights = insights.filter((i) => {
    const hash = getInsightHash(i);
    return !isDismissed(i.id, hash);
  });

  const dismissedInsightCount = dismissed.filter(
    (d) => d.action === 'dismissed' || d.action === 'done'
  ).length;

  // Category breakdown (visible only)
  const insightsByCategory = {
    conversion: visibleInsights.filter((i: Insight) => i.category === 'conversion'),
    retention: visibleInsights.filter((i: Insight) => i.category === 'retention'),
    financial: visibleInsights.filter((i: Insight) => i.category === 'financial'),
    operational: visibleInsights.filter((i: Insight) => i.category === 'operational'),
    growth: visibleInsights.filter((i: Insight) => i.category === 'growth'),
  };

  const priorityCounts = {
    critical: visibleInsights.filter((i: Insight) => i.priority === 'critical').length,
    high: visibleInsights.filter((i: Insight) => i.priority === 'high').length,
    medium: visibleInsights.filter((i: Insight) => i.priority === 'medium').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Analyzing your data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error: {error.message}</div>
        <button type="button" onClick={refresh} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
      {/* Toast notifications */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg text-sm"
            >
              <span>{toast.message}</span>
              <button
                type="button"
                onClick={() => {
                  handleRestore(toast.insightId);
                  dismissToast(toast.id);
                }}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-gray-400 hover:text-gray-300"
                aria-label="Close notification"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                <AlertCircle className="w-6 h-6 mr-2 text-red-600" />
                Smart Business Insights
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Actionable recommendations based on your actual data
              </p>
            </div>
            <button type="button" onClick={refresh} className="btn btn-primary">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-wrap gap-2 items-center mt-4">
            {[
              { value: '1month', label: 'Last Month' },
              { value: '3months', label: 'Last 3 Months' },
              { value: '6months', label: 'Last 6 Months' },
              { value: 'all', label: 'All Time' },
              { value: 'custom', label: 'Custom Range' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDateRange(option.value)}
                className={`btn ${
                  dateRange === option.value
                    ? 'btn-primary'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Inputs */}
          {dateRange === 'custom' && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border-2 border-red-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Select Custom Date Range:</p>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="form-label" htmlFor="insights-start-date">
                    Start Date
                  </label>
                  <input
                    id="insights-start-date"
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="form-label" htmlFor="insights-end-date">
                    End Date
                  </label>
                  <input
                    id="insights-end-date"
                    type="date"
                    value={tempEndDate}
                    onChange={(e) => setTempEndDate(e.target.value)}
                    className="form-input"
                  />
                </div>
                <button type="button" onClick={handleApplyCustomDates} className="btn btn-primary">
                  Apply Filter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Priority Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Priority</p>
                <p className="text-3xl font-bold mt-1 text-red-600">{priorityCounts.critical}</p>
                <p className="text-xs text-gray-500 mt-1">Act immediately</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-3xl font-bold mt-1 text-orange-600">{priorityCounts.high}</p>
                <p className="text-xs text-gray-500 mt-1">Address this week</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Medium Priority</p>
                <p className="text-3xl font-bold mt-1 text-yellow-600">{priorityCounts.medium}</p>
                <p className="text-xs text-gray-500 mt-1">Plan for next month</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Insights */}
        {visibleInsights.length === 0 && !showDismissed ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Everything Looks Good!</h3>
            <p className="text-gray-600">
              No critical issues detected. Your gym is running smoothly.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight: Insight) => {
              const hash = getInsightHash(insight);
              const record = dismissed.find((d) => d.insight_id === insight.id);
              const hidden = isDismissed(insight.id, hash);
              if (hidden && !showDismissed) {
                return null;
              }
              return (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  dataHash={hash}
                  {...(record ? { dismissedRecord: record } : {})}
                  onMarkDone={handleMarkDone}
                  onSnooze={handleSnooze}
                  onDismiss={handleDismiss}
                  onRestore={handleRestore}
                  showDismissed={showDismissed}
                />
              );
            })}
          </div>
        )}

        {/* Show dismissed toggle */}
        {dismissedInsightCount > 0 && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowDismissed((v) => !v)}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              {showDismissed
                ? 'Hide dismissed insights'
                : `Show dismissed (${dismissedInsightCount})`}
            </button>
          </div>
        )}

        {/* Category Breakdown */}
        {visibleInsights.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold mb-4">Insights by Category</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { key: 'conversion', label: 'Conversion', icon: Target, color: 'blue' },
                { key: 'retention', label: 'Retention', icon: Users, color: 'purple' },
                { key: 'financial', label: 'Financial', icon: DollarSign, color: 'green' },
                { key: 'operational', label: 'Operational', icon: Clock, color: 'orange' },
                { key: 'growth', label: 'Growth', icon: TrendingUp, color: 'red' },
              ].map(({ key, label, icon: CategoryIcon, color }) => {
                const count = insightsByCategory[key as keyof typeof insightsByCategory].length;
                return (
                  <div key={key} className="text-center p-4 bg-gray-50 rounded-lg">
                    <CategoryIcon className={`w-6 h-6 mx-auto mb-2 text-${color}-600`} />
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-600">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
