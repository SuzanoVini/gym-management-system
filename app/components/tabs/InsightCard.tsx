'use client';

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BellOff,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  DollarSign,
  DollarSign as DollarSignIcon,
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

  const bgColor = {
    red: 'bg-red-50',
    orange: 'bg-orange-50',
    yellow: 'bg-yellow-50',
    green: 'bg-green-50',
    blue: 'bg-blue-50',
    purple: 'bg-purple-50',
  }[insight.color];

  const borderColor = {
    red: 'border-red-500',
    orange: 'border-orange-500',
    yellow: 'border-yellow-500',
    green: 'border-green-500',
    blue: 'border-blue-500',
    purple: 'border-purple-500',
  }[insight.color];

  const iconColor = {
    red: 'text-red-600',
    orange: 'text-orange-600',
    yellow: 'text-yellow-600',
    green: 'text-green-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
  }[insight.color];

  const priorityBadge = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-gray-100 text-gray-800 border-gray-300',
  }[insight.priority];

  const isDone = dismissedRecord?.action === 'done';
  const isSnoozed = dismissedRecord?.action === 'snoozed';
  const isDismissed = dismissedRecord?.action === 'dismissed';
  const isActioned = isDone || isSnoozed || isDismissed;

  if (isActioned && !showDismissed) {
    return null;
  }

  return (
    <div
      className={`${bgColor} rounded-lg border-l-4 ${borderColor} p-6 shadow-sm hover:shadow-md transition-shadow ${isActioned ? 'opacity-50' : ''}`}
    >
      {/* Dismissed/snoozed banner */}
      {isActioned && (
        <div className="flex items-center justify-between mb-3 px-3 py-2 bg-gray-100 rounded-lg text-xs text-gray-500">
          <span>
            {isDone && '✓ Marked as done'}
            {isSnoozed &&
              dismissedRecord?.snoozed_until &&
              `Snoozed until ${new Date(dismissedRecord.snoozed_until).toLocaleDateString()}`}
            {isDismissed && 'Dismissed'}
          </span>
          <button
            type="button"
            onClick={() => onRestore(insight.id)}
            className="text-blue-600 hover:underline font-medium"
          >
            Undo
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start flex-1">
          <Icon className={`w-6 h-6 ${iconColor} mr-3 mt-1 flex-shrink-0`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900">{insight.title}</h3>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded border ${priorityBadge} uppercase`}
              >
                {insight.priority}
              </span>
            </div>
            {insight.impact && (
              <div className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm font-semibold text-gray-700 border border-gray-200 mb-2">
                <DollarSignIcon className="w-4 h-4" />
                {insight.impact}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message */}
      <div className="ml-9 mb-4">
        <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
          {insight.message}
        </p>
      </div>

      {/* Actions */}
      <div className="ml-9 bg-white bg-opacity-50 rounded-lg p-4 border border-gray-200 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <ArrowRight className="w-4 h-4 text-gray-600" />
          <h4 className="font-semibold text-sm text-gray-900">Action Steps:</h4>
        </div>
        <ul className="space-y-2">
          {insight.actions.map((action, idx) => (
            <li
              key={`${insight.id}-${action}`}
              className="flex items-start gap-2 text-sm text-gray-700"
            >
              <span className="text-[--gb-red] font-bold mt-0.5">{idx + 1}.</span>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 3-state action bar */}
      {!isActioned && (
        <div className="ml-9 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onMarkDone(insight.id, dataHash)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Done
          </button>
          <button
            type="button"
            onClick={() => onSnooze(insight.id, dataHash, 7)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200 transition-colors"
          >
            <BellOff className="w-3.5 h-3.5" />
            Snooze 7d
          </button>
          <button
            type="button"
            onClick={() => onDismiss(insight.id, dataHash)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200 transition-colors"
          >
            <EyeOff className="w-3.5 h-3.5" />
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
