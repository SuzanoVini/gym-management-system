const MONTH_NAMES = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

const MONTH_PATTERN = MONTH_NAMES.join('|');

// Returns Vancouver date components for a given UTC date
export function getVancouverDate(d = new Date()): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  return {
    year: Number.parseInt(get('year'), 10),
    month: Number.parseInt(get('month'), 10) - 1,
    day: Number.parseInt(get('day'), 10),
  };
}

// Convert a YYYY-MM-DD date-input value to a UTC ISO string (midnight America/Vancouver)
export function dateInputToUTCTimestamp(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  // Probe noon UTC on that day to find the Vancouver UTC offset (DST-safe)
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const fmt = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Vancouver',
    timeZoneName: 'shortOffset',
  });
  const tzPart = fmt.formatToParts(probe).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-7';
  const match = tzPart.match(/GMT([+-])(\d+)/);
  const offsetHours = match ? Number.parseInt(match[2], 10) * (match[1] === '+' ? 1 : -1) : -7;
  // midnight Vancouver = UTC midnight - offset
  return new Date(Date.UTC(year, month - 1, day, -offsetHours, 0, 0, 0)).toISOString();
}

// Convert a stored UTC timestamp back to a YYYY-MM-DD string in Vancouver time
export function utcTimestampToDateInput(isoString: string): string {
  const { year, month, day } = getVancouverDate(new Date(isoString));
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Convert a local-time Date (as returned by detectReminderDate) to a YYYY-MM-DD string
export function dateToDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Returns true if the reminder is active (date <= today in Vancouver)
export function isReminderActive(
  reminderAt: string | null | undefined,
  nowOverride?: string
): boolean {
  if (!reminderAt) {
    return false;
  }
  const now = nowOverride ? new Date(nowOverride) : new Date();
  const { year: ty, month: tm, day: td } = getVancouverDate(now);
  const { year: ry, month: rm, day: rd } = getVancouverDate(new Date(reminderAt));
  return Date.UTC(ry, rm, rd) <= Date.UTC(ty, tm, td);
}

// Returns "today" or "overdue" for an active reminder
export function getReminderBadgeLabel(
  reminderAt: string,
  nowOverride?: string
): 'today' | 'overdue' {
  const now = nowOverride ? new Date(nowOverride) : new Date();
  const { year: ty, month: tm, day: td } = getVancouverDate(now);
  const { year: ry, month: rm, day: rd } = getVancouverDate(new Date(reminderAt));
  return Date.UTC(ry, rm, rd) < Date.UTC(ty, tm, td) ? 'overdue' : 'today';
}

// Format a stored reminder timestamp for display (e.g., "Jun 22")
export function formatReminderDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-CA', {
    timeZone: 'America/Vancouver',
    month: 'short',
    day: 'numeric',
  });
}

// Detect a reminder date from note text using conservative patterns.
// Returns a local-time Date (Vancouver "today"-relative) or null.
// Month-name references resolve to the current year only — months already
// past never trigger (no rollover to next year), per the design spec.
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: sequential pattern matching is clearer inline
export function detectReminderDate(text: string, now = new Date()): Date | null {
  const lower = text.toLowerCase();
  const { year, month, day } = getVancouverDate(now);
  const todayLocal = new Date(year, month, day);
  const yesterday = new Date(todayLocal);
  yesterday.setDate(yesterday.getDate() - 1);

  const isStale = (d: Date) => d <= yesterday;

  // Pattern 1: intent + "in N days/weeks/months"
  // e.g. "call back in 2 weeks", "follow up in 3 days", "try again in a month"
  const relMatch = lower.match(
    /(?:call(?:ing)?(?:\s+back)?|follow(?:\s*up)?|try(?:\s+again)?|reach(?:\s+out)?|contact(?:\s+again)?|check(?:\s+back)?)\s+in\s+(\d+|an?)\s+(day|week|month)s?/
  );
  if (relMatch) {
    const n = relMatch[1] === 'a' || relMatch[1] === 'an' ? 1 : Number.parseInt(relMatch[1], 10);
    const unit = relMatch[2];
    const d = new Date(todayLocal);
    if (unit === 'day') {
      d.setDate(d.getDate() + n);
    } else if (unit === 'week') {
      d.setDate(d.getDate() + n * 7);
    } else {
      d.setMonth(d.getMonth() + n);
    }
    if (!isStale(d)) {
      return d;
    }
  }

  // Pattern 2: "not ready until [month]" or "after [month]" — 1st of that month.
  // Bare "in [month]" does NOT trigger.
  const monthCtxMatch = lower.match(
    new RegExp(`(?:not\\s+ready\\s+until|after|until)\\s+(${MONTH_PATTERN})`)
  );
  if (monthCtxMatch) {
    const mIdx = MONTH_NAMES.indexOf(monthCtxMatch[1]);
    const d = new Date(year, mIdx, 1);
    if (!isStale(d)) {
      return d;
    }
  }

  // Pattern 3: "end of [month]" or "end of this/next month" — last day of month
  const endOfMonth = lower.match(
    new RegExp(`end\\s+of\\s+(?:the\\s+)?(?:(next\\s+month|this\\s+month)|(${MONTH_PATTERN}))`)
  );
  if (endOfMonth) {
    let targetMonth = month;
    let targetYear = year;
    if (endOfMonth[1]?.startsWith('next')) {
      targetMonth = month + 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear++;
      }
    } else if (!endOfMonth[1]) {
      targetMonth = MONTH_NAMES.indexOf(endOfMonth[2]);
    }
    const lastDay = new Date(targetYear, targetMonth + 1, 0);
    if (!isStale(lastDay)) {
      return lastDay;
    }
  }

  // Pattern 4: "beginning/start of [month]" or "beginning of next month" — 1st of month
  const startOfMonth = lower.match(
    new RegExp(`(?:beginning|start)\\s+of\\s+(?:the\\s+)?(?:(next\\s+month)|(${MONTH_PATTERN}))`)
  );
  if (startOfMonth) {
    let targetMonth: number;
    let targetYear = year;
    if (startOfMonth[1]) {
      targetMonth = month + 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear++;
      }
    } else {
      targetMonth = MONTH_NAMES.indexOf(startOfMonth[2]);
    }
    const d = new Date(targetYear, targetMonth, 1);
    if (!isStale(d)) {
      return d;
    }
  }

  // Pattern 5: "next week" → +7 days
  if (/next\s+week/.test(lower)) {
    const d = new Date(todayLocal);
    d.setDate(d.getDate() + 7);
    if (!isStale(d)) {
      return d;
    }
  }

  // Pattern 6: "next month" → +1 month
  if (/next\s+month/.test(lower)) {
    const d = new Date(todayLocal);
    d.setMonth(d.getMonth() + 1);
    if (!isStale(d)) {
      return d;
    }
  }

  return null;
}
