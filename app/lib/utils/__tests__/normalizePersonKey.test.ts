import { normalizePersonKey, personKeyString } from '@/lib/utils/normalizePersonKey';

describe('normalizePersonKey', () => {
  it('returns null when email is empty', () => {
    expect(normalizePersonKey('Jane Doe', '')).toBeNull();
    expect(normalizePersonKey('Jane Doe', null)).toBeNull();
    expect(normalizePersonKey('Jane Doe', undefined)).toBeNull();
    expect(normalizePersonKey('Jane Doe', '   ')).toBeNull();
  });

  it('normalizes name: trim, lowercase, collapse spaces', () => {
    const key = normalizePersonKey('  Jane   Doe  ', 'jane@example.com');
    expect(key?.name).toBe('jane doe');
  });

  it('normalizes email: trim, lowercase', () => {
    const key = normalizePersonKey('Jane Doe', '  Jane@Example.COM  ');
    expect(key?.email).toBe('jane@example.com');
  });

  it('returns matching keys for same person with different casing', () => {
    const a = normalizePersonKey('Jane Doe', 'jane@example.com');
    const b = normalizePersonKey('JANE DOE', 'JANE@EXAMPLE.COM');
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.name).toBe(b!.name);
    expect(a!.email).toBe(b!.email);
  });

  it('returns different keys for same email but different name (parent/child)', () => {
    const parent = normalizePersonKey('Maria Santos', 'family@example.com');
    const child = normalizePersonKey('Lucas Santos', 'family@example.com');
    expect(parent!.name).not.toBe(child!.name);
  });
});

describe('personKeyString', () => {
  it('returns a stable string for a person key', () => {
    const key = normalizePersonKey('Jane Doe', 'jane@example.com')!;
    expect(personKeyString(key)).toBe('jane doe|jane@example.com');
  });
});
