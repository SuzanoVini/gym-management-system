# Payroll System - Supabase Integration Installation Guide

## Overview

This guide will help you integrate the payroll system with your existing Supabase database.

## Prerequisites

1. ✅ Supabase project created
2. ✅ Database migrations run (see `supabase/migrations/README.md`)
3. ✅ Supabase URL and anon key ready

## Step 1: Run Database Migrations

If you haven't already, run the 3 migration files in your Supabase SQL Editor:
1. `20260114000000_create_payroll_system.sql`
2. `20260114000001_insert_payroll_config.sql`
3. `20260114000002_insert_initial_staff.sql`

## Step 2: Get Supabase Credentials

1. Go to your Supabase project dashboard
2. Click on **Settings** → **API**
3. Copy these values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public** key (the long key under "Project API keys")

## Step 3: Copy Files to Payroll Project

Copy all files from this `payroll-integration` folder to your payroll project:

```
From: C:\Users\GB Kits PD\Desktop\gb-kitsilano-gym\payroll-integration\

To: C:\Windows\System32\gracie-barra-payroll\
```

**Directory structure should be:**
```
gracie-barra-payroll/
├── assets/
│   ├── js/
│   │   ├── config.js                     (NEW)
│   │   ├── services/
│   │   │   ├── supabase.service.js      (NEW)
│   │   │   ├── staff.service.js         (NEW - coming next)
│   │   │   ├── hours.service.js         (NEW - coming next)
│   │   │   ├── period.service.js        (NEW - coming next)
│   │   │   └── import.service.js        (NEW - coming next)
│   │   ├── utils/
│   │   │   ├── date.utils.js            (NEW - coming next)
│   │   │   ├── validation.utils.js      (NEW - coming next)
│   │   │   └── export.utils.js          (NEW - coming next)
│   │   ├── ui/
│   │   │   ├── table.ui.js              (NEW - coming next)
│   │   │   ├── forms.ui.js              (NEW - coming next)
│   │   │   ├── filters.ui.js            (NEW - coming next)
│   │   │   └── notifications.ui.js      (NEW - coming next)
│   │   ├── migration.js                 (NEW - coming next)
│   │   └── app.js                       (EXISTING - will be refactored)
│   └── css/
│       └── styles.css                    (EXISTING - will be updated)
└── index.html                            (EXISTING - will be updated)
```

## Step 4: Update config.js with Your Credentials

Open `assets/js/config.js` and replace the placeholder values:

```javascript
const SUPABASE_CONFIG = {
  url: 'YOUR_SUPABASE_PROJECT_URL',      // ← Replace with your URL
  anonKey: 'YOUR_SUPABASE_ANON_KEY',     // ← Replace with your anon key
};
```

**Example:**
```javascript
const SUPABASE_CONFIG = {
  url: 'https://xyzabc123.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
};
```

## Step 5: Add Supabase Library to index.html

Open `index.html` and add the Supabase JavaScript library **before** your other scripts:

```html
<head>
  <!-- ... existing head content ... -->

  <!-- Add Supabase JS library -->
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
```

Then update the script loading order at the bottom of the file:

```html
<body>
  <!-- ... existing body content ... -->

  <!-- Load scripts in this order -->
  <script src="assets/js/config.js"></script>
  <script src="assets/js/services/supabase.service.js"></script>

  <!-- Load other services as they're created -->
  <!-- <script src="assets/js/services/staff.service.js"></script> -->
  <!-- <script src="assets/js/services/hours.service.js"></script> -->
  <!-- <script src="assets/js/services/period.service.js"></script> -->

  <!-- Load utilities -->
  <!-- <script src="assets/js/utils/date.utils.js"></script> -->
  <!-- <script src="assets/js/utils/validation.utils.js"></script> -->

  <!-- Load UI components -->
  <!-- <script src="assets/js/ui/notifications.ui.js"></script> -->
  <!-- <script src="assets/js/ui/table.ui.js"></script> -->
  <!-- <script src="assets/js/ui/forms.ui.js"></script> -->
  <!-- <script src="assets/js/ui/filters.ui.js"></script> -->

  <!-- Load main app (keep last) -->
  <script src="assets/js/app.js"></script>
</body>
```

## Step 6: Test the Connection

1. Open the payroll application in your browser
2. Open browser console (F12)
3. You should see:
   ```
   ✅ Supabase client initialized successfully
   ✅ Supabase connection test successful
   ✅ Database initialized - all tables exist
   ```

If you see errors:
- ❌ **"Invalid Supabase configuration"** → Check config.js credentials
- ❌ **"Failed to fetch"** → Check your internet connection
- ❌ **"Some tables are missing"** → Run the database migrations

## Step 7: Verify Database Data

Open browser console and run these test queries:

```javascript
// Test 1: Get all staff members
const client = window.getSupabase();
const { data, error } = await client.from('staff_members').select('*');
console.log('Staff members:', data);

// Test 2: Get current payroll period
const { data: period } = await client
  .from('payroll_periods')
  .select('*')
  .eq('is_current', true)
  .single();
console.log('Current period:', period);

// Test 3: Get configuration
const { data: config } = await client.from('app_configuration').select('*');
console.log('Configuration:', config);
```

Expected results:
- ✅ 11 staff members
- ✅ 1 current payroll period
- ✅ 10+ configuration entries

## Step 8: Next Steps

Once the connection is working:

1. **Continue with service layer implementation**:
   - `staff.service.js` - Staff CRUD operations
   - `hours.service.js` - Hours tracking
   - `period.service.js` - Payroll periods
   - `import.service.js` - CSV/PDF import
   - `export.utils.js` - CSV export

2. **Refactor app.js**:
   - Replace localStorage calls with service calls
   - Update event handlers to use async/await
   - Implement error handling

3. **Update UI**:
   - Add loading states
   - Add search/filter controls
   - Add mobile-responsive card view
   - Add inline validation

4. **Test migration**:
   - Test auto-migration from localStorage
   - Verify data integrity
   - Test all CRUD operations

## Troubleshooting

### Connection Errors

**Problem**: "Failed to fetch" or network errors
- **Solution**: Check internet connection, verify Supabase URL is correct

**Problem**: "Permission denied" or RLS errors
- **Solution**: Verify RLS policies are enabled (run `enable_rls.sql` migration)

**Problem**: "Table does not exist"
- **Solution**: Run database migrations in Supabase SQL Editor

### Configuration Errors

**Problem**: "YOUR_SUPABASE_PROJECT_URL" in config.js
- **Solution**: Replace with actual Supabase URL from dashboard

**Problem**: Supabase library not found
- **Solution**: Add `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>` to index.html

### Data Errors

**Problem**: No staff members returned
- **Solution**: Run `20260114000002_insert_initial_staff.sql` migration

**Problem**: No current payroll period
- **Solution**: Manually create a period in Supabase dashboard or run the initial staff migration

## Need Help?

1. Check browser console for specific error messages
2. Check Supabase dashboard → Database → Logs for database errors
3. Verify all migration files were run successfully
4. Test connection using the verification queries above

## Current Status

✅ Task 01: Database schema created
✅ Task 02 (In Progress): Supabase service layer
⏳ Task 03: Staff management service
⏳ Task 04: Hours & period management service
⏳ Task 05: Import service
⏳ Task 06: Export service
⏳ Task 07: Migration system
⏳ Task 08: UI/UX enhancements
