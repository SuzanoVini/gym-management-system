-- Fixes mark_unsigned_intros() to wait 14 calendar days before marking signed_up = 'No'.
-- Previous predicate used < CURRENT_DATE, which fires the day after class.
-- A May 1 class is now first marked on May 15.

CREATE OR REPLACE FUNCTION mark_unsigned_intros()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.intros
  SET signed_up = 'No'
  WHERE (signed_up IS NULL OR signed_up = '')
    AND COALESCE(date::date, created_at::date) <= CURRENT_DATE - INTERVAL '14 days';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
