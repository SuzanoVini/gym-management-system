export interface PersonKey {
  name: string;
  email: string;
}

export function normalizePersonKey(
  name: string,
  email: string | null | undefined
): PersonKey | null {
  const normEmail = (email ?? '').trim().toLowerCase();
  if (!normEmail) {
    return null;
  }
  const normName = name.trim().toLowerCase().replace(/\s+/g, ' ');
  return { name: normName, email: normEmail };
}

export function personKeyString(key: PersonKey): string {
  return `${key.name}|${key.email}`;
}

/**
 * Escape ILIKE wildcard characters so a name lookup can't be misinterpreted
 * as a pattern (a literal "%" or "_" in someone's name would otherwise match
 * unrelated rows).
 */
export function escapeIlike(value: string): string {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`);
}
