import { canonicalizeStaffName } from '@/lib/utils/canonicalizeStaffName';
import type { Cancellation, Intro, Signup } from '@/types';

export interface OverviewRecords {
  intros: Intro[];
  signups: Signup[];
  cancellations: Cancellation[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const personName = (name: string) => name.toLowerCase().trim().replace(/\s+/g, ' ');

export function computeCoreMetrics(data: OverviewRecords) {
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

export function computeMonthlyTrends({ intros, signups, cancellations }: OverviewRecords) {
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

  return [...trendBuckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, bucket]) => ({ ...bucket, 'Net Growth': bucket['Sign-ups'] - bucket.Cancellations }));
}

export function computeFunnelData({
  totalIntros,
  attendedIntros,
  signupsFromIntros,
}: ReturnType<typeof computeCoreMetrics>) {
  return [
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
}

export function computeTopClasses(intros: Intro[], signups: Signup[]) {
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

  return Object.entries(classSignups)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export function computeMembershipChart(signups: Signup[]) {
  const membershipData = signups.reduce<Record<string, number>>((acc, signup) => {
    acc[signup.membership] = (acc[signup.membership] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(membershipData).map(([name, value]) => ({ name, value }));
}

export function computeReasonsChart(cancellations: Cancellation[]) {
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

  return Object.entries(cancellationReasons)
    .map(([name, value]) => ({ name: capitalizeWords(name), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

export function computeStaffPerformance(intros: Intro[], staffMembers: string[]) {
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

  return Object.entries(staffStats)
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
}
