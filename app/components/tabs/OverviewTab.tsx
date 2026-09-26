'use client';

import { Calendar, Download, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import DateRangeFilter, { type DateRangeOption } from '@/components/ui/DateRangeFilter';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
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
import OverviewBreakdownCharts, {
  useOverviewPieSelection,
} from './overview/OverviewBreakdownCharts';
import OverviewInsights from './overview/OverviewInsights';
import OverviewStaffPerformance from './overview/OverviewStaffPerformance';
import OverviewSummaryCards from './overview/OverviewSummaryCards';
import OverviewTrendChart from './overview/OverviewTrendChart';

const OVERVIEW_DATE_RANGE_OPTIONS: DateRangeOption[] = [
  { value: 'all', label: 'All Time' },
  { value: '1month', label: 'Last Month' },
  { value: '3months', label: 'Last 3 Months' },
  { value: '6months', label: 'Last 6 Months' },
  { value: 'year', label: 'Last Year' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'custom', label: 'Custom Range' },
];

export default function OverviewTab() {
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

  const { filteredData, previousPeriodData, loading, error, refresh } = useAnalyticsData({
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

  const selection = useOverviewPieSelection();
  const { intros, signups, cancellations, holds } = filteredData;
  const current = computeCoreMetrics(filteredData);
  const previous = previousPeriodData ? computeCoreMetrics(previousPeriodData) : null;
  const activeHolds = holds.filter((h) => isActiveHold(h)).length;
  const monthlyData = computeMonthlyTrends(filteredData);
  const funnelData = computeFunnelData(current);
  const topClasses = computeTopClasses(intros, signups);
  const membershipChart = computeMembershipChart(signups);
  const reasonsChart = computeReasonsChart(cancellations);
  const staffPerformance = computeStaffPerformance(intros, staffMembers);
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
            <Calendar className="w-5 h-5 mr-2" />
            Date Range Filter
          </h2>
          {/* Grouped so justify-between keeps the heading left and both actions together right. */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportAllData}
              className="btn btn-primary bg-green-600 hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Export All Data
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="btn btn-secondary"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>

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
      </div>

      <OverviewSummaryCards current={current} previous={previous} activeHolds={activeHolds} />
      <OverviewInsights insights={insights} />
      <OverviewTrendChart monthlyData={monthlyData} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OverviewAcquisitionCharts funnelData={funnelData} topClasses={topClasses} />
        <OverviewBreakdownCharts
          membershipChart={membershipChart}
          reasonsChart={reasonsChart}
          selection={selection}
        />
      </div>
      <OverviewStaffPerformance staffPerformance={staffPerformance} />
    </div>
  );
}
