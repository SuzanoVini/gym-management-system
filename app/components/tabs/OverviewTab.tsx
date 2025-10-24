'use client';

import { useEffect, useState } from 'react';
import { fetchIntros, fetchSignups, fetchCancellations, fetchHolds } from '../../lib/supabase/client';
import { Users, TrendingUp, TrendingDown, Clock } from 'lucide-react';

export default function OverviewTab() {
  const [metrics, setMetrics] = useState({
    totalIntros: 0,
    totalAttended: 0,
    totalSignedUp: 0,
    conversionRate: 0,
    totalSignups: 0,
    totalCancellations: 0,
    totalHolds: 0,
    netGrowth: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [intros, signups, cancellations, holds] = await Promise.all([
        fetchIntros(),
        fetchSignups(),
        fetchCancellations(),
        fetchHolds(),
      ]);

      const attended = intros.filter(i => i.attended === 'Yes');
      const signedUp = intros.filter(i => i.signed_up === 'Yes');

      setMetrics({
        totalIntros: intros.length,
        totalAttended: attended.length,
        totalSignedUp: signedUp.length,
        conversionRate: attended.length > 0 ? Math.round((signedUp.length / attended.length) * 100) : 0,
        totalSignups: signups.length,
        totalCancellations: cancellations.length,
        totalHolds: holds.length,
        netGrowth: signups.length - cancellations.length,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Overview Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Intros"
          value={metrics.totalIntros}
          subtitle={`${metrics.totalAttended} attended`}
          icon={Users}
          color="bg-blue-100 text-blue-600"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.conversionRate}%`}
          subtitle="Attended to Signed Up"
          icon={TrendingUp}
          color="bg-red-100 text-red-600"
        />
        <MetricCard
          title="Net Growth"
          value={metrics.netGrowth >= 0 ? `+${metrics.netGrowth}` : metrics.netGrowth}
          subtitle={`${metrics.totalSignups} signups - ${metrics.totalCancellations} cancellations`}
          icon={metrics.netGrowth >= 0 ? TrendingUp : TrendingDown}
          color={metrics.netGrowth >= 0 ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}
        />
        <MetricCard
          title="Active Holds"
          value={metrics.totalHolds}
          subtitle="Members on hold"
          icon={Clock}
          color="bg-yellow-100 text-yellow-600"
        />
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}