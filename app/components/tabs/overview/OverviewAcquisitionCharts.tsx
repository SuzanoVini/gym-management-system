import BarList from '@/components/ui/BarList';
import InfoTip from '@/components/ui/InfoTip';
import type { computeFunnelData, computeTopClasses } from '@/lib/analytics/overviewMetrics';

export default function OverviewAcquisitionCharts({
  funnelData,
  topClasses,
}: {
  funnelData: ReturnType<typeof computeFunnelData>;
  topClasses: ReturnType<typeof computeTopClasses>;
}) {
  const lastStage = funnelData.length - 1;
  return (
    <>
      <div className="section-container">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          Conversion funnel
          <InfoTip label="Follows people through the journey: intros booked, how many attended, and how many then signed up. The percentage at each step is of the step above it, not of the original total." />
        </h2>
        {/* The last stage is the one the screen is about, so it alone takes the red. */}
        <BarList
          rows={funnelData.map((stage, idx) => ({
            label: stage.stage,
            value: stage.count,
            display: String(stage.countLabel ?? stage.count),
            emphasis: idx === lastStage,
          }))}
          labelWidth="w-40"
        />
        <p className="mt-3 text-xs text-[var(--muted)]">Each percentage is of the step above.</p>
      </div>

      <div className="section-container">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          Top classes by sign-ups
          <InfoTip label="Which class a member first attended as an intro before they signed up. It credits the class that brought them in, not every class they have taken since." />
        </h2>
        <BarList
          rows={[...topClasses]
            .sort((a, b) => b.count - a.count)
            .map((c) => ({ label: c.name, value: c.count }))}
          labelWidth="w-36"
        />
      </div>
    </>
  );
}
