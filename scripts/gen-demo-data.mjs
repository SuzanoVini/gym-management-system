// Generates fictional, internally consistent CSVs for every import in the app.
// Usage: node gen-demo-data.mjs <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });

// Seeded PRNG so reruns produce identical files.
let seed = 20261014;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

const TODAY = new Date(Date.UTC(2026, 9, 14));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const writeCsv = (file, headers, rows) => {
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(',')),
  ];
  writeFileSync(join(OUT, file), `${lines.join('\n')}\n`);
  console.log(`${file}: ${rows.length} rows`);
};

// ---- People -------------------------------------------------------------
const FIRST = [
  'Liam',
  'Olivia',
  'Noah',
  'Emma',
  'Ethan',
  'Ava',
  'Lucas',
  'Mia',
  'Mateo',
  'Sofia',
  'Aiden',
  'Chloe',
  'Leo',
  'Zoe',
  'Owen',
  'Isla',
  'Kai',
  'Nora',
  'Ezra',
  'Maya',
  'Hugo',
  'Leah',
  'Jonah',
  'Aria',
  'Felix',
  'Hana',
  'Theo',
  'Priya',
  'Arjun',
  'Yuki',
  'Diego',
  'Lucia',
  'Marco',
  'Elena',
  'Sami',
  'Amira',
  'Omar',
  'Nadia',
  'Ravi',
  'Mei',
  'Caleb',
  'Ivy',
  'Gabriel',
  'Clara',
  'Jasper',
  'Freya',
  'Rowan',
  'Talia',
  'Wesley',
  'Iris',
  'Declan',
  'Esme',
  'Tomas',
  'Ines',
  'Rafael',
  'Bianca',
  'Kenji',
  'Aiko',
  'Andre',
  'Lena',
];
const LAST = [
  'Anderson',
  'Bennett',
  'Carvalho',
  'Dubois',
  'Ellison',
  'Fischer',
  'Garcia',
  'Hayes',
  'Ito',
  'Jensen',
  'Kowalski',
  'Lindqvist',
  'Moreau',
  'Nakamura',
  'Okafor',
  'Patel',
  'Quinn',
  'Rossi',
  'Santos',
  'Tanaka',
  'Ueda',
  'Varga',
  'Whitfield',
  'Xu',
  'Yilmaz',
  'Zimmer',
  'Abbott',
  'Brennan',
  'Castillo',
  'Dalton',
  'Esposito',
  'Fontaine',
  'Greer',
  'Holloway',
  'Ibarra',
  'Jovanovic',
  'Kaur',
  'Larsen',
  'Mendes',
  'Novak',
  'Oliveira',
  'Petrov',
  'Ramirez',
  'Sinclair',
  'Thornton',
  'Valdez',
  'Weston',
  'Young',
  'Zhou',
  'Morrison',
];
const usedNames = new Set();
const newName = () => {
  for (;;) {
    const n = `${pick(FIRST)} ${pick(LAST)}`;
    if (!usedNames.has(n)) {
      usedNames.add(n);
      return n;
    }
  }
};
let phoneSeq = 0;
// 555-01xx is the reserved fictional block in North America.
const newPhone = () => {
  const area = ['604', '778', '236'][Math.floor(phoneSeq / 100) % 3];
  const tail = String(phoneSeq % 100).padStart(2, '0');
  phoneSeq++;
  return `${area}-555-01${tail}`;
};
const DOMAINS = ['example.com', 'example.net', 'example.org'];
const emailFor = (name) =>
  `${name
    .toLowerCase()
    .replace(/[^a-z ]/g, '')
    .split(' ')
    .join('.')}@${pick(DOMAINS)}`;

