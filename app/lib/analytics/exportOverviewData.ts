import { exportToCSV } from '@/lib/supabase/utils';
import type { Hold } from '@/types';
import type { OverviewRecords } from './overviewMetrics';

export function exportOverviewData({
  intros,
  signups,
  cancellations,
  holds,
}: OverviewRecords & { holds: Hold[] }) {
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
}
