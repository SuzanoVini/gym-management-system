import { Download, Settings } from 'lucide-react';
import type { FollowUpRow } from '@/hooks/useFollowUps';
import { parseDate } from '@/lib/utils/date.utils';

// Tiers 1 and 3 are the overdue first and second contacts, the same rule as the sidebar badge.
function overdueSummary(rows: FollowUpRow[]) {
  const overdue = rows.filter((r) => r.tier === 1 || r.tier === 3);
  const dates = overdue
    .map((r) => (r.date ? parseDate(r.date) : null))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  const oldest = dates[0]?.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  return { count: overdue.length, oldest };
}

// The title row: the screen's name, its one finding (who is waiting for a reply) next to the
// action it drives, and the secondary actions kept quiet.
export default function OverviewTitle({
  followUpRows,
  onOpenFollowUps,
  onExport,
  onOpenSettings,
}: {
  followUpRows?: FollowUpRow[] | undefined;
  onOpenFollowUps?: (() => void) | undefined;
  onExport: () => void;
  onOpenSettings: () => void;
}) {
  const { count, oldest } = overdueSummary(followUpRows ?? []);
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="page-title">Overview</h1>
        {followUpRows && (
          <p
            className={
              count > 0 ? 'mt-1 text-sm font-medium text-[var(--negative)]' : 'page-subtitle'
            }
          >
            {count > 0
              ? `${count} follow-up${count === 1 ? '' : 's'} overdue${oldest ? `, oldest intro ${oldest}` : ''}`
              : 'No follow-ups overdue'}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onExport} className="btn btn-secondary">
          <Download className="w-4 h-4" />
          Export data
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="btn btn-tertiary"
          aria-label="Overview settings"
        >
          <Settings className="w-4 h-4" />
        </button>
        {onOpenFollowUps && count > 0 && (
          <button type="button" onClick={onOpenFollowUps} className="btn btn-primary">
            Open follow-ups
          </button>
        )}
      </div>
    </div>
  );
}
