@AGENTS.md

New public tables need explicit GRANTs to anon, authenticated, service_role in the same migration (Supabase stopped auto-granting 2026-10-30); `scripts/check-supabase-grants.mjs` enforces it in CI.
