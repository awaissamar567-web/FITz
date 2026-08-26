-- ==============================================================================
-- Fitz Database Schema Migration 001
-- Multi-Tenant Isolation & Row-Level Security
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. COMPANIES (Coaches)
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  whop_company_id text unique not null,   -- biz_xxx from Whop
  coach_name text,
  default_checkin_frequency text default 'weekly', -- 'daily' | 'weekly'
  units text default 'kg',                         -- 'kg' | 'lbs'
  plan text default 'free',                        -- 'free' | 'pro'
  created_at timestamptz default now()
);

-- 2. CLIENTS (Members subscribed to a coach)
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  whop_user_id text not null,
  whop_experience_id text not null,        -- exp_xxx this client belongs to
  status text default 'active',            -- 'active' | 'at_risk' | 'cancelled'
  goal text,
  stats jsonb default '{}'::jsonb,
  experience_level text,
  equipment jsonb default '[]'::jsonb,
  limitations text,
  intake_completed boolean default false,
  joined_at timestamptz default now(),
  unique(company_id, whop_user_id)
);

-- 3. CHECKINS (Client submissions - denormalized company_id for non-join RLS)
create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  date date not null default current_date,
  weight numeric,
  photo_url text,
  macro_hit jsonb default '{}'::jsonb,
  notes text,
  created_at timestamptz default now()
);

-- 4. PLANS (Workout routine + Macro targets - denormalized company_id)
create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  split_name text,
  exercises jsonb default '[]'::jsonb,      -- [{name, sets, reps}]
  macros jsonb default '{}'::jsonb,         -- {calories, protein, carbs, fat}
  updated_at timestamptz default now()
);

-- 5. WEBHOOK_EVENTS (Idempotency log)
create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  whop_event_id text unique not null,
  event_type text not null,
  payload jsonb,
  processed_at timestamptz default now()
);

-- ==============================================================================
-- INDEXES (Composite indexes for scalable, indexed RLS evaluation)
-- ==============================================================================
create index if not exists idx_companies_whop_id on companies (whop_company_id);
create index if not exists idx_clients_company_status on clients (company_id, status);
create index if not exists idx_clients_whop_user on clients (whop_user_id);
create index if not exists idx_clients_whop_experience on clients (whop_experience_id);
create index if not exists idx_checkins_company_client_date on checkins (company_id, client_id, date desc);
create index if not exists idx_plans_company_client on plans (company_id, client_id);

-- ==============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

alter table companies enable row level security;
alter table clients enable row level security;
alter table checkins enable row level security;
alter table plans enable row level security;
alter table webhook_events enable row level security;

-- 1. Companies Policies
create policy "companies_scoped_select"
on companies for select
using (
  id = nullif(current_setting('app.current_company_id', true), '')::uuid
  or whop_company_id = current_setting('app.current_whop_company_id', true)
);

create policy "companies_scoped_update"
on companies for update
using (
  id = nullif(current_setting('app.current_company_id', true), '')::uuid
  or whop_company_id = current_setting('app.current_whop_company_id', true)
);

-- 2. Clients Policies
create policy "clients_scoped_select"
on clients for select
using (
  company_id = nullif(current_setting('app.current_company_id', true), '')::uuid
);

create policy "clients_scoped_insert"
on clients for insert
with check (
  company_id = nullif(current_setting('app.current_company_id', true), '')::uuid
);

create policy "clients_scoped_update"
on clients for update
using (
  company_id = nullif(current_setting('app.current_company_id', true), '')::uuid
);

-- 3. Checkins Policies
create policy "checkins_scoped_select"
on checkins for select
using (
  company_id = nullif(current_setting('app.current_company_id', true), '')::uuid
);

create policy "checkins_scoped_insert"
on checkins for insert
with check (
  company_id = nullif(current_setting('app.current_company_id', true), '')::uuid
);

create policy "checkins_scoped_update"
on checkins for update
using (
  company_id = nullif(current_setting('app.current_company_id', true), '')::uuid
);

-- 4. Plans Policies
create policy "plans_scoped_select"
on plans for select
using (
  company_id = nullif(current_setting('app.current_company_id', true), '')::uuid
);

create policy "plans_scoped_insert"
on plans for insert
with check (
  company_id = nullif(current_setting('app.current_company_id', true), '')::uuid
);

create policy "plans_scoped_update"
on plans for update
using (
  company_id = nullif(current_setting('app.current_company_id', true), '')::uuid
);
