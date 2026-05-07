-- Drop ALL FK constraints from follow_up_notes and intro_class_history
-- that reference intros(id), then re-add with ON DELETE CASCADE.
-- The previous migration may have left the original constraint intact
-- if its name differed from the expected pattern.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'follow_up_notes'::regclass
      AND confrelid = 'intros'::regclass
      AND contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE follow_up_notes DROP CONSTRAINT %I', r.conname);
  END LOOP;

  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'intro_class_history'::regclass
      AND confrelid = 'intros'::regclass
      AND contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE intro_class_history DROP CONSTRAINT %I', r.conname);
  END LOOP;
END;
$$;

ALTER TABLE follow_up_notes
  ADD CONSTRAINT follow_up_notes_intro_id_fkey
  FOREIGN KEY (intro_id) REFERENCES intros(id) ON DELETE CASCADE;

ALTER TABLE intro_class_history
  ADD CONSTRAINT intro_class_history_intro_id_fkey
  FOREIGN KEY (intro_id) REFERENCES intros(id) ON DELETE CASCADE;
