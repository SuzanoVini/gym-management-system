import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import InfoTip from '@/components/ui/InfoTip';
import type { computeFunnelData, computeTopClasses } from '@/lib/analytics/overviewMetrics';

export default function OverviewAcquisitionCharts({
  funnelData,
  topClasses,
}: {
  funnelData: ReturnType<typeof computeFunnelData>;
  topClasses: ReturnType<typeof computeTopClasses>;
}) {
  return (
    <>
      {/* Conversion Funnel */}
      <div className="section-container">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          Conversion Funnel
          <InfoTip label="Follows people through the journey: intros booked, how many attended, and how many then signed up. The percentage at each step is of the step above it, not of the original total." />
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={funnelData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="stage" type="category" width={100} />
            <Tooltip />
            <Bar
              dataKey="count"
              fill="#3b82f6"
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-out"
            >
              <LabelList dataKey="countLabel" position="right" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Classes */}
      <div className="section-container">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          Top Classes by Sign-ups
          <InfoTip label="Which class a member first attended as an intro before they signed up. It credits the class that brought them in, not every class they have taken since." />
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topClasses}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <Tooltip />
            <Bar
              dataKey="count"
              fill="#10b981"
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
