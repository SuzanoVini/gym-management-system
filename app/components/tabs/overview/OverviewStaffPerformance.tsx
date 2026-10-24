import BarList from '@/components/ui/BarList';
import InfoTip from '@/components/ui/InfoTip';
import type { computeStaffPerformance } from '@/lib/analytics/overviewMetrics';

export default function OverviewStaffPerformance({
  staffPerformance,
}: {
  staffPerformance: ReturnType<typeof computeStaffPerformance>;
}) {
  // conversionRate arrives pre-formatted as a string ("60.0"); rank and draw from the number.
  const ranked = staffPerformance
    .map((s) => ({ ...s, rate: Number.parseFloat(String(s.conversionRate)) || 0 }))
    .sort((a, b) => b.rate - a.rate);
  return (
    <div className="section-container">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        Staff conversion
        <InfoTip label="For each coach, the share of their intro classes that turned into signups. Only intros marked as attended count, so a no-show does not drag a coach down." />
      </h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <BarList
          rows={ranked.map((s) => ({
            label: s.name,
            value: s.rate,
            display: `${s.rate.toFixed(1)}%`,
          }))}
          max={100}
        />
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Staff</th>
                <th className="num">Intros</th>
                <th className="num">Attended</th>
                <th className="num">Signed up</th>
                <th className="num">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((staff) => (
                <tr key={staff.name}>
                  <td className="font-medium">{staff.name}</td>
                  <td className="num">{staff.totalIntros}</td>
                  <td className="num">{staff.attended}</td>
                  <td className="num">{staff.signedUp}</td>
                  <td className="num">{staff.rate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
