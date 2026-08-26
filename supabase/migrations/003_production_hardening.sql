-- FITz canonical production hardening.
-- The browser never queries tenant tables directly. Authenticated Next.js routes use
-- the service role only after Whop authorization and always scope by company_id.

alter table public.companies enable row level security;
alter table public.clients enable row level security;
alter table public.checkins enable row level security;
alter table public.plans enable row level security;
alter table public.webhook_events enable row level security;

-- Remove earlier permissive or session-setting policies. The service role bypasses
-- RLS by design; anon/authenticated browser roles receive no table policies.
drop policy if exists "service_role_companies_all" on public.companies;
drop policy if exists "service_role_clients_all" on public.clients;
drop policy if exists "service_role_checkins_all" on public.checkins;
drop policy if exists "service_role_plans_all" on public.plans;
drop policy if exists "service_role_webhook_events_all" on public.webhook_events;
drop policy if exists "companies_scoped_select" on public.companies;
drop policy if exists "companies_scoped_update" on public.companies;
drop policy if exists "clients_scoped_select" on public.clients;
drop policy if exists "clients_scoped_insert" on public.clients;
drop policy if exists "clients_scoped_update" on public.clients;
drop policy if exists "checkins_scoped_select" on public.checkins;
drop policy if exists "checkins_scoped_insert" on public.checkins;
drop policy if exists "checkins_scoped_update" on public.checkins;
drop policy if exists "plans_scoped_select" on public.plans;
drop policy if exists "plans_scoped_insert" on public.plans;
drop policy if exists "plans_scoped_update" on public.plans;

revoke all on table public.companies from anon, authenticated;
revoke all on table public.clients from anon, authenticated;
revoke all on table public.checkins from anon, authenticated;
revoke all on table public.plans from anon, authenticated;
revoke all on table public.webhook_events from anon, authenticated;

alter table public.checkins add column if not exists coach_feedback text;

-- Enforce that a check-in or plan can only reference a client in the same tenant.
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

insert into storage.buckets (id, name, public)
values ('checkin-photos', 'checkin-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "checkin_photos_scoped_select" on storage.objects;
drop policy if exists "checkin_photos_scoped_insert" on storage.objects;

revoke all on table storage.objects from anon, authenticated;
