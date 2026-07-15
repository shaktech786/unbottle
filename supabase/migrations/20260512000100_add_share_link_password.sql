-- Add optional password protection to shared sessions.
-- share_password_hash stores a scrypt hash; null means no password.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS share_password_hash TEXT;

-- The share page only needs to know *whether* a password is set, never the hash
-- itself. A generated column gives anon that boolean without exposing the
-- secret, and it cannot drift from the hash the way a hand-maintained flag would.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS has_share_password BOOLEAN
  GENERATED ALWAYS AS (share_password_hash IS NOT NULL) STORED;

-- "Public can read published sessions" (20260508120000) lets anon SELECT any row
-- with is_public = true, so sessions now holds a secret in a table anonymous
-- users can read. Without this, anyone could run
--   GET /rest/v1/sessions?is_public=eq.true&select=share_password_hash
-- and walk off with every share hash to crack offline -- defeating the gate.
--
-- A bare `REVOKE SELECT (share_password_hash) ... FROM anon` does NOT work: a
-- table-level SELECT grant implies SELECT on every column, and the column-level
-- revoke is silently ignored while it stands. The table grant must be dropped
-- first and an explicit column list granted back.
--
-- Consequence: any column added to sessions later must be added to this GRANT or
-- it will be invisible to the share page. `authenticated` keeps its table-level
-- grant, so owner reads (getSession's select *) are unaffected.
REVOKE SELECT ON sessions FROM anon;
GRANT SELECT (
  id, user_id, title, description, status, bpm, key_signature, time_signature,
  genre, mood, parent_branch_id, created_at, updated_at, last_active_at,
  share_slug, is_public, has_share_password
) ON sessions TO anon;
