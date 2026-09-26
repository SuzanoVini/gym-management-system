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
import type { computeStaffPerformance } from '@/lib/analytics/overviewMetrics';

export default function OverviewStaffPerformance({
  staffPerformance,
}: {
  staffPerformance: ReturnType<typeof computeStaffPerformance>;
}) {
  return (
    <div className="section-container">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        Staff Performance (Conversion Rates)
        <InfoTip label="For each coach, the share of their intro classes that turned into signups. Only intros marked as attended count, so a no-show does not drag a coach down." />
      </h2>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={staffPerformance}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis label={{ value: 'Conversion Rate (%)', angle: -90, position: 'insideLeft' }} />
          <Tooltip
            formatter={(_value, _name, props) => {
              const data = props.payload;
              return [`${data.label}`, 'Conversion'];
            }}
          />
          <Bar
            dataKey="conversionRate"
            fill="#8b5cf6"
            isAnimationActive={true}
            animationDuration={600}
            animationEasing="ease-out"
          >
            <LabelList
              dataKey="label"
              position="top"
              style={{ fontSize: '12px', fill: '#6b7280' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Staff Performance Table */}
      <div className="mt-6 overflow-x-auto section-nested">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Staff
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Total Intros
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Attended
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Signed Up
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Conversion Rate
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {staffPerformance.map((staff) => (
              <tr key={staff.name}>
                <td className="px-4 py-2 font-medium">{staff.name}</td>
                <td className="px-4 py-2">{staff.totalIntros}</td>
                <td className="px-4 py-2">{staff.attended}</td>
                <td className="px-4 py-2">{staff.signedUp}</td>
                <td className="px-4 py-2">
                  <span className="font-semibold text-purple-600">{staff.label}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
