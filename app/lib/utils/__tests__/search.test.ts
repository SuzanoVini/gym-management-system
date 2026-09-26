import { buildSearchIndex, normalizeText, searchMatches } from '../search';

const person = buildSearchIndex(
  ['Jo\u00e3o da Silva', 'joao.silva@example.com'],
  ['(604) 555-0142']
);

describe('normalizeText', () => {
  it('strips accents, lowercases and collapses spaces', () => {
    expect(normalizeText('  JO\u00c3O   D\u00e0  ')).toBe('joao da');
  });
});

describe('searchMatches', () => {
  it.each([
    ['', true],
    ['jo\u00e3o', true],
    ['JOAO   SILVA', true],
    ['silva joao', true],
    ['example.com', true],
    ['6045550142', true],
    ['+1 604 555 0142', true],
    ['604-555', true],
    ['5550142', true],
    ['silvaa', true],
    ['slva', true],
    ['joao smith', false],
    ['da', true],
    ['dx', false],
    ['7775550142', false],
  ])('%p -> %p', (query, expected) => {
    expect(searchMatches(person, query)).toBe(expected);
  });

  it('does not match a phone-style token against a date split by separators', () => {
    const signup = buildSearchIndex(['Sample Person', '2026-04-12']);
    expect(searchMatches(signup, '604')).toBe(false);
    expect(searchMatches(signup, '2026-04')).toBe(true);
    expect(searchMatches(signup, '2026')).toBe(true);
  });

  it('short words must match exactly', () => {
    const idx = buildSearchIndex(['Sample Li']);
    expect(searchMatches(idx, 'lu')).toBe(false);
    expect(searchMatches(idx, 'li')).toBe(true);
  });
});
