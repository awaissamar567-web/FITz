-- FITz live schema reconciliation
-- Safe to run after the partial companies/clients setup currently in Supabase.

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null default current_date,
  weight numeric,
  photo_url text,
  macro_hit jsonb not null default '{}'::jsonb,
  notes text,
  coach_feedback text,
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  split_name text,
  exercises jsonb not null default '[]'::jsonb,
  macros jsonb not null default '{}'::jsonb,
  schedule jsonb not null default '[]'::jsonb,
  pdf_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  whop_event_id text unique not null,
  event_type text not null,
  payload jsonb,
  processed_at timestamptz not null default now()
);

create index if not exists idx_clients_company_status
  on public.clients (company_id, status);
create index if not exists idx_clients_company_joined
  on public.clients (company_id, joined_at desc);
create index if not exists idx_checkins_company_client_date
  on public.checkins (company_id, client_id, date desc);
create index if not exists idx_checkins_company_created_at
  on public.checkins (company_id, created_at desc);
create index if not exists idx_plans_company_client
  on public.plans (company_id, client_id);
create index if not exists idx_webhook_events_processed
  on public.webhook_events (whop_event_id, processed_at desc);
create unique index if not exists uq_clients_company_id_id
  on public.clients (company_id, id);

alter table public.checkins
  drop constraint if exists checkins_company_client_fkey;
alter table public.checkins
  add constraint checkins_company_client_fkey
  foreign key (company_id, client_id)
  references public.clients (company_id, id)
  on delete cascade;

alter table public.plans
  drop constraint if exists plans_company_client_fkey;
alter table public.plans
  add constraint plans_company_client_fkey
  foreign key (company_id, client_id)
  references public.clients (company_id, id)
  on delete cascade;

alter table public.companies enable row level security;
alter table public.clients enable row level security;
alter table public.checkins enable row level security;
alter table public.plans enable row level security;
alter table public.webhook_events enable row level security;

-- FITz accesses these tables only through Whop-authorized server routes.
revoke all on table public.companies from anon, authenticated;
revoke all on table public.clients from anon, authenticated;
revoke all on table public.checkins from anon, authenticated;
revoke all on table public.plans from anon, authenticated;
revoke all on table public.webhook_events from anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'checkins'
  ) then
    alter publication supabase_realtime add table public.checkins;
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('checkin-photos', 'checkin-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "checkin_photos_scoped_select" on storage.objects;
drop policy if exists "checkin_photos_scoped_insert" on storage.objects;
revoke all on table storage.objects from anon, authenticated;