// Program decides class, age category and membership label.
const PROGRAMS = [
  {
    w: 50,
    age: 'Adult',
    classes: ['GB1', 'GB1', 'GB 1/2', 'No Gi', 'Jiu-Jitsu Drills', 'MUAY THAI'],
    times: ['6:30 AM', '12:00 PM', '6:00 PM', '7:15 PM'],
    label: 'Adult',
  },
  { w: 10, age: 'Adult', classes: ["Women's"], times: ['10:00 AM', '6:00 PM'], label: 'Adult' },
  {
    w: 14,
    age: '3-6 YO',
    classes: ['Kids 3 - 6 yo', 'Kids & Parents'],
    times: ['4:00 PM', '9:30 AM'],
    label: 'Kids',
  },
  {
    w: 14,
    age: '7-9 YO',
    classes: ['Kids 7 - 9 yo', 'Kids 6 - 8 yo'],
    times: ['4:45 PM', '10:15 AM'],
    label: 'Kids',
  },
  {
    w: 12,
    age: '10-15 YO',
    classes: ['Juniors & Teens'],
    times: ['5:30 PM', '11:00 AM'],
    label: 'Youth',
  },
];
const pickProgram = () => {
  let r = rand() * 100;
  for (const p of PROGRAMS) {
    r -= p.w;
    if (r < 0) {
      return p;
    }
  }
  return PROGRAMS[0];
};
const PLANS = [
  'Legacy',
  'Legacy',
  'Integrity',
  'Integrity',
  'Integrity',
  'Special',
  'Flex 10',
  'Flex 20',
];
const TERMS = ['Monthly', 'Monthly', 'Annual', 'Semi-Annual'];
const membershipLabel = (plan, prog) =>
  plan.startsWith('Flex') ? `${plan} ${prog.label}` : `${plan} ${prog.label} ${pick(TERMS)}`;

const STAFF = [
  'Ana Torres',
  'Ben Carter',
  'Chloe Nguyen',
  'Diego Ramos',
  'Emma Walsh',
  'Felipe Costa',
];

// Recent intros often have no outcome yet, which is what feeds Follow-Ups.
function introOutcome(date) {
  if (date > TODAY) {
    return { attended: '', signed: '' };
  }
  const recent = (TODAY - date) / 86400000 < 12;
  if (recent && chance(0.5)) {
    return { attended: '', signed: '' };
  }
  const attended = chance(0.78) ? 'Yes' : 'No';
  if (attended !== 'Yes') {
    return { attended, signed: '' };
  }
  if (!recent) {
    return { attended, signed: chance(0.5) ? 'Yes' : 'No' };
  }
  return { attended, signed: chance(0.3) ? 'Yes' : '' };
}

// ---- Intros (Jan 1 - Oct 31 2026; anything after today is still booked) --
const intros = [];
const signups = [];
const INTRO_MONTHLY = [16, 19, 24, 22, 20, 17, 15, 18, 28, 26]; // Jan..Oct, September back-to-school peak
INTRO_MONTHLY.forEach((count, m) => {
  for (let i = 0; i < count; i++) {
    const daysInMonth = new Date(Date.UTC(2026, m + 1, 0)).getUTCDate();
    const date = new Date(Date.UTC(2026, m, int(1, daysInMonth)));
    const prog = pickProgram();
    const name = newName();
    const { attended, signed } = introOutcome(date);
    const person = { name, prog, email: emailFor(name), phone: newPhone() };
    intros.push({
      _d: date,
      MONTH: MONTHS[m],
      DATE: date.getUTCDate(),
      TIME: pick(prog.times),
      CLASS: pick(prog.classes),
      NAME: name,
      EMAIL: person.email,
      PHONE: person.phone,
      STAFF: pick(STAFF),
      ATTENDED: attended,
      'SIGNED UP': signed,
    });
    if (signed === 'Yes') {
      const sd = addDays(date, int(0, 9));
      if (sd <= TODAY) {
        const plan = pick(PLANS);
        signups.push({
          ...person,
          plan,
          label: membershipLabel(plan, prog),
          _d: sd,
          fromIntro: true,
        });
      }
    }
  }
});

// A class name the app doesn't know yet, to show the resolve-class flow.
for (const idx of [37, 151]) {
  intros[idx].CLASS = 'BJJ Fundamentals';
}

// Bookings that trip the spam heuristics.
const spamRows = [
  {
    NAME: 'Bro',
    EMAIL: 'fastdeals@example.com',
    PHONE: '+92 300 0000123',
    CLASS: 'GB1',
    TIME: '6:00 PM',
    m: 8,
    d: 16,
  },
  {
    NAME: 'Kamran Rq',
    EMAIL: 'kr48812937@example.net',
    PHONE: '0300 000 0456',
    CLASS: 'No Gi',
    TIME: '7:15 PM',
    m: 8,
    d: 16,
  },
  {
    NAME: 'Test User',
    EMAIL: 'tu99102938@example.org',
    PHONE: '604-555-0199',
    CLASS: 'GB1',
    TIME: '12:00 PM',
    m: 9,
    d: 3,
  },
  {
    NAME: 'Asdf',
    EMAIL: 'asdf@example.com',
    PHONE: '+92 311 0000789',
    CLASS: "Women's",
    TIME: '10:00 AM',
    m: 9,
    d: 9,
  },
];
for (const s of spamRows) {
  intros.push({
    _d: new Date(Date.UTC(2026, s.m, s.d)),
    MONTH: MONTHS[s.m],
    DATE: s.d,
    TIME: s.TIME,
    CLASS: s.CLASS,
    NAME: s.NAME,
    EMAIL: s.EMAIL,
    PHONE: s.PHONE,
    STAFF: '',
    ATTENDED: '',
    'SIGNED UP': '',
  });
}

