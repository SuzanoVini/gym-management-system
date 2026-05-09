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
