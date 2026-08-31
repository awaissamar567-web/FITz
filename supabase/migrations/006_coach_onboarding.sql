-- Additive coach profile storage. Existing coaches complete setup on next visit.
begin;

alter table public.companies
  add column if not exists coach_years_experience integer,
  add column if not exists coach_expertise text,
  add column if not exists coach_avatar_path text,
  add column if not exists coach_onboarded_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'companies_coach_years_experience_check' and conrelid = 'public.companies'::regclass) then
    alter table public.companies add constraint companies_coach_years_experience_check
      check (coach_years_experience between 0 and 80);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'companies_coach_expertise_length_check' and conrelid = 'public.companies'::regclass) then
    alter table public.companies add constraint companies_coach_expertise_length_check
      check (char_length(coach_expertise) between 2 and 120);
  end if;
end $$;

-- Private: only Whop-authorized server routes upload or issue signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('coach-avatars', 'coach-avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

commit;
