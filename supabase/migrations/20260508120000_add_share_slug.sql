ALTER TABLE sessions ADD COLUMN IF NOT EXISTS share_slug TEXT UNIQUE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS sessions_share_slug_idx ON sessions(share_slug) WHERE share_slug IS NOT NULL;
