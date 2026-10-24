'use client';

import { CheckCircle } from 'lucide-react';
import { useCallback, useState } from 'react';

import DateRangeFilter, { type DateRangeOption } from '@/components/ui/DateRangeFilter';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { useDismissedInsights } from '@/hooks/useDismissedInsights';
import { useInsights } from '@/hooks/useInsights';
import { useRevenueSetting } from '@/hooks/useRevenueSetting';
import type { Insight } from '@/types';
import { InsightCard } from './InsightCard';
import { type FollowUpsSummary, withFollowUpInsight } from './InsightsTab/buildFollowUpInsight';
import InsightToasts from './InsightsTab/InsightToasts';
import { useInsightActions } from './InsightsTab/useInsightActions';
import { useInsightsDateRange } from './InsightsTab/useInsightsDateRange';
import { useInsightToasts } from './InsightsTab/useInsightToasts';

export { buildFollowUpInsight } from './InsightsTab/buildFollowUpInsight';

const INSIGHTS_DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { value: '1month', label: 'Last month' },
  { value: '3months', label: 'Last 3 months' },
  { value: '6months', label: 'Last 6 months' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
];

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

interface InsightsTabProps {
  followUps: FollowUpsSummary;
}

function InsightsLoading() {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4" />
        <p className="text-gray-600">Analyzing your data...</p>
      </div>
    </div>
  );
}

function InsightsEmptyState() {
  return (
    <div className="bg-white rounded-[var(--radius-card)] border border-[var(--border)] p-12 text-center">
      <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-900 mb-2">Everything Looks Good!</h3>
      <p className="text-gray-600">No critical issues detected. Your gym is running smoothly.</p>
    </div>
  );
}

export default function InsightsTab({ followUps }: InsightsTabProps) {
  const range = useInsightsDateRange();
  const { dateRange, customStartDate, customEndDate } = range;
  const [showDismissed, setShowDismissed] = useState(false);
  const revenuePerMember = useRevenueSetting();

  const { filteredData, loading, error, refresh } = useAnalyticsData({
    dateRange,
    customStartDate,
    customEndDate,
  });

  const { insights: baseInsights } = useInsights({
    ...filteredData,
    revenuePerMember,
  });

  const insights = withFollowUpInsight(followUps, baseInsights);

  const { isDismissed, markDone, snooze, dismiss, restore, dismissed } = useDismissedInsights();

  // Per-insight data hash — keyed by insight id, computed from the insight content
  const getInsightHash = useCallback(
    (insight: Insight) =>
      insightDataHash({ id: insight.id, title: insight.title, message: insight.message }),
    []
  );

  const { toasts, addToast, dismissToast, removeToastsFor } = useInsightToasts();

  const { handleMarkDone, handleSnooze, handleDismiss, handleRestore } = useInsightActions(
    { markDone, snooze, dismiss, restore },
    { addToast, removeToastsFor }
  );

  const visibleInsights = insights.filter((i) => {
    const hash = getInsightHash(i);
    return !isDismissed(i.id, hash);
  });

  const dismissedInsightCount = dismissed.filter(
    (d) => d.action === 'dismissed' || d.action === 'done'
  ).length;

  if (loading) {
    return <InsightsLoading />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error: {error.message}</div>
        <button
          type="button"
          onClick={() => {
            void refresh();
          }}
          className="btn btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
      {/* Toast notifications */}
      <InsightToasts
        toasts={toasts}
        onUndo={(toast) => {
          handleRestore(toast.insightId);
          dismissToast(toast.id);
        }}
        onClose={dismissToast}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="px-1">
          <div className="flex items-center justify-between mb-4 gap-4">
            <div>
              <h1 className="page-title">Smart Business Insights</h1>
              <p className="text-sm text-gray-600 mt-1">
                Actionable recommendations based on your actual data
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void refresh();
              }}
              className="btn btn-primary"
            >
              Refresh
            </button>
          </div>

          {/* Date Range Filter */}
          <div className="mt-4">
            <DateRangeFilter
              idPrefix="insights"
              options={INSIGHTS_DATE_RANGE_OPTIONS}
              dateRange={dateRange}
              onSelectRange={range.setDateRange}
              tempStartDate={range.tempStartDate}
              tempEndDate={range.tempEndDate}
              onTempStartDateChange={range.setTempStartDate}
              onTempEndDateChange={range.setTempEndDate}
              onApplyCustomDates={range.handleApplyCustomDates}
              customRangeBoxClassName="mt-4 p-4 bg-gray-50 rounded-lg border-2 border-red-200"
            />
          </div>
        </div>

        {/* Insights */}
        {visibleInsights.length === 0 && !showDismissed ? (
          <InsightsEmptyState />
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
      </div>
    </div>
  );
}
