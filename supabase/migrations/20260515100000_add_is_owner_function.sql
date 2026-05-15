-- supabase/migrations/20260515100000_add_is_owner_function.sql

-- STABLE so Postgres can cache the result within a query.
-- SECURITY DEFINER so it can read user_profiles regardless of the caller's RLS.
-- SET search_path = '' pins the schema to prevent search-path injection attacks.
CREATE OR REPLACE FUNCTION is_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role = 'owner'
  )
$$;
