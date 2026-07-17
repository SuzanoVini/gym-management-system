// Minimal in-memory fake of the postgrest-js chainable query builder, scoped
// to the verbs hours.service.ts actually uses (select/eq/order/maybeSingle/
// single/insert/update/delete/in, plus bare-await on the builder itself).
// Not a general Supabase mock — just enough surface to exercise real
// adjustment-entry logic against real filtering instead of mocking each call.
type Row = Record<string, unknown>;

const MAT_CLEANING_BONUS = 0.25;

// Mirrors the DB trigger aggregate_time_entries(): recomputes a staff_hours
// row's aggregate columns from its time_entries whenever they change, so the
// fake behaves like the real single-owner trigger instead of going stale.
function recomputeStaffHours(tables: Record<string, Row[]>, staffHoursId: unknown) {
  const staffHoursRow = tables.staff_hours?.find((r) => r.id === staffHoursId);
  if (!staffHoursRow) {
    return;
  }
  const entries = (tables.time_entries ?? []).filter((e) => e.staff_hours_id === staffHoursId);
  const sum = (type: string) =>
    entries.filter((e) => e.entry_type === type).reduce((s, e) => s + (e.hours as number), 0);
  const matCleaningCount = entries.filter((e) => e.entry_type === 'mat_cleaning').length;

  staffHoursRow.regular_hours = sum('regular');
  staffHoursRow.overtime_hours = sum('overtime');
  staffHoursRow.vacation_hours = sum('vacation');
  staffHoursRow.sick_hours = sum('sick');
  staffHoursRow.mat_cleaning_count = matCleaningCount;
  staffHoursRow.total_hours =
    (staffHoursRow.regular_hours as number) +
    (staffHoursRow.overtime_hours as number) +
    (staffHoursRow.vacation_hours as number) +
    (staffHoursRow.sick_hours as number) +
    matCleaningCount * MAT_CLEANING_BONUS;
}

export function makeFakeSupabase(tables: Record<string, Row[]>) {
  let idCounter = 0;
  const nextId = () => `id-${++idCounter}`;

  function builder(tableName: string) {
    const rows = tables[tableName] as Row[];
    let filtered = rows;
    let mode: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let insertRows: Row[] = [];
    let updateData: Row = {};

    function afterWrite(affected: Row[]) {
      if (tableName !== 'time_entries') {
        return;
      }
      const ids = new Set(affected.map((r) => r.staff_hours_id));
      for (const id of ids) {
        recomputeStaffHours(tables, id);
      }
    }

    function runInsert() {
      const created = insertRows.map((r) => ({
        id: nextId(),
        created_at: new Date().toISOString(),
        ...r,
      }));
      rows.push(...created);
      afterWrite(created);
      return created;
    }

    function runDelete() {
      const remove = new Set(filtered);
      tables[tableName] = rows.filter((r) => !remove.has(r));
      afterWrite(filtered);
    }

    function runUpdate() {
      for (const r of filtered) {
        Object.assign(r, updateData);
      }
      afterWrite(filtered);
    }

    const api = {
      select: () => api,
      eq: (col: string, val: unknown) => {
        filtered = filtered.filter((r) => r[col] === val);
        return api;
      },
      order: () => api,
      insert: (data: Row[]) => {
        mode = 'insert';
        insertRows = data;
        return api;
      },
      update: (data: Row) => {
        mode = 'update';
        updateData = data;
        return api;
      },
      delete: () => {
        mode = 'delete';
        return api;
      },
      in: (col: string, vals: unknown[]) => {
        filtered = filtered.filter((r) => vals.includes(r[col]));
        return builderResult();
      },
      // Real supabase-js returns freshly deserialized rows, not live
      // references — copy so callers can't accidentally mutate the fake
      // table (and so two reads taken at different times don't alias)
      maybeSingle: () =>
        Promise.resolve({ data: filtered[0] ? { ...filtered[0] } : null, error: null }),
      single: () => {
        if (mode === 'insert') {
          const created = runInsert();
          return Promise.resolve({ data: { ...created[0] }, error: null });
        }
        if (mode === 'update') {
          runUpdate();
          return Promise.resolve({ data: filtered[0] ? { ...filtered[0] } : null, error: null });
        }
        return Promise.resolve({ data: filtered[0] ? { ...filtered[0] } : null, error: null });
      },
      // Mirrors postgrest-js: the builder itself is a thenable so bare
      // `await supabase.from(x)....` resolves without a terminal single().
      // biome-ignore lint/suspicious/noThenProperty: intentional PromiseLike shape, matches the real query builder
      then: (resolve: (v: { data: unknown; error: null }) => void) => {
        if (mode === 'insert') {
          const created = runInsert();
          return resolve({ data: created.map((r) => ({ ...r })), error: null });
        }
        if (mode === 'delete') {
          runDelete();
          return resolve({ data: null, error: null });
        }
        if (mode === 'update') {
          runUpdate();
          return resolve({ data: filtered.map((r) => ({ ...r })), error: null });
        }
        return resolve({ data: filtered.map((r) => ({ ...r })), error: null });
      },
    };

    function builderResult() {
      if (mode === 'delete') {
        runDelete();
        return Promise.resolve({ error: null });
      }
      return Promise.resolve({ data: filtered, error: null });
    }

    return api;
  }

  return { from: (t: string) => builder(t) };
}
