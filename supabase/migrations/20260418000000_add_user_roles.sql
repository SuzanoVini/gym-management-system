-- supabase/migrations/20260418000000_add_user_roles.sql

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'staff'
  CHECK (role IN ('owner', 'staff'));

-- Existing rows get 'staff' automatically via the DEFAULT above.
-- Promote owner. RAISE EXCEPTION aborts migration if email not found,
-- preventing silent security failure.
DO $$
DECLARE
  owner_id UUID;
BEGIN
  SELECT id INTO owner_id
  FROM auth.users
  WHERE email = 'owner@example.com';

  IF owner_id IS NULL THEN
    RAISE WARNING
      'Owner user owner@example.com not found in auth.users — '
      'role column added but no owner promoted. '
      'On production, create the account and run: '
      'UPDATE user_profiles SET role = ''owner'' WHERE id = (SELECT id FROM auth.users WHERE email = ''owner@example.com'');';
    RETURN;
  END IF;

  UPDATE user_profiles SET role = 'owner' WHERE id = owner_id;
END;
$$;
