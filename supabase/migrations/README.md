# Payroll System Database Migrations

## Overview

These migrations add a complete payroll management system to your existing Gracie Barra Kitsilano database. The system includes staff management, time tracking, and payroll period management.

## Migration Files (Run in Order)

### 1. `20260114000000_create_payroll_system.sql`
**Creates the database schema:**
- **Tables**: staff_members, payroll_periods, staff_hours, time_entries, app_configuration
- **Views**: staff_hours_summary, department_mappings
- **Functions**: aggregate_time_entries(), enforce_single_current_period()
- **Triggers**: Auto-aggregation, single current period enforcement, updated_at timestamps
- **RLS Policies**: Row-level security for all tables

### 2. `20260114000001_insert_payroll_config.sql`
**Inserts default configuration:**
- Payroll period rules (1-15, 16-31)
- Mat cleaning hours (0.25)
- Auto-generated ID base (1040)
- Contractor IDs (1030, 1035, 1037)
- After School Program keywords
- Company name
- CSV export settings

### 3. `20260114000002_insert_initial_staff.sql`
**Inserts initial staff data:**
- 11 default staff members (from original hardcoded data)
- Creates current payroll period (auto-calculated)
- Sets up initial state for the system

## How to Run Migrations

### Option 1: Run All at Once (Recommended)
1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy and paste the contents of ALL THREE files in order
5. Click **Run** to execute

### Option 2: Run Individually
1. Go to your Supabase project dashboard
2. Click on **SQL Editor** in the left sidebar
3. For each migration file (in order):
   - Click **New query**
   - Copy and paste the file contents
   - Click **Run**
   - Wait for confirmation message
   - Move to next file

## Verification

After running the migrations, verify everything was created successfully:

```sql
-- Check tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('staff_members', 'payroll_periods', 'staff_hours', 'time_entries', 'app_configuration')
ORDER BY table_name;

-- Check staff members were inserted
SELECT COUNT(*) as staff_count, COUNT(*) FILTER (WHERE is_active = true) as active_count
FROM staff_members;

-- Check configuration was inserted
SELECT config_key, description
FROM app_configuration
ORDER BY config_key;

-- Check current payroll period
SELECT display_name, start_date, end_date, is_current
FROM payroll_periods
WHERE is_current = true;

-- Check views were created
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('staff_hours_summary', 'department_mappings');
```

Expected results:
- ✅ 5 tables created
- ✅ 11 staff members inserted
- ✅ 10+ configuration entries
- ✅ 1 current payroll period
- ✅ 2 views created

## Troubleshooting

### Error: "relation already exists"
- The tables may already be created. Run `DROP TABLE` statements if you want to recreate:
  ```sql
  DROP TABLE IF EXISTS time_entries CASCADE;
  DROP TABLE IF EXISTS staff_hours CASCADE;
  DROP TABLE IF EXISTS payroll_periods CASCADE;
  DROP TABLE IF EXISTS staff_members CASCADE;
  DROP TABLE IF EXISTS app_configuration CASCADE;
  ```
  Then re-run the migrations.

### Error: "function set_updated_at() does not exist"
- This means the base migration `enable_rls.sql` wasn't run yet.
- Make sure you've run all migrations from your main gym system first.

### Error: "permission denied"
- Make sure you're logged in to the correct Supabase project.
- Check that you have the correct permissions (project owner or admin).

## Next Steps

After running these migrations successfully:

1. **Get your Supabase credentials:**
   - Go to Project Settings → API
   - Copy your **Project URL**
   - Copy your **anon public key**

2. **Configure the frontend:**
   - Create `assets/js/config.js` with your Supabase credentials
   - Create the service layer files (staff.service.js, hours.service.js, etc.)

3. **Test the connection:**
   - Load the application and verify it connects to Supabase
   - Test CRUD operations on staff members
   - Test importing hours data

## Database Schema Diagram

```
staff_members (11 rows)
  ├── id (UUID, PK)
  ├── employee_id (VARCHAR, UNIQUE)
  ├── full_name (VARCHAR)
  ├── job_title (VARCHAR)
  └── is_active (BOOLEAN)

payroll_periods (1+ rows)
  ├── id (UUID, PK)
  ├── start_date (DATE)
  ├── end_date (DATE)
  ├── display_name (VARCHAR)
  └── is_current (BOOLEAN, UNIQUE)

staff_hours (junction table)
  ├── id (UUID, PK)
  ├── staff_member_id (UUID, FK → staff_members)
  ├── payroll_period_id (UUID, FK → payroll_periods)
  ├── regular_hours (NUMERIC)
  └── overtime_hours (NUMERIC)
  └── UNIQUE(staff_member_id, payroll_period_id)

time_entries (audit trail)
  ├── id (UUID, PK)
  ├── staff_member_id (UUID, FK → staff_members)
  ├── payroll_period_id (UUID, FK → payroll_periods)
  ├── entry_date (DATE)
  ├── entry_type (VARCHAR: regular/overtime/mat_clean)
  ├── hours (NUMERIC)
  ├── notes (TEXT)
  └── source (VARCHAR: manual/csv/pdf/quick_import)

app_configuration (10 rows)
  ├── id (UUID, PK)
  ├── config_key (VARCHAR, UNIQUE)
  ├── config_value (JSONB)
  └── description (TEXT)
```

## Support

If you encounter issues:
1. Check the Supabase logs in the dashboard
2. Verify all three migration files were run in order
3. Ensure your existing migrations (enable_rls.sql, etc.) are present
4. Check that RLS policies are enabled and working correctly
