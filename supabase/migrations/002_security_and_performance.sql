-- ==============================================================================
-- Fitz Database Schema Migration 002
-- Security Hardening, Realtime Feeds & Query Performance Optimization
-- ==============================================================================

-- 1. Optimized Composite Indexes for Feed and Retention Engine
create index if not exists idx_checkins_company_created_at 
  on checkins (company_id, created_at desc);

create index if not exists idx_clients_company_joined_status 
  on clients (company_id, joined_at desc, status);

create index if not exists idx_webhook_events_processed 
  on webhook_events (whop_event_id, processed_at desc);

-- 2. Realtime Publication Setup (for Coach Feed)
-- Enables Postgres WAL CDC publication for checkins table
alter publication supabase_realtime add table checkins;

-- 3. Storage Bucket & RLS Policies for Check-in Photos
insert into storage.buckets (id, name, public)
values ('checkin-photos', 'checkin-photos', false)
on conflict (id) do nothing;

-- Storage Policy: Users can only upload and read objects within their own company_id folder
create policy "checkin_photos_scoped_select"
on storage.objects for select
using (
  bucket_id = 'checkin-photos'
  and (storage.foldername(name))[1] = nullif(current_setting('app.current_company_id', true), '')
);

create policy "checkin_photos_scoped_insert"
on storage.objects for insert
with check (
  bucket_id = 'checkin-photos'
  and (storage.foldername(name))[1] = nullif(current_setting('app.current_company_id', true), '')
);
