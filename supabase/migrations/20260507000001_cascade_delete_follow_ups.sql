-- Add ON DELETE CASCADE to follow_ups.intro_id foreign key
ALTER TABLE follow_ups DROP CONSTRAINT IF EXISTS follow_ups_intro_id_fkey;

ALTER TABLE follow_ups
  ADD CONSTRAINT follow_ups_intro_id_fkey
  FOREIGN KEY (intro_id) REFERENCES intros(id) ON DELETE CASCADE;
