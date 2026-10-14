import type { useIntroListView } from '@/hooks/useIntroListView';

export default function IntroMetrics({
  metrics,
}: {
  metrics: ReturnType<typeof useIntroListView>['metrics'];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="section-container border-l-4 border-blue-600">
        <div className="text-sm text-gray-600">Total Intros</div>
        <div className="text-3xl font-bold mt-1">{metrics.total}</div>
      </div>
      <div className="section-container border-l-4 border-green-600">
        <div className="text-sm text-gray-600">Attended</div>
        <div className="text-3xl font-bold mt-1">{metrics.attended}</div>
      </div>
      <div className="section-container border-l-4 border-purple-600">
        <div className="text-sm text-gray-600">Signed Up</div>
        <div className="text-3xl font-bold mt-1">{metrics.signedUp}</div>
      </div>
    </div>
  );
}
