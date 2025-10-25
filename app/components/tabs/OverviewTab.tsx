'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Users, UserPlus, UserMinus, Clock, AlertCircle, CheckCircle, DollarSign, Target } from 'lucide-react';
import { fetchIntros, fetchSignups, fetchCancellations, fetchHolds } from '../../lib/supabase/client';
import { LineChart, Line, BarChart, Bar, LabelList, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Intro {
  id: string;
  month: string;
  name: string;
  class: string;
  staff: string;
  attended: string;
  signed_up: string;
  [key: string]: any;
}

interface Signup {
  id: string;
  month: string;
  name: string;
  membership: string;
  membership_date?: string;
  [key: string]: any;
}

interface Cancellation {
  id: string;
  month: string;
  name: string;
  reason: string;
  date: string;
  [key: string]: any;
}

interface Hold {
  id: string;
  month: string;
  name: string;
  start: string;
  end: string;
  reason: string;
  [key: string]: any;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function OverviewTab() {
  const [intros, setIntros] = useState<Intro[]>([]);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [holds, setHolds] = useState<Hold[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all'); // all, 3months, 6months, year

  useEffect(() => {
    loadAllData();
  }, []);
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [introsData, signupsData, cancellationsData, holdsData] = await Promise.all([
        fetchIntros(),
        fetchSignups(),
        fetchCancellations(),
        fetchHolds()
      ]);
      setIntros(introsData);
      setSignups(signupsData);
      setCancellations(cancellationsData);
      setHolds(holdsData);

      // DEBUG: Log sample data to check formats
      console.log('=== DATA SAMPLE ===');
      console.log('Sample Intro:', introsData[0]);
      console.log('Sample Signup:', signupsData[0]);
      console.log('Sample Cancellation:', cancellationsData[0]);
      console.log('Sample Hold:', holdsData[0]);

      console.log('\n=== DATA COUNTS ===');
      console.log('Total Intros:', introsData.length);
      console.log('Total Signups:', signupsData.length);
      console.log('Total Cancellations:', cancellationsData.length);
      console.log('Total Holds:', holdsData.length);

      // Check boolean formats
      console.log('\n=== BOOLEAN CHECKS ===');
      console.log('Attended values:', [...new Set(introsData.map(i => i.attended))]);
      console.log('Signed Up values:', [...new Set(introsData.map(i => i.signed_up))]);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter by date range
  const filterByDateRange = (data: any[], dateField: string = 'created_at') => {
    if (dateRange === 'all') return data;

    const now = new Date();
    const cutoffDate = new Date();

    if (dateRange === '3months') {
      cutoffDate.setMonth(now.getMonth() - 3);
    } else if (dateRange === '6months') {
      cutoffDate.setMonth(now.getMonth() - 6);
    } else if (dateRange === 'year') {
      cutoffDate.setFullYear(now.getFullYear() - 1);
    }

    return data.filter(item => {
      const itemDate = new Date(item[dateField] || item.created_at);
      return itemDate >= cutoffDate;
    });
  };

  const filteredIntros = filterByDateRange(intros);
  const filteredSignups = filterByDateRange(signups);
  const filteredCancellations = filterByDateRange(cancellations);
  const filteredHolds = filterByDateRange(holds);

  // Key Metrics
  const totalIntros = filteredIntros.length;
  const attendedIntros = filteredIntros.filter(i => i.attended === 'Yes').length;
  const totalSignups = filteredSignups.length;
  const totalCancellations = filteredCancellations.length;
  const activeHolds = filteredHolds.filter(h => {
    const end = new Date(h.end);
    return end > new Date();
  }).length;

  const signupsFromIntros = filteredSignups.filter(signup =>
    filteredIntros.some(intro => intro.name.toLowerCase().trim() === signup.name.toLowerCase().trim())
  ).length;

  const conversionRate = attendedIntros > 0 ? ((signupsFromIntros / attendedIntros) * 100).toFixed(1) : '0';
  const netGrowth = totalSignups - totalCancellations;

  // Monthly Trends
  const monthlyData = MONTHS.map(month => {
    const monthIntros = filteredIntros.filter(i => i.month === month).length;
    const monthSignups = filteredSignups.filter(s => s.month === month).length;
    const monthCancellations = filteredCancellations.filter(c => c.month === month).length;

    return {
      month,
      Intros: monthIntros,
      'Sign-ups': monthSignups,
      Cancellations: monthCancellations,
      'Net Growth': monthSignups - monthCancellations
    };
  }).filter(m => m.Intros > 0 || m['Sign-ups'] > 0 || m.Cancellations > 0);

  // Conversion Funnel
  const funnelData = [
    { stage: 'Intros', count: totalIntros, percentage: 100 },
    { stage: 'Attended', count: attendedIntros, percentage: totalIntros > 0 ? ((attendedIntros / totalIntros) * 100).toFixed(0) : 0 },
    { stage: 'Signed Up', count: totalSignups, percentage: totalIntros > 0 ? ((totalSignups / totalIntros) * 100).toFixed(0) : 0 }
  ];

  // Top Classes by Sign-ups
  const classSignups = filteredIntros.reduce((acc: any, intro) => {
    if (intro.signed_up === 'Yes') {
      acc[intro.class] = (acc[intro.class] || 0) + 1;
    }
    return acc;
  }, {});

  const topClasses = Object.entries(classSignups)
    .map(([name, count]) => ({ name, count }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5);

  // Membership Type Breakdown
  const membershipData = filteredSignups.reduce((acc: any, signup) => {
    acc[signup.membership] = (acc[signup.membership] || 0) + 1;
    return acc;
  }, {});

  const membershipChart = Object.entries(membershipData).map(([name, value]) => ({ name, value }));

  // Cancellation Reasons
  const cancellationReasons = filteredCancellations.reduce((acc: any, cancel) => {
    acc[cancel.reason] = (acc[cancel.reason] || 0) + 1;
    return acc;
  }, {});

  const reasonsChart = Object.entries(cancellationReasons)
    .map(([name, value]) => ({ name, value }))
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 5);

  // Staff Performance - only count intros where they actually attended
  const staffStats = filteredIntros.reduce((acc: any, intro) => {
    // Only count if they attended
    if (intro.attended !== 'Yes') return acc;

    if (!acc[intro.staff]) {
      acc[intro.staff] = { attended: 0, signedUp: 0 };
    }
    acc[intro.staff].attended++;

    if (intro.signed_up === 'Yes') {
      acc[intro.staff].signedUp++;
    }

    return acc;
  }, {});

  // staffPerformance is computed below with a single declaration (deduplicated)

  // Debug: Log the data to see what we're getting
  console.log('Staff Stats:', staffStats);
  console.log('Sample intro:', filteredIntros[0]);

  const staffPerformance = Object.entries(staffStats)
    .map(([name, stats]: [string, any]) => ({
      name,
      attended: stats.attended,
      signedUp: stats.signedUp,
      conversionRate: stats.attended > 0 ? parseFloat(((stats.signedUp / stats.attended) * 100).toFixed(1)) : 0
    }))
    .filter(s => s.attended >= 3) // Lowered threshold for testing
    .sort((a: any, b: any) => b.conversionRate - a.conversionRate)

  console.log('Staff Performance:', staffPerformance);

  // Smart Insights
  const generateInsights = () => {
    const insights = [];

    // Recent cancellations
    const last3Months = new Date();
    last3Months.setMonth(last3Months.getMonth() - 3);
    const recentSignups = signups.filter(s => new Date(s.membership_date || s.created_at) >= last3Months);
    const recentCancellations = cancellations.filter(c => {
      const cancelDate = new Date(c.date || c.created_at);
      const signup = signups.find(s => s.name.toLowerCase() === c.name.toLowerCase());
      if (!signup) return false;
      const signupDate = new Date(signup.membership_date || signup.created_at);
      const daysSinceSignup = (cancelDate.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceSignup <= 90;
    });

    if (recentCancellations.length > 0 && recentSignups.length > 0) {
      const earlyChurnRate = ((recentCancellations.length / recentSignups.length) * 100).toFixed(0);
      if (parseInt(earlyChurnRate) > 10) {
        insights.push({
          type: 'warning',
          icon: AlertCircle,
          title: 'High Early Cancellation Rate',
          message: `${earlyChurnRate}% of members who signed up in the last 3 months have cancelled. Consider improving onboarding.`,
          color: 'red'
        });
      }
    }

    // Conversion rate
    if (parseFloat(conversionRate) < 40) {
      insights.push({
        type: 'warning',
        icon: Target,
        title: 'Low Conversion Rate',
        message: `Conversion rate is ${conversionRate}%. Industry standard is 40-50%. Focus on follow-ups and trial experience.`,
        color: 'yellow'
      });
    } else if (parseFloat(conversionRate) > 50) {
      insights.push({
        type: 'success',
        icon: CheckCircle,
        title: 'Excellent Conversion Rate',
        message: `Your ${conversionRate}% conversion rate is above industry average! Keep up the great work.`,
        color: 'green'
      });
    }

    // Seasonal holds
    const summerMonths = ['Jun', 'Jul', 'Aug'];
    const summerHolds = holds.filter(h => summerMonths.includes(h.month));
    const avgHolds = holds.length / 12;
    const summerAvg = summerHolds.length / 3;

    if (summerAvg > avgHolds * 2) {
      insights.push({
        type: 'info',
        icon: Clock,
        title: 'Seasonal Hold Pattern Detected',
        message: `Holds spike ${((summerAvg / avgHolds) * 100).toFixed(0)}% in summer. Plan for reduced summer revenue and consider summer programs.`,
        color: 'blue'
      });
    }

    // Staff performance
    const topStaff = staffPerformance[0];
    if (topStaff && Number(topStaff.conversionRate) > 60) {
      insights.push({
        type: 'success',
        icon: Users,
        title: 'Top Performer Identified',
        message: `${topStaff.name} has a ${topStaff.conversionRate}% conversion rate! Learn from their approach and share best practices.`,
        color: 'green'
      });
    }

    // Follow-ups needed
    const needFollowUp = intros.filter(i => {
      const attended = i.attended === 'Yes';
      const notSignedUp = i.signed_up !== 'Yes';
      const noFollowUp = i.follow_up === null || i.follow_up === '' || i.follow_up === undefined || (Array.isArray(i.follow_up) && i.follow_up.length === 0);
      return attended && notSignedUp && noFollowUp;
    }).length;

    if (needFollowUp > 10) {
      insights.push({
        type: 'action',
        icon: AlertCircle,
        title: 'Follow-ups Needed',
        message: `${needFollowUp} intros attended but haven't signed up yet. Follow up within 48 hours for best conversion.`,
        color: 'purple'
      });
    }

    // Net growth
    if (netGrowth < 0) {
      insights.push({
        type: 'warning',
        icon: TrendingDown,
        title: 'Negative Net Growth',
        message: `You have ${Math.abs(netGrowth)} more cancellations than sign-ups. Prioritize both acquisition and retention.`,
        color: 'red'
      });
    } else if (netGrowth > 10) {
      insights.push({
        type: 'success',
        icon: TrendingUp,
        title: 'Strong Growth',
        message: `Net growth of +${netGrowth} members! Your gym is expanding healthily.`,
        color: 'green'
      });
    }

    return insights;
  };

  const insights = generateInsights();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-gray-600 mt-1">GB Kits' performance at a glance</p>
        </div>
        <div>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg">
            <option value="all">All Time</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="year">Last Year</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Intros</p>
              <p className="text-3xl font-bold mt-1">{totalIntros}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sign-ups</p>
              <p className="text-3xl font-bold mt-1">{totalSignups}</p>
            </div>
            <UserPlus className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-red-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cancellations</p>
              <p className="text-3xl font-bold mt-1">{totalCancellations}</p>
            </div>
            <UserMinus className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${netGrowth >= 0 ? 'border-green-600' : 'border-red-600'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Net Growth</p>
              <p className={`text-3xl font-bold mt-1 ${netGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netGrowth >= 0 ? '+' : ''}{netGrowth}
              </p>
            </div>
            {netGrowth >= 0 ? <TrendingUp className="w-8 h-8 text-green-600" /> : <TrendingDown className="w-8 h-8 text-red-600" />}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Conversion Rate</p>
              <p className="text-3xl font-bold mt-1">{conversionRate}%</p>
            </div>
            <Target className="w-8 h-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-yellow-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Holds</p>
              <p className="text-3xl font-bold mt-1">{activeHolds}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Smart Insights */}
      {insights.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center">
            <AlertCircle className="w-6 h-6 mr-2" />
            Smart Insights & Recommendations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((insight, index) => {
              const Icon = insight.icon;
              return (
                <div key={index} className={`p-4 rounded-lg border-l-4 ${insight.color === 'red' ? 'bg-red-50 border-red-500' :
                  insight.color === 'orange' ? 'bg-orange-50 border-orange-500' :
                    insight.color === 'yellow' ? 'bg-yellow-50 border-yellow-500' :
                      insight.color === 'green' ? 'bg-green-50 border-green-500' :
                        insight.color === 'blue' ? 'bg-blue-50 border-blue-500' :
                          'bg-purple-50 border-purple-500'
                  }`}>
                  <div className="flex items-start">
                    <Icon className={`w-5 h-5 mr-3 mt-0.5 ${insight.color === 'red' ? 'text-red-600' :
                      insight.color === 'orange' ? 'text-orange-600' :
                        insight.color === 'yellow' ? 'text-yellow-600' :
                          insight.color === 'green' ? 'text-green-600' :
                            insight.color === 'blue' ? 'text-blue-600' :
                              'text-purple-600'
                      }`} />
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
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold mb-4">Monthly Trends</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Intros" stroke="#3b82f6" strokeWidth={2} />
            <Line type="monotone" dataKey="Sign-ups" stroke="#10b981" strokeWidth={2} />
            <Line type="monotone" dataKey="Cancellations" stroke="#ef4444" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4">Conversion Funnel</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="stage" type="category" width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6">
                <LabelList dataKey="countLabel" position="right" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Classes */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4">Top Classes by Sign-ups</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topClasses}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Membership Breakdown */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4">Membership Types</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={membershipChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {membershipChart.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Cancellation Reasons */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4">Top Cancellation Reasons</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={reasonsChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {reasonsChart.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Staff Performance */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold mb-4">Staff Performance (Conversion Rate)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={staffPerformance}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis label={{ value: 'Conversion Rate (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip formatter={(value) => `${value}%`} />
            <Bar dataKey="conversionRate" fill="#8b5cf6" label={{ position: 'top', formatter: (value: any) => `${value}%` }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}