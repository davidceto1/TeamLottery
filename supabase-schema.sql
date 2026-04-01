-- Supabase SQL schema for TeamLottery
-- Run this in the Supabase SQL Editor (https://app.supabase.com → SQL Editor)

-- Rooms: each team gets a shareable room
create table rooms (
  id text primary key,                          -- short ID shown in URL, e.g. "abc123"
  members jsonb not null default '[]'::jsonb,   -- array of member name strings
  created_at timestamptz not null default now()
);

-- Draws: every lottery draw result
create table draws (
  id bigint generated always as identity primary key,
  room_id text not null references rooms(id) on delete cascade,
  winner text not null,
  drawn_at timestamptz not null default now()
);

create index idx_draws_room on draws(room_id, drawn_at);

-- Enable Row Level Security
alter table rooms enable row level security;
alter table draws enable row level security;

-- Allow anonymous read/write (public app, no auth)
create policy "Anyone can read rooms"  on rooms for select using (true);
create policy "Anyone can insert rooms" on rooms for insert with check (true);
create policy "Anyone can update rooms" on rooms for update using (true);

create policy "Anyone can read draws"  on draws for select using (true);
create policy "Anyone can insert draws" on draws for insert with check (true);
create policy "Anyone can delete draws" on draws for delete using (true);
