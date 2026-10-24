import type { FollowUpRow } from '@/hooks/useFollowUps';
import { normalizePersonKey, personKeyString } from '@/lib/utils/normalizePersonKey';

// Rows stay white; the status cell carries the signal. Finished rows are dimmed.
export function rowClass(row: FollowUpRow): string {
  if (row.hasActiveReminder || row.tier <= 4) {
    return '';
  }
  return 'opacity-60';
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

const PILL = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium';

function overduePill() {
  return <span className={`${PILL} bg-[var(--accent-50)] text-[var(--accent-ink)]`}>Overdue</span>;
}

function donePill(iso: string) {
  return <span className="text-xs text-[var(--muted)]">Done {formatDate(iso)}</span>;
}

export function dueBadge(row: FollowUpRow): React.ReactNode {
  if (!row.followup_1_at) {
    if (row.tier === 1) {
      return overduePill();
    }
    if (row.tier === 2) {
      return <span className={`${PILL} bg-amber-50 text-amber-800`}>Due today</span>;
    }
    return (
      <span className="text-xs text-[var(--muted)]">
        Due {formatDate(row.firstDueDate.toISOString())}
      </span>
    );
  }
  return donePill(row.followup_1_at);
}

export function due2Badge(row: FollowUpRow): React.ReactNode {
  if (!row.followup_1_at) {
    return <span className="text-sm text-[var(--muted)]">—</span>;
  }
  if (row.followup_2_at) {
    return donePill(row.followup_2_at);
  }
  if (row.isSecondOverdue) {
    return overduePill();
  }
  return (
    <span className="text-xs text-[var(--muted)]">
      Due {row.secondDueDate ? formatDate(row.secondDueDate.toISOString()) : '—'}
    </span>
  );
}

function escapeCsvField(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

export function exportCsv(rows: FollowUpRow[]) {
  const header = [
    'Name',
    'Phone',
    'Email',
    'Class',
    'Intro Date',
    'Attended',
    'Staff',
    '1st Follow-up',
    '2nd Follow-up',
    'Notes',
  ];
  const csvRows = rows.map((r) => [
    escapeCsvField(r.name),
    escapeCsvField(r.phone ?? ''),
    escapeCsvField(r.email ?? ''),
    escapeCsvField(r.class ?? ''),
    escapeCsvField(r.date ?? ''),
    escapeCsvField(r.attended ?? ''),
    escapeCsvField(r.staff ?? ''),
    escapeCsvField(r.followup_1_at ? formatDate(r.followup_1_at) : ''),
    escapeCsvField(r.followup_2_at ? formatDate(r.followup_2_at) : ''),
    escapeCsvField((r.follow_up_notes ?? []).map((n) => n.note).join(' ; ')),
  ]);
  const csv = [header.map(escapeCsvField), ...csvRows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `follow-ups-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// One entry per person group with an active reminder, for the banner
export function groupActiveReminders(rows: FollowUpRow[]): FollowUpRow[] {
  const seen = new Map<string, FollowUpRow>();
  for (const row of rows) {
    if (!row.hasActiveReminder) {
      continue;
    }
    const key = normalizePersonKey(row.name, row.email);
    const k = key ? personKeyString(key) : row.id;
    if (!seen.has(k)) {
      seen.set(k, row);
    }
  }
  return Array.from(seen.values());
}
