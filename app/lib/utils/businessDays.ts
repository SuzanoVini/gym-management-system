export function addBusinessDays(
  start: Date,
  days: number,
  isHoliday?: (date: Date) => boolean
): Date {
  const result = new Date(start);
  let daysLeft = days;

  while (daysLeft > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const day = result.getUTCDay();
    const isWeekend = day === 0 || day === 6;
    const isHolidayDay = isHoliday ? isHoliday(result) : false;
    if (!isWeekend && !isHolidayDay) {
      daysLeft--;
    }
  }

  return result;
}

/** Count of weekdays strictly between two dates (0 if end <= start). */
export function businessDaysBetween(start: Date, end: Date): number {
  if (end <= start) {
    return 0;
  }
  let count = 0;
  const cur = new Date(start);
  while (cur < end) {
    cur.setUTCDate(cur.getUTCDate() + 1);
    const day = cur.getUTCDay();
    if (day !== 0 && day !== 6 && cur <= end) {
      count++;
    }
  }
  return count;
}