// ---- Long-standing roster (joined 2022-2025) ---------------------------
const roster = [];
for (let i = 0; i < 140; i++) {
  const name = newName();
  const prog = pickProgram();
  const plan = pick(PLANS);
  roster.push({
    name,
    prog,
    plan,
    label: membershipLabel(plan, prog),
    email: emailFor(name),
    phone: newPhone(),
    _d: new Date(Date.UTC(int(2022, 2025), int(0, 11), int(1, 28))),
  });
}
// A few walk-in sign-ups in 2026 who never booked an intro.
for (let i = 0; i < 8; i++) {
  const name = newName();
  const prog = pickProgram();
  const plan = pick(PLANS);
  signups.push({
    name,
    prog,
    plan,
    label: membershipLabel(plan, prog),
    email: emailFor(name),
    phone: newPhone(),
    _d: new Date(Date.UTC(2026, int(0, 9), int(1, 13))),
    fromIntro: false,
  });
}
signups.sort((a, b) => a._d - b._d);

// ---- Cancellations (2026) ----------------------------------------------
const REASONS = [
  'No time',
  'No time',
  'Moving',
  'Injury',
  'Financial',
  'Financial',
  'No interest',
  'Try new sport',
  'Other Gym',
  'Distance from work',
  'Overdue',
  'Medical reason',
];
const NOTES = {
  'No time': 'New job schedule',
  Moving: 'Relocating to Toronto',
  Injury: 'Knee surgery, may return in spring',
  Financial: 'Asked to be contacted in 3 months',
  'Try new sport': 'Switching to climbing',
  'Other Gym': 'Closer to home',
  'Medical reason': 'Doctor advised a break',
};
const cancelled = new Map();
const cancelPool = [
  ...roster.slice(0, 30),
  ...signups.filter((s) => s._d < new Date(Date.UTC(2026, 6, 1))).slice(0, 8),
];
for (const p of cancelPool) {
  const earliest =
    p._d.getUTCFullYear() < 2026 ? new Date(Date.UTC(2026, 0, 5)) : addDays(p._d, 45);
  const span = Math.max(1, Math.floor((TODAY - earliest) / 86400000));
  const d = addDays(earliest, int(0, span));
  if (d > TODAY) {
    continue;
  }
  const reason = pick(REASONS);
  cancelled.set(p.name, { p, d, reason });
}
const cancellations = [...cancelled.values()]
  .sort((a, b) => a.d - b.d)
  .map(({ p, d, reason }) => ({
    MONTH: MONTHS[d.getUTCMonth()],
    NAME: p.name,
    'CANCELLATION DATE': d.getUTCDate(),
    REASON: reason,
    'AGE CATEGORY': p.prog.age,
    NOTES: chance(0.6) ? (NOTES[reason] ?? '') : '',
  }));

// Two former members who booked a new intro after cancelling (shows the ⚠ flag).
const returning = [...cancelled.values()]
  .filter((c) => c.d < new Date(Date.UTC(2026, 5, 1)))
  .slice(0, 2);
for (const { p, d } of returning) {
  const date = addDays(d, int(60, 100));
  if (date > TODAY) {
    continue;
  }
  intros.push({
    _d: date,
    MONTH: MONTHS[date.getUTCMonth()],
    DATE: date.getUTCDate(),
    TIME: pick(p.prog.times),
    CLASS: pick(p.prog.classes),
    NAME: p.name,
    EMAIL: p.email,
    PHONE: p.phone,
    STAFF: pick(STAFF),
    ATTENDED: 'Yes',
    'SIGNED UP': '',
  });
}
intros.sort((a, b) => a._d - b._d);

// ---- Holds -------------------------------------------------------------
const HOLD_REASONS = ['Injury', 'Illness', 'Travel', 'Travel', 'Break Time', 'Work'];
const holds = [];
const holdPool = [...roster.slice(30, 60), ...signups.slice(0, 10)].filter(
  (p) => !cancelled.has(p.name)
);
for (const p of holdPool.slice(0, 26)) {
  const start = addDays(new Date(Date.UTC(2026, 0, 3)), int(0, 300)); // some still active or upcoming
  const end = addDays(start, pick([14, 21, 30, 30, 45, 60]));
  const reason = pick(HOLD_REASONS);
  holds.push({
    _s: start,
    _e: end,
    _p: p,
    MONTH: MONTHS[start.getUTCMonth()],
    NAME: p.name,
    'START DATE': iso(start),
    'END DATE': iso(end),
    REASON: reason,
    FEE: reason === 'Injury' || reason === 'Illness' ? 'Waived' : '$25',
  });
}
holds.sort((a, b) => a._s - b._s);

