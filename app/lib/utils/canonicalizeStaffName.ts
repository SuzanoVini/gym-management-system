/**
 * Canonical staff name = full name (mirrors the class_mappings approach).
 * Old Zen Planner booking emails carried bare first names while current ones
 * carry full names, splitting one coach into two ("Alpha" vs "Alpha Instructor").
 *
 * A bare name maps to a vocabulary entry only when it matches the first name
 * of exactly ONE entry — zero or two-plus matches return the name unchanged,
 * so two future coaches sharing a first name are never merged.
 */
export function canonicalizeStaffName(name: string, staffList: string[]): string {
  const trimmed = name.trim();
  if (!trimmed) {
    return name;
  }
  if (staffList.includes(trimmed)) {
    return trimmed;
  }
  const lower = trimmed.toLowerCase();
  const matches = staffList.filter((entry) => entry.trim().toLowerCase().split(/\s+/)[0] === lower);
  return matches.length === 1 && matches[0] ? matches[0] : trimmed;
}
