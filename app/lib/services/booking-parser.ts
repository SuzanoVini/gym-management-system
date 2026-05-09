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

// Maps Zen Planner class type labels to the class names used in the app
const CLASS_MAP: Record<string, string> = {
  'Jiu-Jitsu No Gi (Adults | All Levels)': 'No-Gi',
  'Jiu-Jitsu Fundamentals (Adults | GB1)': 'GB1',
  'Jiu-Jitsu (Adults | GB1 & GB2)': 'GB1',
  'Muay Thai (Adults)': 'Muay Thai',
  'Juniors & Teens (9 - 13 yo)': 'Kids 7-9',
  'Juniors & Teens (9 - 13 yo) - NO GI': 'Kids 7-9',
  'Tiny & Little Champions 1 (Kids 3 - 5 yo)': 'Kids 3-6',
  'Tiny & Little Champions 1 (Kids 3 - 5 yo) - NO GI': 'Kids 3-6',
  "Jiu-Jitsu Women's Only (Adults | All Levels)": "Women's",
};

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

export function parseBookingEmail(text: string): ParsedBooking | null {
  const typeMatch = text.match(/Type:\s*([^\r\n]+)/);
  const dateMatch = text.match(/Date:\s*(\w+)\s+(\d{1,2}),\s*(\d{4})/);
  const timeMatch = text.match(/Time:\s*([\d:]+\s*[APMapm]+)/);
  const staffMatch = text.match(/Staff:\s*([^\r\n]+)/);
  const nameMatch = text.match(/Name:\s*([^\r\n]+)/);
  const phone = extractField(text, 'Phone');
  const email = extractField(text, 'Email');

  if (
    !typeMatch?.[1] ||
    !dateMatch?.[1] ||
    !dateMatch?.[2] ||
    !dateMatch?.[3] ||
    !timeMatch?.[1] ||
    !staffMatch?.[1] ||
    !nameMatch?.[1]
  ) {
    return null;
  }

  const typeLine = typeMatch[1].trim();
  const fullMonth = dateMatch[1];

  return {
    className: CLASS_MAP[typeLine] ?? typeLine,
    month: MONTH_SHORT[fullMonth] ?? fullMonth.slice(0, 3),
    date: parseInt(dateMatch[2], 10),
    year: parseInt(dateMatch[3], 10),
    time: timeMatch[1].trim(),
    staff: staffMatch[1].trim(),
    name: nameMatch[1].trim(),
    phone,
    email,
  };
}
