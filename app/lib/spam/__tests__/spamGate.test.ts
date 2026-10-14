/**
 * @jest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';

const FROM_INTROS = /\.from\(\s*['"]intros['"]\s*\)/g;
const IS_SPAM_FILTER = /\.eq\(\s*['"]is_spam['"]\s*,\s*(true|false)\s*\)/;
const STATEMENT_BOUNDARY = /[;{},]\s*$/;

// Returns 1-based line numbers of intros reads that neither filter is_spam with a
// literal nor carry "spam-gate: allow" on the line directly above their statement.
function findUngatedIntroReads(source: string): number[] {
  const sourceLines = source.split('\n');
  const line = (i: number) => sourceLines[i] ?? '';
  const offending: number[] = [];
  for (const match of source.matchAll(FROM_INTROS)) {
    const start = (match.index ?? 0) + match[0].length;
    const rest = source.slice(start);
    const firstCall = /^\s*\.(\w+)\(/.exec(rest);
    if (!firstCall || firstCall[1] !== 'select') {
      continue;
    }
    const ends = [rest.search(/\.from\(/), rest.indexOf(';'), 600].filter((n) => n >= 0);
    const chain = rest.slice(0, Math.min(...ends));
    if (IS_SPAM_FILTER.test(chain)) {
      continue;
    }
    const lineIndex = source.slice(0, match.index).split('\n').length - 1;
    let above = lineIndex - 1;
    // Walk up to the first line of the statement (lines that don't end a previous statement).
    while (
      above >= 0 &&
      line(above).trim() !== '' &&
      !STATEMENT_BOUNDARY.test(line(above)) &&
      !line(above).trim().startsWith('//')
    ) {
      above--;
    }
    if (above >= 0 && /\/\/\s*spam-gate: allow/.test(line(above))) {
      continue;
    }
    offending.push(lineIndex + 1);
  }
  return offending;
}

describe('findUngatedIntroReads (checker)', () => {
  it('flags a select without an is_spam filter', () => {
    const src = "const x = await supabase\n  .from('intros')\n  .select('*');";
    expect(findUngatedIntroReads(src)).toEqual([2]);
  });

  it('accepts eq is_spam true or false, either quote style', () => {
    expect(
      findUngatedIntroReads("supabase.from('intros').select('*').eq('is_spam', false);")
    ).toEqual([]);
    expect(
      findUngatedIntroReads('supabase.from("intros").select("id").eq("is_spam", true);')
    ).toEqual([]);
  });

  it('does not accept merely selecting the column', () => {
    expect(findUngatedIntroReads("supabase.from('intros').select('id, is_spam');")).toEqual([1]);
  });

  it('accepts an allow comment directly above the statement', () => {
    const src =
      "// spam-gate: allow — dedup must see spam\nconst { data } = await supabase\n  .from('intros')\n  .select('id');";
    expect(findUngatedIntroReads(src)).toEqual([]);
  });

  it('rejects an allow comment that belongs to an earlier statement', () => {
    const src =
      "// spam-gate: allow — other\nconst a = 1;\nconst { data } = await supabase\n  .from('intros')\n  .select('id');";
    expect(findUngatedIntroReads(src)).toEqual([4]);
  });

  it('ignores writes, including select() after insert/update', () => {
    expect(findUngatedIntroReads("supabase.from('intros').insert(rows).select('id');")).toEqual([]);
    expect(
      findUngatedIntroReads("supabase.from('intros').update(v).eq('id', 1).select();")
    ).toEqual([]);
    expect(findUngatedIntroReads("supabase.from('intros').delete().in('id', ids);")).toEqual([]);
  });

  it('checks array entries separately', () => {
    const src =
      "Promise.all([\n  supabase.from('intros').select('*').ilike('name', n),\n  supabase.from('signups').select('*'),\n]);";
    expect(findUngatedIntroReads(src)).toEqual([2]);
  });
});

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.next', '__tests__'].includes(entry.name)) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('spam gate over the codebase', () => {
  it('every intros read filters is_spam or is explicitly allow-listed', () => {
    const root = path.resolve(__dirname, '../../../..');
    const files = [
      ...listSourceFiles(path.join(root, 'app')),
      ...listSourceFiles(path.join(root, 'scripts')),
    ];
    const offenders = files.flatMap((file) =>
      findUngatedIntroReads(fs.readFileSync(file, 'utf8')).map(
        (line) => `${path.relative(root, file)}:${line}`
      )
    );
    expect(offenders).toEqual([]);
  });
});
