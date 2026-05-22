-- Remove stale production-only duplicate updated_at trigger on holds.
-- The canonical trigger is set_holds_updated_at -> set_updated_at().

DROP TRIGGER IF EXISTS update_holds_updated_at ON holds;
