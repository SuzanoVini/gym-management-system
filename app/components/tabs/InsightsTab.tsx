'use client';

import { CheckCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { useDismissedInsights } from '@/hooks/useDismissedInsights';
import type { FollowUpRow } from '@/hooks/useFollowUps';
import { useInsights } from '@/hooks/useInsights';
import { DEFAULT_MONTHLY_MEMBERSHIP_REVENUE } from '@/lib/insights/rules';
import { fetchNumberSetting } from '@/lib/supabase/settings';
import { addBusinessDays } from '@/lib/utils/businessDays';
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

interface InsightsTabProps {
  followUps: {
    rows: FollowUpRow[];
    overdueCount: number;
    remindersDueCount: number;
  };
}

// One source of truth for follow-up urgency: the same useFollowUps rows that
// drive the Follow Ups tab and sidebar badge, so this card disappears exactly
// when follow-up is up to date.
export function buildFollowUpInsight(followUps: InsightsTabProps['followUps']): Insight | null {
  if (followUps.overdueCount === 0 && followUps.remindersDueCount === 0) {
    return null;
  }

  if (followUps.overdueCount === 0) {
    return {
      id: 'follow-ups-due',
      title: `${followUps.remindersDueCount} Follow-Up Reminder${followUps.remindersDueCount === 1 ? '' : 's'} Due`,
      message: `${followUps.remindersDueCount} follow-up reminder${followUps.remindersDueCount === 1 ? ' is' : 's are'} due. Handle these while the lead is still warm.`,
      icon: 'Clock',
      color: 'orange',
      priority: 'medium',
      impact: 'Improves intro-to-signup follow-through',
      actions: [
        'Open the Follow Ups tab',
        'Contact due leads first',
        'Log each contact attempt',
        'Set reminders for anyone who needs more time',
      ],
      category: 'operational',
    };
  }

  const overdue = followUps.rows.filter((r) => r.tier === 1 || r.tier === 3);
  const neverContacted = overdue.filter((r) => r.tier === 1).length;
  const awaitingSecond = overdue.length - neverContacted;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const severelyOverdue = overdue.some((r) => {
    const due = r.tier === 1 ? r.firstDueDate : r.secondDueDate;
    return due !== null && addBusinessDays(due, 5) < today;
  });

  const byStaff = overdue.reduce<Record<string, number>>((acc, r) => {
    const staff = r.staff || 'Unassigned';
    acc[staff] = (acc[staff] || 0) + 1;
    return acc;
  }, {});
  const staffBreakdown = Object.entries(byStaff)
    .sort((a, b) => b[1] - a[1])
    .map(([staff, count]) => `• ${count} from ${staff}'s classes`)
    .join('\n');

  const splitParts = [
    neverContacted > 0 ? `${neverContacted} never contacted (overdue)` : null,
    awaitingSecond > 0 ? `${awaitingSecond} awaiting 2nd contact (overdue)` : null,
  ].filter(Boolean);

  return {
    id: 'follow-ups-due',
    title: `${overdue.length} Follow-Up${overdue.length === 1 ? '' : 's'} Overdue`,
    message: `${splitParts.join(' · ')}\n\n${staffBreakdown}\n\nThese are active leads that need contact before they go cold.`,
    icon: 'AlertCircle',
    color: 'red',
    priority: severelyOverdue ? 'critical' : 'high',
    impact: 'Improves intro-to-signup follow-through',
    actions: [
      'Open the Follow Ups tab',
      'Contact overdue leads first',
      'Log each contact attempt',
      'Set reminders for anyone who needs more time',
    ],
    category: 'operational',
  };
}

export default function InsightsTab({ followUps }: InsightsTabProps) {
  const [dateRange, setDateRange] = useState('3months');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [showDismissed, setShowDismissed] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [revenuePerMember, setRevenuePerMember] = useState(DEFAULT_MONTHLY_MEMBERSHIP_REVENUE);

  const { filteredData, loading, error, refresh } = useAnalyticsData({
    dateRange,
    customStartDate,
    customEndDate,
  });

  useEffect(() => {
    fetchNumberSetting('avg_monthly_membership_revenue', DEFAULT_MONTHLY_MEMBERSHIP_REVENUE).then(
      setRevenuePerMember
    );
  }, []);

  const { insights: baseInsights } = useInsights({
    ...filteredData,
    revenuePerMember,
  });

  const followUpInsight = buildFollowUpInsight(followUps);

  const insights = followUpInsight ? [followUpInsight, ...baseInsights] : baseInsights;

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
        <div className="px-1">
          <div className="flex items-center justify-between mb-4 gap-4">
            <div>
              <h2 className="text-2xl font-bold">Smart Business Insights</h2>
              <p className="text-sm text-gray-600 mt-1">
                Actionable recommendations based on your actual data
              </p>
            </div>
            <button type="button" onClick={refresh} className="btn btn-primary">
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
      </div>
    </div>
  );
}
