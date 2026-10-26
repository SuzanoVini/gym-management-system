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

// Sign-ups are the series the screen is about, so they carry the red; intros are context in GB
// navy and cancellations a dashed light grey. Straight lines, no markers, faint gridlines.
const AXIS = { fontSize: 12, fill: '#5d6675' };

export default function OverviewTrendChart({
  monthlyData,
}: {
  monthlyData: ReturnType<typeof computeMonthlyTrends>;
}) {
  return (
    <div className="section-container">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        Monthly trends
        <InfoTip label="Counts intros, signups and cancellations per month over the selected range. Each person is counted in the month their record is dated, so a signup logged late lands in the month it happened, not the month it was entered." />
      </h2>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={monthlyData} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke="#edf0f5" />
          <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={{ stroke: '#e2e7ee' }} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: '#5d6675' }} />
          <Line type="linear" dataKey="Sign-ups" stroke="#dc2626" strokeWidth={2} dot={false} />
          <Line type="linear" dataKey="Intros" stroke="#1e3a8a" strokeWidth={2} dot={false} />
          <Line
            type="linear"
            dataKey="Cancellations"
            stroke="#a3acba"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
