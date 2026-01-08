'use client';

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  RefreshCw,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';

import { useAnalyticsData } from '@/hooks/useAnalyticsData';

import { useInsights } from '@/hooks/useInsights';

import type { Insight } from '@/types';

// Map icon names to their components for dynamic rendering and to satisfy TypeScript usage checks

const InsightIcons = {
  AlertCircle,

  AlertTriangle,

  Calendar,

  CheckCircle,

  Clock,

  DollarSign,

  TrendingUp,

  Users,

  Target,
};

export default function InsightsTab() {
  const [dateRange, setDateRange] = useState('3months');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempEndDate, setTempEndDate] = useState('');

  const { filteredData, loading, error, refresh } = useAnalyticsData({
    dateRange,
    customStartDate,
    customEndDate,
  });
  const { insights } = useInsights(filteredData);

  const handleApplyCustomDates = () => {
    setCustomStartDate(tempStartDate);
    setCustomEndDate(tempEndDate);
  };

  // Category breakdown
  const insightsByCategory = {
    conversion: insights.filter((i: Insight) => i.category === 'conversion'),
    retention: insights.filter((i: Insight) => i.category === 'retention'),
    financial: insights.filter((i: Insight) => i.category === 'financial'),
    operational: insights.filter((i: Insight) => i.category === 'operational'),
    growth: insights.filter((i: Insight) => i.category === 'growth'),
  };

  const priorityCounts = {
    critical: insights.filter((i: Insight) => i.priority === 'critical').length,
    high: insights.filter((i: Insight) => i.priority === 'high').length,
    medium: insights.filter((i: Insight) => i.priority === 'medium').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing your data...</p>
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
          onClick={refresh}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                <AlertCircle className="w-6 h-6 mr-2 text-red-600" />
                Smart Business Insights
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Actionable recommendations based on your actual data
              </p>
            </div>
            <button
              onClick={refresh}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-wrap gap-2 items-center mt-4">
            {[
              { value: '1month', label: 'Last Month' },
              { value: '3months', label: 'Last 3 Months' },
              { value: '6months', label: 'Last 6 Months' },
              { value: 'all', label: 'All Time' },
              { value: 'custom', label: '📅 Custom Range' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === option.value
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Inputs */}
          {dateRange === 'custom' && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border-2 border-red-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Select Custom Date Range:</p>
              <div className="flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={tempStartDate}
                    onChange={(e) => setTempStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={tempEndDate}
                    onChange={(e) => setTempEndDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <button
                  onClick={handleApplyCustomDates}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Apply Filter
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Priority Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Critical Priority</p>
                <p className="text-3xl font-bold mt-1 text-red-600">{priorityCounts.critical}</p>
                <p className="text-xs text-gray-500 mt-1">Act immediately</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-3xl font-bold mt-1 text-orange-600">{priorityCounts.high}</p>
                <p className="text-xs text-gray-500 mt-1">Address this week</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Medium Priority</p>
                <p className="text-3xl font-bold mt-1 text-yellow-600">{priorityCounts.medium}</p>
                <p className="text-xs text-gray-500 mt-1">Plan for next month</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Insights */}
        {insights.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Everything Looks Good!</h3>
            <p className="text-gray-600">
              No critical issues detected. Your gym is running smoothly.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight: Insight) => {
              const Icon = InsightIcons[insight.icon as keyof typeof InsightIcons] || AlertCircle;

              const bgColor = {
                red: 'bg-red-50',
                orange: 'bg-orange-50',
                yellow: 'bg-yellow-50',
                green: 'bg-green-50',
                blue: 'bg-blue-50',
                purple: 'bg-purple-50',
              }[insight.color];

              const borderColor = {
                red: 'border-red-500',
                orange: 'border-orange-500',
                yellow: 'border-yellow-500',
                green: 'border-green-500',
                blue: 'border-blue-500',
                purple: 'border-purple-500',
              }[insight.color];

              const iconColor = {
                red: 'text-red-600',
                orange: 'text-orange-600',
                yellow: 'text-yellow-600',
                green: 'text-green-600',
                blue: 'text-blue-600',
                purple: 'text-purple-600',
              }[insight.color];

              const priorityBadge = {
                critical: 'bg-red-100 text-red-800 border-red-300',
                high: 'bg-orange-100 text-orange-800 border-orange-300',
                medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                low: 'bg-gray-100 text-gray-800 border-gray-300',
              }[insight.priority];

              return (
                <div
                  key={insight.id}
                  className={`${bgColor} rounded-lg border-l-4 ${borderColor} p-6 shadow-sm hover:shadow-md transition-shadow`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start flex-1">
                      <Icon className={`w-6 h-6 ${iconColor} mr-3 mt-1 flex-shrink-0`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{insight.title}</h3>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded border ${priorityBadge} uppercase`}
                          >
                            {insight.priority}
                          </span>
                        </div>
                        {insight.impact && (
                          <div className="inline-flex items-center gap-1 bg-white px-3 py-1 rounded-full text-sm font-semibold text-gray-700 border border-gray-200 mb-2">
                            <DollarSign className="w-4 h-4" />
                            {insight.impact}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="ml-9 mb-4">
                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                      {insight.message}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="ml-9 bg-white bg-opacity-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowRight className="w-4 h-4 text-gray-600" />
                      <h4 className="font-semibold text-sm text-gray-900">Action Steps:</h4>
                    </div>
                    <ul className="space-y-2">
                      {insight.actions.map((action, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-red-600 font-bold mt-0.5">{idx + 1}.</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Category Breakdown */}
        {insights.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-bold mb-4">Insights by Category</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { key: 'conversion', label: 'Conversion', icon: Target, color: 'blue' },
                { key: 'retention', label: 'Retention', icon: Users, color: 'purple' },
                { key: 'financial', label: 'Financial', icon: DollarSign, color: 'green' },
                { key: 'operational', label: 'Operational', icon: Clock, color: 'orange' },
                { key: 'growth', label: 'Growth', icon: TrendingUp, color: 'red' },
              ].map(({ key, label, icon: CategoryIcon, color }) => {
                const count = insightsByCategory[key as keyof typeof insightsByCategory].length;
                return (
                  <div key={key} className="text-center p-4 bg-gray-50 rounded-lg">
                    <CategoryIcon className={`w-6 h-6 mx-auto mb-2 text-${color}-600`} />
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-600">{label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
