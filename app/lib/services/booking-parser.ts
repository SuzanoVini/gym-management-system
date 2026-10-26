export interface ParsedBooking {
  className: string;
  month: string;
  date: number;
  year: number;
  time: string;
  staff: string;
  name: string;
  phone: string | null;
  email: string | null;
}

const MONTH_SHORT: Record<string, string> = {
  January: 'Jan',
  February: 'Feb',
  March: 'Mar',
  April: 'Apr',
  May: 'May',
  June: 'Jun',
  July: 'Jul',
  August: 'Aug',
  September: 'Sep',
  October: 'Oct',
  November: 'Nov',
  December: 'Dec',
};

export const MONTH_TO_NUM: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

// Value on the `Label:` line, '' when the label is there but blank, undefined when the label
// is missing. The value never runs past the end of its own line: `\s*` would swallow the line
// break after a blank field and capture the next line ("Staff:" picking up "Name: ...").
function fieldValue(text: string, label: string): string | undefined {
  return text.match(new RegExp(`\\b${label}:[ \\t]*(.*)$`, 'm'))?.[1]?.trim();
}

// "September 4, 2026" -> [month name, day, year]
function matchBookingDate(value: string): [string, string, string] | null {
  const dateMatch = value.match(/^(\w+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (!dateMatch?.[1] || !dateMatch?.[2] || !dateMatch?.[3]) {
    return null;
  }
  return [dateMatch[1], dateMatch[2], dateMatch[3]];
}

export function parseBookingEmail(text: string): ParsedBooking | null {
  const type = fieldValue(text, 'Type');
  const bookingDate = matchBookingDate(fieldValue(text, 'Date') ?? '');
  const time = fieldValue(text, 'Time')?.match(/^[\d:]+\s*[APMapm]+$/)?.[0];
  // Staff may be blank (booked without a coach), but the line itself must be there
  const staff = fieldValue(text, 'Staff');
  const name = fieldValue(text, 'Name');

  if (!type || !bookingDate || !time || staff === undefined || !name) {
    return null;
  }

  const [fullMonth, day, year] = bookingDate;

  return {
    className: type,
    month: MONTH_SHORT[fullMonth] ?? fullMonth.slice(0, 3),
    date: parseInt(day, 10),
    year: parseInt(year, 10),
    time,
    staff,
    name,
    phone: fieldValue(text, 'Phone') || null,
    email: fieldValue(text, 'Email') || null,
  };
}
