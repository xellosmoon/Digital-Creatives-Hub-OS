-- =============================================================
-- Migration: Allow public event proposals
-- Purpose:   Add 'proposed' status to events table, allow
--            anyone to submit event proposals for admin review.
-- =============================================================

-- Expand the status check to include 'proposed'
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;
ALTER TABLE events ADD CONSTRAINT events_status_check
  CHECK (status IN ('draft', 'published', 'cancelled', 'proposed'));

-- Add proposer contact fields (for non-authenticated submissions)
ALTER TABLE events ADD COLUMN IF NOT EXISTS proposer_name    VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS proposer_email   VARCHAR(255);
ALTER TABLE events ADD COLUMN IF NOT EXISTS proposer_phone   VARCHAR(50);
ALTER TABLE events ADD COLUMN IF NOT EXISTS proposal_notes   TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS expected_attendees INTEGER;

-- Allow anyone (including anon) to INSERT proposals
CREATE POLICY "Anyone can submit event proposals"
  ON events FOR INSERT
  WITH CHECK (status = 'proposed');

-- Allow anyone to see their own proposals (by email match)
CREATE POLICY "Proposers can view their own proposals"
  ON events FOR SELECT
  USING (status = 'proposed' AND proposer_email = current_setting('request.jwt.claims', true)::json->>'email');
