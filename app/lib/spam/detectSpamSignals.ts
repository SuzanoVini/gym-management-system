import { normalizeEmail, normalizePhone } from './normalize';

export type SpamSignal =
  | 'phone_foreign_format'
  | 'email_long_digit_run'
  | 'matches_spam_contact'
  | 'name_single_word'
  | 'name_short_or_slang_word';

const STRONG: ReadonlySet<string> = new Set([
  'phone_foreign_format',
  'email_long_digit_run',
  'matches_spam_contact',
]);

export const SPAM_SIGNAL_LABELS: Record<SpamSignal, string> = {
  phone_foreign_format: 'Phone number is in a foreign format (starts with 0 or +92)',
  email_long_digit_run: 'Email contains a long string of digits',
  matches_spam_contact: 'Same email or phone as a booking already marked as spam',
  name_single_word: 'Name is a single word',
  name_short_or_slang_word: 'Name contains a very short or slang word',
};

export interface SpamContacts {
  emails: Set<string>;
  phones: Set<string>;
}

const NAME_PARTICLES = new Set([
  'da',
  'de',
  'do',
  'dos',
  'das',
  'di',
  'du',
  'e',
  'y',
  'la',
  'le',
  'van',
  'von',
  'del',
  'dal',
]);
const SLANG_WORDS = new Set(['bro', 'bruh', 'bg', 'test', 'asdf', 'xx', 'lol']);
const MIN_GROUP_PHONE_DIGITS = 7;

export function buildSpamContacts(
  rows: { email_normalized?: string | null; phone_normalized?: string | null }[]
): SpamContacts {
  const emails = new Set<string>();
  const phones = new Set<string>();
  for (const row of rows) {
    if (row.email_normalized) {
      emails.add(row.email_normalized);
    }
    if (row.phone_normalized && row.phone_normalized.length >= MIN_GROUP_PHONE_DIGITS) {
      phones.add(row.phone_normalized);
    }
  }
  return { emails, phones };
}

function isForeignPhone(raw: string | null | undefined): boolean {
  const trimmed = (raw ?? '').trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    return false;
  }
  return digits.startsWith('0') || trimmed.startsWith('+92');
}

function isNorthAmericanPhoneShape(run: string): boolean {
  return (run.length === 10 && /^[2-9]/.test(run)) || (run.length === 11 && /^1[2-9]/.test(run));
}

function hasLongDigitRun(email: string | null | undefined): boolean {
  const local = (email ?? '').split('@')[0] ?? '';
  const runs = local.match(/\d+/g) ?? [];
  return runs.some((run) => run.length >= 5 && !isNorthAmericanPhoneShape(run));
}

function hasShortOrSlangWord(words: string[]): boolean {
  return words.some((word, index) => {
    const bare = word.replace(/\.$/, '').toLowerCase();
    if (SLANG_WORDS.has(bare)) {
      return true;
    }
    if (!/^\p{L}{1,2}$/u.test(bare) || NAME_PARTICLES.has(bare)) {
      return false;
    }
    const isInitial = bare.length === 1 && index < words.length - 1;
    return !isInitial;
  });
}

export function detectSpamSignals(
  intro: { name: string; email?: string | null; phone?: string | null },
  spamContacts: SpamContacts
): SpamSignal[] {
  const signals: SpamSignal[] = [];
  if (isForeignPhone(intro.phone)) {
    signals.push('phone_foreign_format');
  }
  if (hasLongDigitRun(intro.email)) {
    signals.push('email_long_digit_run');
  }
  const email = normalizeEmail(intro.email);
  const phone = normalizePhone(intro.phone);
  if (
    (email && spamContacts.emails.has(email)) ||
    (phone && phone.length >= MIN_GROUP_PHONE_DIGITS && spamContacts.phones.has(phone))
  ) {
    signals.push('matches_spam_contact');
  }
  const words = intro.name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    signals.push('name_single_word');
  }
  if (hasShortOrSlangWord(words)) {
    signals.push('name_short_or_slang_word');
  }
  return signals;
}

export function spamLevel(intro: {
  spam_signals?: string[] | null;
  spam_warning_dismissed_at?: string | null;
  is_spam?: boolean | null;
}): 'strong' | 'weak' | null {
  const signals = intro.spam_signals ?? [];
  if (intro.is_spam || intro.spam_warning_dismissed_at || signals.length === 0) {
    return null;
  }
  return signals.some((s) => STRONG.has(s)) ? 'strong' : 'weak';
}
