// Mirrors the generated columns in 20260925000000_add_intro_spam_flagging.sql.
// Change both together; Task 2's parity check compares them.

export function normalizePhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) {
    return null;
  }
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  const value = (raw ?? '').replace(/^ +| +$/g, '').toLowerCase();
  return value === '' ? null : value;
}
