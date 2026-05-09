export function addBusinessDays(
  start: Date,
  days: number,
  isHoliday?: (date: Date) => boolean
): Date {
  const result = new Date(start);
  let remaining = days;

  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const day = result.getUTCDay();
    const isWeekend = day === 0 || day === 6;
    const isHol = isHoliday ? isHoliday(result) : false;
    if (!isWeekend && !isHol) {
      remaining--;
    }
  }

  return result;
}
