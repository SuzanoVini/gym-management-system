import type { FollowUpRow } from '@/hooks/useFollowUps';
import { normalizePersonKey, personKeyString } from '@/lib/utils/normalizePersonKey';

export function rowClass(row: FollowUpRow): string {
  if (row.hasActiveReminder) {
    return 'border-l-4 border-blue-400 bg-blue-50';
  }
  const base = 'border-l-4 ';
  if (row.tier === 1 || row.tier === 3) {
    return `${base}border-red-400 bg-red-50`;
  }
  if (row.tier === 2) {
    return `${base}border-amber-400 bg-amber-50`;
  }
  if (row.tier === 4) {
    return `${base}border-blue-400 bg-blue-50`;
  }
  return 'border-l-4 border-transparent opacity-60';
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

export function dueBadge(row: FollowUpRow): React.ReactNode {
  if (!row.followup_1_at) {
    if (row.tier === 1) {
      return <span className="text-xs font-semibold text-red-600">⚠ Overdue</span>;
    }
    if (row.tier === 2) {
      return <span className="text-xs font-semibold text-amber-600">Due today</span>;
    }
    return (
      <span className="text-xs text-gray-400">
        Due {formatDate(row.firstDueDate.toISOString())}
      </span>
    );
  }
  return <span className="text-xs text-green-700">✓ {formatDate(row.followup_1_at)}</span>;
}

export function due2Badge(row: FollowUpRow): React.ReactNode {
  if (!row.followup_1_at) {
    return <span className="text-gray-300 text-sm">—</span>;
  }
  if (row.followup_2_at) {
    return <span className="text-xs text-green-700">✓ {formatDate(row.followup_2_at)}</span>;
  }
  if (row.isSecondOverdue) {
    return <span className="text-xs font-semibold text-red-600">⚠ Overdue</span>;
  }
  return (
    <span className="text-xs text-blue-600">
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
