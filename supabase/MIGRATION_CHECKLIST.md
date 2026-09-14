# Migration safety checklist

Two production incidents (Sep 2026) came from the same root cause: `CREATE OR
REPLACE FUNCTION` replaces the *entire* function, including attributes like
`SECURITY DEFINER` — if a new migration doesn't restate them, they silently
disappear. Both bugs only surfaced when a real guest hit an RLS error on the
live site, not before.

## Before writing a migration that touches an existing function or trigger

- [ ] If the migration does `CREATE OR REPLACE FUNCTION <name>`, find that
      function's most recent prior definition in `supabase/migrations/` and
      diff the two. Specifically check whether these got dropped:
      - `SECURITY DEFINER`
      - `SET search_path = ...`
      - `STABLE` / `VOLATILE` / `IMMUTABLE`
- [ ] If the function is `SECURITY DEFINER`, ask *why* — usually it's because
      an unauthenticated guest or non-admin triggers it (e.g. a booking
      insert that writes to an admin-only table like `daily_occupancy`).
      Restate the same reason in a comment so the next edit doesn't drop it
      by accident.

## After applying any migration to the live database

Confirm it actually ran (check the Supabase SQL editor/CLI output for
errors) — a migration committed to git is not the same as a migration
applied to the database. Then manually retest whichever of these guest
flows the migration could plausibly affect:

- [ ] **Guest group booking with a long Facebook link.** Book a group slot
      as a guest (no account) and paste a real Facebook mobile "Share" link
      (paste one from Messenger/FB mobile — these often exceed 255 chars
      with tracking params). Confirm it submits successfully.
- [ ] **Guest gadget borrow is rejected; account-holder borrow succeeds.**
      Since `057_require_account_for_borrowings.sql`, borrowing without an
      account should fail with a clear message, not a silent/generic error.
      Confirm both the rejection and the logged-in success path.
- [ ] **A booking that causes `daily_occupancy` to update.** Submit (or
      admin-approve) a booking so its status becomes `approved`/`active`,
      then check the public calendar's "Reserved: X/Y" count actually moves.
      This is the exact path the `SECURITY DEFINER` regression broke.

If any of these fail, the fix is almost always in the trigger/function the
migration touched — check the diff against the prior version first before
assuming it's a new bug.
