import { canonicalizeStaffName } from '../canonicalizeStaffName';

const STAFF = ['Staff Member 3', 'Bravo Instructor', 'Charlie Instructor'];

describe('canonicalizeStaffName', () => {
  it('returns exact vocabulary matches unchanged', () => {
    expect(canonicalizeStaffName('Staff Member 3', STAFF)).toBe('Staff Member 3');
  });

  it('maps a bare first name to its single full-name match', () => {
    expect(canonicalizeStaffName('Staff 1', STAFF)).toBe('Staff Member 3');
    expect(canonicalizeStaffName('jack', STAFF)).toBe('Staff Member 3');
  });

  it('never merges when two entries share a first name', () => {
    const ambiguous = [...STAFF, 'Alpha Helper'];
    expect(canonicalizeStaffName('Staff 1', ambiguous)).toBe('Staff 1');
  });

  it('returns unknown names unchanged', () => {
    expect(canonicalizeStaffName('Staff 10', STAFF)).toBe('Staff 10');
    expect(canonicalizeStaffName('  Leona  ', STAFF)).toBe('Staff 10');
  });

  it('returns empty input unchanged', () => {
    expect(canonicalizeStaffName('', STAFF)).toBe('');
  });
});
