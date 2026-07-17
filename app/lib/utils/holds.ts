import type { Hold } from '@/types';

/**
 * A hold is active when it has started and hasn't ended yet — open-ended
 * holds (no end date) stay active until closed.
 */
export function isActiveHold(hold: Pick<Hold, 'start' | 'end'>, now: Date = new Date()): boolean {
  if (!hold.start) {
    return false;
  }
  const end = hold.end ? new Date(hold.end) : null;
  return new Date(hold.start) <= now && (!end || end >= now);
}
