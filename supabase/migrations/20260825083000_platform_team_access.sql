create table if not exists public.platform_access_audit (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('granted', 'revoked')),
  performed_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.platform_access_audit enable row level security;
revoke all on table public.platform_access_audit from anon, authenticated;
grant select on table public.platform_access_audit to authenticated;
drop policy if exists "platform administrators view access audit" on public.platform_access_audit;
create policy "platform administrators view access audit" on public.platform_access_audit
  for select to authenticated using (private.is_platform_admin());

create or replace function public.list_platform_team_members()
returns table (user_id uuid, email text, full_name text, is_bootstrap_owner boolean, granted_at timestamptz)
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
begin
  if auth.uid() is null or not private.is_platform_admin() then
    raise exception 'Platform administrator access is required.' using errcode = '42501';
  end if;

  return query
  select
    p.user_id,
    u.email,
    p.full_name,
    p.user_id = (select claimed_by from private.bootstrap_admin_state where singleton = true),
    p.updated_at
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where p.role = 'platform_admin'
  order by p.created_at;
end;
$$;

create or replace function public.grant_platform_team_access(p_email text)
returns void
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  target_id uuid;
  target_role public.app_role;
begin
  if auth.uid() is null or not private.is_platform_admin() then
    raise exception 'Platform administrator access is required.' using errcode = '42501';
  end if;

  select u.id, p.role into target_id, target_role
  from auth.users u
  join public.profiles p on p.user_id = u.id
  where lower(u.email) = lower(btrim(p_email)) and u.email_confirmed_at is not null;

  if target_id is null then
    raise exception 'A confirmed CampusWear account with that email was not found.' using errcode = 'P0002';
  end if;
  if target_role <> 'student' then
    raise exception 'Only an ordinary student account can be granted platform team access.' using errcode = '22023';
  end if;

  update public.profiles set role = 'platform_admin', updated_at = now() where user_id = target_id;
  insert into public.platform_access_audit (target_user_id, action, performed_by) values (target_id, 'granted', auth.uid());
end;
$$;

create or replace function public.revoke_platform_team_access(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
begin
  if auth.uid() is null or not private.is_platform_admin() then
    raise exception 'Platform administrator access is required.' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot revoke your own platform access.' using errcode = '22023';
  end if;
  if p_user_id = (select claimed_by from private.bootstrap_admin_state where singleton = true) then
    raise exception 'The bootstrap owner cannot be revoked through team management.' using errcode = '22023';
  end if;

  update public.profiles set role = 'student', updated_at = now() where user_id = p_user_id and role = 'platform_admin';
  if not found then
    raise exception 'Platform team member not found.' using errcode = 'P0002';
  end if;
  insert into public.platform_access_audit (target_user_id, action, performed_by) values (p_user_id, 'revoked', auth.uid());
end;
$$;

revoke all on function public.list_platform_team_members() from public, anon;
revoke all on function public.grant_platform_team_access(text) from public, anon;
revoke all on function public.revoke_platform_team_access(uuid) from public, anon;
grant execute on function public.list_platform_team_members() to authenticated;
grant execute on function public.grant_platform_team_access(text) to authenticated;
grant execute on function public.revoke_platform_team_access(uuid) to authenticated;
