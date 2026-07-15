-- TEXT UNIQUE already creates a unique index, and Postgres unique constraints
-- ignore NULLs, so a partial "WHERE share_slug IS NOT NULL" index would be a
-- second B-tree maintained on every session write for the same guarantee.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS share_slug TEXT UNIQUE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- The share page is read by signed-out visitors through the anon key, so RLS is
-- the only gate here rather than defence in depth. Without this policy
-- auth.uid() is NULL, "Users can CRUD own sessions" cannot match, and every
-- share link 404s for exactly the audience the feature exists for.
DROP POLICY IF EXISTS "Public can read published sessions" ON sessions;
CREATE POLICY "Public can read published sessions" ON sessions
  FOR SELECT TO anon, authenticated USING (is_public = true);

CREATE INDEX IF NOT EXISTS sessions_is_public_idx ON sessions(is_public) WHERE is_public = true;
