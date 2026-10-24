import KpiStrip from '@/components/ui/KpiStrip';
import type { computeCoreMetrics } from '@/lib/analytics/overviewMetrics';

// Period-over-period change written as a phrase with its baseline. `goodDirection` decides the
// colour: only a change in the bad direction is red; a good or flat change stays grey.
function Delta({
  current,
  previous,
  goodDirection = 'up',
}: {
  current: number;
  previous: number | null;
  goodDirection?: 'up' | 'down';
}) {
  if (previous === null) {
    return null;
  }
  if (previous === 0) {
    return current === 0 ? null : <span title="No prior-period data">new this period</span>;
  }
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) {
    return <span>flat vs previous period</span>;
  }
  const isUp = pct > 0;
  const isBad = isUp !== (goodDirection === 'up');
  return (
    <span
      className={isBad ? 'text-[var(--negative)]' : undefined}
      title={`Previous period: ${previous}`}
    >
      {isUp ? '+' : '−'}
      {Math.abs(pct).toFixed(0)}% vs previous period
    </span>
  );
}

export default function OverviewSummaryCards({
  current,
  previous,
  activeHolds,
}: {
  current: ReturnType<typeof computeCoreMetrics>;
  previous: ReturnType<typeof computeCoreMetrics> | null;
  activeHolds: number;
}) {
  const { totalIntros, totalSignups, totalCancellations, netGrowth } = current;
  return (
    <KpiStrip
      items={[
        {
          label: 'Intros',
          value: totalIntros,
          caption: <Delta current={totalIntros} previous={previous?.totalIntros ?? null} />,
          info: 'Intro classes booked in the selected range, whether or not the person showed up. Attendance is tracked separately in the funnel.',
        },
        {
          label: 'Sign-ups',
          value: totalSignups,
          caption: <Delta current={totalSignups} previous={previous?.totalSignups ?? null} />,
          info: 'All new memberships started in the selected range, including people who never booked an intro. The funnel below counts only sign-ups that followed an attended intro.',
        },
        {
          label: 'Cancellations',
          value: totalCancellations,
          caption: (
            <Delta
              current={totalCancellations}
              previous={previous?.totalCancellations ?? null}
              goodDirection="down"
            />
          ),
          info: 'Memberships cancelled in the selected range, counted on the cancellation date. A membership that simply lapsed without notice is not counted here; it shows as Expired on the roster instead.',
        },
        {
          label: 'Net growth',
          value: netGrowth > 0 ? `+${netGrowth}` : netGrowth,
          tone: netGrowth < 0 ? 'negative' : 'default',
          caption: 'sign-ups minus cancellations',
          info: 'Signups minus cancellations for the selected range. Positive means the gym grew; negative means it shrank. Holds are not counted either way, since a paused member has not left.',
        },
        {
          label: 'Intro conversion',
          value: `${current.conversionRate.toFixed(1)}%`,
          caption: 'of attended intros signed up',
        },
        { label: 'Active holds', value: activeHolds, caption: 'today' },
      ]}
    />
  );
}
