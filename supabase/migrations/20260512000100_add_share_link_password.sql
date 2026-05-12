-- Add optional password protection to shared sessions.
-- password_hash stores a bcrypt hash (cost 10); null means no password.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS share_password_hash TEXT;
