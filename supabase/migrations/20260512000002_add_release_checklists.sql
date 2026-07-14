-- Release pipeline: checklists and user finish stats

-- release_checklists
create table if not exists release_checklists (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  steps jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'released')),
  distribution_status text not null default 'not_submitted'
    check (distribution_status in ('not_submitted', 'submitted', 'distributed', 'live')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_release_checklists_session on release_checklists(session_id);

alter table release_checklists enable row level security;
create policy "Users can CRUD own release checklists" on release_checklists for all
  using (session_id in (select id from sessions where user_id = auth.uid()))
  with check (session_id in (select id from sessions where user_id = auth.uid()));

create trigger set_updated_at before update on release_checklists
  for each row execute function update_updated_at();

-- user_stats: finish milestone streak tracker (MAIN-44)
create table if not exists user_stats (
  user_id uuid primary key references profiles(id) on delete cascade,
  finish_streak integer not null default 0,
  last_finish_date date,
  total_finishes integer not null default 0,
  updated_at timestamptz default now()
);

alter table user_stats enable row level security;
create policy "Users can CRUD own stats" on user_stats for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on user_stats
  for each row execute function update_updated_at();
