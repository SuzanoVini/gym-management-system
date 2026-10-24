export interface BarListRow {
  label: string;
  value: number;
  /** What to print at the end of the row; defaults to the value. */
  display?: string;
  /** When any row is emphasised, only those rows take the red; the rest go grey. */
  emphasis?: boolean;
}

// A ranked list where each row's fill is its share of the largest value (or of `max`). Used in
// place of pies and angled bar charts: the labels stay readable and the figures line up.
export default function BarList({
  rows,
  max,
  labelWidth = 'w-32',
}: {
  rows: BarListRow[];
  max?: number;
  labelWidth?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Nothing in this range yet.</p>;
  }
  const scale = max ?? Math.max(...rows.map((r) => r.value), 1);
  const anyEmphasis = rows.some((r) => r.emphasis);
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => {
        const pct = scale > 0 ? Math.min(100, (row.value / scale) * 100) : 0;
        const fill =
          !anyEmphasis || row.emphasis ? 'bg-[var(--accent)]' : 'bg-[var(--chart-neutral)]';
        return (
          <li key={row.label} className="flex items-center gap-3 text-sm">
            <span
              className={`${labelWidth} shrink-0 truncate text-[var(--gb-dark-gray)]`}
              title={row.label}
            >
              {row.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-sm bg-[var(--rule)]">
              <div className={`h-full rounded-sm ${fill}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-24 shrink-0 text-right tabular-nums text-[var(--gb-dark-gray)]">
              {row.display ?? row.value}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
