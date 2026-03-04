# Migration Order - Run These in Supabase SQL Editor

## ⚠️ IMPORTANT: Run in This Exact Order

Copy and paste each file's contents into Supabase SQL Editor and click "Run".

### 1️⃣ First: Fix Payroll Schema
**File**: `20260227000000_fix_payroll_schema.sql`

This adds missing columns and fixes column names.

---

### 2️⃣ Second: Add Sick Hours
**File**: `20260227000001_add_sick_hours.sql`

This adds the sick_hours column and updates triggers.

---

### 3️⃣ Third: Create CSV Format Table
**File**: `20260227000002_create_csv_format_config.sql`

This creates the csv_export_formats table.

---

### 4️⃣ Fourth: Fix Any Errors
**File**: `20260227000003_fix_migration_errors.sql`

This fixes any issues from the previous migrations.
**Note**: This is safe to run even if you had no errors.

---

### 5️⃣ Fifth: Add Performance Indexes
**File**: `add_indexes.sql`

This adds performance indexes to all tables.

---

## ✅ Verification

After running all migrations, verify with:

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'staff_hours',
    'staff_members',
    'payroll_periods',
    'time_entries',
    'csv_export_formats'
  )
ORDER BY table_name;
-- Should return 5 rows

-- Check sick_hours column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'staff_hours'
  AND column_name = 'sick_hours';
-- Should return 1 row

-- Check csv_export_formats table is empty and ready
SELECT COUNT(*) as format_count FROM csv_export_formats;
-- Should return 0 (empty table ready to use)
```

## 🚨 If You Get Errors

### Error: "column already exists"
✅ This is OK - the column was already added. Continue to next migration.

### Error: "table already exists"
✅ This is OK - the table was already created. Continue to next migration.

### Error: "trigger already exists"
✅ This is OK - run migration #4 (`20260227000003_fix_migration_errors.sql`)

### Error: "cannot change view column name"
✅ Run migration #4 (`20260227000003_fix_migration_errors.sql`)

### Error: "functions in index predicate must be marked IMMUTABLE"
✅ This has been fixed in the updated migrations. Re-download the latest files or just skip the problematic index.

---

## 📊 What Gets Added

- **1 new table**: `csv_export_formats`
- **5 new columns**: sick_hours, vacation_hours, mat_cleaning_count, total_hours, is_closed
- **~25 performance indexes**
- **2 new triggers**: format enforcement, time aggregation
- **1 updated view**: staff_hours_summary

---

## Done! 🎉

Your database is now ready for the enhanced payroll system with:
- ✅ Sick hours tracking
- ✅ Vacation hours tracking
- ✅ CSV format customization
- ✅ Template import support
