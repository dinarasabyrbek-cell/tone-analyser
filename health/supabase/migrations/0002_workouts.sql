-- Workouts for the muscle map (cloud mode only; local mode keeps them in the browser).
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  done_at timestamptz not null default now(),
  text text not null default '',
  title text not null default '',
  kind text not null default 'other',
  minutes int,
  intensity int not null default 2 check (intensity between 1 and 3),
  kcal int,
  muscles jsonb not null default '[]',
  exercises jsonb not null default '[]',
  note text not null default ''
);
create index if not exists workouts_user_idx on public.workouts (user_id, done_at desc);
alter table public.workouts enable row level security;
drop policy if exists "owner only" on public.workouts;
create policy "owner only" on public.workouts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
