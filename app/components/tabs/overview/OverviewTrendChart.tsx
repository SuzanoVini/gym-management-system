import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import InfoTip from '@/components/ui/InfoTip';
import type { computeMonthlyTrends } from '@/lib/analytics/overviewMetrics';

export default function OverviewTrendChart({
  monthlyData,
}: {
  monthlyData: ReturnType<typeof computeMonthlyTrends>;
}) {
  return (
    <div className="section-container">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        Monthly Trends
        <InfoTip label="Counts intros, signups and cancellations per month over the selected range. Each person is counted in the month their record is dated, so a signup logged late lands in the month it happened, not the month it was entered." />
      </h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={monthlyData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="Intros"
            stroke="#3b82f6"
            strokeWidth={2}
            isAnimationActive={true}
            animationDuration={1000}
            animationEasing="ease-in-out"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="Sign-ups"
            stroke="#10b981"
            strokeWidth={2}
            isAnimationActive={true}
            animationDuration={1000}
            animationEasing="ease-in-out"
            animationBegin={200}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="Cancellations"
            stroke="#ef4444"
            strokeWidth={2}
            isAnimationActive={true}
            animationDuration={1000}
            animationEasing="ease-in-out"
            animationBegin={400}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
