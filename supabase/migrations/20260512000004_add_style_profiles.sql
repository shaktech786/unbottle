-- MAIN-31: Style profile schema
-- Stores a user's musical style DNA — key signatures, tempo range, genres, vibes.

create table if not exists style_profiles (
  id text primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  key_signatures text[] not null default '{}',
  tempo_min integer not null default 80 check (tempo_min >= 20),
  tempo_max integer not null default 140 check (tempo_max <= 400),
  genres text[] not null default '{}',
  vibes text[] not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint tempo_range_valid check (tempo_min <= tempo_max),
  unique (user_id)
);

alter table style_profiles enable row level security;

create policy "Users can read own style profile"
  on style_profiles for select
  using (user_id = auth.uid());

create policy "Users can insert own style profile"
  on style_profiles for insert
  with check (user_id = auth.uid());

create policy "Users can update own style profile"
  on style_profiles for update
  using (user_id = auth.uid());

create policy "Users can delete own style profile"
  on style_profiles for delete
  using (user_id = auth.uid());
