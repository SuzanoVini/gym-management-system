-- supabase/migrations/20260515100000_add_is_owner_function.sql

-- STABLE so Postgres can cache the result within a query.
-- SECURITY DEFINER so it can read user_profiles regardless of the caller's RLS.
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
      AND role = 'owner'
  )
$$;
