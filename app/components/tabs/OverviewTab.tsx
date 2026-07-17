'use client';

import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Target,
  TrendingDown,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  type ComponentProps,
  type ComponentType,
  type ReactElement,
  useEffect,
  useState,
} from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { exportToCSV } from '@/lib/supabase/utils';
import { canonicalizeStaffName } from '@/lib/utils/canonicalizeStaffName';
import { isActiveHold } from '@/lib/utils/holds';
import { useSettingsStore } from '@/store/useSettingsStore';

const OverviewIcons = {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Target,
  TrendingDown,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

const insightStyles: Record<
  'red' | 'orange' | 'yellow' | 'green' | 'blue',
  { card: string; icon: string }
> = {
  red: { card: 'bg-red-50 border-red-500', icon: 'text-red-600' },
  orange: { card: 'bg-orange-50 border-orange-500', icon: 'text-orange-600' },
  yellow: { card: 'bg-yellow-50 border-yellow-500', icon: 'text-yellow-600' },
  green: { card: 'bg-green-50 border-green-500', icon: 'text-green-600' },
  blue: { card: 'bg-blue-50 border-blue-500', icon: 'text-blue-600' },
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Overview combines multiple analytics blocks.
export default function OverviewTab() {
  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');
  const [activeMembershipIndex, setActiveMembershipIndex] = useState<number | null>(null);
  const [activeReasonIndex, setActiveReasonIndex] = useState<number | null>(null);

  const { filteredData, previousPeriodData, loading, error, refresh } = useAnalyticsData({
    dateRange,
    customStartDate,
    customEndDate,
  });
  const staffMembers = useSettingsStore((s) => s.staffMembers);

  const handleApplyCustomDates = () => {
    setCustomStartDate(tempStartDate);
    setCustomEndDate(tempEndDate);
  };

  // Pie chart active shape renderer
  const renderActiveShape = (props: unknown) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props as {
      cx: number;
      cy: number;
      innerRadius: number;
      outerRadius: number;
      startAngle: number;
      endAngle: number;
      fill: string;
    };
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius * 1.08}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
          }}
        />
      </g>
    );
  };

  const PieWithActive = Pie as unknown as ComponentType<
    ComponentProps<typeof Pie> & {
      activeIndex?: number;
      activeShape?: (props: unknown) => ReactElement;
    }
  >;

  // Click outside handler to reset pie chart active states
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.recharts-pie')) {
        setActiveMembershipIndex(null);
        setActiveReasonIndex(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const { intros, signups, cancellations, holds } = filteredData;

  // Person-level matching (signups carry no email, so normalized name is the
  // key): a prospect with several intro rows counts once, and walk-in signups
  // that never attended an intro don't inflate the funnel past 100%
  const personName = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ');

  function computeCoreMetrics(data: {
    intros: typeof intros;
    signups: typeof signups;
    cancellations: typeof cancellations;
  }) {
    const attended = data.intros.filter((i) => i.attended === 'Yes').length;
    const attendedNames = new Set(
      data.intros.filter((i) => i.attended === 'Yes').map((i) => personName(i.name))
    );
    const signupsFromIntros = new Set(
      data.signups.map((s) => personName(s.name)).filter((n) => attendedNames.has(n))
    ).size;
    return {
      totalIntros: data.intros.length,
      attendedIntros: attended,
      totalSignups: data.signups.length,
      totalCancellations: data.cancellations.length,
      netGrowth: data.signups.length - data.cancellations.length,
      conversionRate: attended > 0 ? (signupsFromIntros / attended) * 100 : 0,
      signupsFromIntros,
    };
  }

  // Key Metrics
  const current = computeCoreMetrics({ intros, signups, cancellations });
  const {
    totalIntros,
    attendedIntros,
    totalSignups,
    totalCancellations,
    netGrowth,
    signupsFromIntros,
  } = current;
  const conversionRate = current.conversionRate.toFixed(1);
  const activeHolds = holds.filter((h) => isActiveHold(h)).length;

  // Period-over-period deltas vs the immediately preceding window of the same
  // length — null (hidden) when the date filter is "All Time", since there's
  // no bounded window to mirror
  const previous = previousPeriodData ? computeCoreMetrics(previousPeriodData) : null;

  // Monthly Trends — bucketed by month + year so "All Time" doesn't sum
  // Jan 2025 and Jan 2026 into one point
  const trendBuckets = new Map<
    number,
    { month: string; Intros: number; 'Sign-ups': number; Cancellations: number }
  >();
  const bumpTrend = (
    records: Array<{ month: string; year?: number; created_at?: string }>,
    field: 'Intros' | 'Sign-ups' | 'Cancellations'
  ) => {
    for (const r of records) {
      const monthIndex = MONTHS.indexOf(r.month);
      const year = r.year ?? (r.created_at ? new Date(r.created_at).getFullYear() : undefined);
      if (monthIndex === -1 || !year) {
        continue;
      }
      const sortKey = year * 12 + monthIndex;
      const bucket = trendBuckets.get(sortKey) ?? {
        month: `${r.month} ${year}`,
        Intros: 0,
        'Sign-ups': 0,
        Cancellations: 0,
      };
      bucket[field]++;
      trendBuckets.set(sortKey, bucket);
    }
  };
  bumpTrend(intros, 'Intros');
  bumpTrend(signups, 'Sign-ups');
  bumpTrend(cancellations, 'Cancellations');

  const monthlyData = [...trendBuckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, bucket]) => ({ ...bucket, 'Net Growth': bucket['Sign-ups'] - bucket.Cancellations }));

  // Conversion Funnel
  const funnelData = [
    {
      stage: 'Intros',
      count: totalIntros,
      percentage: 100,
      countLabel: `${totalIntros} (100%)`,
    },
    {
      stage: 'Attended',
      count: attendedIntros,
      percentage: totalIntros > 0 ? ((attendedIntros / totalIntros) * 100).toFixed(0) : 0,
      countLabel: `${attendedIntros} (${totalIntros > 0 ? ((attendedIntros / totalIntros) * 100).toFixed(0) : 0}%)`,
    },
    {
      stage: 'Signed Up',
      count: signupsFromIntros,
      percentage: attendedIntros > 0 ? ((signupsFromIntros / attendedIntros) * 100).toFixed(0) : 0,
      countLabel: `${signupsFromIntros} (${attendedIntros > 0 ? ((signupsFromIntros / attendedIntros) * 100).toFixed(0) : 0}%)`,
    },
  ];

  // Top Classes by Sign-ups — person-level match on the attended intro
  const classByPerson = new Map<string, string>();
  for (const intro of intros) {
    if (intro.attended === 'Yes' && intro.class) {
      classByPerson.set(personName(intro.name), intro.class);
    }
  }
  const classSignups = signups.reduce<Record<string, number>>((acc, signup) => {
    const introClass = classByPerson.get(personName(signup.name));
    if (introClass) {
      acc[introClass] = (acc[introClass] || 0) + 1;
    }
    return acc;
  }, {});

  const topClasses = Object.entries(classSignups)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Membership Type Breakdown
  const membershipData = signups.reduce<Record<string, number>>((acc, signup) => {
    acc[signup.membership] = (acc[signup.membership] || 0) + 1;
    return acc;
  }, {});

  const membershipChart = Object.entries(membershipData).map(([name, value]) => ({ name, value }));

  // Cancellation Reasons (case-insensitive)
  const cancellationReasons = cancellations.reduce<Record<string, number>>((acc, cancel) => {
    const normalizedReason = cancel.reason?.toLowerCase();
    if (!normalizedReason) {
      return acc;
    }
    acc[normalizedReason] = (acc[normalizedReason] || 0) + 1;
    return acc;
  }, {});

  const capitalizeWords = (str: string) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const reasonsChart = Object.entries(cancellationReasons)
    .map(([name, value]) => ({ name: capitalizeWords(name), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Staff Performance with ABSOLUTE NUMBERS + PERCENTAGES
  const staffStats = intros.reduce<
    Record<string, { total: number; attended: number; signedUp: number }>
  >((acc, intro) => {
    if (!intro.staff) {
      return acc;
    }

    // Safety net after the one-time data migration: bare first names from old
    // records aggregate under the same coach as full names
    const staffName = canonicalizeStaffName(intro.staff, staffMembers);
    if (!acc[staffName]) {
      acc[staffName] = {
        total: 0,
        attended: 0,
        signedUp: 0,
      };
    }

    const staffEntry = acc[staffName];
    if (staffEntry) {
      staffEntry.total++;
      if (intro.attended === 'Yes') {
        staffEntry.attended++;
        if (intro.signed_up === 'Yes') {
          staffEntry.signedUp++;
        }
      }
    }

    return acc;
  }, {});

  const staffPerformance = Object.entries(staffStats)
    .map(([name, stats]) => ({
      name,
      totalIntros: stats.total,
      attended: stats.attended,
      signedUp: stats.signedUp,
      conversionRate:
        stats.attended > 0 ? ((stats.signedUp / stats.attended) * 100).toFixed(1) : '0',
      label: `${stats.signedUp}/${stats.attended} (${stats.attended > 0 ? ((stats.signedUp / stats.attended) * 100).toFixed(1) : '0'}%)`,
    }))
    .sort((a, b) => parseFloat(b.conversionRate) - parseFloat(a.conversionRate));

  // ENHANCED: Smart Business Insights - Focus on Retention, Conversion, and Business Health
  const insights: Array<{
    icon: keyof typeof OverviewIcons;
    title: string;
    message: string;
    color: 'red' | 'orange' | 'yellow' | 'green' | 'blue';
  }> = [];

  // 1. Conversion Rate Analysis
  if (parseFloat(conversionRate) < 30 && attendedIntros > 10) {
    insights.push({
      icon: 'TrendingDown',
      title: 'Low Conversion Rate',
      message: `Your conversion rate is ${conversionRate}%. Review intro class quality, instructor engagement, and pricing strategy to improve conversions.`,
      color: 'red',
    });
  } else if (parseFloat(conversionRate) >= 50 && attendedIntros > 5) {
    insights.push({
      icon: 'CheckCircle',
      title: 'Excellent Conversion Rate',
      message: `Outstanding ${conversionRate}% conversion rate! Your intro program is highly effective. Consider scaling your marketing efforts.`,
      color: 'green',
    });
  }

  // 2. Retention & Growth Analysis
  if (netGrowth < 0) {
    const churnRate =
      totalSignups > 0 ? ((totalCancellations / totalSignups) * 100).toFixed(1) : '0';
    insights.push({
      icon: 'UserMinus',
      title: 'Negative Member Growth',
      message: `Net loss of ${Math.abs(netGrowth)} members (${churnRate}% churn rate). Priority: improve retention programs and address cancellation reasons.`,
      color: 'red',
    });
  } else if (netGrowth > 10) {
    insights.push({
      icon: 'TrendingUp',
      title: 'Strong Growth Trajectory',
      message: `Net gain of ${netGrowth} members! Maintain this momentum with consistent intro quality and member engagement.`,
      color: 'green',
    });
  }

  // 3. Cancellation Reason Analysis
  const cancellationReasonsForInsights = cancellations.reduce<Record<string, number>>(
    (acc, cancel) => {
      if (cancel.reason) {
        acc[cancel.reason] = (acc[cancel.reason] || 0) + 1;
      }
      return acc;
    },
    {}
  );

  const topCancellationReason = Object.entries(cancellationReasonsForInsights).sort(
    (a, b) => b[1] - a[1]
  )[0];

  if (topCancellationReason && (topCancellationReason[1] as number) > 3) {
    const [reason, count] = topCancellationReason;
    let actionableAdvice = '';

    if (reason.toLowerCase().includes('time')) {
      actionableAdvice =
        'Consider offering more flexible class schedules or virtual training options.';
    } else if (
      reason.toLowerCase().includes('financial') ||
      reason.toLowerCase().includes('money')
    ) {
      actionableAdvice =
        'Review pricing tiers and consider introducing budget-friendly membership options or payment plans.';
    } else if (
      reason.toLowerCase().includes('injury') ||
      reason.toLowerCase().includes('medical')
    ) {
      actionableAdvice =
        'Emphasize injury prevention training and consider specialized classes for recovery.';
    } else if (reason.toLowerCase().includes('moving')) {
      actionableAdvice =
        'Offer temporary holds for relocations and promote your gym network if applicable.';
    } else {
      actionableAdvice = 'Schedule exit interviews to better understand this cancellation pattern.';
    }

    insights.push({
      icon: 'AlertCircle',
      title: `Top Cancellation: ${reason}`,
      message: `${count} cancellations due to "${reason}". ${actionableAdvice}`,
      color: 'orange',
    });
  }

  // 4. Hold Rate Analysis
  const holdRate = totalSignups > 0 ? (activeHolds / totalSignups) * 100 : 0;
  if (holdRate > 15) {
    insights.push({
      icon: 'Clock',
      title: 'High Hold Rate Alert',
      message: `${activeHolds} members on hold (${holdRate.toFixed(0)}% of active base). Implement re-engagement campaigns to bring them back.`,
      color: 'yellow',
    });
  }

  // 5. Seasonal Hold Patterns
  const holdsByMonth = holds.reduce<Record<string, number>>((acc, hold) => {
    if (hold.month) {
      acc[hold.month] = (acc[hold.month] || 0) + 1;
    }
    return acc;
  }, {});

  const peakHoldMonth = Object.entries(holdsByMonth).sort((a, b) => b[1] - a[1])[0];

  if (peakHoldMonth && (peakHoldMonth[1] as number) > 5) {
    insights.push({
      icon: 'Calendar',
      title: 'Seasonal Hold Pattern Detected',
      message: `${peakHoldMonth[1]} holds in ${peakHoldMonth[0]}. Plan promotions or special events during this period to minimize seasonal drops.`,
      color: 'blue',
    });
  }

  // 6. Conversion Opportunity (but only for active, uncontacted intros)
  const attendedNotSigned = intros.filter(
    (i) =>
      i.attended === 'Yes' &&
      i.signed_up !== 'Yes' &&
      i.status !== 'Completed' &&
      i.status !== 'Cancelled'
  ).length;

  if (attendedNotSigned > 5) {
    insights.push({
      icon: 'Target',
      title: 'Conversion Opportunity',
      message: `${attendedNotSigned} active prospects attended but haven't signed up. Focus conversion efforts here for quick wins.`,
      color: 'blue',
    });
  }

  // Export functionality
  const handleExportAllData = () => {
    const exportData = {
      intros: intros.map((i) => ({
        name: i.name,
        month: i.month,
        class: i.class,
        staff: i.staff,
        attended: i.attended,
        signed_up: i.signed_up,
        date: i.created_at,
      })),
      signups: signups.map((s) => ({
        name: s.name,
        month: s.month,
        membership: s.membership,
        date: s.membership_date,
      })),
      cancellations: cancellations.map((c) => ({
        name: c.name,
        month: c.month,
        reason: c.reason,
        date: c.date,
      })),
      holds: holds.map((h) => ({
        name: h.name,
        month: h.month,
        reason: h.reason,
        start: h.start,
        end: h.end,
      })),
    };

    // Export each dataset
    exportToCSV(exportData.intros, 'intros');
    exportToCSV(exportData.signups, 'signups');
    exportToCSV(exportData.cancellations, 'cancellations');
    exportToCSV(exportData.holds, 'holds');

    alert('✅ All data exported successfully! Check your downloads folder.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error: {error.message}</div>
        <button type="button" onClick={refresh} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter Section */}
      <div className="section-container">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <OverviewIcons.Calendar className="w-5 h-5 mr-2" />
            Date Range Filter
          </h2>
          <button
            type="button"
            onClick={handleExportAllData}
            className="btn btn-primary bg-green-600 hover:bg-green-700"
          >
            <OverviewIcons.Download className="w-4 h-4" />
            Export All Data
          </button>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {[
            { value: 'all', label: 'All Time' },
            { value: '1month', label: 'Last Month' },
            { value: '3months', label: 'Last 3 Months' },
            { value: '6months', label: 'Last 6 Months' },
            { value: 'year', label: 'Last Year' },
            { value: 'ytd', label: 'Year to Date' },
            { value: 'custom', label: 'Custom Range' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setDateRange(option.value)}
              className={`btn ${
                dateRange === option.value
                  ? 'btn-primary'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Custom Date Range Inputs */}
        {dateRange === 'custom' && (
          <div className="mt-4 section-nested border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">Select Custom Date Range:</p>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="form-label" htmlFor="overview-start-date">
                  Start Date
                </label>
                <input
                  id="overview-start-date"
                  type="date"
                  value={tempStartDate}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="form-label" htmlFor="overview-end-date">
                  End Date
                </label>
                <input
                  id="overview-end-date"
                  type="date"
                  value={tempEndDate}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  className="form-input"
                />
              </div>
              <button type="button" onClick={handleApplyCustomDates} className="btn btn-primary">
                Apply Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="section-container summary-card border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Intros</p>
              <p className="text-3xl font-bold mt-1 flex items-baseline">
                {totalIntros}
                <DeltaBadge current={totalIntros} previous={previous?.totalIntros ?? null} />
              </p>
            </div>
            <OverviewIcons.Users className="summary-card-icon w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="section-container summary-card border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sign-ups</p>
              <p className="text-3xl font-bold mt-1 flex items-baseline">
                {totalSignups}
                <DeltaBadge current={totalSignups} previous={previous?.totalSignups ?? null} />
              </p>
            </div>
            <OverviewIcons.UserPlus className="summary-card-icon w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="section-container summary-card border-l-4 border-red-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cancellations</p>
              <p className="text-3xl font-bold mt-1 flex items-baseline">
                {totalCancellations}
                <DeltaBadge
                  current={totalCancellations}
                  previous={previous?.totalCancellations ?? null}
                  goodDirection="down"
                />
              </p>
            </div>
            <OverviewIcons.UserMinus className="summary-card-icon w-8 h-8 text-red-600" />
          </div>
        </div>

        <div
          className={`section-container summary-card border-l-4 ${netGrowth >= 0 ? 'border-green-600' : 'border-red-600'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Net Growth</p>
              <p
                className={`text-3xl font-bold mt-1 flex items-baseline ${netGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {netGrowth >= 0 ? '+' : ''}
                {netGrowth}
                <DeltaBadge current={netGrowth} previous={previous?.netGrowth ?? null} />
              </p>
            </div>
            {netGrowth >= 0 ? (
              <OverviewIcons.TrendingUp className="summary-card-icon w-8 h-8 text-green-600" />
            ) : (
              <OverviewIcons.TrendingDown className="summary-card-icon w-8 h-8 text-red-600" />
            )}
          </div>
        </div>

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
            <OverviewIcons.Target className="summary-card-icon w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="section-container summary-card border-l-4 border-yellow-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Holds</p>
              <p className="text-3xl font-bold mt-1">{activeHolds}</p>
            </div>
            <OverviewIcons.Clock className="summary-card-icon w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <div className="section-container">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <OverviewIcons.AlertCircle className="w-6 h-6 mr-2" />
            Smart Insights & Recommendations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight) => {
              const Icon = OverviewIcons[insight.icon as keyof typeof OverviewIcons];
              const style = insightStyles[insight.color];
              return (
                <div
                  key={`${insight.title}-${insight.color}`}
                  className={`insight-card p-4 rounded-lg border-l-4 ${style.card}`}
                >
                  <div className="flex items-start">
                    <Icon className={`w-5 h-5 mr-3 mt-0.5 ${style.icon}`} />
                    <div>
                      <h3 className="font-semibold text-sm">{insight.title}</h3>
                      <p className="text-sm text-gray-700 mt-1">{insight.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly Trends */}
      <div className="section-container">
        <h2 className="text-xl font-bold mb-4">Monthly Trends</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="Intros"
              stroke="#3b82f6"
              strokeWidth={2}
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-in-out"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="Sign-ups"
              stroke="#10b981"
              strokeWidth={2}
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-in-out"
              animationBegin={200}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="Cancellations"
              stroke="#ef4444"
              strokeWidth={2}
              isAnimationActive={true}
              animationDuration={1000}
              animationEasing="ease-in-out"
              animationBegin={400}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="section-container">
          <h2 className="text-xl font-bold mb-4">Conversion Funnel</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="stage" type="category" width={100} />
              <Tooltip />
              <Bar
                dataKey="count"
                fill="#3b82f6"
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-out"
              >
                <LabelList dataKey="countLabel" position="right" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Classes */}
        <div className="section-container">
          <h2 className="text-xl font-bold mb-4">Top Classes by Sign-ups</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topClasses}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="count"
                fill="#10b981"
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Membership Breakdown */}
        <div className="section-container">
          <h2 className="text-xl font-bold mb-4">Membership Types</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <PieWithActive
                data={membershipChart}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
                activeShape={renderActiveShape}
                {...(activeMembershipIndex !== null ? { activeIndex: activeMembershipIndex } : {})}
                onMouseEnter={(_, index) => setActiveMembershipIndex(index)}
                onMouseLeave={() => setActiveMembershipIndex(null)}
                onClick={(_, index) => {
                  setActiveMembershipIndex(index);
                }}
              >
                {membershipChart.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </PieWithActive>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Cancellation Reasons */}
        <div className="section-container">
          <h2 className="text-xl font-bold mb-4">Top Cancellation Reasons</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <PieWithActive
                data={reasonsChart}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label
                activeShape={renderActiveShape}
                {...(activeReasonIndex !== null ? { activeIndex: activeReasonIndex } : {})}
                onMouseEnter={(_, index) => setActiveReasonIndex(index)}
                onMouseLeave={() => setActiveReasonIndex(null)}
                onClick={(_, index) => {
                  setActiveReasonIndex(index);
                }}
              >
                {reasonsChart.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </PieWithActive>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Staff Performance with Absolute Numbers + Percentages */}
      <div className="section-container">
        <h2 className="text-xl font-bold mb-4">Staff Performance (Conversion Rates)</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={staffPerformance}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'Conversion Rate (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(_value, _name, props) => {
                const data = props.payload;
                return [`${data.label}`, 'Conversion'];
              }}
            />
            <Bar
              dataKey="conversionRate"
              fill="#8b5cf6"
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-out"
            >
              <LabelList
                dataKey="label"
                position="top"
                style={{ fontSize: '12px', fill: '#6b7280' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Staff Performance Table */}
        <div className="mt-6 overflow-x-auto section-nested">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Staff
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Intros
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Attended
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Signed Up
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Conversion Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {staffPerformance.map((staff) => (
                <tr key={staff.name}>
                  <td className="px-4 py-2 font-medium">{staff.name}</td>
                  <td className="px-4 py-2">{staff.totalIntros}</td>
                  <td className="px-4 py-2">{staff.attended}</td>
                  <td className="px-4 py-2">{staff.signedUp}</td>
                  <td className="px-4 py-2">
                    <span className="font-semibold text-purple-600">{staff.label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
