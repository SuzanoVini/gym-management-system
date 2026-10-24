import KpiStrip from '@/components/ui/KpiStrip';
import type { useIntroListView } from '@/hooks/useIntroListView';

export default function IntroMetrics({
  metrics,
}: {
  metrics: ReturnType<typeof useIntroListView>['metrics'];
}) {
  return (
    <KpiStrip
      items={[
        { label: 'Total intros', value: metrics.total },
        { label: 'Attended', value: metrics.attended },
        { label: 'Signed up', value: metrics.signedUp },
      ]}
    />
  );
}
