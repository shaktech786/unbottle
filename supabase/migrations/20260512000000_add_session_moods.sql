-- Session mood tracking for the "Get Unstuck" feature
-- Users rate their flow state at the end of each session

create type session_mood_rating as enum (
  'stuck',
  'distracted',
  'okay',
  'good',
  'in_the_zone'
);

create table if not exists session_moods (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  session_id    uuid references sessions(id) on delete set null,
  mood          session_mood_rating not null,
  created_at    timestamptz not null default now()
);

create index session_moods_user_id_idx on session_moods(user_id);
create index session_moods_session_id_idx on session_moods(session_id);
create index session_moods_created_at_idx on session_moods(created_at desc);

-- Row-level security: users can only see/insert their own moods
alter table session_moods enable row level security;

create policy "Users can view own moods"
  on session_moods for select
  using (auth.uid() = user_id);

create policy "Users can insert own moods"
  on session_moods for insert
  with check (auth.uid() = user_id);
