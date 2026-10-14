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
import type { Insight, InsightColor } from '@/types';

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

const insightStyles: Record<InsightColor, { card: string; icon: string }> = {
  red: { card: 'bg-red-50 border-red-500', icon: 'text-red-600' },
  orange: { card: 'bg-orange-50 border-orange-500', icon: 'text-orange-600' },
  yellow: { card: 'bg-yellow-50 border-yellow-500', icon: 'text-yellow-600' },
  green: { card: 'bg-green-50 border-green-500', icon: 'text-green-600' },
  blue: { card: 'bg-blue-50 border-blue-500', icon: 'text-blue-600' },
  purple: { card: 'bg-purple-50 border-purple-500', icon: 'text-purple-600' },
};

export default function OverviewInsights({ insights }: { insights: Insight[] }) {
  return (
    <>
      {insights.length > 0 && (
        <div className="section-container">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <OverviewIcons.AlertCircle className="w-6 h-6 mr-2" />
            Top Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight) => {
              const Icon =
                OverviewIcons[insight.icon as keyof typeof OverviewIcons] ??
                OverviewIcons.AlertCircle;
              const style = insightStyles[insight.color];
              return (
                <div
                  key={insight.id}
                  className={`insight-card p-4 rounded-lg border-l-4 ${style.card}`}
                >
                  <div className="flex items-start">
                    <Icon className={`w-5 h-5 mr-3 mt-0.5 ${style.icon}`} />
                    <div>
                      <h3 className="font-semibold text-sm">{insight.title}</h3>
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-line">
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
