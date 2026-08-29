-- One-time bootstrap control for the first real CampusWear owner. The configured email is
-- intentionally fail-closed: no other signup can obtain a privileged role automatically.
create table if not exists private.bootstrap_admin_state (
  singleton boolean primary key default true check (singleton),
  bootstrap_email text not null,
  claimed_by uuid references auth.users(id) on delete restrict,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table private.bootstrap_admin_state enable row level security;
revoke all on table private.bootstrap_admin_state from public, anon, authenticated;

insert into private.bootstrap_admin_state (singleton, bootstrap_email)
values (true, 'keancaballero147@gmail.com')
on conflict (singleton) do nothing;

create or replace function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  assigned_role public.app_role := 'student';
  configured_email text;
begin
  -- Serialize only this one-time decision so concurrent signups cannot claim the bootstrap role.
  perform pg_advisory_xact_lock(hashtextextended('campuswear.bootstrap-platform-admin', 0));

  select bootstrap_email
    into configured_email
  from private.bootstrap_admin_state
  where singleton = true and claimed_by is null
  for update;

  if configured_email is not null and lower(coalesce(new.email, '')) = lower(configured_email) then
    assigned_role := 'platform_admin';
    update private.bootstrap_admin_state
      set claimed_by = new.id, claimed_at = now()
      where singleton = true and claimed_by is null;
  end if;

  insert into public.profiles (user_id, role, full_name, avatar_url)
  values (
    new.id,
    assigned_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function private.create_profile_for_new_user() from public, anon, authenticated;
