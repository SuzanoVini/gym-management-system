import { normalizePhone } from '@/lib/spam/normalize';

export interface SearchIndex {
  text: string;
  words: string[];
  digitRuns: string[];
  phones: string[];
}

const COMBINING_MARKS = /[\u0300-\u036f]/g;

export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const present = (v: string | null | undefined): v is string => !!v && v.trim() !== '';

export function buildSearchIndex(
  fields: (string | null | undefined)[],
  phones: (string | null | undefined)[] = []
): SearchIndex {
  const texts = fields.filter(present).map(normalizeText);
  const phoneTexts = phones.filter(present).map(normalizeText);
  const all = [...texts, ...phoneTexts];
  return {
    text: all.join(' | '),
    words: all
      .join(' ')
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean),
    digitRuns: texts.flatMap((t) => t.match(/\d+/g) ?? []),
    phones: phones.map(normalizePhone).filter((p): p is string => !!p),
  };
}

function withinOneEdit(a: string, b: string): boolean {
  if (a === b) {
    return true;
  }
  if (Math.abs(a.length - b.length) > 1) {
    return false;
  }
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    edits++;
    if (edits > 1) {
      return false;
    }
    if (a.length > b.length) {
      i++;
    } else if (b.length > a.length) {
      j++;
    } else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function tokenMatches(index: SearchIndex, token: string): boolean {
  if (index.text.includes(token)) {
    return true;
  }
  const digits = token.replace(/\D/g, '');
  if (!/\p{L}/u.test(token) && digits.length >= 3) {
    const phone = normalizePhone(token) ?? digits;
    if (index.phones.some((p) => p.includes(phone) || p.includes(digits))) {
      return true;
    }
    return token === digits && index.digitRuns.some((run) => run.includes(digits));
  }
  if (/^\p{L}{4,20}$/u.test(token)) {
    return index.words.some(
      (word) => Math.abs(word.length - token.length) <= 1 && withinOneEdit(word, token)
    );
  }
  return false;
}

export function searchMatches(index: SearchIndex, query: string): boolean {
  const normalized = normalizeText(query);
  if (!normalized) {
    return true;
  }
  // A whole query that looks like one phone number ("+1 604 555 0142") is one token.
  const phoneLike = /^[+\d\s().-]+$/.test(normalized) && normalized.replace(/\D/g, '').length >= 7;
  const tokens = phoneLike ? [normalized.replace(/\s+/g, '')] : normalized.split(' ');
  return tokens.every((token) => tokenMatches(index, token));
}
