-- Enforce closed payroll periods at the DB layer (the repo's established
-- pattern — see aggregate_time_entries()). Until now is_closed was
-- decorative: finalizePeriod() exists but nothing blocked further writes,
-- so a submitted period's payroll could be silently altered. The UI also
-- disables editing for a closed period, but this holds even if that's
-- bypassed.

CREATE OR REPLACE FUNCTION reject_write_to_closed_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_period_id UUID;
  period_closed BOOLEAN;
BEGIN
  IF TG_TABLE_NAME = 'staff_hours' THEN
    target_period_id := COALESCE(NEW.period_id, OLD.period_id);
  ELSIF TG_TABLE_NAME = 'time_entries' THEN
    SELECT period_id INTO target_period_id
    FROM staff_hours
    WHERE id = COALESCE(NEW.staff_hours_id, OLD.staff_hours_id);
  END IF;

  IF target_period_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT is_closed INTO period_closed
  FROM payroll_periods
  WHERE id = target_period_id;

  IF period_closed THEN
    RAISE EXCEPTION 'Cannot modify hours: payroll period is closed';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION reject_write_to_closed_period() IS
  'Blocks INSERT/UPDATE/DELETE on staff_hours/time_entries when the owning payroll period is closed';

DROP TRIGGER IF EXISTS reject_staff_hours_write_when_closed ON staff_hours;
CREATE TRIGGER reject_staff_hours_write_when_closed
  BEFORE INSERT OR UPDATE OR DELETE ON staff_hours
  FOR EACH ROW EXECUTE FUNCTION reject_write_to_closed_period();

DROP TRIGGER IF EXISTS reject_time_entries_write_when_closed ON time_entries;
CREATE TRIGGER reject_time_entries_write_when_closed
  BEFORE INSERT OR UPDATE OR DELETE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION reject_write_to_closed_period();
