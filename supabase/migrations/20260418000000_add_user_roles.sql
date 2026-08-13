-- supabase/migrations/20260418000000_add_user_roles.sql

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'staff'
  CHECK (role IN ('owner', 'staff'));

-- Existing rows get 'staff' automatically via the DEFAULT above.
-- The owner account is environment-specific, so it is read from a setting
-- rather than hardcoded:
--   ALTER DATABASE <db> SET app.owner_email = 'owner@yourdomain.com';
-- A missing setting warns instead of aborting: the column is still added, but
-- no owner is promoted, so the failure is loud rather than silent.
DO $$
DECLARE
  owner_email TEXT := current_setting('app.owner_email', true);
  owner_id UUID;
BEGIN
  IF owner_email IS NULL OR owner_email = '' THEN
    RAISE WARNING
      'app.owner_email is not set — role column added but no owner promoted. '
      'Promote manually with: '
      'UPDATE user_profiles SET role = ''owner'' WHERE id = '
      '(SELECT id FROM auth.users WHERE email = ''<owner email>'');';
    RETURN;
  END IF;

  SELECT id INTO owner_id
  FROM auth.users
  WHERE email = owner_email;

  IF owner_id IS NULL THEN
    RAISE WARNING
      'Owner account % not found in auth.users — role column added '
      'but no owner promoted.', owner_email;
    RETURN;
  END IF;

  UPDATE user_profiles SET role = 'owner' WHERE id = owner_id;
END;
$$;
