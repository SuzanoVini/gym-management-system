import { canonicalizeStaffName } from '../canonicalizeStaffName';

const STAFF = ['Alpha Instructor', 'Bravo Instructor', 'Charlie Instructor'];

describe('canonicalizeStaffName', () => {
  it('returns exact vocabulary matches unchanged', () => {
    expect(canonicalizeStaffName('Alpha Instructor', STAFF)).toBe('Alpha Instructor');
  });

  it('maps a bare first name to its single full-name match', () => {
    expect(canonicalizeStaffName('Alpha', STAFF)).toBe('Alpha Instructor');
    expect(canonicalizeStaffName('alpha', STAFF)).toBe('Alpha Instructor');
  });

  it('never merges when two entries share a first name', () => {
    const ambiguous = [...STAFF, 'Alpha Helper'];
    expect(canonicalizeStaffName('Alpha', ambiguous)).toBe('Alpha');
  });

  it('returns unknown names unchanged', () => {
    expect(canonicalizeStaffName('Delta', STAFF)).toBe('Delta');
    expect(canonicalizeStaffName('  Delta  ', STAFF)).toBe('Delta');
  });

  it('returns empty input unchanged', () => {
    expect(canonicalizeStaffName('', STAFF)).toBe('');
  });
});
