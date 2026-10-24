import KpiStrip from '@/components/ui/KpiStrip';

interface HoldsSummaryProps {
  total: number;
  active: number;
  upcoming: number;
  ended: number;
}

export default function HoldsSummary({ total, active, upcoming, ended }: HoldsSummaryProps) {
  return (
    <KpiStrip
      items={[
        { label: 'Total holds', value: total },
        { label: 'Active', value: active },
        { label: 'Upcoming', value: upcoming },
        { label: 'Ended', value: ended },
      ]}
    />
  );
}
