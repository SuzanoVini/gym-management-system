import { normalizeEmail, normalizePhone } from '../normalize';

describe('normalizePhone', () => {
  it.each([
    ['604-555-0142', '6045550142'],
    ['(604) 555-0142', '6045550142'],
    ['+1 604 555 0142', '6045550142'],
    ['16045550142', '6045550142'],
    ['03001112222', '03001112222'],
    ['0092 300 111 2222', '00923001112222'],
    ['555-0142', '5550142'],
  ])('%s -> %s', (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected);
  });

  it.each([[''], ['   '], ['n/a'], [null], [undefined]])('blank %p -> null', (raw) => {
    expect(normalizePhone(raw)).toBeNull();
  });
});

describe('normalizeEmail', () => {
  it('lowercases and strips ASCII spaces', () => {
    expect(normalizeEmail('  Sample.Person@Example.com ')).toBe('sample.person@example.com');
  });

  it("keeps tabs and non-breaking spaces, matching SQL btrim(email, ' ')", () => {
    expect(normalizeEmail('\tuser@example.com')).toBe('\tuser@example.com');
    expect(normalizeEmail('user@example.com\u00a0')).toBe('user@example.com\u00a0');
  });

  it.each([[''], ['   '], [null], [undefined]])('blank %p -> null', (raw) => {
    expect(normalizeEmail(raw)).toBeNull();
  });
});
