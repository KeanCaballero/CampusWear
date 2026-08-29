-- A self-service vendor application is only a request. It creates no vendor organization,
-- staff assignment, or privileged role until a platform administrator approves it.
do $$ begin
  create type public.vendor_application_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.vendor_applications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  applicant_user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null check (char_length(btrim(business_name)) between 3 and 160),
  requested_slug text not null check (requested_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  contact_email text not null check (position('@' in contact_email) > 1),
  contact_phone text,
  requested_pickup_location text not null check (char_length(btrim(requested_pickup_location)) between 3 and 240),
  status public.vendor_application_status not null default 'pending',
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, applicant_user_id, requested_slug)
);

create index if not exists vendor_applications_status_created_idx on public.vendor_applications (status, created_at desc);
create index if not exists vendor_applications_applicant_idx on public.vendor_applications (applicant_user_id, created_at desc);
create index if not exists vendor_applications_school_idx on public.vendor_applications (school_id, status);

alter table public.vendor_applications enable row level security;
grant select, insert, update on public.vendor_applications to authenticated;

create policy "applicants view own vendor applications" on public.vendor_applications
for select to authenticated
using (applicant_user_id = (select auth.uid()) or private.is_platform_admin());

create policy "authenticated users submit vendor applications" on public.vendor_applications
for insert to authenticated
with check (
  applicant_user_id = (select auth.uid())
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and review_note is null
  and exists (select 1 from public.schools where id = school_id and is_active)
);

create policy "platform administrators review vendor applications" on public.vendor_applications
for update to authenticated
using (private.is_platform_admin())
with check (private.is_platform_admin());

create or replace function public.approve_vendor_application(p_application_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  application public.vendor_applications%rowtype;
  approved_vendor_id uuid;
begin
  if auth.uid() is null or not private.is_platform_admin() then
    raise exception 'Platform administrator access is required.' using errcode = '42501';
  end if;

  select * into application
  from public.vendor_applications
  where id = p_application_id and status = 'pending'
  for update;

  if not found then
    raise exception 'The pending vendor application was not found.' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.vendors where school_id = application.school_id and slug = application.requested_slug) then
    raise exception 'A vendor already uses this school and slug.' using errcode = '23505';
  end if;

  insert into public.vendors (school_id, name, slug, pickup_location, contact_email, contact_phone, is_authorized, is_active)
  values (application.school_id, application.business_name, application.requested_slug, application.requested_pickup_location, application.contact_email, application.contact_phone, true, true)
  returning id into approved_vendor_id;

  insert into public.vendor_staff (vendor_id, user_id)
  values (approved_vendor_id, application.applicant_user_id)
  on conflict do nothing;

  insert into public.school_memberships (school_id, user_id, role)
  values (application.school_id, application.applicant_user_id, 'vendor_staff')
  on conflict (school_id, user_id) do update set role = 'vendor_staff';

  update public.profiles
  set school_id = application.school_id, role = 'vendor_staff', updated_at = now()
  where user_id = application.applicant_user_id;

  update public.vendor_applications
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = application.id;

  return approved_vendor_id;
end;
$$;

create or replace function public.reject_vendor_application(p_application_id uuid, p_review_note text)
returns void
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  normalized_note text := btrim(coalesce(p_review_note, ''));
begin
  if auth.uid() is null or not private.is_platform_admin() then
    raise exception 'Platform administrator access is required.' using errcode = '42501';
  end if;

  if char_length(normalized_note) < 3 or char_length(normalized_note) > 1000 then
    raise exception 'A review note between 3 and 1000 characters is required.' using errcode = '22023';
  end if;

  update public.vendor_applications
  set status = 'rejected', review_note = normalized_note, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = p_application_id and status = 'pending';

  if not found then
    raise exception 'The pending vendor application was not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.approve_vendor_application(uuid) from public, anon;
revoke all on function public.reject_vendor_application(uuid, text) from public, anon;
grant execute on function public.approve_vendor_application(uuid) to authenticated;
grant execute on function public.reject_vendor_application(uuid, text) to authenticated;
