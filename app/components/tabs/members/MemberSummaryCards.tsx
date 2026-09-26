import InfoTip from '@/components/ui/InfoTip';

export default function MemberSummaryCards({
  activeCount,
  netGrowth,
  onHoldCount,
  retentionRate,
}: {
  activeCount: number;
  netGrowth: number;
  onHoldCount: number;
  retentionRate: number;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="section-container border-l-4 border-red-600">
        <div className="text-sm text-gray-600 flex items-center gap-1.5">
          Active Members
          <InfoTip label="Members currently training. Anyone on hold, cancelled, or whose membership expired is excluded, so this is who is actually on the mats." />
        </div>
        <div className="text-3xl font-bold mt-1 text-red-600">{activeCount}</div>
      </div>
      <div className="section-container border-l-4 border-green-600">
        <div className="text-sm text-gray-600 flex items-center gap-1.5">
          Net This Month
          <InfoTip label="Signups minus cancellations for the current calendar month. It measures direction of travel this month, not overall size." />
        </div>
        <div className="text-3xl font-bold mt-1 text-green-600">
          {netGrowth >= 0 ? `+${netGrowth}` : netGrowth}
        </div>
      </div>
      <div className="section-container border-l-4 border-orange-600">
        <div className="text-sm text-gray-600 flex items-center gap-1.5">
          On Hold
          <InfoTip label="Members with a hold that covers today. They still count as members and are expected back, so they are not part of the active count." />
        </div>
        <div className="text-3xl font-bold mt-1 text-orange-600">{onHoldCount}</div>
      </div>
      <div className="section-container border-l-4 border-blue-600">
        <div className="text-sm text-gray-600 flex items-center gap-1.5">
          Retention Rate
          <InfoTip label="The share of active members who did not cancel this month, calculated as 1 minus this month's cancellations over active members. It is a single-month snapshot, not a rolling or annualised figure." />
        </div>
        <div className="text-3xl font-bold mt-1 text-blue-600">{retentionRate.toFixed(1)}%</div>
      </div>
    </div>
  );
}
