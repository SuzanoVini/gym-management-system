'use client';

import { useEffect, useState } from 'react';
import DateRangeFilter, { type DateRangeOption } from '@/components/ui/DateRangeFilter';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import type { FollowUpRow } from '@/hooks/useFollowUps';
import { useInsights } from '@/hooks/useInsights';
import { useRevenueSetting } from '@/hooks/useRevenueSetting';
import { exportOverviewData } from '@/lib/analytics/exportOverviewData';
import {
  computeCoreMetrics,
  computeFunnelData,
  computeMembershipChart,
  computeMonthlyTrends,
  computeReasonsChart,
  computeStaffPerformance,
  computeTopClasses,
} from '@/lib/analytics/overviewMetrics';
import { isActiveHold } from '@/lib/utils/holds';
import { useFilterStore } from '@/store/useFilterStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import SettingsModal from './modals/SettingsModal';
import OverviewAcquisitionCharts from './overview/OverviewAcquisitionCharts';
import OverviewBreakdownCharts from './overview/OverviewBreakdownCharts';
import OverviewInsights from './overview/OverviewInsights';
import OverviewStaffPerformance from './overview/OverviewStaffPerformance';
import OverviewSummaryCards from './overview/OverviewSummaryCards';
import OverviewTitle from './overview/OverviewTitle';
import OverviewTrendChart from './overview/OverviewTrendChart';
import TodayOnTheMats from './overview/TodayOnTheMats';

const OVERVIEW_DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { value: 'all', label: 'All time' },
  { value: '1month', label: 'Last month' },
  { value: '3months', label: 'Last 3 months' },
  { value: '6months', label: 'Last 6 months' },
  { value: 'year', label: 'Last year' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'custom', label: 'Custom' },
];

function useOverviewDateRange() {
  const [dateRange, setDateRange] = useState('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const overviewDateRange = useFilterStore((s) => s.overviewDateRange);
  const prefsHydrated = useFilterStore((s) => s.hydrated);
  const [rangeInitialised, setRangeInitialised] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');

  useEffect(() => {
    if (prefsHydrated && !rangeInitialised) {
      setDateRange(overviewDateRange);
      setRangeInitialised(true);
    }
  }, [prefsHydrated, overviewDateRange, rangeInitialised]);

  return {
    dateRange,
    setDateRange,
    settingsOpen,
    setSettingsOpen,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    tempStartDate,
    setTempStartDate,
    tempEndDate,
    setTempEndDate,
  };
}

function computeOverviewCharts(
  filteredData: ReturnType<typeof useAnalyticsData>['filteredData'],
  current: ReturnType<typeof computeCoreMetrics>,
  staffMembers: string[]
) {
  const { intros, signups, cancellations } = filteredData;
  return {
    monthlyData: computeMonthlyTrends(filteredData),
    funnelData: computeFunnelData(current),
    topClasses: computeTopClasses(intros, signups),
    membershipChart: computeMembershipChart(signups),
    reasonsChart: computeReasonsChart(cancellations),
    staffPerformance: computeStaffPerformance(intros, staffMembers),
  };
}

export default function OverviewTab({
  followUpRows,
  onOpenFollowUps,
  onIntrosChanged,
}: {
  followUpRows?: FollowUpRow[];
  onOpenFollowUps?: () => void;
  onIntrosChanged?: () => Promise<void> | void;
} = {}) {
  const {
    dateRange,
    setDateRange,
    settingsOpen,
    setSettingsOpen,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    tempStartDate,
    setTempStartDate,
    tempEndDate,
    setTempEndDate,
  } = useOverviewDateRange();

  const { filteredData, previousPeriodData, allData, loading, error, refresh, silentRefresh } =
    useAnalyticsData({
      dateRange,
      customStartDate,
      customEndDate,
    });
  const staffMembers = useSettingsStore((s) => s.staffMembers);
  const revenuePerMember = useRevenueSetting();

  const handleApplyCustomDates = () => {
    setCustomStartDate(tempStartDate);
    setCustomEndDate(tempEndDate);
  };

  const { intros, signups, cancellations, holds } = filteredData;
  const current = computeCoreMetrics(filteredData);
  const previous = previousPeriodData ? computeCoreMetrics(previousPeriodData) : null;
  const { monthlyData, funnelData, topClasses, membershipChart, reasonsChart, staffPerformance } =
    computeOverviewCharts(filteredData, current, staffMembers);
  // Active holds describes today, regardless of the selected chart range.
  const activeHolds = allData.holds.filter((hold) => isActiveHold(hold)).length;
  // Top insights from the shared engine (same rules as the Insights tab) —
  // this used to be a hand-rolled fork with its own thresholds that drifted
  // from the real rules over time (e.g. >3 vs ≥5 for top cancellation reason)
  const { insights: sharedInsights } = useInsights({
    intros,
    signups,
    cancellations,
    holds,
    revenuePerMember,
  });
  const insights = sharedInsights.slice(0, 4);

  const handleExportAllData = () => exportOverviewData(filteredData);

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
        <button
          type="button"
          onClick={() => {
            void refresh();
          }}
          className="btn btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <OverviewTitle
        followUpRows={followUpRows}
        onOpenFollowUps={onOpenFollowUps}
        onExport={handleExportAllData}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        scope="overview"
      />
      <DateRangeFilter
        idPrefix="overview"
        options={OVERVIEW_DATE_RANGE_OPTIONS}
        dateRange={dateRange}
        onSelectRange={setDateRange}
        tempStartDate={tempStartDate}
        tempEndDate={tempEndDate}
        onTempStartDateChange={setTempStartDate}
        onTempEndDateChange={setTempEndDate}
        onApplyCustomDates={handleApplyCustomDates}
      />

      <OverviewSummaryCards current={current} previous={previous} activeHolds={activeHolds} />
      {/* Today's bookings come from all data, whatever range is selected above. */}
      <TodayOnTheMats
        intros={allData.intros}
        onAttendanceChanged={async () => {
          await silentRefresh();
          await onIntrosChanged?.();
        }}
      />
      <OverviewInsights insights={insights} />
      <OverviewTrendChart monthlyData={monthlyData} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OverviewAcquisitionCharts funnelData={funnelData} topClasses={topClasses} />
        <OverviewBreakdownCharts membershipChart={membershipChart} reasonsChart={reasonsChart} />
      </div>
      <OverviewStaffPerformance staffPerformance={staffPerformance} />
    </div>
  );
}
