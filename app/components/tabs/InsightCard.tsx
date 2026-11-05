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
  onMarkDone: (insightId: string) => void;
  onSnooze: (insightId: string, days?: number) => void;
  onDismiss: (insightId: string) => void;
}

export function InsightCard({ insight, onMarkDone, onSnooze, onDismiss }: InsightCardProps) {
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

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6">
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
            {insight.standard && (
              <p className="text-xs text-[var(--muted)] mt-0.5">Standard: {insight.standard}</p>
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
      <div className="ml-8 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onMarkDone(insight.id)} className="btn btn-secondary">
          <Check className="w-3.5 h-3.5" />
          Done
        </button>
        <button type="button" onClick={() => onSnooze(insight.id, 7)} className="btn btn-secondary">
          <BellOff className="w-3.5 h-3.5" />
          Snooze 7 days
        </button>
        <button type="button" onClick={() => onDismiss(insight.id)} className="btn btn-tertiary">
          <EyeOff className="w-3.5 h-3.5" />
          Dismiss
        </button>
      </div>
    </div>
  );
}
