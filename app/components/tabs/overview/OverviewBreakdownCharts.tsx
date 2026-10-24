import BarList from '@/components/ui/BarList';
import InfoTip from '@/components/ui/InfoTip';

const byValue = (rows: { name: string; value: number }[]) => {
  const total = rows.reduce((sum, r) => sum + r.value, 0);
  return [...rows]
    .sort((a, b) => b.value - a.value)
    .map((r) => ({
      label: r.name,
      value: r.value,
      display: `${r.value} (${total > 0 ? Math.round((r.value / total) * 100) : 0}%)`,
    }));
};

// Shares as sorted bar lists instead of pies: the order and the figures read at a glance.
export default function OverviewBreakdownCharts({
  membershipChart,
  reasonsChart,
}: {
  membershipChart: { name: string; value: number }[];
  reasonsChart: { name: string; value: number }[];
}) {
  return (
    <>
      <div className="section-container">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          Membership types
          <InfoTip label="The plan each active member is currently on, taken from the last roster import. Alumni and expired memberships are excluded, so this reflects who is training now." />
        </h2>
        <BarList rows={byValue(membershipChart)} />
      </div>

      <div className="section-container">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          Top cancellation reasons
          <InfoTip label="The reason recorded on each cancellation in the selected range. Cancellations logged without a reason are grouped as unspecified rather than dropped." />
        </h2>
        <BarList rows={byValue(reasonsChart)} labelWidth="w-36" />
      </div>
    </>
  );
}
