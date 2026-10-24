'use client';

import {
  AlertCircle,
  AlertTriangle,
  BellOff,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  DollarSign,
  EyeOff,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import type { DismissedInsight } from '@/hooks/useDismissedInsights';
import type { Insight } from '@/types';

const InsightIcons = {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Users,
  Target,
};

function actionedState(dismissedRecord: DismissedInsight | undefined) {
  const isDone = dismissedRecord?.action === 'done';
  const isSnoozed = dismissedRecord?.action === 'snoozed';
  const isDismissed = dismissedRecord?.action === 'dismissed';
  const isActioned = isDone || isSnoozed || isDismissed;
  return { isDone, isSnoozed, isDismissed, isActioned };
}

function ActionedBanner({
  isDone,
  isSnoozed,
  isDismissed,
  dismissedRecord,
  onUndo,
}: {
  isDone: boolean;
  isSnoozed: boolean;
  isDismissed: boolean;
  dismissedRecord: DismissedInsight | undefined;
  onUndo: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3 px-3 py-2 bg-gray-100 rounded-lg text-xs text-gray-500">
      <span>
        {isDone && 'Marked as done'}
        {isSnoozed &&
          dismissedRecord?.snoozed_until &&
          `Snoozed until ${new Date(dismissedRecord.snoozed_until).toLocaleDateString()}`}
        {isDismissed && 'Dismissed'}
      </span>
      <button type="button" onClick={onUndo} className="text-blue-600 hover:underline font-medium">
        Undo
      </button>
    </div>
  );
}

interface InsightCardProps {
  insight: Insight;
  dataHash: string;
  dismissedRecord?: DismissedInsight;
  onMarkDone: (insightId: string, dataHash: string) => void;
  onSnooze: (insightId: string, dataHash: string, days?: number) => void;
  onDismiss: (insightId: string, dataHash: string) => void;
  onRestore: (insightId: string) => void;
  showDismissed?: boolean;
}

export function InsightCard({
  insight,
  dataHash,
  dismissedRecord,
  onMarkDone,
  onSnooze,
  onDismiss,
  onRestore,
  showDismissed = false,
}: InsightCardProps) {
  const Icon = InsightIcons[insight.icon as keyof typeof InsightIcons] ?? AlertCircle;

  // One hue: only a critical insight's icon and badge take the red. Cards themselves stay white.
  const iconColor =
    insight.priority === 'critical' ? 'text-[var(--accent)]' : 'text-[var(--muted)]';

  const priorityBadge = {
    critical: 'bg-[var(--accent-50)] text-[var(--accent-ink)]',
    high: 'bg-amber-50 text-amber-800',
    medium: 'bg-[var(--raised)] text-[var(--gb-dark-gray)]',
    low: 'bg-[var(--raised)] text-[var(--muted)]',
  }[insight.priority];

  const { isDone, isSnoozed, isDismissed, isActioned } = actionedState(dismissedRecord);

  if (isActioned && !showDismissed) {
    return null;
  }

  return (
    <div
      className={`rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 ${isActioned ? 'opacity-50' : ''}`}
    >
      {/* Dismissed/snoozed banner */}
      {isActioned && (
        <ActionedBanner
          isDone={isDone}
          isSnoozed={isSnoozed}
          isDismissed={isDismissed}
          dismissedRecord={dismissedRecord}
          onUndo={() => onRestore(insight.id)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start flex-1">
          <Icon className={`w-5 h-5 ${iconColor} mr-3 mt-0.5 flex-shrink-0`} />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-base font-semibold text-[var(--text)]">{insight.title}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${priorityBadge}`}
              >
                {insight.priority}
              </span>
            </div>
            {insight.impact && (
              <p className="text-sm text-[var(--muted)]">Impact: {insight.impact}</p>
            )}
          </div>
        </div>
      </div>

      {/* Message */}
      <div className="ml-8 mb-4">
        <p className="text-sm text-[var(--gb-dark-gray)] whitespace-pre-line leading-relaxed">
          {insight.message}
        </p>
      </div>

      {/* Actions */}
      <div className="ml-8 mb-4 rounded-md bg-[var(--raised)] p-4">
        <h4 className="mb-2 text-sm font-medium text-[var(--text)]">What to do</h4>
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-[var(--gb-dark-gray)]">
          {insight.actions.map((action) => (
            <li key={`${insight.id}-${action}`}>{action}</li>
          ))}
        </ol>
      </div>

      {/* 3-state action bar */}
      {!isActioned && (
        <div className="ml-8 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onMarkDone(insight.id, dataHash)}
            className="btn btn-secondary"
          >
            <Check className="w-3.5 h-3.5" />
            Done
          </button>
          <button
            type="button"
            onClick={() => onSnooze(insight.id, dataHash, 7)}
            className="btn btn-secondary"
          >
            <BellOff className="w-3.5 h-3.5" />
            Snooze 7 days
          </button>
          <button
            type="button"
            onClick={() => onDismiss(insight.id, dataHash)}
            className="btn btn-tertiary"
          >
            <EyeOff className="w-3.5 h-3.5" />
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
