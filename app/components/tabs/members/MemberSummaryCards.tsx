import KpiStrip from '@/components/ui/KpiStrip';

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
    <KpiStrip
      items={[
        {
          label: 'Active members',
          value: activeCount,
          info: 'Members currently training. Anyone on hold, cancelled, or whose membership expired is excluded, so this is who is actually on the mats.',
        },
        {
          label: 'Net this month',
          value: netGrowth > 0 ? `+${netGrowth}` : netGrowth,
          tone: netGrowth < 0 ? 'negative' : 'default',
          caption: 'sign-ups minus cancellations',
          info: 'Signups minus cancellations for the current calendar month. It measures direction of travel this month, not overall size.',
        },
        {
          label: 'On hold',
          value: onHoldCount,
          info: 'Members with a hold that covers today. They still count as members and are expected back, so they are not part of the active count.',
        },
        {
          label: 'Retention rate',
          value: `${retentionRate.toFixed(1)}%`,
          caption: 'this month',
          info: "The share of active members who did not cancel this month, calculated as 1 minus this month's cancellations over active members. It is a single-month snapshot, not a rolling or annualised figure.",
        },
      ]}
    />
  );
}
