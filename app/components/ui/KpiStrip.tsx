import type { ReactNode } from 'react';
import InfoTip from '@/components/ui/InfoTip';

export interface KpiItem {
  label: string;
  value: ReactNode;
  /** Explains how the figure is counted, shown behind an info icon. */
  info?: string;
  /** One short line naming the baseline or window ("vs previous 3 months"). */
  caption?: ReactNode;
  /** Colour says good or bad, never up or down; most figures stay in ink. */
  tone?: 'default' | 'negative' | 'positive';
}

// Literal class names so Tailwind keeps them.
const COLUMNS: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-3 lg:grid-cols-5',
  6: 'md:grid-cols-3 xl:grid-cols-6',
};

const TONE: Record<NonNullable<KpiItem['tone']>, string> = {
  default: 'text-[var(--text)]',
  negative: 'text-[var(--negative)]',
  positive: 'text-[var(--positive)]',
};

// Headline figures as one container split by hairlines: a label over a number, no icons, no tiles.
export default function KpiStrip({
  items,
  className = '',
}: {
  items: KpiItem[];
  className?: string;
}) {
  const oddOnPhone = items.length % 2 === 1;
  return (
    <div
      className={`grid grid-cols-2 ${COLUMNS[items.length] ?? 'md:grid-cols-4'} gap-px overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--border)] ${className}`}
    >
      {items.map((item, idx) => (
        <div
          key={item.label}
          className={`bg-[var(--surface)] px-5 py-4 ${oddOnPhone && idx === items.length - 1 ? 'col-span-2 md:col-span-1' : ''}`}
        >
          <div className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
            <span>{item.label}</span>
            {item.info && <InfoTip label={item.info} />}
          </div>
          <div
            className={`mt-1 text-2xl font-semibold tabular-nums leading-tight ${TONE[item.tone ?? 'default']}`}
          >
            {item.value}
          </div>
          {item.caption && <div className="mt-1 text-xs text-[var(--muted)]">{item.caption}</div>}
        </div>
      ))}
    </div>
  );
}
