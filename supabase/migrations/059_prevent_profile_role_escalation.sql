-- =============================================================
-- Migration: Prevent self-service role/tier escalation on profiles
-- Purpose:
--   "Users can update their own profile" (001_initial_schema.sql:166-168,
--   redefined in 009_add_tier_to_profiles.sql:36-42) has a USING clause
--   but no WITH CHECK clause. Postgres reuses USING as WITH CHECK when
--   none is given, and USING only verifies auth.uid() = id — it does not
--   restrict which columns may change. Any authenticated user can
--   therefore run, straight from the browser's Supabase client:
--
--     supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id)
--
--   and it succeeds, since the row being updated is their own. Because
--   every admin-only RLS policy in this schema (bookings, spaces, assets,
--   borrowings, gallery, notifications, etc.) checks
--   `profiles.role = 'admin'`, this is a full admin privilege escalation.
--
--   Rather than rewrite the UPDATE policy's USING/WITH CHECK (which is
--   awkward to get right here because the WALK_IN branch has no auth.uid()
--   to pin to), this adds a BEFORE UPDATE trigger that blocks any change
--   to `role` or `tier` unless the acting user already has role = 'admin'.
--   This runs as an additional check on every UPDATE regardless of which
--   RLS policy allowed the row to be reached, so it closes the hole for
--   both the auth.uid() = id path and the WALK_IN path.
--
--   No app code currently changes `role`/`tier` from the client (role
--   promotion is done out-of-band via SQL against the database), so this
--   is not expected to break any existing feature.
-- =============================================================

CREATE OR REPLACE FUNCTION prevent_profile_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.tier IS DISTINCT FROM OLD.tier) THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only admins may change role or tier';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS prevent_profile_role_escalation_trigger ON profiles;
CREATE TRIGGER prevent_profile_role_escalation_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_profile_role_escalation();
