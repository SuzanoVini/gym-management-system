import { Clock, Target, TrendingDown, TrendingUp, UserMinus, UserPlus, Users } from 'lucide-react';
import InfoTip from '@/components/ui/InfoTip';
import type { computeCoreMetrics } from '@/lib/analytics/overviewMetrics';

// Period-over-period delta badge for a summary card. `goodDirection` flips
// the color (an increase in Cancellations is bad, not good).
function DeltaBadge({
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
    if (current === 0) {
      return null;
    }
    return (
      <span className="text-xs font-medium text-gray-500 ml-2" title="No prior-period data">
        new
      </span>
    );
  }

  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.5) {
    return <span className="text-xs font-medium text-gray-500 ml-2">flat</span>;
  }

  const isUp = pct > 0;
  const isGood = isUp === (goodDirection === 'up');
  const Icon = isUp ? TrendingUp : TrendingDown;

  return (
    <span
      className={`inline-flex items-center text-xs font-semibold ml-2 ${isGood ? 'text-green-600' : 'text-red-600'}`}
      title={`vs. previous period: ${previous}`}
    >
      <Icon className="w-3 h-3 mr-0.5" />
      {Math.abs(pct).toFixed(0)}%
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
  const conversionRate = current.conversionRate.toFixed(1);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <div className="section-container summary-card border-l-4 border-blue-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 flex items-center gap-1.5">
              Total Intros
              <InfoTip label="Intro classes booked in the selected range, whether or not the person showed up. Attendance is tracked separately in the funnel." />
            </p>
            <p className="text-3xl font-bold mt-1 flex items-baseline">
              {totalIntros}
              <DeltaBadge current={totalIntros} previous={previous?.totalIntros ?? null} />
            </p>
          </div>
          <Users className="summary-card-icon w-8 h-8 text-blue-600" />
        </div>
      </div>

      <div className="section-container summary-card border-l-4 border-green-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 flex items-center gap-1.5">
              Sign-ups
              <InfoTip label="New memberships started in the selected range, counted on the membership start date rather than when the record was entered." />
            </p>
            <p className="text-3xl font-bold mt-1 flex items-baseline">
              {totalSignups}
              <DeltaBadge current={totalSignups} previous={previous?.totalSignups ?? null} />
            </p>
          </div>
          <UserPlus className="summary-card-icon w-8 h-8 text-green-600" />
        </div>
      </div>

      <div className="section-container summary-card border-l-4 border-red-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 flex items-center gap-1.5">
              Cancellations
              <InfoTip label="Memberships cancelled in the selected range, counted on the cancellation date. A membership that simply lapsed without notice is not counted here — it shows as Expired on the roster instead." />
            </p>
            <p className="text-3xl font-bold mt-1 flex items-baseline">
              {totalCancellations}
              <DeltaBadge
                current={totalCancellations}
                previous={previous?.totalCancellations ?? null}
                goodDirection="down"
              />
            </p>
          </div>
          <UserMinus className="summary-card-icon w-8 h-8 text-red-600" />
        </div>
      </div>

      <NetGrowthCard netGrowth={netGrowth} previous={previous?.netGrowth ?? null} />

      <div className="section-container summary-card border-l-4 border-purple-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Conversion Rate</p>
            <p className="text-3xl font-bold mt-1 flex items-baseline">
              {conversionRate}%
              <DeltaBadge
                current={current.conversionRate}
                previous={previous?.conversionRate ?? null}
              />
            </p>
          </div>
          <Target className="summary-card-icon w-8 h-8 text-purple-600" />
        </div>
      </div>

      <div className="section-container summary-card border-l-4 border-yellow-600">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Active Holds</p>
            <p className="text-3xl font-bold mt-1">{activeHolds}</p>
          </div>
          <Clock className="summary-card-icon w-8 h-8 text-yellow-600" />
        </div>
      </div>
    </div>
  );
}

function NetGrowthCard({ netGrowth, previous }: { netGrowth: number; previous: number | null }) {
  return (
    <div
      className={`section-container summary-card border-l-4 ${netGrowth >= 0 ? 'border-green-600' : 'border-red-600'}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 flex items-center gap-1.5">
            Net Growth
            <InfoTip label="Signups minus cancellations for the selected range. Positive means the gym grew; negative means it shrank. Holds are not counted either way, since a paused member has not left." />
          </p>
          <p
            className={`text-3xl font-bold mt-1 flex items-baseline ${netGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            {netGrowth >= 0 ? '+' : ''}
            {netGrowth}
            <DeltaBadge current={netGrowth} previous={previous} />
          </p>
        </div>
        {netGrowth >= 0 ? (
          <TrendingUp className="summary-card-icon w-8 h-8 text-green-600" />
        ) : (
          <TrendingDown className="summary-card-icon w-8 h-8 text-red-600" />
        )}
      </div>
    </div>
  );
}
