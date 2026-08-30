-- Align public.list_platform_team_members with auth.users.email.
--
-- The function declares `email text` while auth.users.email is character
-- varying(255). Its sibling public.list_platform_accounts already carries the
-- `::text` cast; this function was left without one because migration
-- 20260828050000_fix_platform_rpc_email_type.sql was never recorded as applied
-- against the live project, leaving the repository and production out of step.
--
-- Scope note: varchar -> text is binary coercible (pg_cast castmethod = 'b',
-- castcontext = 'i'), and convert_tuples_by_position() only raises 42804 for
-- types that are NOT binary coercible. This cast therefore makes the declared
-- return contract explicit and matches the sibling function; it is not a repair
-- of an observed runtime failure.
--
-- Function body only. No rows, roles, grants, RLS policies, tenant-isolation
-- rules, or other RPCs are changed.

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
    u.email::text,
    p.full_name,
    p.user_id = (select claimed_by from private.bootstrap_admin_state where singleton = true),
    p.updated_at
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where p.role = 'platform_admin'
  order by p.created_at;
end;
$$;

-- Restate the existing execution boundary. Both statements are no-ops against
-- the current live grants (postgres, authenticated, service_role); neither
-- broadens access, and anon/public remain without EXECUTE.
revoke all on function public.list_platform_team_members() from public, anon;
grant execute on function public.list_platform_team_members() to authenticated;
