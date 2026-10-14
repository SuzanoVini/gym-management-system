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

// Extract a field value from the email body, stopping at line boundaries and stripping \r
function extractField(text: string, label: string): string | null {
  const match = text.match(new RegExp(`${label}:\\s*([^\r\n]+)`));
  const value = match?.[1]?.trim().replace(/\r$/, '') ?? null;
  return value || null;
}

// First capture group of `pattern` in the email body, if any.
function captureGroup(text: string, pattern: RegExp): string | undefined {
  return text.match(pattern)?.[1];
}

// "Date: September 4, 2026" -> [month name, day, year]
function matchBookingDate(text: string): [string, string, string] | null {
  const dateMatch = text.match(/Date:\s*(\w+)\s+(\d{1,2}),\s*(\d{4})/);
  if (!dateMatch?.[1] || !dateMatch?.[2] || !dateMatch?.[3]) {
    return null;
  }
  return [dateMatch[1], dateMatch[2], dateMatch[3]];
}

export function parseBookingEmail(text: string): ParsedBooking | null {
  const type = captureGroup(text, /Type:\s*([^\r\n]+)/);
  const bookingDate = matchBookingDate(text);
  const time = captureGroup(text, /Time:\s*([\d:]+\s*[APMapm]+)/);
  const staff = captureGroup(text, /Staff:\s*([^\r\n]+)/);
  const name = captureGroup(text, /Name:\s*([^\r\n]+)/);
  const phone = extractField(text, 'Phone');
  const email = extractField(text, 'Email');

  if (!type || !bookingDate || !time || !staff || !name) {
    return null;
  }

  const typeLine = type.trim();
  const [fullMonth, day, year] = bookingDate;

  return {
    className: typeLine,
    month: MONTH_SHORT[fullMonth] ?? fullMonth.slice(0, 3),
    date: parseInt(day, 10),
    year: parseInt(year, 10),
    time: time.trim(),
    staff: staff.trim(),
    name: name.trim(),
    phone,
    email,
  };
}
