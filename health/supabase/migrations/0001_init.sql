-- Soul Health schema. Run once in Supabase → SQL editor.
-- Every table is private to its owner through Row-Level Security.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  birth_year int,
  sex text not null default '',
  height_cm numeric,
  weight_kg numeric,
  conditions text not null default '',
  medications text not null default '',
  supplements text not null default '',
  diet text not null default '',
  goals text not null default '',
  water_target_ml int,
  updated_at timestamptz not null default now()
);

create table if not exists public.lab_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  taken_at date not null,
  lab_name text not null default '',
  file_name text not null default '',
  file_path text,
  status text not null default 'review' check (status in ('review', 'saved')),
  ai_notes text,
  created_at timestamptz not null default now()
);
create index if not exists lab_reports_user_idx on public.lab_reports (user_id, taken_at desc);

create table if not exists public.lab_results (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.lab_reports on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  marker_key text not null,
  raw_name text not null,
  value numeric not null,
  unit text not null default '',
  value_std numeric,
  ref_low numeric,
  ref_high numeric,
  flag text not null default 'unknown',
  note text
);
create index if not exists lab_results_user_marker_idx on public.lab_results (user_id, marker_key);
create index if not exists lab_results_report_idx on public.lab_results (report_id);

create table if not exists public.health_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  score int,
  headline text not null default '',
  summary text not null default '',
  systems jsonb not null default '[]',
  priorities jsonb not null default '[]',
  eat_more jsonb not null default '[]',
  eat_less jsonb not null default '[]',
  hydration text not null default '',
  see_doctor jsonb not null default '[]',
  model text not null default ''
);
create index if not exists health_reviews_user_idx on public.health_reviews (user_id, created_at desc);

create table if not exists public.test_plans (
  user_id uuid primary key references auth.users on delete cascade,
  items jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table if not exists public.food_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('meal', 'menu', 'receipt')),
  eaten_at timestamptz not null default now(),
  note text not null default '',
  thumb text,
  photo_path text,
  result jsonb not null default '{}'
);
create index if not exists food_entries_user_idx on public.food_entries (user_id, eaten_at desc);

create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  ml int not null check (ml > 0 and ml <= 5000),
  logged_at timestamptz not null default now()
);
create index if not exists water_logs_user_idx on public.water_logs (user_id, logged_at);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_user_idx on public.chat_messages (user_id, created_at desc);

-- Row-Level Security: owner-only access on every table
do $$
declare t text;
begin
  foreach t in array array['profiles','lab_reports','lab_results','health_reviews','test_plans','food_entries','water_logs','chat_messages']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner only" on public.%I', t);
    execute format(
      'create policy "owner only" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;

-- Results may only point at the owner's own reports
create or replace function public.lab_result_owner_check() returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public.lab_reports r where r.id = new.report_id and r.user_id = new.user_id) then
    raise exception 'report does not belong to user';
  end if;
  return new;
end $$;
drop trigger if exists lab_result_owner_check on public.lab_results;
create trigger lab_result_owner_check before insert or update on public.lab_results
  for each row execute function public.lab_result_owner_check();

-- Private file bucket; each user can only touch files under "<their user id>/..."
insert into storage.buckets (id, name, public)
values ('health-files', 'health-files', false)
on conflict (id) do nothing;

drop policy if exists "health files owner" on storage.objects;
create policy "health files owner" on storage.objects for all to authenticated
  using (bucket_id = 'health-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'health-files' and (storage.foldername(name))[1] = auth.uid()::text);
