# Payroll Migration Guide

## Step-by-Step Instructions

Run these migrations **in order** in your Supabase SQL Editor:

### Step 1: Fix Payroll Schema
**File**: `20260227000000_fix_payroll_schema.sql`

This migration:
- Fixes column names (staff_member_id → staff_id, etc.)
- Adds missing columns to staff_hours table
- Updates foreign key relationships
- Adds is_closed column to payroll_periods

**Status**: Run this first

---

### Step 2: Add Sick Hours Support
**File**: `20260227000001_add_sick_hours.sql`

This migration:
- Adds sick_hours column to staff_hours table
- Updates time_entries to support 'sick' entry type
- Modifies aggregation triggers
- Updates staff_hours_summary view

**Status**: Run after Step 1

---

### Step 3: Create CSV Format Configuration
**File**: `20260227000002_create_csv_format_config.sql`

This migration:
- Creates csv_export_formats table
- Adds triggers for default format enforcement
- Sets up RLS policies

**Status**: Run after Step 2

---

### Step 4: Fix Migration Errors (if needed)
**File**: `20260227000003_fix_migration_errors.sql`

This migration fixes common errors:
- "trigger already exists" error
- "cannot change view column name" error
- "functions in index predicate must be marked IMMUTABLE" error

**Status**: Run ONLY if you encountered errors in Steps 1-3

---

### Step 5: Add Performance Indexes
**File**: `add_indexes.sql`

This adds performance indexes for all tables including the new payroll tables.

**Status**: Run after all migrations are successful

---

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard
2. Click on your project
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the contents of the migration file
6. Click **Run** (or press Ctrl+Enter)
7. Wait for success message
8. Repeat for each migration file in order

### Option 2: Supabase CLI

```bash
# If you have Supabase CLI installed

# Apply migrations in order
psql $DATABASE_URL -f supabase/migrations/20260227000000_fix_payroll_schema.sql
psql $DATABASE_URL -f supabase/migrations/20260227000001_add_sick_hours.sql
psql $DATABASE_URL -f supabase/migrations/20260227000002_create_csv_format_config.sql

# If you had errors, run the fix migration
psql $DATABASE_URL -f supabase/migrations/20260227000003_fix_migration_errors.sql

# Finally, add indexes
psql $DATABASE_URL -f supabase/migrations/add_indexes.sql
```

---

## Common Errors and Solutions

### Error: "trigger already exists"
**Solution**: Run migration `20260227000003_fix_migration_errors.sql`

### Error: "cannot change name of view column"
**Solution**: Run migration `20260227000003_fix_migration_errors.sql`

### Error: "functions in index predicate must be marked IMMUTABLE"
**Solution**: This error shouldn't occur with the updated migrations. If it does, check your PostgreSQL version and ensure you're running on Supabase's supported version.

### Error: "table already exists"
**Solution**: The table was already created. You can either:
- Skip this migration
- Use `DROP TABLE IF EXISTS` before creating (add to migration)
- Continue with next migration

---

## Verification Steps

After running all migrations, verify everything is correct:

### 1. Check Tables Exist

```sql
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
```

**Expected Result**: All 5 tables should be listed

### 2. Check Columns Exist

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'staff_hours'
  AND column_name IN ('sick_hours', 'vacation_hours', 'mat_cleaning_count')
ORDER BY column_name;
```

**Expected Result**: All 3 columns should be listed

### 3. Check Indexes Exist

```sql
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('csv_export_formats', 'staff_hours', 'time_entries')
ORDER BY tablename, indexname;
```

**Expected Result**: Multiple indexes for each table

### 4. Check Triggers Exist

```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('csv_export_formats', 'time_entries')
ORDER BY event_object_table;
```

**Expected Result**: Triggers for csv_export_formats and time_entries

---

## Rollback (if needed)

If you need to rollback the migrations:

```sql
-- Rollback CSV format configuration
DROP TABLE IF EXISTS csv_export_formats CASCADE;

-- Rollback sick hours (be careful - this removes data!)
ALTER TABLE staff_hours DROP COLUMN IF EXISTS sick_hours;
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_entry_type_check;
ALTER TABLE time_entries ADD CONSTRAINT time_entries_entry_type_check
  CHECK (entry_type IN ('regular', 'overtime', 'vacation', 'mat_cleaning'));

-- Note: Rollback of schema fixes may require more careful handling
-- Contact support if you need to rollback the first migration
```

---

## Support

If you encounter issues:

1. Check error messages carefully
2. Run `20260227000003_fix_migration_errors.sql` to fix common issues
3. Verify you're running migrations in the correct order
4. Check that your database user has sufficient permissions
5. Ensure you're connected to the correct database

---

## Summary

- **Total New Tables**: 1 (csv_export_formats)
- **Total Updated Tables**: 3 (staff_hours, time_entries, payroll_periods)
- **Total New Columns**: 5 (sick_hours, vacation_hours, mat_cleaning_count, total_hours, is_closed)
- **Total New Indexes**: ~20 performance indexes
- **Total New Triggers**: 2 (format enforcement, time aggregation)
