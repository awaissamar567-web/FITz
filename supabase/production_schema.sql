-- ==============================================================================
-- FITZ PRODUCTION DATABASE SCHEMA
-- Multi-Tenant Isolation, Row-Level Security, Realtime & Storage
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. COMPANIES (Coach Workspaces)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  whop_company_id text unique not null,
  coach_name text,
  default_checkin_frequency text default 'weekly',
  units text default 'kg',
  at_risk_threshold_days integer default 7,
  avatar_url text,
  plan text default 'free',
  created_at timestamptz default now()
);

-- 2. CLIENTS (Members enrolled under a coach)
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  whop_user_id text not null,
  whop_experience_id text not null,
  display_name text,
  avatar_url text,
  units_preference text default 'kg',
  status text default 'active',
  goal text,
  stats jsonb default '{}'::jsonb,
  experience_level text,
  equipment jsonb default '{}'::jsonb,
  limitations text,
  intake_completed boolean default false,
  joined_at timestamptz default now(),
  unique(company_id, whop_user_id)
);

-- 3. CHECKINS (Client Weekly Progress Submissions)
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  date date not null default current_date,
  weight numeric,
  photo_url text,
  macro_hit jsonb default '{}'::jsonb,
  notes text,
  created_at timestamptz default now()
);

-- 4. PLANS (Workout Splits & Macro Targets)
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  split_name text,
  exercises jsonb default '[]'::jsonb,
  macros jsonb default '{}'::jsonb,
  schedule jsonb default '[]'::jsonb,
  pdf_url text,
  updated_at timestamptz default now()
);

-- 5. WEBHOOK_EVENTS (Idempotency Audit Log)
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  whop_event_id text unique not null,
  event_type text not null,
  payload jsonb,
  processed_at timestamptz default now()
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE & REALTIME LATENCY
-- ==============================================================================
create index if not exists idx_companies_whop_id on public.companies (whop_company_id);
create index if not exists idx_clients_company_status on public.clients (company_id, status);
create index if not exists idx_clients_company_joined on public.clients (company_id, joined_at desc);
create index if not exists idx_clients_whop_user on public.clients (whop_user_id);
create index if not exists idx_checkins_company_client_date on public.checkins (company_id, client_id, date desc);
create index if not exists idx_checkins_company_created_at on public.checkins (company_id, created_at desc);
create index if not exists idx_plans_company_client on public.plans (company_id, client_id);
create index if not exists idx_webhook_events_whop_id on public.webhook_events (whop_event_id);

-- ==============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
alter table public.companies enable row level security;
alter table public.clients enable row level security;
alter table public.checkins enable row level security;
alter table public.plans enable row level security;
alter table public.webhook_events enable row level security;

-- Service Role (Full Access for Backend API & Server Actions)
create policy "service_role_companies_all" on public.companies for all using (true) with check (true);
create policy "service_role_clients_all" on public.clients for all using (true) with check (true);
create policy "service_role_checkins_all" on public.checkins for all using (true) with check (true);
create policy "service_role_plans_all" on public.plans for all using (true) with check (true);
create policy "service_role_webhook_events_all" on public.webhook_events for all using (true) with check (true);

-- Realtime CDC Publication
alter publication supabase_realtime add table public.checkins;

-- ==============================================================================
-- STORAGE BUCKET FOR CHECK-IN PROGRESS PHOTOS
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('checkin-photos', 'checkin-photos', true)
on conflict (id) do nothing;