// ---- Members (Zen Planner-style roster export) -------------------------
const onHoldNow = new Set(holds.filter((h) => h._s <= TODAY && h._e >= TODAY).map((h) => h.NAME));
const members = [...roster, ...signups].map((p) => {
  const [first, ...rest] = p.name.split(' ');
  let status = 'CURRENT';
  if (cancelled.has(p.name)) {
    status = chance(0.5) ? 'CANCELLED' : 'EXPIRED';
  } else if (onHoldNow.has(p.name)) {
    status = 'HOLD';
  } else if (p._d > addDays(TODAY, -3)) {
    status = 'NOT STARTED';
  }
  return {
    'First Name': first,
    'Last Name': rest.join(' '),
    Email: p.email,
    Phone: p.phone,
    'Signup Date': iso(p._d),
    'Membership Label': p.label,
    'Mbr. Status': status,
  };
});

// ---- Write -------------------------------------------------------------
writeCsv(
  'intros-2026.csv',
  ['MONTH', 'DATE', 'TIME', 'CLASS', 'NAME', 'EMAIL', 'PHONE', 'STAFF', 'ATTENDED', 'SIGNED UP'],
  intros
);
writeCsv(
  'signups-2026.csv',
  ['MONTH', 'DATE', 'NAME', 'MEMBERSHIP', '1ST PAYMENT DATE', 'SIGN-UP PACKAGE?', 'NOTES'],
  signups.map((s) => ({
    MONTH: MONTHS[s._d.getUTCMonth()],
    DATE: s._d.getUTCDate(),
    NAME: s.name,
    MEMBERSHIP: s.plan,
    '1ST PAYMENT DATE': iso(addDays(s._d, pick([0, 0, 1, 7, 14]))),
    'SIGN-UP PACKAGE?': chance(0.6) ? 'Yes' : 'No',
    NOTES: s.fromIntro ? (chance(0.25) ? 'Referred by a friend' : '') : 'Walk-in, no intro class',
  }))
);
writeCsv('holds-2026.csv', ['MONTH', 'NAME', 'START DATE', 'END DATE', 'REASON', 'FEE'], holds);
writeCsv(
  'cancellations-2026.csv',
  ['MONTH', 'NAME', 'CANCELLATION DATE', 'REASON', 'AGE CATEGORY', 'NOTES'],
  cancellations
);
writeCsv(
  'members.csv',
  ['First Name', 'Last Name', 'Email', 'Phone', 'Signup Date', 'Membership Label', 'Mbr. Status'],
  members
);

// ---- Payroll -----------------------------------------------------------
const staffRows = STAFF.map((n, i) => {
  const [first, last] = n.split(' ');
  return {
    'Payroll ID': `EMP-${String(101 + i)}`,
    'First Name': first,
    'Last Name': last,
    'Job Title': i === 0 ? 'Head Instructor' : i < 4 ? 'Instructor' : 'Front Desk',
    Department: i < 4 ? 'Coaching' : 'Operations',
  };
});
writeCsv(
  'payroll-staff.csv',
  ['Payroll ID', 'First Name', 'Last Name', 'Job Title', 'Department'],
  staffRows
);
const hoursRows = [];
for (
  let d = new Date(Date.UTC(2026, 9, 1));
  d <= new Date(Date.UTC(2026, 9, 15));
  d = addDays(d, 1)
) {
  const dow = d.getUTCDay();
  if (dow === 0) {
    continue;
  }
  for (const s of staffRows) {
    if (chance(0.25)) {
      continue;
    }
    const id = s['Payroll ID'];
    const asp = s['Job Title'] === 'Front Desk' && dow >= 1 && dow <= 5 && chance(0.4);
    hoursRows.push({
      'Payroll ID': id,
      Date: iso(d),
      Hours: asp ? 3 : pick([2, 3.5, 4, 5.25, 6, 8]),
      Type: chance(0.06) ? 'overtime' : 'regular',
      Notes: asp ? 'ASP pickup' : '',
    });
  }
}
writeCsv(
  'payroll-hours-2026-10-01.csv',
  ['Payroll ID', 'Date', 'Hours', 'Type', 'Notes'],
  hoursRows
);
