import { buildSearchIndex, searchMatches } from '@/lib/utils/search';
import type { Hold } from '@/types';

export type HoldStatus = 'unknown' | 'upcoming' | 'ended' | 'active';

export function getHoldStatus(start?: string, end?: string): HoldStatus {
  if (!start) {
    return 'unknown';
  }
  const today = new Date();
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : null;

  if (startDate > today) {
    return 'upcoming';
  }
  if (endDate && endDate < today) {
    return 'ended';
  }
  return 'active';
}

export function filterHolds(
  holds: Hold[],
  filters: {
    month: string;
    reason: string;
    holdStatus: string;
    year: string;
    searchTerm: string;
  },
  statusForHold: (start?: string, end?: string) => HoldStatus
): Hold[] {
  let filtered = holds.filter((hold) => {
    const matchesMonth = filters.month === 'all' || hold.month === filters.month;
    const matchesReason =
      filters.reason === 'all' || (hold.reason && hold.reason === filters.reason);
    const matchesStatus =
      filters.holdStatus === 'all' || statusForHold(hold.start, hold.end) === filters.holdStatus;
    const matchesYear = filters.year === 'all' || String(hold.year) === filters.year;
    return matchesMonth && matchesReason && matchesStatus && matchesYear;
  });

  if (filters.searchTerm.trim()) {
    filtered = filtered.filter((hold) =>
      searchMatches(
        buildSearchIndex([hold.name, hold.reason, hold.start, hold.end]),
        filters.searchTerm
      )
    );
  }
  return filtered;
}

export function getHoldSortTimestamp(hold: Hold): number {
  const startValue = hold.start ? new Date(hold.start).getTime() : 0;
  return startValue || (hold.created_at ? new Date(hold.created_at).getTime() : 0);
}

export function sortHolds(holds: Hold[], sortOrder: 'newest' | 'oldest'): Hold[] {
  return [...holds].sort((a, b) => {
    const dateA = getHoldSortTimestamp(a);
    const dateB = getHoldSortTimestamp(b);
    if (dateA === dateB) {
      return 0;
    }
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });
}

export function getAvailableHoldYears(holds: Hold[]): number[] {
  const years = new Set<number>();
  for (const hold of holds) {
    if (hold.year) {
      years.add(hold.year);
    }
  }
  return Array.from(years).sort((a, b) => b - a);
}
