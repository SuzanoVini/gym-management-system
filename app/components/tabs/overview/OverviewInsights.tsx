import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Target,
  TrendingDown,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import type { Insight } from '@/types';

const OverviewIcons = {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Target,
  TrendingDown,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
};

export default function OverviewInsights({ insights }: { insights: Insight[] }) {
  return (
    <>
      {insights.length > 0 && (
        <div className="section-container">
          <h2 className="text-lg font-semibold mb-4">Top insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight) => {
              const Icon =
                OverviewIcons[insight.icon as keyof typeof OverviewIcons] ??
                OverviewIcons.AlertCircle;
              return (
                <div
                  key={insight.id}
                  className="rounded-md border border-[var(--rule)] bg-[var(--raised)] p-4"
                >
                  <div className="flex items-start">
                    <Icon
                      className={`w-4 h-4 mr-3 mt-0.5 flex-shrink-0 ${insight.priority === 'critical' ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}
                    />
                    <div>
                      <h3 className="font-semibold text-sm">{insight.title}</h3>
                      <p className="text-sm text-[var(--gb-dark-gray)] mt-1 whitespace-pre-line">
                        {insight.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
