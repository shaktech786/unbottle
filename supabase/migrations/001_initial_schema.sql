-- Unbottle MVP Schema
-- Run this in Supabase SQL Editor or via supabase db push

-- Profiles (extends auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  preferences jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can read own profile" on profiles for select using (id = auth.uid());
create policy "Users can update own profile" on profiles for update using (id = auth.uid());
create policy "Users can insert own profile" on profiles for insert with check (id = auth.uid());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sessions
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null default 'Untitled Session',
  description text,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  bpm integer default 120,
  key_signature text default 'C',
  time_signature text default '4/4',
  genre text,
  mood text,
  parent_branch_id uuid references sessions(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_active_at timestamptz default now()
);

create index idx_sessions_user on sessions(user_id);
create index idx_sessions_last_active on sessions(user_id, last_active_at desc);

alter table sessions enable row level security;
create policy "Users can CRUD own sessions" on sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Sections (song structure)
create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  name text not null,
  type text not null check (type in ('intro', 'verse', 'pre_chorus', 'chorus', 'bridge', 'outro', 'breakdown', 'custom')),
  start_bar integer not null,
  length_bars integer not null,
  chord_progression jsonb default '[]',
  sort_order integer default 0,
  color text default '#8b5cf6',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_sections_session on sections(session_id);

alter table sections enable row level security;
create policy "Users can CRUD own sections" on sections for all
  using (session_id in (select id from sessions where user_id = auth.uid()))
  with check (session_id in (select id from sessions where user_id = auth.uid()));

-- Tracks
create table if not exists tracks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  name text not null default 'Track 1',
  instrument text not null default 'synth',
  volume float default 0.8,
  pan float default 0,
  muted boolean default false,
  solo boolean default false,
  color text default '#6366f1',
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_tracks_session on tracks(session_id);

alter table tracks enable row level security;
create policy "Users can CRUD own tracks" on tracks for all
  using (session_id in (select id from sessions where user_id = auth.uid()))
  with check (session_id in (select id from sessions where user_id = auth.uid()));

-- Notes
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references tracks(id) on delete cascade,
  section_id uuid references sections(id) on delete set null,
  pitch text not null,
  start_tick integer not null,
  duration_ticks integer not null,
  velocity integer default 100 check (velocity between 0 and 127),
  created_at timestamptz default now()
);

create index idx_notes_track on notes(track_id);
create index idx_notes_section on notes(section_id);

alter table notes enable row level security;
create policy "Users can CRUD own notes" on notes for all
  using (track_id in (
    select t.id from tracks t join sessions s on t.session_id = s.id where s.user_id = auth.uid()
  ))
  with check (track_id in (
    select t.id from tracks t join sessions s on t.session_id = s.id where s.user_id = auth.uid()
  ));

-- Chat messages
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index idx_chat_messages_session on chat_messages(session_id, created_at);

alter table chat_messages enable row level security;
create policy "Users can CRUD own chat messages" on chat_messages for all
  using (session_id in (select id from sessions where user_id = auth.uid()))
  with check (session_id in (select id from sessions where user_id = auth.uid()));

-- Captures (audio recordings, taps, text descriptions)
create table if not exists captures (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  type text not null check (type in ('audio', 'tap', 'text')),
  audio_url text,
  transcription text,
  detected_notes jsonb,
  detected_rhythm jsonb,
  text_description text,
  duration_ms integer,
  created_at timestamptz default now()
);

create index idx_captures_session on captures(session_id);

alter table captures enable row level security;
create policy "Users can CRUD own captures" on captures for all
  using (session_id in (select id from sessions where user_id = auth.uid()))
  with check (session_id in (select id from sessions where user_id = auth.uid()));

-- Bookmarks
create table if not exists bookmarks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  label text not null,
  description text,
  context_snapshot jsonb not null default '{}',
  created_at timestamptz default now()
);

create index idx_bookmarks_session on bookmarks(session_id);

alter table bookmarks enable row level security;
create policy "Users can CRUD own bookmarks" on bookmarks for all
  using (session_id in (select id from sessions where user_id = auth.uid()))
  with check (session_id in (select id from sessions where user_id = auth.uid()));

-- Storage buckets
insert into storage.buckets (id, name, public) values ('captures', 'captures', false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('exports', 'exports', false)
  on conflict (id) do nothing;

-- Storage policies
create policy "Users can upload own captures" on storage.objects for insert
  with check (bucket_id = 'captures' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can read own captures" on storage.objects for select
  using (bucket_id = 'captures' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can upload own exports" on storage.objects for insert
  with check (bucket_id = 'exports' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users can read own exports" on storage.objects for select
  using (bucket_id = 'exports' and auth.uid()::text = (storage.foldername(name))[1]);

-- Updated_at trigger function
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger set_updated_at before update on profiles for each row execute function update_updated_at();
create trigger set_updated_at before update on sessions for each row execute function update_updated_at();
create trigger set_updated_at before update on sections for each row execute function update_updated_at();
create trigger set_updated_at before update on tracks for each row execute function update_updated_at();
