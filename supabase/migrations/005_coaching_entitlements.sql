-- Additive migration. Never modifies memberships, plans, or client history.
-- Separate selections preserve the coach's Free choices across upgrades/downgrades.
begin;
alter table public.companies add column if not exists free_client_ids uuid[];
alter table public.companies add column if not exists pro_client_ids uuid[];
alter table public.companies drop constraint if exists companies_free_capacity;
alter table public.companies add constraint companies_free_capacity
  check (free_client_ids is null or cardinality(free_client_ids) <= 3);
alter table public.companies drop constraint if exists companies_pro_capacity;
alter table public.companies add constraint companies_pro_capacity
  check (pro_client_ids is null or cardinality(pro_client_ids) <= 250);
alter table public.checkins add column if not exists coach_feedback text;
commit;
