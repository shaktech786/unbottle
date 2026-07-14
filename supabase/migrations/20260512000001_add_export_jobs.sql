-- Export jobs table — tracks async export operations for a session.
-- Supports: wav, mp3, midi, stems, bundle formats.
create table if not exists export_jobs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  format text not null check (format in ('wav', 'mp3', 'midi', 'stems', 'bundle')),
  bit_depth integer check (bit_depth in (16, 24, 32)),
  stems_config jsonb, -- array of track IDs for stems export
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'error')),
  output_url text,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_export_jobs_session on export_jobs(session_id, created_at desc);

alter table export_jobs enable row level security;
create policy "Users can manage own export jobs" on export_jobs for all
  using (
    session_id in (select id from sessions where user_id = auth.uid())
  )
  with check (
    session_id in (select id from sessions where user_id = auth.uid())
  );
