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
  const [y, m, d] = dateString.split('-');
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  // Probe noon UTC on that day to find the Vancouver UTC offset (DST-safe)
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const fmt = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Vancouver',
    timeZoneName: 'shortOffset',
  });
  const tzPart = fmt.formatToParts(probe).find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-7';
  const match = tzPart.match(/GMT([+-])(\d+)/);
  const offsetHours = match
    ? Number.parseInt(match[2] ?? '7', 10) * (match[1] === '+' ? 1 : -1)
    : -7;
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

interface ReminderContext {
  lower: string;
  year: number;
  month: number;
  todayLocal: Date;
}

function nextMonthOf(year: number, month: number): { year: number; month: number } {
  return month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
}

// Pattern 1: intent + "in N days/weeks/months"
// e.g. "call back in 2 weeks", "follow up in 3 days", "try again in a month"
function matchRelativeIntent({ lower, todayLocal }: ReminderContext): Date | null {
  const relMatch = lower.match(
    /(?:call(?:ing)?(?:\s+back)?|follow(?:\s*up)?|try(?:\s+again)?|reach(?:\s+out)?|contact(?:\s+again)?|check(?:\s+back)?)\s+in\s+(\d+|an?)\s+(day|week|month)s?/
  );
  if (!relMatch) {
    return null;
  }
  const qty = relMatch[1] ?? '';
  const n = qty === 'a' || qty === 'an' ? 1 : Number.parseInt(qty, 10);
  const unit = relMatch[2];
  const d = new Date(todayLocal);
  if (unit === 'day') {
    d.setDate(d.getDate() + n);
  } else if (unit === 'week') {
    d.setDate(d.getDate() + n * 7);
  } else {
    d.setMonth(d.getMonth() + n);
  }
  return d;
}

// Pattern 2: "not ready until [month]" or "after [month]" — 1st of that month.
// Bare "in [month]" does NOT trigger.
function matchUntilMonth({ lower, year }: ReminderContext): Date | null {
  const monthCtxMatch = lower.match(
    new RegExp(`(?:not\\s+ready\\s+until|after|until)\\s+(${MONTH_PATTERN})`)
  );
  if (!monthCtxMatch) {
    return null;
  }
  const mIdx = MONTH_NAMES.indexOf(monthCtxMatch[1] ?? '');
  return mIdx >= 0 ? new Date(year, mIdx, 1) : null;
}

// Pattern 3: "end of [month]" or "end of this/next month" — last day of month
function matchEndOfMonth({ lower, year, month }: ReminderContext): Date | null {
  const endOfMonth = lower.match(
    new RegExp(`end\\s+of\\s+(?:the\\s+)?(?:(next\\s+month|this\\s+month)|(${MONTH_PATTERN}))`)
  );
  if (!endOfMonth) {
    return null;
  }
  let target = { year, month };
  if (endOfMonth[1]?.startsWith('next')) {
    target = nextMonthOf(year, month);
  } else if (!endOfMonth[1]) {
    target = { year, month: MONTH_NAMES.indexOf(endOfMonth[2] ?? '') };
  }
  return target.month >= 0 ? new Date(target.year, target.month + 1, 0) : null;
}

// Pattern 4: "beginning/start of [month]" or "beginning of next month" — 1st of month
function matchStartOfMonth({ lower, year, month }: ReminderContext): Date | null {
  const startOfMonth = lower.match(
    new RegExp(`(?:beginning|start)\\s+of\\s+(?:the\\s+)?(?:(next\\s+month)|(${MONTH_PATTERN}))`)
  );
  if (!startOfMonth) {
    return null;
  }
  const target = startOfMonth[1]
    ? nextMonthOf(year, month)
    : { year, month: MONTH_NAMES.indexOf(startOfMonth[2] ?? '') };
  return target.month >= 0 ? new Date(target.year, target.month, 1) : null;
}

// Pattern 5: "next week" → +7 days
function matchNextWeek({ lower, todayLocal }: ReminderContext): Date | null {
  if (!/next\s+week/.test(lower)) {
    return null;
  }
  const d = new Date(todayLocal);
  d.setDate(d.getDate() + 7);
  return d;
}

// Pattern 6: "next month" → +1 month
function matchNextMonth({ lower, todayLocal }: ReminderContext): Date | null {
  if (!/next\s+month/.test(lower)) {
    return null;
  }
  const d = new Date(todayLocal);
  d.setMonth(d.getMonth() + 1);
  return d;
}

const REMINDER_MATCHERS = [
  matchRelativeIntent,
  matchUntilMonth,
  matchEndOfMonth,
  matchStartOfMonth,
  matchNextWeek,
  matchNextMonth,
];

// Detect a reminder date from note text using conservative patterns.
// Returns a local-time Date (Vancouver "today"-relative) or null.
// Month-name references resolve to the current year only — months already
// past never trigger (no rollover to next year), per the design spec.
// Patterns are tried in order; a stale match falls through to the next one.
export function detectReminderDate(text: string, now = new Date()): Date | null {
  const { year, month, day } = getVancouverDate(now);
  const todayLocal = new Date(year, month, day);
  const yesterday = new Date(todayLocal);
  yesterday.setDate(yesterday.getDate() - 1);

  const ctx: ReminderContext = { lower: text.toLowerCase(), year, month, todayLocal };
  for (const match of REMINDER_MATCHERS) {
    const d = match(ctx);
    if (d && d > yesterday) {
      return d;
    }
  }
  return null;
}
