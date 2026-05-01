-- ============================================
-- CASCADE DELETE FOR INTRO CHILD TABLES
-- ============================================
-- Deleting an intro was silently blocked (409 Conflict) when the intro
-- had related follow_up_notes or intro_class_history records.
-- Adding ON DELETE CASCADE so child records are removed automatically.

-- follow_up_notes
ALTER TABLE follow_up_notes
  DROP CONSTRAINT IF EXISTS follow_up_notes_intro_id_fkey;

ALTER TABLE follow_up_notes
  ADD CONSTRAINT follow_up_notes_intro_id_fkey
  FOREIGN KEY (intro_id) REFERENCES intros(id) ON DELETE CASCADE;

-- intro_class_history
ALTER TABLE intro_class_history
  DROP CONSTRAINT IF EXISTS intro_class_history_intro_id_fkey;

ALTER TABLE intro_class_history
  ADD CONSTRAINT intro_class_history_intro_id_fkey
  FOREIGN KEY (intro_id) REFERENCES intros(id) ON DELETE CASCADE;
