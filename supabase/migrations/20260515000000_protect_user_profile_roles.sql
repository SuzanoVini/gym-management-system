-- Prevent authenticated clients from creating or promoting account roles.
-- Admin/server maintenance using the service-role key remains allowed.

CREATE OR REPLACE FUNCTION prevent_client_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  jwt_role TEXT := COALESCE(auth.role(), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS DISTINCT FROM 'staff' AND jwt_role IN ('authenticated', 'anon') THEN
      RAISE EXCEPTION 'Only service-role clients can assign user roles';
    END IF;
  ELSIF NEW.role IS DISTINCT FROM OLD.role AND jwt_role IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'Only service-role clients can change user roles';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_profile_roles ON user_profiles;

CREATE TRIGGER protect_user_profile_roles
  BEFORE INSERT OR UPDATE OF role ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_client_role_escalation();
