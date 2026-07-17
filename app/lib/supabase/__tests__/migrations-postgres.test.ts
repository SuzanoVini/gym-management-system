/**
 * @jest-environment node
 *
 * Applies the full migration chain to an embedded PostgreSQL (PGlite) and
 * asserts the schema invariants the application depends on. The lifecycle
 * tables predate CLI-managed migrations, so a baseline fixture reconstructs
 * that starting state first (see fixtures/pre-cli-baseline.sql).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';

jest.setTimeout(60_000);

// Must stay in sync with the membership_types settings vocabulary seeded in
// useSettingsStore / lib/supabase/settings.ts. If this fails after adding a
// membership type, the enum migration or the settings default is missing.
const EXPECTED_MEMBERSHIP_TYPES = ['ASP', 'Flex 10', 'Flex 20', 'Integrity', 'Legacy', 'Special'];

let db: PGlite;

async function applySupabaseStubs(target: PGlite): Promise<void> {
  await target.exec(`
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE service_role;

    CREATE SCHEMA auth;
    CREATE TABLE auth.users (
      id uuid PRIMARY KEY,
      email text,
      raw_user_meta_data jsonb DEFAULT '{}'::jsonb
    );
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.role', true), '');
    $$;

    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean);
    CREATE TABLE storage.objects (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      bucket_id text,
      name text,
      owner uuid
    );
    CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql AS $$
      SELECT (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1];
    $$;

    CREATE SCHEMA supabase_migrations;
    CREATE TABLE supabase_migrations.schema_migrations (version text PRIMARY KEY);

    CREATE PUBLICATION supabase_realtime;
  `);
}

beforeAll(async () => {
  db = new PGlite();
  await applySupabaseStubs(db);

  const fixtures = join(__dirname, 'fixtures');
  await db.exec(readFileSync(join(fixtures, 'pre-cli-baseline.sql'), 'utf8'));

  // Mirror the CLI: apply timestamped migrations only, in version order.
  const migrationsDir = join(process.cwd(), 'supabase', 'migrations');
  const migrationFiles = readdirSync(migrationsDir)
    .filter((name) => /^\d{14}_.+\.sql$/.test(name))
    .sort();
  expect(migrationFiles.length).toBeGreaterThan(30);

  for (const name of migrationFiles) {
    try {
      await db.exec(readFileSync(join(migrationsDir, name), 'utf8'));
    } catch (error) {
      throw new Error(`Migration ${name} failed: ${(error as Error).message}`);
    }
  }
});

afterAll(async () => {
  await db.close();
});

describe('migration chain in embedded PostgreSQL', () => {
  it('keeps the membership enum in sync with the settings vocabulary', async () => {
    const result = await db.query<{ enumlabel: string }>(`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'membership_type'
      ORDER BY e.enumlabel
    `);
    expect(result.rows.map((row) => row.enumlabel)).toEqual(EXPECTED_MEMBERSHIP_TYPES);
  });

  it('derives year from the date column on every lifecycle table', async () => {
    await db.exec(`
      INSERT INTO intros (month, name, date) VALUES ('Jul', 'Year Probe', '2024-07-15');
      INSERT INTO signups (month, name, membership, membership_date)
        VALUES ('Jul', 'Year Probe', 'Integrity', '2023-07-15');
      INSERT INTO cancellations (month, name, date) VALUES ('Jul', 'Year Probe', '2022-07-15');
      INSERT INTO holds (month, name, start) VALUES ('Jul', 'Year Probe', '2021-07-15');
    `);
    for (const [table, expected] of [
      ['intros', 2024],
      ['signups', 2023],
      ['cancellations', 2022],
      ['holds', 2021],
    ] as const) {
      const result = await db.query<{ year: number }>(
        `SELECT year FROM ${table} WHERE name = 'Year Probe'`
      );
      expect({ table, year: result.rows[0]?.year }).toEqual({ table, year: expected });
    }
  });

  it('normalizes names and rejects duplicate cancellations and holds', async () => {
    await db.exec(`
      INSERT INTO cancellations (month, name, date) VALUES ('Jan', '  Dupe CHECK ', '2026-01-10');
      INSERT INTO holds (month, name, start) VALUES ('Jan', '  Dupe CHECK ', '2026-01-10');
    `);
    const normalized = await db.query<{ name_normalized: string }>(
      `SELECT name_normalized FROM holds WHERE name = '  Dupe CHECK '`
    );
    expect(normalized.rows[0]?.name_normalized).toBe('dupe check');

    await expect(
      db.exec(
        `INSERT INTO cancellations (month, name, date) VALUES ('Jan', 'dupe check', '2026-01-10')`
      )
    ).rejects.toThrow(/duplicate key/);
    await expect(
      db.exec(
        `INSERT INTO holds (month, name, start) VALUES ('DUPE CHECK', 'dupe check', '2026-01-10')`
      )
    ).rejects.toThrow(/duplicate key/);
  });

  it('allows only one current payroll period', async () => {
    await db.exec(`
      INSERT INTO payroll_periods (period_label, start_date, end_date, is_current)
        VALUES ('07/01/26 - 07/15/26', '2026-07-01', '2026-07-15', true);
      INSERT INTO payroll_periods (period_label, start_date, end_date, is_current)
        VALUES ('07/16/26 - 07/31/26', '2026-07-16', '2026-07-31', true);
    `);
    const result = await db.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM payroll_periods WHERE is_current`
    );
    expect(result.rows[0]?.count).toBe(1);
  });

  it('blocks writes to staff_hours and time_entries once a period is closed', async () => {
    await db.exec(`
      INSERT INTO staff_members (id, employee_id, full_name, job_title)
        VALUES ('20000000-0000-4000-8000-000000000001', 'EMP-CLOSED', 'Closed Period Coach', 'Coach');
      INSERT INTO payroll_periods (id, period_label, start_date, end_date, is_closed)
        VALUES ('20000000-0000-4000-8000-000000000002', '01/01/26 - 01/15/26', '2026-01-01', '2026-01-15', false);
      INSERT INTO staff_hours (id, staff_id, period_id)
        VALUES ('20000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002');
      INSERT INTO time_entries (staff_hours_id, entry_date, entry_type, hours)
        VALUES ('20000000-0000-4000-8000-000000000003', '2026-01-02', 'regular', 4);
      UPDATE payroll_periods SET is_closed = true
        WHERE id = '20000000-0000-4000-8000-000000000002';
    `);

    await expect(
      db.exec(`
        INSERT INTO time_entries (staff_hours_id, entry_date, entry_type, hours)
          VALUES ('20000000-0000-4000-8000-000000000003', '2026-01-03', 'regular', 2)
      `)
    ).rejects.toThrow(/payroll period is closed/);

    await expect(
      db.exec(`
        DELETE FROM staff_hours WHERE id = '20000000-0000-4000-8000-000000000003'
      `)
    ).rejects.toThrow(/payroll period is closed/);
  });

  it('blocks role escalation from client contexts', async () => {
    await db.exec(`
      INSERT INTO auth.users (id, email)
        VALUES ('10000000-0000-4000-8000-000000000001', 'staff@example.test');
    `);
    // The signup trigger created the profile with the default staff role.
    const created = await db.query<{ role: string }>(
      `SELECT role FROM user_profiles WHERE id = '10000000-0000-4000-8000-000000000001'`
    );
    expect(created.rows[0]?.role).toBe('staff');

    await db.exec(`SELECT set_config('request.jwt.claim.role', 'authenticated', false)`);
    await expect(
      db.exec(`
        UPDATE user_profiles SET role = 'owner'
        WHERE id = '10000000-0000-4000-8000-000000000001'
      `)
    ).rejects.toThrow(/service-role clients/);
    await db.exec(`SELECT set_config('request.jwt.claim.role', '', false)`);
  });

  it('enables row-level security on every application table', async () => {
    const result = await db.query<{ relname: string }>(`
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
      ORDER BY c.relname
    `);
    expect(result.rows.map((row) => row.relname)).toEqual([]);
  });

  it('renamed the lifecycle date columns to their application names', async () => {
    const columns = await db.query<{ table_name: string; column_name: string }>(`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND ((table_name = 'holds' AND column_name IN ('start', 'end', 'start_date'))
          OR (table_name = 'cancellations' AND column_name IN ('date', 'age_group', 'cancellation_date')))
      ORDER BY table_name, column_name
    `);
    const names = columns.rows.map((row) => `${row.table_name}.${row.column_name}`);
    expect(names).toContain('holds.start');
    expect(names).toContain('holds.end');
    expect(names).not.toContain('holds.start_date');
    expect(names).toContain('cancellations.date');
    expect(names).toContain('cancellations.age_group');
  });

  it('marks stale undecided intros as not signed up via the scheduled function', async () => {
    await db.exec(`
      INSERT INTO intros (month, name, date, attended)
        VALUES ('Jan', 'Stale Probe', '2026-01-01', 'Yes');
    `);
    const marked = await db.query<{ mark_unsigned_intros: number }>(
      'SELECT mark_unsigned_intros()'
    );
    expect(marked.rows[0]?.mark_unsigned_intros).toBeGreaterThanOrEqual(1);
    const row = await db.query<{ signed_up: string }>(
      `SELECT signed_up FROM intros WHERE name = 'Stale Probe'`
    );
    expect(row.rows[0]?.signed_up).toBe('No');
  });
});
